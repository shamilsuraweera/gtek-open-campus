from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from app.api.deps import get_db, get_current_active_user
from app.models.assessment import Assessment
from app.models.grade import Grade
from app.models.user import User
from app.schemas.gradebook import AssessmentCreate, AssessmentResponse, GradeCreate, GradeResponse

router = APIRouter(prefix="/gradebook", tags=["gradebook"])

@router.post("/assessments", response_model=AssessmentResponse)
def create_assessment(assessment: AssessmentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    new_assessment = Assessment(**assessment.model_dump())
    db.add(new_assessment)
    db.commit()
    db.refresh(new_assessment)
    return new_assessment

@router.post("/grades", response_model=GradeResponse)
def submit_grade(grade: GradeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    new_grade = Grade(
        **grade.model_dump(),
        audit_log=f"Graded by {current_user.email}"
    )
    db.add(new_grade)
    db.commit()
    db.refresh(new_grade)
    return new_grade

@router.post("/refresh-transcripts")
def refresh_transcripts(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    db.execute(text("REFRESH MATERIALIZED VIEW student_transcripts_mv"))
    db.commit()
    return {"message": "Materialized view refreshed"}

@router.get("/transcript/{student_id}")
def get_transcript(student_id: int, db: Session = Depends(get_db)):
    result = db.execute(text("SELECT course_id, final_score FROM student_transcripts_mv WHERE student_id = :sid"), {"sid": student_id}).fetchall()
    
    courses = []
    total_score = 0
    for row in result:
        score = row.final_score or 0
        letter = "A" if score >= 90 else "B" if score >= 80 else "C" if score >= 70 else "F"
        courses.append({"course_id": row.course_id, "final_score": round(score, 2), "letter_grade": letter})
        total_score += score
        
    gpa = (total_score / len(courses) / 25.0) if courses else 0.0
    
    return {
        "student_id": student_id,
        "gpa": round(gpa, 2),
        "courses": courses
    }
