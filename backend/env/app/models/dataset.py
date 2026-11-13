from datetime import datetime

from sqlalchemy import (
    String,
    Integer,
    ForeignKey,
    DateTime,
    Text,
    func
)

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Dataset(Base):

    __tablename__ = "datasets"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    original_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    stored_filename: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False
    )

    file_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False
    )

    cleaned_file_path: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )

    file_size: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    total_rows: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    total_columns: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    status: Mapped[str] = mapped_column(
        String(50),
        default="uploaded",
        nullable=False
    )

    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # Relationship
    owner: Mapped["User"] = relationship(
        back_populates="datasets"
    )