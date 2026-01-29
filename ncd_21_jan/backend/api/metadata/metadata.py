from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session
from db.models import Metadata, Channel
from db.database import get_db
from api.models import ResponseModel
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter(prefix='/api/v1/metadata')


# DB dependency
@router.post("")
def create_metadata(data: dict, db: Session = Depends(get_db)):
    success = False
    response_data = None
    try:
        row = Metadata(
            fileName=data["fileName"],
            version=data.get("version"),
            author=data.get("author")
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        success = True
        message = "Successfully Metadata Created!!"
        response_data = {
            "id": row.id,
            "fileName": row.fileName
        }

    except SQLAlchemyError as e:
        db.rollback()
        message = "Database error occurred"
        data = str(e)

    except Exception as e:
        db.rollback()
        message = "Unexpected error occurred"
        data = str(e)
    return ResponseModel(success, message, response_data)


@router.get("")
def list_metadata(db: Session = Depends(get_db)):
    success = False

    try:
        data = (
            db.query(Metadata)
            .order_by(Metadata.created_at.desc())
            .all()
        )

        success = True
        message = "Metadata fetched successfully"

    except SQLAlchemyError as e:
        message = "Database error occurred"
        data = str(e)

    except Exception as e:
        message = "Unexpected error occurred"
        data = str(e)

    return ResponseModel(
        success=success,
        message=message,
        data=data
    )


@router.delete("/{id}", status_code=200)
def delete_metadata(id: int, db: Session = Depends(get_db)):
    success = False

    try:
        row = db.query(Metadata).filter(Metadata.id == id).first()

        if not row:
            return ResponseModel(
                success=False,
                message="Metadata not found",
                data={"id": id}
            )

        db.delete(row)
        db.commit()

        success = True
        message = "Metadata deleted successfully"
        data = {"id": id}

    except SQLAlchemyError as e:
        db.rollback()
        message = "Database error occurred"
        data = str(e)

    except Exception as e:
        db.rollback()
        message = "Unexpected error occurred"
        data = str(e)

    return ResponseModel(
        success=success,
        message=message,
        data=data
    )


@router.get("/{id}")
def get_metadata(id: int, db: Session = Depends(get_db)):
    try:
        row = db.query(Metadata).filter(Metadata.id == id).first()

        if not row:
            raise HTTPException(status_code=404, detail="Metadata not found")

        data = {
            "id": row.id,
            "fileName": row.fileName,
            "version": row.version,
            "author": row.author,
            "created_at": row.created_at  # make sure this exists
        }

        return ResponseModel(
            True,
            "Successfully got Metadata.",
            data
        )

    except SQLAlchemyError as e:
        db.rollback()
        return ResponseModel(False, "Database error occurred", str(e))

    except Exception as e:
        return ResponseModel(False, "Unexpected error occurred", str(e))
