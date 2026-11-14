from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DatasetResponse(BaseModel):

    id: int
    original_filename: str
    file_size: int
    total_rows: int | None
    total_columns: int | None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DatasetPreviewResponse(BaseModel):

    dataset_id: int
    filename: str
    total_rows: int
    total_columns: int
    columns: list[dict]
    preview: list[dict]


class DatasetQualityResponse(BaseModel):
    dataset_id: int
    filename: str
    summary: dict
    columns: list[dict]
