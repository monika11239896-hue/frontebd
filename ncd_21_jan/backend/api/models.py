from dataclasses import dataclass
from pydantic import BaseModel
from typing import List, Any, Dict, Optional, Union


class SignalsCreateModel(BaseModel):
    sig_name: str
    start_bit: int
    length: int
    value_desc: Optional[Dict[int, Union[str, int]]] = None
    message_id: int
    min_value: Optional[float] = 1
    max_value: Optional[float] = 255
    is_signed: Optional[bool] = False
    is_float: Optional[bool] = False
    is_multiplexed: Optional[bool] = False
    multiplex_val: Optional[str] = ''
    endianness: Optional[str] = 'little_endian'
    factor: Optional[float] = 1.0
    offset: Optional[float] = 0.0
    initial_value: Optional[float] = 1.0
    unit: Optional[str] = ''
    comment: Optional[str] = ''
    receiver_ecus: List[int]


class SignalsUpdateModel(BaseModel):
    sig_name: Optional[str] = None
    start_bit: Optional[int] = None
    length: Optional[int] = None
    value_desc: Optional[Dict[int, Union[str, int]]] = None
    message_id: Optional[int] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    is_signed: Optional[bool] = None
    is_float: Optional[bool] = None
    is_multiplexed: Optional[bool] = None
    multiplex_val: Optional[str] = None
    endianness: Optional[str] = None
    factor: Optional[float] = None
    offset: Optional[float] = None
    initial_value: Optional[float] = None
    unit: Optional[str] = None
    comment: Optional[str] = None
    receiver_ecus: List[int] = None


class SignalFilterModel(BaseModel):
    sig_name: Optional[str] = None
    message_id: Optional[int] = None


class SignalBulkDeleteModel(BaseModel):
    sig_ids: List[int]


class SignalsEcuMsgMappingModel(BaseModel):
    ecu_ids: List[int]
    message_id: int


class MessageCreateModel(BaseModel):
    message_id: int
    name: str
    length: int
    is_extended: Optional[bool]
    send_type: Optional[str] = None
    cycle_time: Optional[int] = None
    comment: Optional[str] = None
    channel_id: int
    tx_ecu_id: int


class MessagesUpdateModel(BaseModel):
    name: Optional[str] = None
    length: Optional[int] = None
    is_extended: Optional[bool] = None
    send_type: Optional[str] = None
    cycle_time: Optional[int] = None
    comment: Optional[str] = None
    channel_id: Optional[int] = None
    tx_ecu_id: Optional[int] = None


class MessageFilterModel(BaseModel):
    msg_name: Optional[str] = None
    message_id: Optional[int] = None
    channel_id: Optional[int] = None
    tx_ecu_id: Optional[int] = None


class MessageBulkDeleteModel(BaseModel):
    message_ids: List[int]


class EcuCreateModel(BaseModel):
    ecu_id: Optional[int] = None
    ecu_name: str


class EcuFilterModel(BaseModel):
    ecu_id: Optional[int] = None
    ecu_name: Optional[str] = None


class EcuUpdateModel(BaseModel):
    ecu_name: Optional[str] = None


class ChannelCreateModel(BaseModel):
    channel_id: Optional[int] = None
    channel_name: str
    ecu_ids: Optional[List[int]] = None


class ChannelFilterModel(BaseModel):
    channel_id: Optional[int] = None
    channel_name: Optional[str] = None


class ChannelUpdateModel(BaseModel):
    channel_name: Optional[str] = None
    ecu_ids: Optional[List[int]] = None


class AttributeCreateModel(BaseModel):
    attribute_name: str
    ecu_id: Optional[int] = None
    message_id: Optional[int] = None
    signal_id: Optional[int] = None
    int_value: Optional[int] = None
    float_value: Optional[int] = None
    string_value: Optional[str] = None


class AttributeFilterModel(BaseModel):
    attribute_name: Optional[str] = None
    ecu_id: Optional[int] = None
    message_id: Optional[int] = None
    signal_id: Optional[int] = None


class AttributeUpdateModel(BaseModel):
    attribute_name: str = None
    ecu_id: Optional[int] = None
    message_id: Optional[int] = None
    signal_id: Optional[int] = None
    int_value: Optional[int] = None
    float_value: Optional[int] = None
    string_value: Optional[str] = None


class AttributeDefinitionModel(BaseModel):
    name: str
    data_type: str


class CanDbcCreateModel(BaseModel):
    dbc_type: str
    channel_id: Optional[int] = None
    ecu_id: Optional[int] = None


@dataclass
class ResponseModel:
    success: bool
    message: str
    data: Any = None
