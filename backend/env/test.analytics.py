from pathlib import Path
from app.services.analytics_service import get_dataset_overview

file_path = Path(r"D:\DATA ANALYST\cleaned_check3.csv")

result = get_dataset_overview(file_path)

print(result)