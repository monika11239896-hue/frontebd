from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from db.models import Message, MsgEcuChannel
from db.database import get_db
from api.models import ResponseModel, MessageCreateModel, MessageFilterModel, MessageBulkDeleteModel, \
    MessagesUpdateModel
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter(prefix='/api/v1/messages')


@router.post("")
def create_message(payload: MessageCreateModel, db: Session = Depends(get_db)):
    try:
        message = Message(
            name=payload.name,
            length=payload.length,
            is_extended=payload.is_extended,
            send_type=payload.send_type,
            cycle_time=payload.cycle_time,
            comment=payload.comment,
            message_id=payload.message_id,
        )

        db.add(message)
        db.flush()
        channel_id = payload.channel_id
        ecu_id = payload.tx_ecu_id
        msg_ecu_channel_mapping = MsgEcuChannel(message_id=message.message_id, channel_id=channel_id, ecu_id=ecu_id)
        db.add(msg_ecu_channel_mapping)
        db.commit()
        success, message = True, "Message inserted successfully"
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail=ResponseModel(False, 'Message ID already exists').__dict__)
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    except Exception as e:
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)

    return ResponseModel(success, message)


@router.get("")
def get_messages(filters: MessageFilterModel = Depends(), db: Session = Depends(get_db)):
    try:
        query = (
            db.query(Message, MsgEcuChannel.channel_id, MsgEcuChannel.ecu_id).join(MsgEcuChannel,
                     Message.message_id == MsgEcuChannel.message_id))
        if filters.message_id:
            query = query.filter(Message.message_id == filters.message_id)

        if filters.msg_name:
            query = query.filter(Message.name == filters.msg_name)

        if filters.channel_id:
            query = query.filter(MsgEcuChannel.channel_id == filters.channel_id)

        if filters.tx_ecu_id:
            query = query.filter(MsgEcuChannel.ecu_id == filters.tx_ecu_id)

        rows = query.all()

        result = []
        for message, channel_id, sender_ecu_id in rows:
            result.append({
                "message_id": message.message_id,
                "msg_name": message.name,
                "length": message.length,
                "cycle_time": message.cycle_time,
                "send_type": message.send_type,
                "is_extended": message.is_extended,
                "comment": message.comment,
                "channel_id": channel_id,
                "sender_ecu_id": sender_ecu_id
            })
        success, message = True, "Messages fetched successfully"
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    except Exception as e:
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    return ResponseModel(success, message, result)


@router.put("/{message_id}")
def update_message(message_id: int, payload: MessagesUpdateModel, db: Session = Depends(get_db)):
    try:
        message = db.query(Message).filter(Message.message_id == message_id).first()
        if not message:
            raise HTTPException(status_code=404, detail='Message not found in database')

        update_data = payload.dict(exclude_unset=True, exclude={"channel_id", "tx_ecu_id"})

        for key, value in update_data.items():
            setattr(message, key, value)

        mapping = db.query(MsgEcuChannel).filter(MsgEcuChannel.message_id == message_id).first()
        if not mapping:
            raise HTTPException(status_code=404, detail='Mapping not found in database')
        if payload.tx_ecu_id is not None:
            mapping.ecu_id = payload.tx_ecu_id
        if payload.channel_id is not None:
            mapping.channel_id = payload.channel_id

        db.commit()
        success, message = True, "Message modified successfully"
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    except Exception as e:
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)

    return ResponseModel(success, message)


@router.delete("/bulk")
def delete_messages_bulk(payload: MessageBulkDeleteModel, db: Session = Depends(get_db)):
    try:
        # delete mappings
        db.query(MsgEcuChannel).filter(MsgEcuChannel.message_id.in_(payload.message_ids)).delete(
            synchronize_session=False)
        # delete messages
        db.query(Message).filter(Message.message_id.in_(payload.message_ids)).delete(synchronize_session=False)
        db.commit()
        success, message = True, "Message deleted successfully"

    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)

    return ResponseModel(success, message)


@router.delete("/{message_id:int}")
def delete_message(message_id: int, db: Session = Depends(get_db)):
    try:
        message = db.query(Message).filter(Message.message_id == message_id).first()
        if not message:
            raise HTTPException(status_code=404, detail='Message not found in database')

        db.query(MsgEcuChannel).filter(
            MsgEcuChannel.message_id == message_id).delete()  # To be deleted when using mysql

        db.delete(message)
        db.commit()
        success, message = True, "Message deleted successfully"
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    except Exception as e:
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)

    return ResponseModel(success, message)
