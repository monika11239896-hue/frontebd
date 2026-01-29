from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session
from db.models import Signal, SignalReceiverECU
from db.database import get_db
from api.models import ResponseModel, SignalsCreateModel, SignalsUpdateModel, SignalFilterModel, SignalBulkDeleteModel
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter(prefix='/api/v1/signals')


@router.post("")
def create_signal(payload: list[SignalsCreateModel], db: Session = Depends(get_db)):
    try:
        mapping_objects = []
        for sig in payload:
            ecu_ids = sig.receiver_ecus

            signal = Signal(
                sig_name=sig.sig_name,
                start_bit=sig.start_bit,
                length=sig.length,
                message_id=sig.message_id,
                endianness=sig.endianness,
                is_signed=sig.is_signed,
                is_float=sig.is_float,
                is_multiplexed=sig.is_multiplexed,
                multiplex_val=sig.multiplex_val,
                factor=sig.factor,
                offset=sig.offset,
                min_value=sig.min_value,
                max_value=sig.max_value,
                initial_value=sig.initial_value,
                unit=sig.unit,
                comment=sig.comment,
                value_desc=sig.value_desc,
            )

            db.add(signal)
            db.flush()
            mapping_objects += [SignalReceiverECU(ecu_id=ecu_id, signal_id=signal.signal_id, message_id=sig.message_id)
                                for ecu_id in ecu_ids]

        if mapping_objects:
            db.add_all(mapping_objects)
        db.commit()

        success, message = True, "Signal added successfully"
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    except Exception as e:
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    return ResponseModel(success, message)


@router.get("")
def get_signals(filters: SignalFilterModel = Depends(), db: Session = Depends(get_db)):
    try:

        query = (db.query(Signal, SignalReceiverECU.ecu_id)
                 .outerjoin(SignalReceiverECU, Signal.signal_id == SignalReceiverECU.signal_id))
        if filters.sig_name:
            query = query.filter(Signal.sig_name == filters.sig_name)
        if filters.message_id:
            query = query.filter(Signal.message_id == filters.message_id)
        data = query.all()
        return_dict = {}
        for signal, ecu_id in data:
            if signal.__dict__.get('signal_id') not in return_dict:
                return_dict[signal.__dict__.get('signal_id')] = signal.__dict__
                return_dict[signal.__dict__.get('signal_id')]['receiver_ecus'] = []
            return_dict[signal.__dict__.get('signal_id')]['receiver_ecus'].append(ecu_id)

        success, message = True, "Signals fetched successfully"
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    except Exception as e:
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    return ResponseModel(success, message, [return_dict[sig_id] for sig_id in return_dict])


@router.put("/{signal_id}")
def update_signal(signal_id: int, payload: SignalsUpdateModel, db: Session = Depends(get_db)):
    try:
        signal = db.query(Signal).filter(Signal.signal_id == signal_id).first()
        if not signal:
            raise HTTPException(status_code=404, detail='Signal not found in database')

        update_data = payload.dict(exclude_unset=True, exclude={"receiver_ecus"})

        for key, value in update_data.items():
            setattr(signal, key, value)

        if payload.receiver_ecus is not None:
            db.query(SignalReceiverECU).filter(SignalReceiverECU.signal_id == signal_id).delete()
            mappings = [SignalReceiverECU(ecu_id=ecu_id, signal_id=signal.signal_id, message_id=signal.message_id)
                        for ecu_id in payload.receiver_ecus]
            if mappings:
                db.add_all(mappings)

        db.commit()
        success, message = True, "Signal modified successfully"
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    except Exception as e:
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)

    return ResponseModel(success, message)


@router.delete("/bulk")
def delete_signals_bulk(payload: SignalBulkDeleteModel, db: Session = Depends(get_db)):
    try:
        # delete mappings
        db.query(SignalReceiverECU).filter(SignalReceiverECU.signal_id.in_(payload.sig_ids)).delete(
            synchronize_session=False)
        # delete signals
        db.query(Signal).filter(Signal.signal_id.in_(payload.sig_ids)).delete(synchronize_session=False)
        db.commit()
        success, message = True, "Signal deleted successfully"

    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)

    return ResponseModel(success, message)


@router.delete("/{signal_id:int}")
def delete_signal(signal_id: int, db: Session = Depends(get_db)):
    try:
        signal = db.query(Signal).filter(Signal.signal_id == signal_id).first()
        if not signal:
            raise HTTPException(status_code=404, detail='Signal not found in database')

        db.query(SignalReceiverECU).filter(
            SignalReceiverECU.signal_id == signal_id).delete()  # To be deleted when using mysql

        db.delete(signal)
        db.commit()
        success, message = True, "Signal deleted successfully"
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)
    except Exception as e:
        raise HTTPException(status_code=500, detail=ResponseModel(False, str(e)).__dict__)

    return ResponseModel(success, message)
