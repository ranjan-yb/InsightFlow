from io import BytesIO
from app.services.storage_service import (
    download_bytes,
    upload_bytes,
    delete_file
)

from uuid import uuid4
import re

import pandas as pd
from fastapi import HTTPException

from app.models.dataset import Dataset
from app.schemas.cleaning import CleaningRequest

from app.services.csv_service import read_csv_content, read_dataset



def normalize_column_name(name: str) -> str:
    """Convert column names into clean snake_case names."""

    name = str(name).strip().lower()
    name = re.sub(r"[^a-z0-9]+", "_", name)
    name = name.strip("_")

    return name or "unnamed"


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize names and prevent duplicate column names."""

    new_columns = []
    used_names = set()

    for column in df.columns:
        base_name = normalize_column_name(column)
        new_name = base_name
        counter = 2

        while new_name in used_names:
            new_name = f"{base_name}_{counter}"
            counter += 1

        used_names.add(new_name)
        new_columns.append(new_name)

    df.columns = new_columns

    return df


def handle_missing_values(
    df: pd.DataFrame,
    config: CleaningRequest,
    report: dict
) -> pd.DataFrame:

    numeric_columns = df.select_dtypes(
        include="number"
    ).columns.tolist()

    datetime_columns = df.select_dtypes(
        include="datetime"
    ).columns.tolist()

    categorical_columns = [
        column for column in df.columns
        if column not in numeric_columns
        and column not in datetime_columns
    ]

    # Numeric missing values
    if config.numeric_missing == "drop_rows":
        df = df.dropna(subset=numeric_columns)

    elif config.numeric_missing in ["mean", "median", "zero"]:
        for column in numeric_columns:
            if df[column].isna().sum() == 0:
                continue

            if config.numeric_missing == "mean":
                fill_value = df[column].mean()

            elif config.numeric_missing == "median":
                fill_value = df[column].median()

            else:
                fill_value = 0

            if pd.notna(fill_value):
                df[column] = df[column].fillna(fill_value)

    # Categorical missing values
    if config.categorical_missing == "drop_rows":
        df = df.dropna(subset=categorical_columns)

    elif config.categorical_missing == "unknown":
        df[categorical_columns] = df[categorical_columns].fillna(
            "Unknown"
        )

    elif config.categorical_missing == "mode":
        for column in categorical_columns:
            mode_values = df[column].mode(dropna=True)

            if not mode_values.empty:
                df[column] = df[column].fillna(
                    mode_values.iloc[0]
                )

    # Datetime missing values
    if config.datetime_missing == "drop_rows":
        df = df.dropna(subset=datetime_columns)

    report["rows_after_missing_handling"] = len(df)

    return df


def remove_duplicates(
    df: pd.DataFrame,
    config: CleaningRequest,
    report: dict
) -> pd.DataFrame:

    before = len(df)

    if config.duplicate_strategy == "exact":
        df = df.drop_duplicates()

    elif config.duplicate_strategy == "business":
        selected_columns = config.duplicate_columns

        # Map selected columns to normalized names when enabled
        if config.normalize_column_names:
            selected_columns = [
                normalize_column_name(column)
                for column in selected_columns
            ]

        missing_columns = [
            column for column in selected_columns
            if column not in df.columns
        ]

        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Duplicate columns not found: {missing_columns}"
            )

        df = df.drop_duplicates(subset=selected_columns)

    report["duplicates_removed"] = before - len(df)

    return df


def handle_outliers(
    df: pd.DataFrame,
    config: CleaningRequest,
    report: dict
) -> pd.DataFrame:

    if config.outlier_strategy == "keep":
        report["outlier_cells_detected"] = 0
        report["outlier_rows_removed"] = 0
        report["outlier_cells_capped"] = 0
        return df

    numeric_columns = df.select_dtypes(
        include="number"
    ).columns.tolist()

    outlier_mask = pd.DataFrame(
        False,
        index=df.index,
        columns=numeric_columns
    )

    bounds = {}

    for column in numeric_columns:
        values = df[column].dropna()

        if values.empty:
            continue

        q1 = values.quantile(0.25)
        q3 = values.quantile(0.75)
        iqr = q3 - q1

        if iqr <= 0:
            continue

        lower = q1 - (1.5 * iqr)
        upper = q3 + (1.5 * iqr)

        bounds[column] = (lower, upper)

        outlier_mask[column] = (
            (df[column] < lower)
            | (df[column] > upper)
        )

    total_outlier_cells = int(outlier_mask.sum().sum())

    report["outlier_cells_detected"] = total_outlier_cells
    report["outlier_rows_removed"] = 0
    report["outlier_cells_capped"] = 0

    if config.outlier_strategy == "remove_rows":
        rows_to_remove = outlier_mask.any(axis=1)
        report["outlier_rows_removed"] = int(rows_to_remove.sum())

        df = df.loc[~rows_to_remove].copy()

    elif config.outlier_strategy == "cap":
        for column, (lower, upper) in bounds.items():
            before_values = df[column].copy()

            df[column] = df[column].clip(
                lower=lower,
                upper=upper
            )

            changed = (
                before_values.notna()
                & (before_values != df[column])
            )

            report["outlier_cells_capped"] += int(
                changed.sum()
            )

    return df


def clean_dataset(
    dataset: Dataset,
    config: CleaningRequest
):
    """Clean a dataset stored in Cloudflare R2."""

    cleaned_object_key = None
    uploaded_to_r2 = False

    try:

        print("DATABASE CLEANED OBJECT KEY:", repr(dataset.cleaned_file_path))
        # 1. Download original CSV from R2
        original_content = download_bytes(dataset.file_path)

        # 2. Read CSV from memory
        df = read_csv_content(original_content)

        original_rows = len(df)
        original_columns = len(df.columns)
        original_missing = int(df.isna().sum().sum())

        report = {
            "original_rows": original_rows,
            "original_columns": original_columns,
            "original_missing_values": original_missing
        }

        # 3. Normalize column names
        if config.normalize_column_names:
            df = normalize_columns(df)

        # 4. Handle missing values
        df = handle_missing_values(
            df,
            config,
            report
        )

        # 5. Handle duplicates
        df = remove_duplicates(
            df,
            config,
            report
        )

        # 6. Handle outliers
        df = handle_outliers(
            df,
            config,
            report
        )

        # 7. Generate cleaned CSV in memory
        cleaned_content = df.to_csv(
            index=False
        ).encode("utf-8-sig")

        cleaned_filename = f"{uuid4().hex}_cleaned.csv"

        # Store cleaned files separately from original files
        cleaned_object_key = (
            f"users/{dataset.user_id}/datasets/cleaned/"
            f"{cleaned_filename}"
        )

        print("R2 CLEANED OBJECT KEY:", repr(cleaned_object_key))


        # 8. Upload cleaned CSV to R2
        upload_bytes(
            content=cleaned_content,
            object_key=cleaned_object_key,
            content_type="text/csv"
        )

        uploaded_to_r2 = True

        # 9. Update cleaning report
        report.update({
            "cleaned_rows": len(df),
            "cleaned_columns": len(df.columns),
            "remaining_missing_values": int(
                df.isna().sum().sum()
            ),
            "rows_removed": original_rows - len(df),
            "columns_normalized": config.normalize_column_names
        })

        return {
            "cleaned_file_path": cleaned_object_key,
            "report": report
        }

    except HTTPException:
        if uploaded_to_r2 and cleaned_object_key:
            try:
                delete_file(cleaned_object_key)
            except Exception:
                pass

        raise

    except (
        pd.errors.ParserError,
        pd.errors.EmptyDataError,
        UnicodeDecodeError
    ):
        if uploaded_to_r2 and cleaned_object_key:
            try:
                delete_file(cleaned_object_key)
            except Exception:
                pass

        raise HTTPException(
            status_code=400,
            detail="Unable to process CSV file"
        )

    except Exception:
        if uploaded_to_r2 and cleaned_object_key:
            try:
                delete_file(cleaned_object_key)
            except Exception:
                pass

        raise


