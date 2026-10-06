from pydantic import BaseModel, ConfigDict
from typing import Optional, List

class AssessmentBase(BaseModel):
    course_id: int
    title: str
    max_score: float = 100.0
    weight: float = 1.0

class AssessmentCreate(AssessmentBase):
    pass

class AssessmentResponse(AssessmentBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)

class GradeBase(BaseModel):
    assessment_id: int
    student_id: int
    score: float
    feedback: Optional[str] = None

class GradeCreate(GradeBase):
    pass

class GradeResponse(GradeBase):
    id: int
    audit_log: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)
