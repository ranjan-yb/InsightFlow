import json
from pathlib import Path

import pandas as pd
from fastapi import HTTPException

from app.models.dataset import Dataset
from app.services.quality_service import read_dataset
from app.services.storage_service import file_exists


def get_dataset_preview(dataset: Dataset, limit: int = 10):

    file_path = dataset.file_path

    # Check local storage first, then R2
    local_path = Path(file_path)

    if not local_path.is_file() and not file_exists(file_path):
        raise HTTPException(
            status_code=404,
            detail="Dataset file not found"
        )

    try:
        # Read only the requested number of rows
        df = read_dataset(
            file_path,
            nrows=limit
        )

        preview = json.loads(
            df.to_json(
                orient="records",
                date_format="iso"
            )
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

    except HTTPException:
        raise

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