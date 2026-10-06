from pydantic import BaseModel
from typing import Any

class CourseBase(BaseModel):
    title: str
    code: str
    capacity: int = 30
    metadata_obj: dict[str, Any] = {}

class CourseCreate(CourseBase):
    pass # Teacher ID will be derived from current user

class CourseResponse(CourseBase):
    id: int
    teacher_id: int

    class Config:
        from_attributes = True
