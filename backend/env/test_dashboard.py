from pathlib import Path
from app.services.analytics_service import get_dashboard_summary

result = get_dashboard_summary(
    Path(r"D:\DATA ANALYST\cleaned_check3.csv")
)

print(result)