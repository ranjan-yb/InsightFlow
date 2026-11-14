
import json
import pandas as pd
from pathlib import Path
from fastapi import HTTPException

from app.models.dataset import Dataset


def get_dataset_preview(dataset: Dataset, limit: int = 10):
    file_path = Path(dataset.file_path)

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Dataset file not found"
        )

    try:
        # First try UTF-8, then fall back to CP1252
        try:
            df = pd.read_csv(
                file_path,
                encoding="utf-8-sig",
                nrows=limit,
                low_memory=False
            )
        except UnicodeDecodeError:
            df = pd.read_csv(
                file_path,
                encoding="cp1252",
                nrows=limit,
                low_memory=False
            )

        preview = json.loads(
            df.to_json(orient="records", date_format="iso")
        )

        columns = [
            {
                "name": str(column),
                "dtype": str(df[column].dtype)
            }
            for column in df.columns
        ]

        return {
            "dataset_id": dataset.id,
            "filename": dataset.original_filename,
            "total_rows": dataset.total_rows,
            "total_columns": dataset.total_columns,
            "columns": columns,
            "preview": preview
        }

    except pd.errors.EmptyDataError:
        raise HTTPException(
            status_code=400,
            detail="CSV file contains no data"
        )

    except (pd.errors.ParserError, UnicodeDecodeError):
        raise HTTPException(
            status_code=400,
            detail="Unable to parse CSV. Please check its structure and encoding."
        )
