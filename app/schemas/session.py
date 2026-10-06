from pydantic import BaseModel
from datetime import datetime

class SessionBase(BaseModel):
    course_id: int
    start_time: datetime
    end_time: datetime
    location: str | None = None

class SessionCreate(SessionBase):
    pass

class SessionResponse(SessionBase):
    id: int

    class Config:
        from_attributes = True
