from db.database import Base
from sqlalchemy import Column, Integer, String, Float, Boolean, CheckConstraint, Text, DateTime, ForeignKey, JSON
from datetime import datetime
import pytz

IST = pytz.timezone("Asia/Kolkata")


def ist_now():
    return datetime.now(IST)


class Metadata(Base):
    __tablename__ = "metadata_t"

    id = Column(Integer, primary_key=True)
    fileName = Column(String(50), nullable=False)
    version = Column(String(10))
    author = Column(String(20))
    created_at = Column(DateTime, default=ist_now)


class Channel(Base):
    __tablename__ = "channel_t"

    channel_id = Column(Integer, primary_key=True)
    channel_name = Column(String(50), nullable=False)


class ECU(Base):
    __tablename__ = "ecu_t"

    ecu_id = Column(Integer, primary_key=True)
    ecu_name = Column(String(50), unique=True, nullable=False)


class EcuChannel(Base):
    __tablename__ = "ecu_channel_t"

    ecu_id = Column(Integer, ForeignKey("ecu_t.ecu_id"), primary_key=True)
    channel_id = Column(Integer, ForeignKey("channel_t.channel_id"), primary_key=True)


class Message(Base):
    __tablename__ = "messages_t"

    message_id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    length = Column(Integer, nullable=False)
    is_extended = Column(Boolean, default=False)
    send_type = Column(String(10))
    cycle_time = Column(Integer)
    comment = Column(Text)


class MsgEcuChannel(Base):
    __tablename__ = "msg_ecu_channel_t"

    message_id = Column(Integer, ForeignKey("messages_t.message_id"), primary_key=True)
    ecu_id = Column(Integer, ForeignKey("ecu_t.ecu_id"), primary_key=True)
    channel_id = Column(Integer, ForeignKey("channel_t.channel_id"))


class Signal(Base):
    __tablename__ = "signals_t"

    signal_id = Column(Integer, primary_key=True, index=True)
    sig_name = Column(String(255), nullable=False)
    start_bit = Column(Integer)
    length = Column(Integer)

    is_signed = Column(Boolean, default=False)
    is_float = Column(Boolean, default=False)
    is_multiplexed = Column(Boolean, default=False)
    multiplex_val = Column(String(50))

    endianness = Column(String(20), nullable=False)
    factor = Column(Float, default=1.0)
    offset = Column(Float, default=0.0)
    min_value = Column(Float)
    max_value = Column(Float)

    initial_value = Column(Float)
    unit = Column(String(64))
    comment = Column(Text)
    value_desc = Column(JSON, nullable=True)  # JSON stored as TEXT

    message_id = Column(Integer, ForeignKey("messages_t.message_id"), nullable=False)


class SignalReceiverECU(Base):
    __tablename__ = "signal_receiverecu_t"

    ecu_id = Column(Integer, ForeignKey("ecu_t.ecu_id", ondelete="CASCADE"), primary_key=True)
    signal_id = Column(Integer, ForeignKey("signals_t.signal_id", ondelete="CASCADE"), primary_key=True)
    message_id = Column(Integer, ForeignKey("messages_t.message_id", ondelete="CASCADE"))


class AttributeValue(Base):
    __tablename__ = "attribute_value_t"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50))

    ecu_id = Column(Integer, ForeignKey("ecu_t.ecu_id", ondelete="CASCADE"), nullable=True)
    message_id = Column(Integer, ForeignKey("messages_t.message_id", ondelete="CASCADE"), nullable=True)
    signal_id = Column(Integer, ForeignKey("signals_t.signal_id", ondelete="CASCADE"), nullable=True)

    int_value = Column(Integer)
    float_value = Column(Float)
    string_value = Column(Text)

    __table_args__ = (
        CheckConstraint(
            "(ecu_id IS NOT NULL) + "
            "(message_id IS NOT NULL) + "
            "(signal_id IS NOT NULL) = 1",
            name="only_one_parent"
        ),
    )


class AttributeDefinition(Base):
    __tablename__ = "attribute_definition_t"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50))
    data_type = Column(String(10))
