from pathlib import Path

from fastapi import UploadFile, HTTPException, status

from app.core.config import settings


async def validate_csv(file: UploadFile):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is required"
        )

    extension = Path(file.filename).suffix.lower()

    if extension not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are allowed"
        )

    # Check file size without loading everything into memory
    total_size = 0

    while True:

        chunk = await file.read(1024 * 1024)

        if not chunk:
            break

        total_size += len(chunk)

        if total_size > settings.MAX_UPLOAD_SIZE:

            await file.seek(0)

            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File size exceeds the 10 MB limit"
            )

    await file.seek(0)

    if total_size == 0:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty"
        )

    return total_size