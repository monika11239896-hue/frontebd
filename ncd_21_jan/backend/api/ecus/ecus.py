from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session
from db.models import ECU, MsgEcuChannel
from db.database import get_db
from api.models import ResponseModel, EcuCreateModel, EcuFilterModel, EcuUpdateModel
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter(prefix='/api/v1/ecus')


@router.post("")
def create_ecu(payload: EcuCreateModel, db: Session = Depends(get_db)):
    try:
        exists = db.query(ECU).filter(ECU.ecu_name == payload.ecu_name).first()
        if exists:
            raise HTTPException(status_code=409, detail=f"ECU: {payload.ecu_name} already exists")
        ecu = ECU(ecu_name=payload.ecu_name)
        if payload.ecu_id:
            exists = db.query(ECU).filter(ECU.ecu_id == payload.ecu_id).first()
            if exists:
                raise HTTPException(status_code=409, detail=f"ECU id: {payload.ecu_id} already exists")
            ecu.ecu_id = payload.ecu_id
        db.add(ecu)
        db.commit()
        db.refresh(ecu)
        success, message, data = True, "ECU created successfully", {"ecu_id": ecu.ecu_id,"ecu_name": ecu.ecu_name}
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    except Exception as e:
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    return ResponseModel(success, message, data)


@router.get("")
def list_ecus(filters: EcuFilterModel = Depends(), db: Session = Depends(get_db)):
    try:
        query = db.query(ECU).order_by(ECU.ecu_name)
        if filters.ecu_name:
            query = query.filter(ECU.ecu_name == filters.ecu_name)

        if filters.ecu_id:
            query = query.filter(ECU.ecu_id == filters.ecu_id)
        rows = query.all()
        success, message = True, "ECUs fetched successfully"
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    except Exception as e:
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    return ResponseModel(success, message, rows)


@router.put("/{ecu_id}")
def update_ecu(ecu_id: int, payload: EcuUpdateModel, db: Session = Depends(get_db)):
    try:
        ecu = db.query(ECU).filter(ECU.ecu_id == ecu_id).first()
        if not ecu:
            raise HTTPException(status_code=404, detail='ECU not found in database')
        update_data = payload.dict()
        for key, value in update_data.items():
            setattr(ecu, key, value)
        db.commit()
        success, message = True, "ECUI modified successfully"
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    except Exception as e:
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)

    return ResponseModel(success, message)


@router.delete("/{ecu_id:int}")
def delete_ecu(ecu_id: int, db: Session = Depends(get_db)):
    try:
        ecu = db.query(ECU).filter(ECU.ecu_id == ecu_id).first()
        if not ecu:
            raise HTTPException(status_code=404, detail='ECU not found in database')
        db.query(MsgEcuChannel).filter(MsgEcuChannel.ecu_id == ecu_id).delete() #To be deleted when using mysql
        db.delete(ecu)
        db.commit()
        success, message = True, "ECU deleted successfully"
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    except Exception as e:
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    return ResponseModel(success, message)
