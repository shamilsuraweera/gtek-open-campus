from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
from app.api.deps import get_db, get_current_active_user
from app.models.attendance import Attendance
from app.models.user import User
from app.schemas.attendance import AttendanceResponse, BulkAttendanceCreate

router = APIRouter(prefix="/attendance", tags=["attendance"])

@router.post("/bulk", response_model=dict)
def bulk_mark_attendance(
    payload: BulkAttendanceCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    now = datetime.now(timezone.utc)
    inserts = []
    for rec in payload.records:
        inserts.append(
            Attendance(
                session_id=payload.session_id,
                student_id=rec["student_id"],
                status=rec["status"],
                date=now,
                audit_notes=f"Logged by {current_user.email}"
            )
        )
    
    db.add_all(inserts)
    db.commit()
    return {"message": f"Successfully logged {len(inserts)} attendance records."}

@router.get("/session/{session_id}", response_model=List[AttendanceResponse])
def get_attendance_for_session(session_id: int, db: Session = Depends(get_db)):
    return db.query(Attendance).filter(Attendance.session_id == session_id).all()
