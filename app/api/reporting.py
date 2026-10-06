from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.schemas.reporting import AttendanceRate, GradeDistribution
from app.services.notifications import NotificationService

router = APIRouter(prefix="/reporting", tags=["reporting"])

@router.post("/refresh-views")
def refresh_materialized_views(background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
        
    def run_refreshes():
        with db.bind.connect() as conn:
            conn.execute(text("REFRESH MATERIALIZED VIEW attendance_rates_mv"))
            conn.execute(text("REFRESH MATERIALIZED VIEW grade_distributions_mv"))
            conn.commit()
            
    background_tasks.add_task(run_refreshes)
    return {"message": "Materialized views refresh triggered in background"}

@router.get("/attendance-rates", response_model=List[AttendanceRate])
def get_attendance_rates(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    result = db.execute(text("SELECT course_id, total_sessions, present_count, attendance_rate FROM attendance_rates_mv")).fetchall()
    return [AttendanceRate(course_id=row.course_id, total_sessions=row.total_sessions, present_count=row.present_count, attendance_rate=float(row.attendance_rate or 0)) for row in result]

@router.get("/grade-distributions", response_model=List[GradeDistribution])
def get_grade_distributions(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    result = db.execute(text("SELECT course_id, average_score, max_score, min_score FROM grade_distributions_mv")).fetchall()
    return [GradeDistribution(course_id=row.course_id, average_score=float(row.average_score or 0), max_score=float(row.max_score or 0), min_score=float(row.min_score or 0)) for row in result]

@router.post("/notify-low-attendance")
def trigger_low_attendance_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
        
    NotificationService.send_email(to="student@example.com", subject="Low Attendance Warning", body="Your attendance is below 70%. Please see administration.")
    NotificationService.send_sms(to="+15555555555", message="GTEK: Your attendance has dropped below 70%.")
    return {"message": "Notifications dispatched"}
