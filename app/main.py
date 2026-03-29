# app/main.py
from fastapi import FastAPI
from app.config import settings

app = FastAPI(title="GTEK Open Campus API")

@app.get("/")
def root():
    return {"message": "GTEK Open Campus API is running", "database": settings.DATABASE_URL}
