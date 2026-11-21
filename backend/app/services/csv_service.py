from io import BytesIO
from pathlib import Path
from app.services.storage_service import download_bytes
import pandas as pd

def read_csv_content(
    content: bytes,
    nrows: int | None = None
) -> pd.DataFrame:
    """Read CSV bytes with UTF-8 and CP1252 fallback."""

    source = BytesIO(content)

    try:
        return pd.read_csv(
            source,
            encoding="utf-8-sig",
            low_memory=False,
            nrows=nrows
        )

    except UnicodeDecodeError:
        source.seek(0)

        return pd.read_csv(
            source,
            encoding="cp1252",
            low_memory=False,
            nrows=nrows
        )




def read_dataset(
    file_path: str | Path,
    nrows: int | None = None
) -> pd.DataFrame:

    local_path = Path(file_path)

    # Read local CSV
    if local_path.is_file():

        try:
            return pd.read_csv(
                local_path,
                encoding="utf-8-sig",
                low_memory=False,
                nrows=nrows
            )

        except UnicodeDecodeError:
            return pd.read_csv(
                local_path,
                encoding="cp1252",
                low_memory=False,
                nrows=nrows
            )

    # Read CSV from Cloudflare R2
    content = download_bytes(str(file_path))

    return read_csv_content(
        content,
        nrows=nrows
    )