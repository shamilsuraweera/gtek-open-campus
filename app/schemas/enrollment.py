from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class EnrollmentBase(BaseModel):
    student_id: int
    course_id: int
    status: str = "Active"

class EnrollmentCreate(EnrollmentBase):
    pass

class EnrollmentResponse(EnrollmentBase):
    id: int
    enrolled_at: datetime
    student_name: Optional[str] = None
    course_title: Optional[str] = None
    course_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
