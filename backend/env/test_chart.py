from pathlib import Path
from app.services.analytics_service import generate_chart

result = generate_chart(
    file_path=Path(r"D:\DATA ANALYST\cleaned_check3.csv"),
    chart_type="doughnut",
    group_by="city",
    metric="salary",
    aggregation="sum",
    limit=10,
    sort_order="desc"
)

print(result)