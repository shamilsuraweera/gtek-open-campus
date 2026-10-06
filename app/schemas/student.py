from pydantic import BaseModel, ConfigDict
from typing import Optional
from app.schemas.user import UserResponse

class StudentBase(BaseModel):
    first_name: str
    last_name: str
    student_id_number: str

class StudentCreate(StudentBase):
    user_id: Optional[int] = None
    email: Optional[str] = None
    password: Optional[str] = None

class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    student_id_number: Optional[str] = None

class StudentResponse(StudentBase):
    id: int
    user: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)
