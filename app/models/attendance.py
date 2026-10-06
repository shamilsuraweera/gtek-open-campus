from sqlalchemy import Column, Integer, String, DateTime
from app.db.base import Base
from datetime import datetime, timezone

class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (
        {'postgresql_partition_by': 'RANGE (date)'},
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(DateTime, primary_key=True, default=lambda: datetime.now(timezone.utc))
    session_id = Column(Integer, nullable=False, index=True)
    student_id = Column(Integer, nullable=False, index=True)
    status = Column(String(50), nullable=False) # Present, Absent, Late
    audit_notes = Column(String(255))
