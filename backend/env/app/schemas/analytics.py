from pydantic import BaseModel

from typing import Literal
from pydantic import BaseModel, Field

from typing import Any

class AnalyticsOverviewResponse(BaseModel):
    dataset_id: int
    filename: str
    total_rows: int
    total_columns: int
    numeric_columns: list[str]
    categorical_columns: list[str]
    datetime_columns: list[str]
    total_missing_values: int
    columns: list[dict]
    numeric_statistics: dict



class KPIRequest(BaseModel):
    column: str

    operation: Literal[
        "sum",
        "mean",
        "median",
        "min",
        "max",
        "count",
        "std"
    ]


class KPIResponse(BaseModel):
    column: str
    operation: str
    result: float | int



class GroupByRequest(BaseModel):
    group_by: str
    metric: str
    operation: Literal[
        "sum",
        "mean",
        "median",
        "min",
        "max",
        "count"
    ]
    sort_order: Literal["asc", "desc"] = "desc"
    limit: int = Field(default=10, ge=1, le=100)





class FilterCondition(BaseModel):
    column: str

    operator: Literal[
        "equals",
        "not_equals",
        "greater_than",
        "less_than",
        "greater_than_or_equal",
        "less_than_or_equal",
        "contains",
        "not_contains",
        "is_null",
        "is_not_null",
        "in"
    ]

    value: Any = None


class DataFilterRequest(BaseModel):
    filters: list[FilterCondition] = Field(default_factory=list)
    limit: int = Field(default=100, ge=1, le=1000)



class ChartRequest(BaseModel):
    chart_type: Literal[
        "bar",
        "line",
        "pie",
        "doughnut"
    ]

    group_by: str
    metric: str

    aggregation: Literal[
        "sum",
        "mean",
        "median",
        "count"
    ] = "sum"

    limit: int = Field(default=10, ge=1, le=100)

    sort_order: Literal["asc", "desc"] = "desc"

class AnalyticsDashboardResponse(BaseModel):
    dataset_id: int
    filename: str
    overview: dict
    kpis: dict