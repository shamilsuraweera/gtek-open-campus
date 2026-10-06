from pydantic import BaseModel

class AttendanceRate(BaseModel):
    course_id: int
    total_sessions: int
    present_count: int
    attendance_rate: float

class GradeDistribution(BaseModel):
    course_id: int
    average_score: float
    max_score: float
    min_score: float
