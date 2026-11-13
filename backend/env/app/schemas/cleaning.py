
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from datetime import datetime

class CleaningRequest(BaseModel):
    # Missing-value strategies
    numeric_missing: Literal[
        "keep",
        "drop_rows",
        "mean",
        "median",
        "zero"
    ] = "keep"

    categorical_missing: Literal[
        "keep",
        "drop_rows",
        "mode",
        "unknown"
    ] = "keep"

    datetime_missing: Literal[
        "keep",
        "drop_rows"
    ] = "keep"

    # Duplicate strategies
    duplicate_strategy: Literal[
        "keep",
        "exact",
        "business"
    ] = "keep"

    # Columns used to identify business duplicates
    duplicate_columns: list[str] = Field(default_factory=list)

    # Column-name normalization
    normalize_column_names: bool = False

    # Outlier strategies
    outlier_strategy: Literal[
        "keep",
        "remove_rows",
        "cap"
    ] = "keep"

    @model_validator(mode="after")
    def validate_duplicate_columns(self):
        if (
            self.duplicate_strategy == "business"
            and not self.duplicate_columns
        ):
            raise ValueError(
                "Select at least one column for business duplicate detection"
            )

        return self


class CleaningResponse(BaseModel):
    report_id: int
    dataset_id: int
    filename: str
    cleaned_filename: str
    cleaning_report: dict
    created_at: datetime


class CleaningHistoryResponse(BaseModel):
    report_id: int
    dataset_id: int
    cleaned_filename: str
    configuration: dict
    report: dict
    created_at: datetime