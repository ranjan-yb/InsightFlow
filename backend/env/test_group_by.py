from pathlib import Path
from app.services.analytics_service import group_by_analysis

result = group_by_analysis(
    file_path=Path(r"D:\DATA ANALYST\cleaned_check3.csv"),
    group_by="city",
    metric="salary",
    operation="sum",
    sort_order="desc",
    limit=10
)

print(result)