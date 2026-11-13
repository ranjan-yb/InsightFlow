
import math
from pathlib import Path

import pandas as pd
from fastapi import HTTPException

from app.models.dataset import Dataset


def safe_value(value):
    """Convert Pandas/NumPy values into JSON-safe Python values."""
    if pd.isna(value):
        return None

    if hasattr(value, "item"):
        value = value.item()

    if isinstance(value, float) and not math.isfinite(value):
        return None

    if isinstance(value, (str, int, float, bool)):
        return value

    return str(value)


def read_dataset(file_path: Path) -> pd.DataFrame:
    """Read CSV with UTF-8 first and CP1252 as a fallback."""
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


def profile_dataset(dataset: Dataset):
    file_path = Path(dataset.file_path)

    if not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Dataset file not found"
        )

    try:
        df = read_dataset(file_path)

        total_rows, total_columns = df.shape

        total_missing = int(df.isna().sum().sum())

        # Exact duplicate detection
        exact_duplicate_rows = int(df.duplicated().sum())

        # Business duplicate detection
        # Ignore ID-like columns when checking duplicate records
        id_columns = [
            column for column in df.columns
            if str(column).strip().lower() in ["id", "uuid", "record_id"]
        ]

        comparison_columns = [
            column for column in df.columns
            if column not in id_columns
        ]

        if comparison_columns:
            business_duplicate_rows = int(
                df.duplicated(subset=comparison_columns).sum()
            )
        else:
            business_duplicate_rows = exact_duplicate_rows

        numeric_columns = 0
        categorical_columns = 0
        datetime_columns = 0
        boolean_columns = 0
        total_outliers = 0

        column_profiles = []

        for column in df.columns:
            series = df[column]
            missing_count = int(series.isna().sum())
            unique_count = int(series.nunique(dropna=True))

            # Detect column type
            if pd.api.types.is_bool_dtype(series):
                column_type = "boolean"
                boolean_columns += 1

            elif pd.api.types.is_numeric_dtype(series):
                column_type = "numeric"
                numeric_columns += 1

            elif pd.api.types.is_datetime64_any_dtype(series):
                column_type = "datetime"
                datetime_columns += 1

            else:
                column_type = "categorical"
                categorical_columns += 1

            column_info = {
                "name": str(column),
                "data_type": column_type,
                "pandas_dtype": str(series.dtype),
                "missing_count": missing_count,
                "missing_percentage": round(
                    (missing_count / total_rows * 100)
                    if total_rows > 0 else 0,
                    2
                ),
                "unique_values": unique_count,
                "outlier_count": 0
            }

            # Numeric statistics and IQR outlier detection
            if column_type == "numeric":
                values = series.dropna()

                if not values.empty:
                    column_info["statistics"] = {
                        "minimum": safe_value(values.min()),
                        "maximum": safe_value(values.max()),
                        "mean": safe_value(values.mean()),
                        "median": safe_value(values.median()),
                        "standard_deviation": safe_value(
                            values.std()
                        )
                    }

                    q1 = values.quantile(0.25)
                    q3 = values.quantile(0.75)
                    iqr = q3 - q1

                    if iqr > 0:
                        lower_bound = q1 - (1.5 * iqr)
                        upper_bound = q3 + (1.5 * iqr)

                        outlier_count = int(
                            (
                                (values < lower_bound)
                                | (values > upper_bound)
                            ).sum()
                        )

                        column_info["outlier_count"] = outlier_count
                        total_outliers += outlier_count

            # Most common values for categorical columns
            elif column_type in ("categorical", "boolean"):
                top_values = (
                    series.dropna()
                    .value_counts()
                    .head(5)
                )

                column_info["top_values"] = [
                    {
                        "value": safe_value(value),
                        "count": int(count)
                    }
                    for value, count in top_values.items()
                ]

            column_profiles.append(column_info)

        return {
            "dataset_id": dataset.id,
            "filename": dataset.original_filename,
            "summary": {
                "total_rows": total_rows,
                "total_columns": total_columns,
                "total_missing_values": total_missing,
                "exact_duplicate_rows": exact_duplicate_rows,
                "business_duplicate_rows": business_duplicate_rows,
                "numeric_columns": numeric_columns,
                "categorical_columns": categorical_columns,
                "datetime_columns": datetime_columns,
                "boolean_columns": boolean_columns,
                "total_outliers": total_outliers
            },
            "columns": column_profiles
        }

    except pd.errors.EmptyDataError:
        raise HTTPException(
            status_code=400,
            detail="CSV file contains no data"
        )

    except (pd.errors.ParserError, UnicodeDecodeError):
        raise HTTPException(
            status_code=400,
            detail="Unable to analyze this CSV file"
        )
