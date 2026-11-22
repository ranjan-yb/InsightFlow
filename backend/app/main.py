
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.router import api_router


app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG
)


origins = [
    "http://localhost:5173",
    "https://chekcsv.netlify.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    api_router,
    prefix="/api/v1"
)


@app.get("/")
def home():
    return {
        "message": "Welcome to InsightFlow API",
        "status": "Running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }
