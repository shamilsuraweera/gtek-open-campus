from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import csv
import io

from app.api.deps import get_db, get_current_active_user
from app.models.enrollment import Enrollment
from app.models.course import Course
from app.models.student import Student
from app.models.user import User
from app.schemas.enrollment import EnrollmentCreate, EnrollmentResponse

router = APIRouter(prefix="/enrollments", tags=["enrollments"])

@router.post("/", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
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
        raise HTTPException(status_code=400, detail="Student is already enrolled in this course")

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
    
    # Enrich response
    return EnrollmentResponse(
        id=new_enrollment.id,
        student_id=new_enrollment.student_id,
        course_id=new_enrollment.course_id,
        status=new_enrollment.status,
        enrolled_at=new_enrollment.enrolled_at,
        student_name=f"{student.first_name} {student.last_name}",
        course_title=course.title,
        course_code=course.code
    )

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
            
        existing = db.query(Enrollment).filter_by(student_id=student_id, course_id=course_id).first()
        if existing:
            continue
            
        new_enroll = Enrollment(student_id=student_id, course_id=course_id)
        db.add(new_enroll)
        success_count += 1
        
    db.commit()
    return {"message": "Bulk import complete", "success_count": success_count, "errors": errors}

@router.get("/", response_model=List[EnrollmentResponse])
def get_enrollments(
    course_id: Optional[int] = None,
    student_id: Optional[int] = None,
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    query = db.query(Enrollment, Student, Course).join(Student, Enrollment.student_id == Student.id).join(Course, Enrollment.course_id == Course.id)
    if course_id:
        query = query.filter(Enrollment.course_id == course_id)
    if student_id:
        query = query.filter(Enrollment.student_id == student_id)
        
    results = query.offset(skip).limit(limit).all()
    out = []
    for enr, stu, crs in results:
        out.append(EnrollmentResponse(
            id=enr.id,
            student_id=enr.student_id,
            course_id=enr.course_id,
            status=enr.status,
            enrolled_at=enr.enrolled_at,
            student_name=f"{stu.first_name} {stu.last_name}",
            course_title=crs.title,
            course_code=crs.code
        ))
    return out

@router.delete("/{enrollment_id}", status_code=status.HTTP_200_OK)
def delete_enrollment(
    enrollment_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
        
    db.delete(enrollment)
    db.commit()
    return {"message": f"Enrollment #{enrollment_id} successfully deleted"}
