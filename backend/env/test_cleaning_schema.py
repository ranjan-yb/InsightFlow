from app.schemas.cleaning import CleaningRequest

config = CleaningRequest(
    numeric_missing="median",
    categorical_missing="unknown",
    duplicate_strategy="business",
    duplicate_columns=["name", "age ", "salary", "city"],
    normalize_column_names=True,
    outlier_strategy="cap"
)

print(config.model_dump())