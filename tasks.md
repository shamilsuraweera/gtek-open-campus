# Project: G-TEK Open Campus

## Task Breakdown & Timeline

### Phase 0 — Project Setup (Days 1–3)

    Goal: create reproducible dev environment and project skeleton.

    Steps: initialize Git repo; create README, license, and issue tracker; set up Python 3.11, virtualenv, Docker dev compose with Postgres; add pre-commit, linters, and basic CI pipeline.

    Deliverables: working Docker Compose, CI stub, branch strategy.

### Phase 1 — Core Design & Schema (Days 4–10)

    Goal: finalize ER model, API contract, and security model.

    Steps: produce ER diagram for Student, Course, Enrollment, Session, Attendance, Assessment, Grade; define JSON schemas for REST endpoints; design RBAC roles and permissions matrix; decide Postgres features (JSONB fields, attendance partitioning, materialized views).

    Deliverables: ER diagram, OpenAPI spec, RBAC matrix, migration plan.

### Phase 2 — Foundation Sprint (Sprint 1, 2 weeks)

    Goal: authentication, user model, Student and Course CRUD.

    Steps: implement JWT auth, user roles, SQLAlchemy models, Alembic migrations, basic repository layer, service layer with business rules, and simple HTML/JS forms for Student/Course.

    Deliverables: auth endpoints, Student/Course CRUD, unit tests for models, migration scripts.

### Phase 3 — Enrollment & Transactions (Sprint 2, 2 weeks)

    Goal: robust enrollment flows and transactional integrity.

    Steps: implement Enrollment model and service; enforce capacity and prerequisites in transactions; add optimistic locking or DB constraints; create enrollment REST endpoints and tests; add CSV import for bulk enrollments.

    Deliverables: enrollment API, transactional tests, import tool.

### Phase 4 — Sessions & Attendance (Sprint 3, 2 weeks)

    Goal: session scheduling, attendance capture, and partitioning.

    Steps: implement Session and Attendance models; add bulk marking UI and CSV/QR import; implement Postgres partitioning strategy for Attendance; create indexes and sample queries; add audit logging for attendance changes.

    Deliverables: attendance UI, partitioned tables, performance checklist.

### Phase 5 — Assessments & Gradebook (Sprint 4, 2 weeks)

    Goal: assessments, grade entry, and aggregation.

    Steps: implement Assessment and Grade models; compute weighted averages in service layer and as a materialized view; add transcript export endpoint; secure grade edits with audit trail.

    Deliverables: gradebook UI, materialized view for transcripts, export endpoint.

### Phase 6 — Reporting, Notifications, and Ops (Sprint 5, 2 weeks)

    Goal: dashboards, notifications, backups, and monitoring.

    Steps: build materialized views for attendance rates and grade distributions; implement scheduled refresh jobs; add email/SMS notification stubs; configure backups, restore test, and slow‑query logging; finalize CI/CD and Docker image build.

    Deliverables: dashboards, notification service, backup/restore runbook.

### Phase 7 — Testing, Security Audit, Launch (Week 11)

    Goal: harden system and prepare for production.

    Steps: run integration tests against a staging DB, perform role‑based access tests, run load test on attendance import, perform security checklist (HTTPS, secrets management, encrypted backups), finalize documentation and user guides.

    Deliverables: test reports, security checklist, deployment playbook.

### Ongoing Maintenance & Roadmap

    Tasks: schedule materialized view refreshes, rotate backups, monitor slow queries, iterate features (parent portal, mobile UI).

    Key metrics: backup success rate, API error rate, average attendance import time.
