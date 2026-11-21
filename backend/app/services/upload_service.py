from io import BytesIO
from pathlib import Path
from uuid import uuid4

import pandas as pd

from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session

from app.models.dataset import Dataset
from app.models.user import User
from app.services.storage_service import (
    upload_bytes,
    delete_file
)

from app.services.csv_service import read_csv_content




async def upload_dataset(
    file: UploadFile,
    file_size: int,
    current_user: User,
    db: Session
):
    # Generate a unique R2 object key
    stored_filename = f"{uuid4().hex}.csv"

    object_key = (
        f"users/{current_user.id}/datasets/{stored_filename}"
    )

    uploaded_to_r2 = False

    try:
        # Read uploaded file into memory
        content = await file.read()

        if not content:
            raise HTTPException(
                status_code=400,
                detail="CSV file contains no data"
            )

        # Validate CSV before uploading it
        try:
            df = read_csv_content(content)

        except pd.errors.EmptyDataError:
            raise HTTPException(
                status_code=400,
                detail="CSV file contains no data"
            )

        except pd.errors.ParserError:
            raise HTTPException(
                status_code=400,
                detail="Invalid CSV structure"
            )

        except UnicodeDecodeError:
            raise HTTPException(
                status_code=400,
                detail="Unsupported CSV encoding"
            )

        if len(df.columns) == 0:
            raise HTTPException(
                status_code=400,
                detail="CSV file must contain columns"
            )

        if len(df.columns) > 500:
            raise HTTPException(
                status_code=400,
                detail="CSV contains too many columns"
            )



        # Upload original CSV to Cloudflare R2
        upload_bytes(
            content=content,
            object_key=object_key,
            content_type="text/csv"
        )

        uploaded_to_r2 = True

        # Save metadata in PostgreSQL
        dataset = Dataset(
            original_filename=Path(
                file.filename or "dataset.csv"
            ).name,
            stored_filename=stored_filename,
            file_path=object_key,
            file_size=file_size,
            total_rows=len(df),
            total_columns=len(df.columns),
            status="uploaded",
            user_id=current_user.id
        )

        db.add(dataset)
        db.commit()
        db.refresh(dataset)

        return dataset

    except Exception:
        db.rollback()

        # Remove R2 object if database operation fails
        if uploaded_to_r2:
            try:
                delete_file(object_key)
            except Exception:
                pass

        raise

    finally:
        await file.close()