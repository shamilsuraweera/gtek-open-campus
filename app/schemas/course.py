from pydantic import BaseModel, ConfigDict
from typing import Any, Optional

class CourseBase(BaseModel):
    title: str
    code: str
    capacity: int = 30
    metadata_obj: dict[str, Any] = {}

class CourseCreate(CourseBase):
    teacher_id: Optional[int] = None

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    code: Optional[str] = None
    capacity: Optional[int] = None
    metadata_obj: Optional[dict[str, Any]] = None
    teacher_id: Optional[int] = None

class CourseResponse(CourseBase):
    id: int
    teacher_id: int

    model_config = ConfigDict(from_attributes=True)
