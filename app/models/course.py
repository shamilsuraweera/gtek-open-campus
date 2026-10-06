from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    code = Column(String(50), unique=True, index=True, nullable=False)
    capacity = Column(Integer, default=30)
    metadata_obj = Column(JSONB, default=dict)

    teacher = relationship("User")
