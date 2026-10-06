from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import csv
import io

from app.api.deps import get_db, get_current_active_user
from app.models.enrollment import Enrollment
from app.models.course import Course
from app.models.student import Student
from app.models.user import User
from app.schemas.enrollment import EnrollmentCreate, EnrollmentResponse

router = APIRouter(prefix="/enrollments", tags=["enrollments"])

@router.post("/", response_model=EnrollmentResponse)
def create_enrollment(
    enrollment: EnrollmentCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Transactional integrity: Lock the course row to check capacity safely
    course = db.query(Course).filter(Course.id == enrollment.course_id).with_for_update().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    student = db.query(Student).filter(Student.id == enrollment.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Check if already enrolled
    existing = db.query(Enrollment).filter(
        Enrollment.student_id == enrollment.student_id, 
        Enrollment.course_id == enrollment.course_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student already enrolled in this course")

    # Check capacity
    current_enrollments = db.query(func.count(Enrollment.id)).filter(
        Enrollment.course_id == enrollment.course_id,
        Enrollment.status == "Active"
    ).scalar()

    if current_enrollments >= course.capacity:
        raise HTTPException(status_code=400, detail="Course capacity reached")

    new_enrollment = Enrollment(
        student_id=enrollment.student_id,
        course_id=enrollment.course_id,
        status=enrollment.status
    )
    db.add(new_enrollment)
    db.commit()
    db.refresh(new_enrollment)
    return new_enrollment

@router.post("/bulk-import")
def bulk_import_enrollments(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
        
    content = file.file.read().decode("utf-8")
    csv_reader = csv.DictReader(io.StringIO(content))
    
    success_count = 0
    errors = []
    
    for row_num, row in enumerate(csv_reader, start=1):
        try:
            student_id = int(row.get("student_id", 0))
            course_id = int(row.get("course_id", 0))
        except ValueError:
            errors.append(f"Row {row_num}: Invalid IDs")
            continue
            
        if not student_id or not course_id:
            errors.append(f"Row {row_num}: Missing student_id or course_id")
            continue
            
        # Basic check
        existing = db.query(Enrollment).filter_by(student_id=student_id, course_id=course_id).first()
        if existing:
            continue
            
        new_enroll = Enrollment(student_id=student_id, course_id=course_id)
        db.add(new_enroll)
        success_count += 1
        
    db.commit()
    return {"message": "Bulk import complete", "success_count": success_count, "errors": errors}

@router.get("/", response_model=List[EnrollmentResponse])
def get_enrollments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Enrollment).offset(skip).limit(limit).all()

