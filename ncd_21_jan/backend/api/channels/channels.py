from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session
from db.models import Channel, EcuChannel
from db.database import get_db
from api.models import ResponseModel, ChannelCreateModel, ChannelFilterModel, ChannelUpdateModel
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter(prefix='/api/v1/channels')


@router.post("")
def create_channel(payload: ChannelCreateModel, db: Session = Depends(get_db)):
    try:
        exists = db.query(Channel).filter(Channel.channel_name == payload.channel_name).first()
        if exists:
            raise HTTPException(status_code=409, detail=f"Channel: {payload.channel_name} already exists")
        channel = Channel(channel_name=payload.channel_name)
        if payload.channel_id:
            exists = db.query(Channel).filter(Channel.channel_id == payload.channel_id).first()
            if exists:
                raise HTTPException(status_code=409, detail=f"Channel id: {payload.Channel} already exists")
            channel.channel_id = payload.channel_id
        db.add(channel)
        db.flush()
        if payload.ecu_ids:
            ecu_channel_mapping = [EcuChannel(ecu_id=ecu_id, channel_id=channel.channel_id) for ecu_id in payload.ecu_ids]
            db.add_all(ecu_channel_mapping)
        db.commit()
        success, message, data = True, "Channel created successfully", {"channel_id": channel.channel_id,
                                                                        "channel_name": channel.channel_name}
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    except Exception as e:
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    return ResponseModel(success, message, data)


@router.get("")
def list_channels(filters: ChannelFilterModel = Depends(), db: Session = Depends(get_db)):
    try:
        query = db.query(Channel, EcuChannel.ecu_id).outerjoin(EcuChannel, Channel.channel_id == EcuChannel.channel_id)
        if filters.channel_name:
            query = query.filter(Channel.channel_name == filters.channel_name)

        if filters.channel_id:
            query = query.filter(Channel.channel_id == filters.channel_id)
        query = query.order_by(Channel.channel_name.asc())
        rows = query.all()
        result = {}
        for channel, ecu_id in rows:
            ch_id = channel.channel_id
            if ch_id not in result:
                result[ch_id] = {
                    "channel_id": channel.channel_id,
                    "channel_name": channel.channel_name,
                    "ecus": []
                }
            if ecu_id is not None:
                result[ch_id]["ecus"].append(ecu_id)
        data = list(result.values())
        success, message = True, "Channels fetched successfully"
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    except Exception as e:
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    return ResponseModel(success, message, data)


@router.put("/{channel_id}")
def update_ecu(channel_id: int, payload: ChannelUpdateModel, db: Session = Depends(get_db)):
    try:
        channel = db.query(Channel).filter(Channel.channel_id == channel_id).first()
        if not channel:
            raise HTTPException(status_code=404, detail='Channel not found in database')
        update_data = payload.dict()
        for key, value in update_data.items():
            setattr(channel, key, value)
        db.commit()
        success, message = True, "Channel modified successfully"
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    except Exception as e:
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)

    return ResponseModel(success, message)


@router.delete("/{channel_id:int}")
def delete_channel(channel_id: int, db: Session = Depends(get_db)):
    try:
        channel = db.query(Channel).filter(Channel.channel_id == channel_id).first()
        if not channel:
            raise HTTPException(status_code=404, detail='Channel not found in database')
        db.query(EcuChannel).filter(EcuChannel.channel_id == channel_id).delete() #To be deleted when using mysql
        db.delete(channel)
        db.commit()
        success, message = True, "Channel deleted successfully"
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    except Exception as e:
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    return ResponseModel(success, message)
