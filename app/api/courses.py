from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_db, get_current_active_user
from app.models.course import Course
from app.models.user import User
from app.schemas.course import CourseCreate, CourseResponse

router = APIRouter(prefix="/courses", tags=["courses"])

@router.post("/", response_model=CourseResponse)
def create_course(course: CourseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    db_course = db.query(Course).filter(Course.code == course.code).first()
    if db_course:
        raise HTTPException(status_code=400, detail="Course code already exists")
        
    new_course = Course(**course.model_dump(), teacher_id=current_user.id)
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return new_course

@router.get("/", response_model=List[CourseResponse])
def read_courses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    courses = db.query(Course).offset(skip).limit(limit).all()
    return courses
