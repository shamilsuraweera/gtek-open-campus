import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import SessionLocal
from app.models.user import User
from app.models.student import Student
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.session import Session as CourseSession
from app.models.attendance import Attendance
from app.models.assessment import Assessment
from app.models.grade import Grade
from app.utils.security import get_password_hash

def seed():
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).filter(User.email == "admin@gtek.edu").first():
            print("Database already seeded!")
            return

        print("Seeding Users...")
        admin = User(email="admin@gtek.edu", hashed_password=get_password_hash("admin123"), role="admin")
        teacher1 = User(email="teacher1@gtek.edu", hashed_password=get_password_hash("teacher123"), role="teacher")
        teacher2 = User(email="teacher2@gtek.edu", hashed_password=get_password_hash("teacher123"), role="teacher")
        
        db.add_all([admin, teacher1, teacher2])
        db.commit()

        print("Seeding Students...")
        students = []
        for i in range(1, 11):
            u = User(email=f"student{i}@gtek.edu", hashed_password=get_password_hash("student123"), role="student")
            db.add(u)
            db.commit()
            db.refresh(u)
            
            s = Student(
                user_id=u.id, 
                first_name=f"First{i}", 
                last_name=f"Last{i}", 
                student_id_number=f"STU-2026-{i:03d}"
            )
            db.add(s)
            students.append(s)
        db.commit()

        print("Seeding Courses...")
        c1 = Course(teacher_id=teacher1.id, title="Introduction to Python", code="CS101", capacity=30, metadata_obj={"lab_required": True})
        c2 = Course(teacher_id=teacher1.id, title="Data Structures", code="CS201", capacity=30, metadata_obj={})
        c3 = Course(teacher_id=teacher2.id, title="Calculus I", code="MATH101", capacity=30, metadata_obj={})
        courses = [c1, c2, c3]
        db.add_all(courses)
        db.commit()

        print("Seeding Enrollments...")
        for s in students:
            for c in courses:
                # 80% chance to enroll
                if random.random() < 0.8:
                    db.add(Enrollment(student_id=s.id, course_id=c.id))
        db.commit()

        print("Seeding Sessions & Attendance...")
        now = datetime.now(timezone.utc)
        for c in courses:
            sess = CourseSession(course_id=c.id, start_time=now - timedelta(days=1), end_time=now - timedelta(days=1, hours=-2), location="Room 101")
            db.add(sess)
            db.commit()
            db.refresh(sess)
            
            enrollments = db.query(Enrollment).filter(Enrollment.course_id == c.id).all()
            for e in enrollments:
                status = random.choice(["Present", "Present", "Present", "Late", "Absent"])
                db.add(Attendance(session_id=sess.id, student_id=e.student_id, status=status, date=now))
        db.commit()

        print("Seeding Assessments & Grades...")
        for c in courses:
            a1 = Assessment(course_id=c.id, title="Midterm Exam", max_score=100.0, weight=0.4)
            a2 = Assessment(course_id=c.id, title="Final Exam", max_score=100.0, weight=0.6)
            db.add_all([a1, a2])
            db.commit()
            
            enrollments = db.query(Enrollment).filter(Enrollment.course_id == c.id).all()
            for e in enrollments:
                db.add(Grade(assessment_id=a1.id, student_id=e.student_id, score=random.uniform(60, 100), audit_log="System Seed"))
                db.add(Grade(assessment_id=a2.id, student_id=e.student_id, score=random.uniform(50, 100), audit_log="System Seed"))
        db.commit()

        print("Refreshing Materialized Views...")
        db.execute(text("REFRESH MATERIALIZED VIEW student_transcripts_mv"))
        db.execute(text("REFRESH MATERIALIZED VIEW attendance_rates_mv"))
        db.execute(text("REFRESH MATERIALIZED VIEW grade_distributions_mv"))
        db.commit()

        print("Database seeding completed successfully!")
        print("Login with admin@gtek.edu / admin123 to explore the Swagger UI.")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()

