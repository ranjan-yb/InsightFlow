from app.services.quality_service import read_dataset

df = read_dataset(
    "users/4/datasets/cleaned/33af82f28daf49a1b33113d47ff5f89f_cleaned.csv"
)

print(df.head())
print(df.shape)