from fastapi import Depends, HTTPException, APIRouter
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from db.database import get_db
from api.models import ResponseModel, CanDbcCreateModel
from sqlalchemy.exc import SQLAlchemyError
import services.can_dbc_service as dbc_service

router = APIRouter(prefix='/api/v1/dbc')


@router.post("/create")
def create_dbc(payload: CanDbcCreateModel, db: Session = Depends(get_db)):
    try:
        if payload.dbc_type == 'ecu':
            if not payload.ecu_id:
                raise HTTPException(status_code=500, detail=ResponseModel(False, 'ECU id must be present in payload').__dict__)
            file_name = dbc_service.create_ecu_dbc(payload.ecu_id, db)
        elif payload.dbc_type == 'channel':
            if not payload.channel_id:
                raise HTTPException(status_code=500, detail=ResponseModel(False, 'Channel id must be present in payload').__dict__)
            file_name = dbc_service.create_channel_dbc(payload.ecu_id, db)
        else:
            file_name = dbc_service.create_master_dbc(db)
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    except Exception as e:
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    return FileResponse(file_name)

