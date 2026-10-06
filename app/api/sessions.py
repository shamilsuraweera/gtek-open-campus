from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.api.deps import get_db, get_current_active_user
from app.models.session import Session as DBSession
from app.models.attendance import Attendance
from app.models.user import User
from app.schemas.session import SessionCreate, SessionResponse

router = APIRouter(prefix="/sessions", tags=["sessions"])

@router.post("/", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    session: SessionCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    new_session = DBSession(**session.model_dump())
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session

@router.get("/", response_model=List[SessionResponse])
def get_sessions(
    course_id: Optional[int] = None,
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    query = db.query(DBSession)
    if course_id:
        query = query.filter(DBSession.course_id == course_id)
    return query.order_by(DBSession.start_time.desc()).offset(skip).limit(limit).all()

@router.delete("/{session_id}", status_code=status.HTTP_200_OK)
def delete_session(
    session_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    sess = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
        
    db.query(Attendance).filter(Attendance.session_id == session_id).delete()
    db.delete(sess)
    db.commit()
    return {"message": f"Session #{session_id} successfully deleted"}
