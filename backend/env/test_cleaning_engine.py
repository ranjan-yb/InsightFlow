
from app.schemas.cleaning import CleaningRequest
from app.services.cleaning_service import clean_dataset
from app.models.dataset import Dataset


# Use the dataset you previously uploaded.
# Update this path to the actual CSV location.
dataset = Dataset(
    id=3,
    original_filename="check.csv",
    file_path="D:\DATA ANALYST/check.csv"
)

config = CleaningRequest(
    numeric_missing="median",
    categorical_missing="unknown",
    datetime_missing="keep",
    duplicate_strategy="business",
    duplicate_columns=["name", "age ", "salary", "city"],
    normalize_column_names=True,
    outlier_strategy="cap"
)

result = clean_dataset(dataset, config)

print("\nCLEANING COMPLETED!")
print("\nCLEANING REPORT:")
print(result["report"])

print("\nCLEANED FILE:")
print(result["cleaned_file_path"])
