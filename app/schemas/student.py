from pydantic import BaseModel
from app.schemas.user import UserResponse

class StudentBase(BaseModel):
    first_name: str
    last_name: str
    student_id_number: str

class StudentCreate(StudentBase):
    user_id: int

class StudentResponse(StudentBase):
    id: int
    user: UserResponse

    class Config:
        from_attributes = True
