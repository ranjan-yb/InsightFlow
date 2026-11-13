from pathlib import Path
from uuid import uuid4

import pandas as pd

from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.dataset import Dataset
from app.models.user import User


async def upload_dataset(
    file: UploadFile,
    file_size: int,
    current_user: User,
    db: Session
):

    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    stored_filename = f"{uuid4().hex}.csv"

    file_path = upload_dir / stored_filename

    try:

        # Save uploaded file
        with open(file_path, "wb") as buffer:

            while True:

                chunk = await file.read(1024 * 1024)

                if not chunk:
                    break

                buffer.write(chunk)

        # Read CSV using Pandas
        try:
            df = pd.read_csv(
                file_path,
                encoding="utf-8-sig",
                low_memory=False
            )

        except UnicodeDecodeError:
            df = pd.read_csv(
                file_path,
                encoding="cp1252",
                low_memory=False
            )

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

        # Create database record
        dataset = Dataset(
            original_filename=Path(file.filename or "dataset.csv").name,
            stored_filename=stored_filename,
            file_path=str(file_path),
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

        if file_path.exists():
            file_path.unlink()

        raise

    finally:
        await file.close()