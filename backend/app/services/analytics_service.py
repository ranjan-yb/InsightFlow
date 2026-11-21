from io import BytesIO
import pandas as pd
from app.services.storage_service import download_bytes
from app.services.csv_service import read_csv_content, read_dataset

def read_dataset_from_r2(object_key: str) -> pd.DataFrame:
    """Read a CSV dataset directly from Cloudflare R2."""

    if not object_key:
        raise ValueError("Dataset object key is missing")

    # Download CSV bytes from R2
    file_content = download_bytes(object_key)

    # Try UTF-8 encoding first
    try:
        return pd.read_csv(
            BytesIO(file_content),
            encoding="utf-8-sig",
            low_memory=False
        )

    except UnicodeDecodeError:
        # Fallback to CP1252
        return pd.read_csv(
            BytesIO(file_content),
            encoding="cp1252",
            low_memory=False
        )


def get_dataset_overview(object_key: str) -> dict:

    df = read_dataset_from_r2(object_key)

    numeric_columns = df.select_dtypes(
        include="number"
    ).columns.tolist()

    datetime_columns = df.select_dtypes(
        include="datetime"
    ).columns.tolist()

    categorical_columns = [
        column
        for column in df.columns
        if column not in numeric_columns
        and column not in datetime_columns
    ]

    column_details = []

    for column in df.columns:
        column_details.append({
            "name": column,
            "data_type": str(df[column].dtype),
            "missing_values": int(df[column].isna().sum()),
            "unique_values": int(df[column].nunique()),
        })

    numeric_statistics = {}

    for column in numeric_columns:
        numeric_statistics[column] = {
            "mean": float(df[column].mean()),
            "median": float(df[column].median()),
            "min": float(df[column].min()),
            "max": float(df[column].max()),
            "sum": float(df[column].sum()),
        }

    return {
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "numeric_columns": numeric_columns,
        "categorical_columns": categorical_columns,
        "datetime_columns": datetime_columns,
        "total_missing_values": int(df.isna().sum().sum()),
        "columns": column_details,
        "numeric_statistics": numeric_statistics,
    }


def calculate_kpi(file_path: read_csv_content, column: str, operation: str):

    df = read_dataset(file_path)

    if column not in df.columns:
        raise ValueError(f"Column '{column}' not found")

    series = df[column]

    if operation == "count":
        result = int(series.count())

    else:
        if not pd.api.types.is_numeric_dtype(series):
            raise ValueError(
                f"Operation '{operation}' requires a numeric column"
            )

        if series.dropna().empty:
            raise ValueError("Column has no valid numeric values")

        if operation == "sum":
            result = series.sum()

        elif operation == "mean":
            result = series.mean()

        elif operation == "median":
            result = series.median()

        elif operation == "min":
            result = series.min()

        elif operation == "max":
            result = series.max()

        elif operation == "std":
            result = series.std()

        else:
            raise ValueError("Unsupported operation")

    if pd.isna(result):
        raise ValueError("Unable to calculate KPI")

    return {
        "column": column,
        "operation": operation,
        "result": float(result) if operation != "count" else int(result)
    }

def group_by_analysis(
    file_path: read_csv_content,
    group_by: str,
    metric: str,
    operation: str,
    sort_order: str = "desc",
    limit: int = 10
):

    df = read_dataset(file_path)

    if group_by not in df.columns:
        raise ValueError(f"Group-by column '{group_by}' not found")

    if metric not in df.columns:
        raise ValueError(f"Metric column '{metric}' not found")

    if group_by == metric:
        raise ValueError("Group-by and metric columns must be different")

    if operation != "count":
        if not pd.api.types.is_numeric_dtype(df[metric]):
            raise ValueError(
                f"Operation '{operation}' requires a numeric metric column"
            )

    if operation == "count":
        grouped = df.groupby(group_by, dropna=False)[metric].count()

    else:
        grouped = df.groupby(group_by, dropna=False)[metric].agg(operation)

    grouped = grouped.dropna()

    grouped = grouped.sort_values(
        ascending=(sort_order == "asc")
    )

    grouped = grouped.head(limit)

    results = [
        {
            "group": str(group),
            "value": float(value) if operation != "count" else int(value)
        }
        for group, value in grouped.items()
    ]

    return {
        "group_by": group_by,
        "metric": metric,
        "operation": operation,
        "results": results
    }


def filter_dataset(
    file_path: read_csv_content,
    filters: list,
    limit: int = 100
):
    df = read_dataset(file_path)

    for condition in filters:
        column = condition["column"]
        operator = condition["operator"]
        value = condition.get("value")

        if column not in df.columns:
            raise ValueError(f"Column '{column}' not found")

        series = df[column]

        if operator == "equals":
            mask = series == value

        elif operator == "not_equals":
            mask = series != value

        elif operator == "greater_than":
            mask = series > value

        elif operator == "less_than":
            mask = series < value

        elif operator == "greater_than_or_equal":
            mask = series >= value

        elif operator == "less_than_or_equal":
            mask = series <= value

        elif operator == "contains":
            mask = series.astype("string").str.contains(
                str(value),
                case=False,
                na=False,
                regex=False
            )

        elif operator == "not_contains":
            mask = ~series.astype("string").str.contains(
                str(value),
                case=False,
                na=False,
                regex=False
            )

        elif operator == "is_null":
            mask = series.isna()

        elif operator == "is_not_null":
            mask = series.notna()

        elif operator == "in":
            if not isinstance(value, list):
                raise ValueError("'in' operator requires a list value")
            mask = series.isin(value)

        else:
            raise ValueError(f"Unsupported operator: {operator}")

        df = df.loc[mask].copy()

    return {
        "total_filtered_rows": len(df),
        "columns": df.columns.tolist(),
        "results": df.head(limit).astype(object).where(
            pd.notna(df.head(limit)), None
        ).to_dict(orient="records")
    }


def generate_chart(
    file_path: read_csv_content,
    chart_type: str,
    group_by: str,
    metric: str,
    aggregation: str = "sum",
    limit: int = 10,
    sort_order: str = "desc"
):
    # Validate chart type
    allowed_charts = ["bar", "line", "pie", "doughnut"]

    if chart_type not in allowed_charts:
        raise ValueError("Unsupported chart type")

    # Reuse existing group-by service
    grouped_data = group_by_analysis(
        file_path=file_path,
        group_by=group_by,
        metric=metric,
        operation=aggregation,
        sort_order=sort_order,
        limit=limit
    )

    # Prepare chart-friendly data
    chart_data = [
        {
            "label": item["group"],
            "value": item["value"]
        }
        for item in grouped_data["results"]
    ]

    return {
        "chart_type": chart_type,
        "title": f"{metric.replace('_', ' ').title()} by {group_by.replace('_', ' ').title()}",
        "x_axis": group_by,
        "y_axis": metric,
        "data": chart_data
    }


def get_dashboard_summary(file_path: read_csv_content) -> dict:

    overview = get_dataset_overview(file_path)

    df = read_dataset(file_path)

    numeric_columns = overview["numeric_columns"]

    kpis = {
        "total_records": len(df),
        "total_columns": len(df.columns),
        "total_missing_values": int(df.isna().sum().sum()),
        "numeric_columns_count": len(numeric_columns),
        "categorical_columns_count": len(
            overview["categorical_columns"]
        )
    }

    return {
        "overview": overview,
        "kpis": kpis
    }