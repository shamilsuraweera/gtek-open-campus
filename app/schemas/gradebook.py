from pydantic import BaseModel
from typing import List

class AssessmentBase(BaseModel):
    course_id: int
    title: str
    max_score: float = 100.0
    weight: float = 1.0

class AssessmentCreate(AssessmentBase):
    pass

class AssessmentResponse(AssessmentBase):
    id: int
    class Config:
        from_attributes = True

class GradeBase(BaseModel):
    assessment_id: int
    student_id: int
    score: float
    feedback: str | None = None

class GradeCreate(GradeBase):
    pass

class GradeResponse(GradeBase):
    id: int
    audit_log: str | None = None
    class Config:
        from_attributes = True
