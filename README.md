# G-TEK Open Campus

G-TEK Open Campus is a modular school management system built with Python, FastAPI, SQLAlchemy, and PostgreSQL. It features Odoo‑style architecture, JSONB‑powered flexibility, Alembic migrations, and clean domain models for students, courses, enrollment, attendance, and grading—designed as a full learning project from scratch.

## Tech Stack
- **Framework:** FastAPI
- **Database:** PostgreSQL
- **ORM:** SQLAlchemy 2.0
- **Migrations:** Alembic
- **Server:** Uvicorn
- **Python Version:** 3.11+

## Project Structure
```text
.
├── alembic/            # Database migrations directory
├── app/
│   ├── api/            # API endpoints/routers
│   ├── db/             # Database connection and session management
│   ├── models/         # SQLAlchemy ORM models
│   ├── schemas/        # Pydantic models for request/response validation
│   ├── services/       # Business logic and complex operations
│   ├── utils/          # Utility functions
│   ├── config.py       # Application settings and environment variables
│   └── main.py         # FastAPI application entry point
├── .env.example        # Example environment variables file
├── alembic.ini         # Alembic configuration
├── requirements.txt    # Python dependencies
└── tasks.md            # Project roadmap and task breakdown
```

## How to Run

### 1. Prerequisites
- Python 3.11 or higher
- PostgreSQL server running locally or remotely

### 2. Database Setup
Create a new database in PostgreSQL for the project:
```sql
CREATE DATABASE "gtek-open-campus";
```

### 3. Environment Setup
Create a virtual environment and install dependencies:

```bash
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 4. Configuration
Copy the sample environment file and adjust it as needed:

```bash
# On Windows (Command Prompt):
copy .env.example .env
# On Windows (PowerShell):
cp .env.example .env
# On macOS/Linux:
cp .env.example .env
```
Open `.env` and update the `DATABASE_URL` with your PostgreSQL credentials:
```env
DATABASE_URL=postgresql://<USERNAME>:<PASSWORD>@localhost:5432/gtek-open-campus
```

### 5. Run Database Migrations
Since the project uses Alembic for database migrations, you'll need to generate and apply the initial migration to create the tables (like the `users` table).

Generate the initial migration:
```bash
alembic revision --autogenerate -m "Initial migration"
```

Apply the migration to the database:
```bash
alembic upgrade head
```

### 6. Start the Server
Run the FastAPI application using Uvicorn:

```bash
uvicorn app.main:app --reload
```

The API should now be running at [http://127.0.0.1:8000](http://127.0.0.1:8000).

### 7. API Documentation
FastAPI automatically generates interactive API documentation. Once the server is running, you can access:
- **Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

