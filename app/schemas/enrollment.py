from pydantic import BaseModel
from datetime import datetime

class EnrollmentBase(BaseModel):
    student_id: int
    course_id: int
    status: str = "Active"

class EnrollmentCreate(EnrollmentBase):
    pass

class EnrollmentResponse(EnrollmentBase):
    id: int
    enrolled_at: datetime

    class Config:
        from_attributes = True

