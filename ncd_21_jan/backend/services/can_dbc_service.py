from sqlalchemy.orm import Session
from db.models import Message, Signal, MsgEcuChannel, SignalReceiverECU, ECU

import cantools
from cantools.database import can
import cantools.database.can.formats.dbc_specifics as dbc_spec
from cantools.database.can.attribute_definition import AttributeDefinition
from cantools.database.can.attribute import Attribute
from typing import Literal
from collections import OrderedDict

ByteOrder = Literal["little_endian", "big_endian"]
attribute_definitions = OrderedDict({
    "Remarks": AttributeDefinition("Remarks", "null", 'SG_', 'STRING'),
    "NWM_WakeupAllowed": AttributeDefinition("NWM_WakeupAllowed", "No", 'SG_', "ENUM", None, None, ['No', 'Yes']),
    "GenSigStartValue": AttributeDefinition("GenSigStartValue", 0, 'SG_', "INT", 0, 0, ),
    "GenSigSendType": AttributeDefinition("GenSigSendType", "Cyclic", 'SG_', "ENUM", None, None,
                                          ["Cyclic", "OnWrite", "OnWriteWithRepetition", "OnChange",
                                           "OnChangeWithRepetition", "IfActive", "IfActiveWithRepetition",
                                           "NoSigSendType", "NotUsed", "NotUsed", "NotUsed", "NotUsed", "NotUsed"]),
    "GenSigInactiveValue": AttributeDefinition("GenSigInactiveValue", 0, 'SG_', "INT", 0, 0, ),
    "GenSigEnvVarType": AttributeDefinition("GenSigEnvVarType", "undef", 'SG_', "ENUM", None, None,
                                            ["int", "float", "undef"]),
    "GenSigCycleTimeActive": AttributeDefinition("GenSigCycleTimeActive", 0, 'SG_', "INT", 0, 0),
    "GenSigCycleTime": AttributeDefinition("GenSigCycleTime", 0, 'SG_', "INT", 0, 0, ),
    "GenSigTimeoutTime_IVI": AttributeDefinition("GenSigTimeoutTime_IVI", 500, 'SG_', "INT", 0, 65535),
    "GenSigTimeoutMsg_IVI": AttributeDefinition("GenSigTimeoutMsg_IVI", 500, 'SG_', "INT", 0, 65535),
    "GenSigTimeoutTime_HU_Mid_X445": AttributeDefinition("GenSigTimeoutTime_HU_Mid_X445", 500, 'SG_', "INT", 0, 65535),
    "GenSigTimeoutTime_HU_High_X445": AttributeDefinition("GenSigTimeoutTime_HU_High_X445", 500, 'SG_', "INT", 0,
                                                          65535),
    "GenSigTimeoutMsg_HU_Mid_X445": AttributeDefinition("GenSigTimeoutMsg_HU_Mid_X445", 500, 'SG_', "INT", 0, 65535),
    "GenSigTimeoutMsg_HU_High_X445": AttributeDefinition("GenSigTimeoutMsg_HU_High_X445", 500, 'SG_', "INT", 0, 65535),
    "GenSigTimeoutMsg_HU_A": AttributeDefinition("GenSigTimeoutMsg_HU_A", 500, 'SG_', "INT", 0, 65535),
    "GenSigTimeoutMsg_HU_B": AttributeDefinition("GenSigTimeoutMsg_HU_B", 500, 'SG_', "INT", 0, 65535),
    "GenSigTimeoutMsg_HU_High_X451": AttributeDefinition("GenSigTimeoutMsg_HU_High_X451", 500, 'SG_', "INT", 0, 65535),
    "GenSigTimeoutMsg_HU_Mid_X451": AttributeDefinition("GenSigTimeoutMsg_HU_Mid_X451", 500, 'SG_', "INT", 0, 65535),
    "GenSigTimeoutTime_BCM_Mid": AttributeDefinition("GenSigTimeoutTime_BCM_Mid", 500, 'SG_', "INT", 0, 65535),
    "GenSigTimeoutTime_HU_A": AttributeDefinition("GenSigTimeoutTime_HU_A", 500, 'SG_', "INT", 0, 65535),
    "GenSigTimeoutTime_HU_B": AttributeDefinition("GenSigTimeoutTime_HU_B", 500, 'SG_', "INT", 0, 65535),
    "GenSigTimeoutTime_HU_High_X451": AttributeDefinition("GenSigTimeoutTime_HU_High_X451", 500, 'SG_', "INT", 0,
                                                          65535),
    "GenSigTimeoutTime_HU_Mid_X451": AttributeDefinition("GenSigTimeoutTime_HU_Mid_X451", 500, 'SG_', "INT", 0, 65535),
    "NmMessage": AttributeDefinition("NmMessage", "No", 'BO_', "ENUM", None, None, ["No", "Yes"]),
    "NmAsrMessage": AttributeDefinition("NmAsrMessage", "No", 'BO_', "ENUM", None, None, ["<n.a.>", "No", "Yes"]),
    "MessageTimeout": AttributeDefinition("MessageTimeout", 500, 'BO_', "INT", 0, 65535),
    "GenMsgStartDelayTime": AttributeDefinition("GenMsgStartDelayTime", 0, 'BO_', "INT", 0, 0),
    "GenMsgSendType": AttributeDefinition("GenMsgSendType", "Cyclic", 'BO_', "ENUM", None, None,
                                          ["Cyclic", "Event", "NotUsed", "NotUsed", "NotUsed", "NotUsed", "NotUsed",
                                           "IfActive", "NoMsgSendType", "NotUsed"]),
    "GenMsgNrOfRepetition": AttributeDefinition("GenMsgNrOfRepetition", 0, 'BO_', "INT", 0, 0),
    "GenMsgILSupport": AttributeDefinition("GenMsgILSupport", "Yes", 'BO_', "ENUM", None, None, ["No", "Yes"]),
    "GenMsgDelayTime": AttributeDefinition("GenMsgDelayTime", 0, 'BO_', "INT", 0, 100),
    "GenMsgCycleTimeFast": AttributeDefinition("GenMsgCycleTimeFast", 0, 'BO_', "INT", 0, 80),
    "GenMsgCycleTime": AttributeDefinition("GenMsgCycleTime", 0, 'BO_', "INT", 0, 300),
    "DiagUudtResponse": AttributeDefinition("DiagUudtResponse", "false", 'BO_', "ENUM", None, None, ["false", "true"]),
    "DiagUsdtResponse": AttributeDefinition("DiagUsdtResponse", "false", 'BO_', "ENUM", None, None, ["false", "true"]),
    "DiagState": AttributeDefinition("DiagState", "No", 'BO_', "ENUM", None, None, ["No", "Yes"]),
    "DiagResponse": AttributeDefinition("DiagResponse", "No", 'BO_', "ENUM", None, None, ["No", "Yes"]),
    "DiagRequest": AttributeDefinition("DiagRequest", "No", 'BO_', "ENUM", None, None, ["No", "Yes"]),
    "MsgType": AttributeDefinition("MsgType", "Application", 'BO_', "ENUM", None, None, ["Application", "NM", "NMH"]),
    "NodeLayerModules": AttributeDefinition("NodeLayerModules", "null", 'BU_', "STRING"),
    "NmStationAddress": AttributeDefinition("NmStationAddress", 0, 'BU_', "INT", 0, 63),
    "NmNode": AttributeDefinition("NmNode", "No", 'BU_', "ENUM", None, None, ["No", "Yes"]),
    "NmCAN": AttributeDefinition("NmCAN", 3, 'BU_', "INT", 1, 3),
    "NmAsrNodeIdentifier": AttributeDefinition("NmAsrNodeIdentifier", 2, 'BU_', "HEX", 0, 255),
    "NmAsrNode": AttributeDefinition("NmAsrNode", "<n.a.>", 'BU_', "ENUM", None, None, ["<n.a.>", "No", "Yes"]),
    "NmAsrCanMsgReducedTime": AttributeDefinition("NmAsrCanMsgReducedTime", 50, 'BU_', "INT", 1, 65535),
    "NmAsrCanMsgCycleOffs": AttributeDefinition("NmAsrCanMsgCycleOffs", 0, 'BU_', "INT", 0, 65535),
    "ILUsed": AttributeDefinition("ILUsed", "No", 'BU_', "ENUM", None, None, ["Yes", "No"]),
    "ECU": AttributeDefinition("ECU", "", 'BU_', "STRING"),
    "NmType": AttributeDefinition("NmType", "NmAsr", None, 'STRING'),
    "NmMessageCount": AttributeDefinition("NmMessageCount", 128, None, "INT", 0, 128),
    "NmBaseAddress": AttributeDefinition("NmBaseAddress", 0, None, "HEX", 0, 0),
    "NmAsrWaitBusSleepTime": AttributeDefinition("NmAsrWaitBusSleepTime", 500, None, "INT", 1, 65535),
    "NmAsrTimeoutTime": AttributeDefinition("NmAsrTimeoutTime", 1000, None, "INT", 1, 65535),
    "NmAsrRepeatMessageTime": AttributeDefinition("NmAsrRepeatMessageTime", 1500, None, "INT", 1, 65535),
    "NmAsrMessageCount": AttributeDefinition("NmAsrMessageCount", 128, None, "INT", 128, 128),
    "NmAsrCanMsgCycleTime": AttributeDefinition("NmAsrCanMsgCycleTime", 200, None, "INT", 1, 65535),
    "NmAsrBaseAddress": AttributeDefinition("NmAsrBaseAddress", 1280, None, "HEX", 0, 2047),
    "Manufacturer": AttributeDefinition("Manufacturer", "TML", None, "STRING"),
    "ILTxTimeout": AttributeDefinition("ILTxTimeout", 500, None, "INT", 0, 65535),
    "GenEnvVarPrefix": AttributeDefinition("GenEnvVarPrefix", "Env", None, "STRING"),
    "GenEnvVarEndingSnd": AttributeDefinition("GenEnvVarEndingSnd", "_", None, "STRING"),
    "GenEnvVarEndingDsp": AttributeDefinition("GenEnvVarEndingDsp", "Dsp_", None, "STRING"),
    "DBName": AttributeDefinition("DBName", "TestDatabase", None, "STRING"),
    "BusType": AttributeDefinition("BusType", "", None, "STRING"),
    "Baudrate": AttributeDefinition("Baudrate", 500000, None, "INT", 0, 1000000),
    "SystemSignalLongSymbol": AttributeDefinition("SystemSignalLongSymbol", "", 'SG_', "STRING"),
})


def create_ecu_dbc(ecu_id_input: int, db: Session):
    transmitted_messages = (db.query(Message)
                            .join(MsgEcuChannel, MsgEcuChannel.message_id == Message.message_id)
                            .filter(MsgEcuChannel.ecu_id == ecu_id_input).all())
    received_messages = (db.query(Message)
                         .join(Signal, Signal.message_id == Message.message_id)
                         .join(SignalReceiverECU, SignalReceiverECU.signal_id == Signal.signal_id)
                         .filter(SignalReceiverECU.ecu_id == ecu_id_input)
                         .distinct()
                         .all()
                         )
    ecu_rows = db.query(ECU.ecu_id, ECU.ecu_name).all()
    ecu_map = {eid: ecu_name for eid, ecu_name in ecu_rows}

    message_ids = {msg.message_id for msg in transmitted_messages}.union(msg.message_id for msg in received_messages)

    signals = (db.query(Signal, SignalReceiverECU.ecu_id).outerjoin(
        SignalReceiverECU, Signal.signal_id == SignalReceiverECU.signal_id)
               .filter(Signal.message_id.in_(message_ids)).all())

    signals_by_message = {}

    for signal, ecu_id_temp in signals:
        mid = signal.message_id
        if mid not in signals_by_message:
            signals_by_message[mid] = {}
        sid = signal.signal_id
        if sid not in signals_by_message[mid]:
            signals_by_message[mid][sid] = {
                "signal": signal,
                "receiver_ecus": []
            }
        if ecu_id_temp is not None:
            signals_by_message[mid][sid]["receiver_ecus"].append(ecu_id_temp)

    all_messages = set(transmitted_messages + received_messages)
    msg_list_temp = []
    node_list = []
    for msg in all_messages:
        sig_list_temp = []
        msg_signals = signals_by_message.get(msg.message_id, {})
        for sig in msg_signals:
            sig_details: Signal = msg_signals[sig]['signal']
            if sig_details.endianness == "little_endian":
                byte_order: ByteOrder = 'little_endian'
            else:
                byte_order: ByteOrder = "big_endian"
            sig_attribute_dict = {}
            signal_dbc_spec = dbc_spec.DbcSpecifics(attributes=OrderedDict(sig_attribute_dict))
            signal = can.Signal(
                name=sig_details.sig_name,  # Signal name
                start=int(sig_details.start_bit),  # Start bit
                length=int(sig_details.length),  # Length in bits
                raw_initial=int(sig_details.initial_value),  # Initial value
                byte_order=byte_order,  # Byte order (little_endian or big_endian)
                is_signed=bool(sig_details.is_signed),  # Signedness
                minimum=sig_details.min_value,
                maximum=sig_details.max_value,
                is_multiplexer=sig_details.is_multiplexed,
                multiplexer_signal=sig_details.multiplex_val,
                dbc_specifics=signal_dbc_spec,
                unit=sig_details.unit,  # Unit (optional)
                comment=sig_details.comment,  # Comment (optional)
                receivers=[ecu_map[eid] for eid in msg_signals[sig]['receiver_ecus']]
            )
            node_list += [ecu_map[eid] for eid in msg_signals[sig]['receiver_ecus']]
            signal.choices = sig_details.value_desc
            signal.offset = int(sig_details.offset)
            signal.scale = float(sig_details.factor)
            signal.is_float = sig_details.is_float
            sig_list_temp.append(signal)

        msg_attribute_dict = {}
        msg_dbc_spec = dbc_spec.DbcSpecifics(attributes=OrderedDict(msg_attribute_dict))
        # 2. Define a Message, which contains the signal(s)
        # The Message object defines the CAN ID, length (DLC), and associated signals.

        tx_ecu = db.query(MsgEcuChannel.ecu_id).filter(MsgEcuChannel.message_id == msg.message_id).scalar()
        message = can.Message(
            frame_id=msg.message_id,  # CAN ID (frame_id)
            name=msg.name,  # Message name
            length=msg.length,  # Data Length Code (DLC) in bytes
            signals=sig_list_temp,  # List of signals in this message
            senders=[(ecu_map[tx_ecu])] if tx_ecu else None,
            is_extended_frame=bool(msg.is_extended),
            dbc_specifics=msg_dbc_spec,
            comment=msg.comment,
            send_type='Cyclic',
            cycle_time=msg.cycle_time,
        )
        msg_list_temp.append(message)
        node_list += [(ecu_map[tx_ecu])]

        # 3. Define a Database object and add the message(s) to it
    # The Database acts as the container for all definitions.
    node_list_temp = []
    for ecu in set(node_list):
        node = can.Node(ecu)
        node_list_temp.append(node)
    dbc_attribute_dict = {}
    dbc_dbc_spec = dbc_spec.DbcSpecifics(attribute_definitions=attribute_definitions)
                                         # attributes=OrderedDict(dbc_attribute_dict))

    db = can.Database(
        messages=msg_list_temp,
        version='1.0',  # Optional DBC version string
        nodes=node_list_temp,
        dbc_specifics=dbc_spec.DbcSpecifics(attribute_definitions=attribute_definitions) # , attributes=dbc_dbc_spec)
        # Add nodes or other specifics here if needed (e.g., J1939 specifics)
    )
    file_name = f'{ecu_map[ecu_id_input]}.dbc'
    cantools.database.dump_file(db, file_name)
    return file_name


def create_channel_dbc(channel_id_input: int, db: Session):
    transmitted_messages = (db.query(Message)
                            .join(MsgEcuChannel, MsgEcuChannel.message_id == Message.message_id)
                            .filter(MsgEcuChannel.channel_id == channel_id_input).all())

    ecus_in_channel = [row.ecu_id for row in db.query(MsgEcuChannel.ecu_id).filter(MsgEcuChannel.channel_id == channel_id_input).all()]

    received_messages = (db.query(Message)
                            .join(Signal, Signal.message_id == Message.message_id)
                            .join(SignalReceiverECU, SignalReceiverECU.signal_id == Signal.signal_id)
                            .filter(SignalReceiverECU.ecu_id.in_(ecus_in_channel))
                            .distinct()
                            .all())

    ecu_rows = db.query(ECU.ecu_id, ECU.ecu_name).all()
    ecu_map = {eid: ecu_name for eid, ecu_name in ecu_rows}
    message_ids = {msg.message_id for msg in transmitted_messages}.union(msg.message_id for msg in received_messages)

    signals = (db.query(Signal, SignalReceiverECU.ecu_id).outerjoin(
        SignalReceiverECU, Signal.signal_id == SignalReceiverECU.signal_id)
               .filter(Signal.message_id.in_(message_ids)).all())

    signals_by_message = {}

    for signal, ecu_id_temp in signals:
        mid = signal.message_id
        if mid not in signals_by_message:
            signals_by_message[mid] = {}
        sid = signal.signal_id
        if sid not in signals_by_message[mid]:
            signals_by_message[mid][sid] = {
                "signal": signal,
                "receiver_ecus": []
            }
        if ecu_id_temp is not None:
            signals_by_message[mid][sid]["receiver_ecus"].append(ecu_id_temp)

    all_messages = set(transmitted_messages + received_messages)
    msg_list_temp = []
    node_list = []
    for msg in all_messages:
        sig_list_temp = []
        msg_signals = signals_by_message.get(msg.message_id, {})
        for sig in msg_signals:
            sig_details: Signal = msg_signals[sig]['signal']
            if sig_details.endianness == "little_endian":
                byte_order: ByteOrder = 'little_endian'
            else:
                byte_order: ByteOrder = "big_endian"
            sig_attribute_dict = {}
            signal_dbc_spec = dbc_spec.DbcSpecifics(attributes=OrderedDict(sig_attribute_dict))
            signal = can.Signal(
                name=sig_details.sig_name,  # Signal name
                start=int(sig_details.start_bit),  # Start bit
                length=int(sig_details.length),  # Length in bits
                raw_initial=int(sig_details.initial_value),  # Initial value
                byte_order=byte_order,  # Byte order (little_endian or big_endian)
                is_signed=bool(sig_details.is_signed),  # Signedness
                minimum=sig_details.min_value,
                maximum=sig_details.max_value,
                is_multiplexer=sig_details.is_multiplexed,
                multiplexer_signal=sig_details.multiplex_val,
                dbc_specifics=signal_dbc_spec,
                unit=sig_details.unit,  # Unit (optional)
                comment=sig_details.comment,  # Comment (optional)
                receivers=[ecu_map[eid] for eid in msg_signals[sig]['receiver_ecus']]
            )
            node_list += [ecu_map[eid] for eid in msg_signals[sig]['receiver_ecus']]
            signal.choices = sig_details.value_desc
            signal.offset = int(sig_details.offset)
            signal.scale = float(sig_details.factor)
            signal.is_float = sig_details.is_float
            sig_list_temp.append(signal)

        msg_attribute_dict = {}
        msg_dbc_spec = dbc_spec.DbcSpecifics(attributes=OrderedDict(msg_attribute_dict))
        # 2. Define a Message, which contains the signal(s)
        # The Message object defines the CAN ID, length (DLC), and associated signals.

        tx_ecu = db.query(MsgEcuChannel.ecu_id).filter(MsgEcuChannel.message_id == msg.message_id).scalar()
        message = can.Message(
            frame_id=msg.message_id,  # CAN ID (frame_id)
            name=msg.name,  # Message name
            length=msg.length,  # Data Length Code (DLC) in bytes
            signals=sig_list_temp,  # List of signals in this message
            senders=[(ecu_map[tx_ecu])] if tx_ecu else None,
            is_extended_frame=bool(msg.is_extended),
            dbc_specifics=msg_dbc_spec,
            comment=msg.comment,
            send_type=msg.send_type,
            cycle_time=msg.cycle_time,
        )
        msg_list_temp.append(message)
        node_list += [(ecu_map[tx_ecu])]

        # 3. Define a Database object and add the message(s) to it
    # The Database acts as the container for all definitions.
    node_list_temp = []
    for ecu in set(node_list):
        node = can.Node(ecu)
        node_list_temp.append(node)
    dbc_attribute_dict = {}
    dbc_dbc_spec = dbc_spec.DbcSpecifics(attribute_definitions=attribute_definitions,
                                         attributes=OrderedDict(dbc_attribute_dict))

    db = can.Database(
        messages=msg_list_temp,
        version='1.0',  # Optional DBC version string
        nodes=node_list_temp,
        # dbc_specifics=dbc_spec.DbcSpecifics(attribute_definitions=attribute_definitions, attributes=dbc_dbc_spec)
        # Add nodes or other specifics here if needed (e.g., J1939 specifics)
    )
    file_name = f'channel_{channel_id_input}.dbc'
    cantools.database.dump_file(db, file_name)
    return file_name


def create_master_dbc(db: Session):
    ...
