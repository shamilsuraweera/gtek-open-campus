from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.api.deps import get_db, get_current_active_user
from app.models.course import Course
from app.models.user import User
from app.models.enrollment import Enrollment
from app.models.session import Session as DBSession
from app.schemas.course import CourseCreate, CourseUpdate, CourseResponse

router = APIRouter(prefix="/courses", tags=["courses"])

@router.post("/", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    course: CourseCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Admin or Teacher permissions required")
        
    db_course = db.query(Course).filter(Course.code == course.code).first()
    if db_course:
        raise HTTPException(status_code=400, detail="Course code already exists")
        
    teacher_id = course.teacher_id if (course.teacher_id and current_user.role == "admin") else current_user.id
    new_course = Course(
        title=course.title,
        code=course.code,
        capacity=course.capacity,
        metadata_obj=course.metadata_obj,
        teacher_id=teacher_id
    )
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return new_course

@router.get("/", response_model=List[CourseResponse])
def read_courses(
    skip: int = 0, 
    limit: int = 100, 
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Course)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Course.title.ilike(search_filter)) |
            (Course.code.ilike(search_filter))
        )
    return query.offset(skip).limit(limit).all()

@router.get("/{course_id}", response_model=CourseResponse)
def get_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

@router.put("/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: int, 
    course_in: CourseUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    if current_user.role == "teacher" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot edit course you do not teach")

    if course_in.title is not None:
        course.title = course_in.title
    if course_in.code is not None:
        clash = db.query(Course).filter(Course.code == course_in.code, Course.id != course_id).first()
        if clash:
            raise HTTPException(status_code=400, detail="Course code already in use")
        course.code = course_in.code
    if course_in.capacity is not None:
        course.capacity = course_in.capacity
    if course_in.metadata_obj is not None:
        course.metadata_obj = course_in.metadata_obj
    if course_in.teacher_id is not None and current_user.role == "admin":
        course.teacher_id = course_in.teacher_id

    db.commit()
    db.refresh(course)
    return course

@router.delete("/{course_id}", status_code=status.HTTP_200_OK)
def delete_course(
    course_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin permissions required to delete courses")
        
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    # Clean up enrollments and sessions
    db.query(Enrollment).filter(Enrollment.course_id == course_id).delete()
    db.query(DBSession).filter(DBSession.course_id == course_id).delete()
    db.delete(course)
    db.commit()
    return {"message": f"Course '{course.title}' successfully deleted"}
