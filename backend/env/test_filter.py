from pathlib import Path
from app.services.analytics_service import filter_dataset

result = filter_dataset(
    file_path=Path(r"D:\DATA ANALYST\cleaned_check3.csv"),
    filters=[
        {
            "column": "salary",
            "operator": "greater_than",
            "value": 40000
        },
        {
            "column": "city",
            "operator": "equals",
            "value": "Patna"
        }
    ],
    limit=100
)

print(result)