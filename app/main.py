from fastapi import FastAPI
from app.config import settings
from app.api import auth, users, students, courses

app = FastAPI(title="GTEK Open Campus API", version="0.1.0")

app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(students.router, prefix="/api/v1")
app.include_router(courses.router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "GTEK Open Campus API is running"}
