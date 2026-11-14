
from datetime import datetime

from sqlalchemy import (
    Integer,
    ForeignKey,
    DateTime,
    JSON,
    String,
    func
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CleaningReport(Base):
    __tablename__ = "cleaning_reports"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True
    )

    dataset_id: Mapped[int] = mapped_column(
        ForeignKey("datasets.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    cleaned_file_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False
    )

    configuration: Mapped[dict] = mapped_column(
        JSON,
        nullable=False
    )

    report: Mapped[dict] = mapped_column(
        JSON,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
