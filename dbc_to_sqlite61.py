# This code imports multiple DBC files from a folder into SQLite
# ENUM attribute values are stored as numeric indices 
# Compatible with older and newer cantools versions

import cantools
import sqlite3
from datetime import datetime
import os

DBC_FOLDER = "./dbc_files/OneDrive_2026-01-29/Sierra DBC's"
SQLITE_DB = "ncd.db"

CHANNEL_ID = 1

# ---------------- Default Attributes ----------------

default_msg_attrs = {
    "GenMsgCycletime": "20",
    "MessageTimeout": "500",
    "DiagRequest": "No",
    "DiagResponse": "No",
    "DiagState": "No",
    "GenMsgCycletimefast": "0",
    "GenMsgDelayTime": "0",
    "GenMsgILSupport": "Yes",
    "GenMsgNrOfRepetition": "0",
    "GenMsgSendType": "Cyclic",
    "GenMsgStartDelayTime": "0",
    "NmMessage": "No",
    "NmAsrMessage": "No",
    "DiagUsdtResponse": "False",
    "DiagUudtResponse": "False",
    "MsgType": "Application",
    "GenMsgSender": "N/A"
}

default_sig_attrs = {
    "GenSigCycleTime": "20",
    "GenSigCycleTimeActive": "20",
    "GenSigInactiveValue": "0",
    "GenSigSendType": "NoSigSendType",
    "GenSigStartValue": "0",
    "NVM-WakeupAllowed": "No",
    "GenSigEnvVarType": "Undefined"
}

# ---------------- Helpers ----------------

def parse_value(v):
    if v is None:
        return None
    try:
        return int(v)
    except ValueError:
        try:
            return float(v)
        except ValueError:
            return v


def get_attribute_definitions(dbc):
    """Version-safe access to attribute definitions"""
    if hasattr(dbc, "attribute_definitions"):
        return dbc.attribute_definitions
    if hasattr(dbc, "_attribute_definitions"):
        return dbc._attribute_definitions
    return {}


def insert_attributes(cur, attrs, attr_defs, ecu_id=None, message_id=None, signal_id=None):
    for name, value in attrs.items():
        int_v, float_v, str_v = None, None, None

        # ---------- ENUM handling ----------
        if name in attr_defs and attr_defs[name].type == "ENUM":
            # Direct mapping: "Yes" -> 1, "No" -> 0
            if isinstance(value, str):
                if value.lower() == "yes":
                    int_v = 1
                elif value.lower() == "no":
                    int_v = 0
                else:
                    int_v = None  # fallback for unexpected string
            elif isinstance(value, int):
                int_v = value


        # ---------- Normal handling ----------
        if int_v is None:
            if isinstance(value, int):
                int_v = value
            elif isinstance(value, float):
                float_v = value
            elif isinstance(value, bool):
                str_v = str(value)
            elif isinstance(value, str):
                str_v = value
            else:
                str_v = str(value)

        cur.execute("""
            INSERT INTO attribute_value_t
            (name, ecu_id, message_id, signal_id, int_value, float_value, string_value)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (name, ecu_id, message_id, signal_id, int_v, float_v, str_v))


# ---------------- Main ----------------

def main():
    conn = sqlite3.connect(SQLITE_DB)
    cur = conn.cursor()
    cur.execute("BEGIN TRANSACTION")

    dbc_files = [f for f in os.listdir(DBC_FOLDER) if f.lower().endswith(".dbc")]

    for dbc_file in dbc_files:
        dbc_path = os.path.join(DBC_FOLDER, dbc_file)
        print(f"📥 Importing {dbc_file}...")

        try:
            dbc = cantools.database.load_file(dbc_path)
        except Exception as e:
            print(f"⚠️ Skipping {dbc_file}: {e}")
            continue

        attr_defs = get_attribute_definitions(dbc)

        # ---------------- Metadata ----------------
        cur.execute("""
            INSERT INTO metadata_t (fileName, version, author, created_at)
            VALUES (?, ?, ?, ?)
        """, (
            dbc_file,
            getattr(dbc, "version", None),
            None,
            datetime.now().isoformat()
        ))

        # ---------------- Channel ----------------
        cur.execute(
            "INSERT OR IGNORE INTO channel_t (channel_id, channel_name) VALUES (?, ?)",
            (CHANNEL_ID, "CAN_1")
        )

        # ---------------- ECUs ----------------
        ecu_map = {}
        cur.execute("SELECT ecu_id, ecu_name FROM ecu_t")
        for ecu_id, ecu_name in cur.fetchall():
            ecu_map[ecu_name] = ecu_id

        next_ecu_id = max(ecu_map.values()) + 1 if ecu_map else 1
        ecu_names = set()

        for msg in dbc.messages:
            ecu_names.update(msg.senders)
            for sig in msg.signals:
                ecu_names.update(sig.receivers)

        for name in sorted(ecu_names):
            if name not in ecu_map:
                cur.execute(
                    "INSERT INTO ecu_t (ecu_id, ecu_name) VALUES (?, ?)",
                    (next_ecu_id, name)
                )
                ecu_map[name] = next_ecu_id
                next_ecu_id += 1

            cur.execute(
                "INSERT OR IGNORE INTO ecu_channel_t (ecu_id, channel_id) VALUES (?, ?)",
                (ecu_map[name], CHANNEL_ID)
            )

        # ---------------- Node attributes (safe) ----------------
        for node in dbc.nodes:
            if node.name not in ecu_map:
                continue
            if hasattr(node, "attributes") and node.attributes:
                insert_attributes(
                    cur,
                    node.attributes,
                    attr_defs,
                    ecu_id=ecu_map[node.name]
                )

        # ---------------- Messages & Signals ----------------
        cur.execute("SELECT COALESCE(MAX(signal_id), 0) FROM signals_t")
        signal_id_counter = cur.fetchone()[0] + 1
        inserted_signals = set()

        for msg in dbc.messages:
            cycle_time = getattr(msg, "cycle_time", None)
            send_type = (
                "Cyclic" if cycle_time and cycle_time > 0
                else "Event" if cycle_time == 0
                else None
            )

            cur.execute("""
                INSERT OR IGNORE INTO messages_t
                (message_id, name, length, is_extended, send_type, cycle_time, comment)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                msg.frame_id,
                msg.name,
                msg.length,
                int(msg.is_extended_frame),
                send_type,
                cycle_time,
                msg.comment
            ))

            msg_attrs = dict(msg.attributes) if hasattr(msg, "attributes") and msg.attributes else {}
            for k, v in default_msg_attrs.items():
                msg_attrs.setdefault(k, parse_value(v))

            insert_attributes(cur, msg_attrs, attr_defs, message_id=msg.frame_id)

            for sender in msg.senders:
                cur.execute("""
                    INSERT OR IGNORE INTO msg_ecu_channel_t
                    (message_id, ecu_id, channel_id)
                    VALUES (?, ?, ?)
                """, (msg.frame_id, ecu_map[sender], CHANNEL_ID))

            receivers = {r for sig in msg.signals for r in sig.receivers}
            for r in receivers:
                cur.execute("""
                    INSERT OR IGNORE INTO msg_ecu_channel_t
                    (message_id, ecu_id, channel_id)
                    VALUES (?, ?, ?)
                """, (msg.frame_id, ecu_map[r], CHANNEL_ID))

            for sig in msg.signals:
                key = (sig.name, msg.frame_id)
                if key in inserted_signals:
                    continue
                inserted_signals.add(key)

                signal_id = signal_id_counter
                signal_id_counter += 1

                cur.execute("""
                    INSERT OR IGNORE INTO signals_t (
                        signal_id, sig_name, start_bit, length,
                        is_signed, is_float, is_multiplexed,
                        multiplex_val, endianness,
                        factor, offset, min_value, max_value,
                        initial_value, unit, comment, value_desc, message_id
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    signal_id,
                    sig.name,
                    sig.start,
                    sig.length,
                    int(sig.is_signed),
                    int(sig.is_float),
                    0,
                    None,
                    "little_endian" if sig.byte_order == "little_endian" else "big_endian",
                    sig.scale,
                    sig.offset,
                    sig.minimum,
                    sig.maximum,
                    1.0,
                    sig.unit,
                    sig.comment,
                    None,
                    msg.frame_id
                ))

                sig_attrs = dict(sig.attributes) if hasattr(sig, "attributes") and sig.attributes else {}
                for k, v in default_sig_attrs.items():
                    sig_attrs.setdefault(k, parse_value(v))

                insert_attributes(cur, sig_attrs, attr_defs, signal_id=signal_id)

                for r in sig.receivers:
                    cur.execute("""
                        INSERT OR IGNORE INTO signal_receiverecu_t
                        (ecu_id, signal_id, message_id)
                        VALUES (?, ?, ?)
                    """, (ecu_map[r], signal_id, msg.frame_id))

    # ---------------- Cleanup duplicates ----------------
    cur.execute("""
        DELETE FROM msg_ecu_channel_t
        WHERE rowid NOT IN (
            SELECT MIN(rowid)
            FROM msg_ecu_channel_t
            GROUP BY message_id, channel_id
        )
    """)

    conn.commit()
    conn.close()
    print("✅ All DBC files imported successfully")


if __name__ == "__main__":
    main()
