from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_db, get_current_active_user
from app.models.student import Student
from app.models.user import User
from app.schemas.student import StudentCreate, StudentResponse

router = APIRouter(prefix="/students", tags=["students"])

@router.post("/", response_model=StudentResponse)
def create_student(student: StudentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db_student = db.query(Student).filter(Student.student_id_number == student.student_id_number).first()
    if db_student:
        raise HTTPException(status_code=400, detail="Student ID already exists")
        
    new_student = Student(**student.model_dump())
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return new_student

@router.get("/", response_model=List[StudentResponse])
def read_students(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    students = db.query(Student).offset(skip).limit(limit).all()
    return students
