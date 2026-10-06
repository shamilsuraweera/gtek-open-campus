from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class SessionBase(BaseModel):
    course_id: int
    start_time: datetime
    end_time: datetime
    location: Optional[str] = None

class SessionCreate(SessionBase):
    pass

class SessionResponse(SessionBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
