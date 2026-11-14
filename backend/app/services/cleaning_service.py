
from pathlib import Path
from uuid import uuid4
import re

import pandas as pd
from fastapi import HTTPException

from app.core.config import settings
from app.models.dataset import Dataset
from app.schemas.cleaning import CleaningRequest


def read_csv_file(file_path: Path) -> pd.DataFrame:
    """Read CSV with encoding fallback."""

    try:
        return pd.read_csv(
            file_path,
            encoding="utf-8-sig",
            low_memory=False
        )
    except UnicodeDecodeError:
        return pd.read_csv(
            file_path,
            encoding="cp1252",
            low_memory=False
        )


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
    """Apply user-selected cleaning operations."""

    original_path = Path(dataset.file_path)

    if not original_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Original dataset file not found"
        )

    cleaned_path = None

    try:
        df = read_csv_file(original_path)

        original_rows = len(df)
        original_columns = len(df.columns)
        original_missing = int(df.isna().sum().sum())

        report = {
            "original_rows": original_rows,
            "original_columns": original_columns,
            "original_missing_values": original_missing
        }

        # 1. Normalize column names
        if config.normalize_column_names:
            df = normalize_columns(df)

        # 2. Handle missing values
        df = handle_missing_values(
            df,
            config,
            report
        )

        # 3. Handle duplicates
        df = remove_duplicates(
            df,
            config,
            report
        )

        # 4. Handle outliers
        df = handle_outliers(
            df,
            config,
            report
        )

        # 5. Generate cleaned CSV
        output_dir = Path(settings.UPLOAD_DIR) / "cleaned"
        output_dir.mkdir(parents=True, exist_ok=True)

        cleaned_filename = f"{uuid4().hex}_cleaned.csv"
        cleaned_path = output_dir / cleaned_filename

        df.to_csv(
            cleaned_path,
            index=False,
            encoding="utf-8-sig"
        )

        report.update({
            "cleaned_rows": len(df),
            "cleaned_columns": len(df.columns),
            "remaining_missing_values": int(df.isna().sum().sum()),
            "rows_removed": original_rows - len(df),
            "columns_normalized": config.normalize_column_names
        })

        return {
            "cleaned_file_path": str(cleaned_path),
            "report": report
        }

    except HTTPException:
        if cleaned_path and cleaned_path.exists():
            cleaned_path.unlink()
        raise

    except (pd.errors.ParserError, pd.errors.EmptyDataError,
            UnicodeDecodeError):
        raise HTTPException(
            status_code=400,
            detail="Unable to process CSV file"
        )

    except Exception:
        if cleaned_path and cleaned_path.exists():
            cleaned_path.unlink()
        raise
