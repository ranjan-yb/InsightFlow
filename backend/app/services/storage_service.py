
from functools import lru_cache
from io import BytesIO
from pathlib import Path

import boto3
from botocore.config import Config

from app.core.config import settings


@lru_cache(maxsize=1)
def get_r2_client():
    """Create and reuse the Cloudflare R2 S3 client."""

    if not settings.R2_ENABLED:
        raise RuntimeError("Cloudflare R2 is not enabled")

    required_settings = {
        "R2_ENDPOINT_URL": settings.R2_ENDPOINT_URL,
        "R2_ACCESS_KEY_ID": settings.R2_ACCESS_KEY_ID,
        "R2_SECRET_ACCESS_KEY": settings.R2_SECRET_ACCESS_KEY,
        "R2_BUCKET_NAME": settings.R2_BUCKET_NAME,
    }

    missing = [
        name for name, value in required_settings.items()
        if not value
    ]

    if missing:
        raise RuntimeError(
            f"Missing R2 configuration: {', '.join(missing)}"
        )

    return boto3.client(
        "s3",
        endpoint_url=settings.R2_ENDPOINT_URL,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name=settings.R2_REGION,
        config=Config(signature_version="s3v4"),
    )


def get_bucket_name() -> str:
    if not settings.R2_BUCKET_NAME:
        raise RuntimeError("R2 bucket name is not configured")

    return settings.R2_BUCKET_NAME


def check_r2_connection() -> bool:
    """Verify that the configured credentials can access the bucket."""

    client = get_r2_client()
    client.head_bucket(Bucket=get_bucket_name())

    return True


def upload_fileobj(
    file_obj,
    object_key: str,
    content_type: str = "application/octet-stream"
) -> str:
    """Upload a file-like object to R2."""

    client = get_r2_client()

    file_obj.seek(0)

    client.upload_fileobj(
        file_obj,
        get_bucket_name(),
        object_key,
        ExtraArgs={"ContentType": content_type}
    )

    return object_key


def upload_bytes(
    content: bytes,
    object_key: str,
    content_type: str = "application/octet-stream"
) -> str:
    """Upload bytes directly to R2."""

    return upload_fileobj(
        BytesIO(content),
        object_key,
        content_type
    )


def download_file(
    object_key: str,
    destination: Path
) -> Path:
    """Download an R2 object to a local temporary or working path."""

    client = get_r2_client()

    destination.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    client.download_file(
        get_bucket_name(),
        object_key,
        str(destination)
    )

    return destination



# print("CLEANED FILE PATH:", repr(dataset.cleaned_file_path))
def download_bytes(object_key: str) -> bytes:
    """Download an R2 object and return its contents as bytes."""

    client = get_r2_client()

    response = client.get_object(
        Bucket=get_bucket_name(),
        Key=object_key
    )

    return response["Body"].read()


def delete_file(object_key: str) -> None:
    """Delete an object from R2."""

    client = get_r2_client()

    client.delete_object(
        Bucket=get_bucket_name(),
        Key=object_key
    )


def file_exists(object_key: str) -> bool:
    """Check whether an object exists in R2."""

    client = get_r2_client()

    try:
        client.head_object(
            Bucket=get_bucket_name(),
            Key=object_key
        )
        return True

    except client.exceptions.ClientError as error:
        status_code = error.response.get(
            "ResponseMetadata", {}
        ).get("HTTPStatusCode")

        if status_code == 404:
            return False

        raise
