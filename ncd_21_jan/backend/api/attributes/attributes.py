from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from db.models import AttributeValue, AttributeDefinition
from db.database import get_db
from api.models import ResponseModel, AttributeCreateModel, AttributeUpdateModel, AttributeFilterModel, AttributeDefinitionModel
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter(prefix='/api/v1/attributes')


@router.post("")
def add_attribute_definition(payload: list[AttributeDefinitionModel], db: Session = Depends(get_db)):
    try:
        for attr in payload:
            attribute_def = AttributeDefinition(name=attr.name,
                                                data_type=attr.data_type)

            db.add(attribute_def)
            db.flush()
        db.commit()
        success, message = True, "Attribute inserted successfully"
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail=ResponseModel(False, 'Attribute ID already exists').__dict__)
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    except Exception as e:
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)

    return ResponseModel(success, message)


@router.post("")
def create_attribute(payload: AttributeCreateModel, db: Session = Depends(get_db)):
    try:
        attribute_val = AttributeValue(
            name=payload.attribute_name,
            ecu_id=payload.ecu_id,
            message_id=payload.message_id,
            signal_id=payload.signal_id,
            int_value=payload.int_value,
            float_value=payload.float_value,
            string_value=payload.string_value
        )

        db.add(attribute_val)
        db.flush()
        db.commit()
        success, message = True, "Attribute inserted successfully"
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail=ResponseModel(False, 'Attribute ID already exists').__dict__)
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    except Exception as e:
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)

    return ResponseModel(success, message)


@router.get("")
def get_attributes(filters: AttributeFilterModel = Depends(), db: Session = Depends(get_db)):
    try:
        query = (db.query(AttributeValue))

        if filters.message_id:
            query = query.filter(AttributeValue.message_id == filters.message_id)

        if filters.attribute_name:
            query = query.filter(AttributeValue.name == filters.attribute_name)

        if filters.ecu_id:
            query = query.filter(AttributeValue.ecu_id == filters.ecu_id)

        if filters.signal_id:
            query = query.filter(AttributeValue.signal_id == filters.signal_id)

        rows = query.all()

        result = []
        for row in rows:
            if row.int_value is not None:
                value = row.int_value
            elif row.float_value is not None:
                value = row.float_value
            elif row.string_value is not None:
                value = row.string_value
            else:
                value = None

            result.append({
                "attribute_name": row.name,
                "ecu_id": row.ecu_id,
                "message_id": row.message_id,
                "signal_id": row.signal_id,
                "value": value
            })
        success, message = True, "Attributes fetched successfully"
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    except Exception as e:
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    return ResponseModel(success, message, result)


@router.put("/{attribute_id}")
def attribute_message(attribute_id: int, payload: AttributeUpdateModel, db: Session = Depends(get_db)):
    try:
        attribute = db.query(AttributeValue).filter(AttributeValue.id == attribute_id).first()
        if not attribute:
            raise HTTPException(status_code=404, detail='Attribute not found in database')

        update_data = payload.dict(exclude_unset=True, exclude={"id"})

        for key, value in update_data.items():
            setattr(attribute, key, value)

        db.commit()
        success, message = True, "Attribute modified successfully"
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    except Exception as e:
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)

    return ResponseModel(success, message)


@router.delete("/{attribute_id:int}")
def attribute_delete(attribute_id: int, db: Session = Depends(get_db)):
    try:
        attribute = db.query(AttributeValue).filter(AttributeValue.id == attribute_id).first()
        if not attribute:
            raise HTTPException(status_code=404, detail='Attributenot found in database')

        db.delete(attribute)
        db.commit()
        success, message = True, "Attribute deleted successfully"
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    except Exception as e:
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)

    return ResponseModel(success, message)
