from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.api.deps import get_db, get_current_active_user
from app.models.student import Student
from app.models.user import User
from app.schemas.student import StudentCreate, StudentUpdate, StudentResponse
from app.utils.security import get_password_hash

router = APIRouter(prefix="/students", tags=["students"])

@router.post("/", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    student_in: StudentCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin permissions required to register students")
    
    # Check if student ID number exists
    existing = db.query(Student).filter(Student.student_id_number == student_in.student_id_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student ID number already exists")
    
    user_id = student_in.user_id
    if not user_id:
        # Auto-create user account if email is provided
        email = student_in.email or f"{student_in.student_id_number.lower()}@gtek.edu"
        user_exists = db.query(User).filter(User.email == email).first()
        if user_exists:
            user_id = user_exists.id
        else:
            raw_password = student_in.password or "student123"
            new_user = User(
                email=email,
                hashed_password=get_password_hash(raw_password),
                role="student",
                is_active=True
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            user_id = new_user.id
            
    new_student = Student(
        user_id=user_id,
        first_name=student_in.first_name,
        last_name=student_in.last_name,
        student_id_number=student_in.student_id_number
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return new_student

@router.get("/", response_model=List[StudentResponse])
def read_students(
    skip: int = 0, 
    limit: int = 100, 
    search: Optional[str] = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Student)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Student.first_name.ilike(search_filter)) |
            (Student.last_name.ilike(search_filter)) |
            (Student.student_id_number.ilike(search_filter))
        )
    return query.offset(skip).limit(limit).all()

@router.get("/{student_id}", response_model=StudentResponse)
def get_student(
    student_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

@router.put("/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: int, 
    student_in: StudentUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin permissions required")
        
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    if student_in.first_name is not None:
        student.first_name = student_in.first_name
    if student_in.last_name is not None:
        student.last_name = student_in.last_name
    if student_in.student_id_number is not None:
        # verify uniqueness
        clash = db.query(Student).filter(
            Student.student_id_number == student_in.student_id_number,
            Student.id != student_id
        ).first()
        if clash:
            raise HTTPException(status_code=400, detail="Student ID number already in use")
        student.student_id_number = student_in.student_id_number
        
    db.commit()
    db.refresh(student)
    return student

@router.delete("/{student_id}", status_code=status.HTTP_200_OK)
def delete_student(
    student_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin permissions required")
        
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # Delete associated records safely (grades, enrollments, attendance)
    from app.models.enrollment import Enrollment
    from app.models.grade import Grade
    from app.models.attendance import Attendance
    
    db.query(Grade).filter(Grade.student_id == student_id).delete()
    db.query(Enrollment).filter(Enrollment.student_id == student_id).delete()
    db.query(Attendance).filter(Attendance.student_id == student_id).delete()
    db.delete(student)
    db.commit()
    return {"message": f"Student #{student_id} successfully deleted"}
