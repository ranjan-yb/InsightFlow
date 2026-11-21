from app.services.quality_service import read_dataset

# Read CSV from local storage
df = read_dataset("test_files/sample.csv")

print("LOCAL CSV TEST SUCCESSFUL!")
print("\nFirst 5 rows:")
print(df.head())

print("\nDataset shape:")
print(df.shape)