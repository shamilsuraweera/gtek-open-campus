# Phase 1: Core Design & Schema

This document outlines the core architecture, data models, access controls, and database strategies for G-TEK Open Campus.

## 1. Entity-Relationship (ER) Diagram

The following Mermaid diagram maps out the relationships between Students, Courses, Enrollments, Sessions, Attendance, Assessments, and Grades.

```mermaid
erDiagram
    USER ||--o| STUDENT : "has profile"
    USER ||--o{ TEACHER : "has profile"
    COURSE ||--o{ ENROLLMENT : "has"
    STUDENT ||--o{ ENROLLMENT : "participates in"
    COURSE ||--o{ SESSION : "schedules"
    SESSION ||--o{ ATTENDANCE : "records"
    STUDENT ||--o{ ATTENDANCE : "has"
    COURSE ||--o{ ASSESSMENT : "defines"
    STUDENT ||--o{ GRADE : "receives"
    ASSESSMENT ||--o{ GRADE : "results in"
    TEACHER ||--o{ COURSE : "teaches"

    USER {
        int id PK
        string email
        string hashed_password
        string role "Admin, Teacher, Student"
    }
    
    STUDENT {
        int id PK
        int user_id FK
        string first_name
        string last_name
        string student_id_number
    }
    
    TEACHER {
        int id PK
        int user_id FK
        string first_name
        string last_name
        string department
    }
    
    COURSE {
        int id PK
        int teacher_id FK
        string title
        string code
        int capacity
        jsonb metadata "Syllabus, extra config"
    }
    
    ENROLLMENT {
        int id PK
        int student_id FK
        int course_id FK
        string status "Active, Dropped, Completed"
        date enrolled_at
    }
    
    SESSION {
        int id PK
        int course_id FK
        datetime start_time
        datetime end_time
        string location
    }
    
    ATTENDANCE {
        int id PK
        int session_id FK
        int student_id FK
        string status "Present, Absent, Late, Excused"
    }
    
    ASSESSMENT {
        int id PK
        int course_id FK
        string title
        int max_score
        float weight
    }
    
    GRADE {
        int id PK
        int assessment_id FK
        int student_id FK
        float score
        string feedback
    }
```

## 2. Role-Based Access Control (RBAC) Matrix

| Resource          | Admin                 | Teacher                            | Student                            |
|-------------------|-----------------------|------------------------------------|------------------------------------|
| **Users**         | Full CRUD             | Read-only (Students)               | Read/Update self                   |
| **Courses**       | Full CRUD             | CRUD (Owned courses)               | Read-only                          |
| **Enrollments**   | Full CRUD             | Read-only (Owned courses)          | Read-only (Own enrollments)        |
| **Sessions**      | Full CRUD             | CRUD (Owned courses)               | Read-only (Enrolled courses)       |
| **Attendance**    | Full CRUD             | CRUD (Owned courses)               | Read-only (Own attendance)         |
| **Assessments**   | Full CRUD             | CRUD (Owned courses)               | Read-only (Enrolled courses)       |
| **Grades**        | Full CRUD             | CRUD (Owned courses)               | Read-only (Own grades)             |

## 3. PostgreSQL Advanced Features Plan

To support the Odoo-style modularity and high performance at scale, we will leverage the following Postgres features:

- **JSONB Columns:** 
  - Used in `Course` for custom dynamic fields (e.g., specific prerequisites, lab requirements) without needing schema migrations.
  - Used in `User` or `Student` for flexible profile attributes.
- **Table Partitioning:**
  - `Attendance` records grow very fast (Students × Sessions). We will implement **List Partitioning by Academic Year** or **Range Partitioning by Date** to ensure query speeds remain fast during bulk attendance imports.
- **Materialized Views:**
  - Will be used to calculate running aggregations like **Student GPA** or **Course Grade Distributions**. These will be refreshed concurrently on a schedule or via triggers to avoid heavy calculation on API reads.

## 4. API Contract & OpenAPI Strategy

Rather than manually writing a YAML OpenAPI spec, FastAPI will auto-generate it. Our contract strategy:

1. **Auth:** `POST /api/v1/auth/login` (Returns JWT)
2. **Students:** `GET /api/v1/students/me`, `GET /api/v1/students`
3. **Courses:** `GET /api/v1/courses`, `POST /api/v1/courses/{id}/enroll`
4. **Attendance:** `POST /api/v1/sessions/{id}/attendance/bulk` (Accepts list of student statuses)
5. **Grades:** `GET /api/v1/students/{id}/transcript`

*All endpoints will use Pydantic V2 schemas for strict I/O validation and automatic documentation generation.*

