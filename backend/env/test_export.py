from pathlib import Path
from app.services.export_service import export_excel

file_path = Path(r"D:\DATA ANALYST\cleaned_check3.csv")

result = export_excel(file_path)

print("Excel report generated successfully!")
print("File location:", result)
print("File exists:", result.exists())
print("File size:", result.stat().st_size, "bytes")