from pydantic import BaseModel
from datetime import datetime
from typing import List, Dict, Any

class AttendanceBase(BaseModel):
    session_id: int
    student_id: int
    status: str
    audit_notes: str | None = None

class AttendanceCreate(AttendanceBase):
    pass

class BulkAttendanceCreate(BaseModel):
    session_id: int
    records: List[Dict[str, Any]] # [{"student_id": 1, "status": "Present"}]

class AttendanceResponse(AttendanceBase):
    id: int
    date: datetime

    class Config:
        from_attributes = True
