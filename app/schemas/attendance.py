from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Dict, Any, Optional

class AttendanceBase(BaseModel):
    session_id: int
    student_id: int
    status: str
    audit_notes: Optional[str] = None

class AttendanceCreate(AttendanceBase):
    pass

class BulkAttendanceCreate(BaseModel):
    session_id: int
    records: List[Dict[str, Any]] # [{"student_id": 1, "status": "Present"}]

class AttendanceResponse(AttendanceBase):
    id: int
    date: datetime

    model_config = ConfigDict(from_attributes=True)
