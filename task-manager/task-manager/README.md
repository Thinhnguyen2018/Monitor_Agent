# GreenNode Task Manager

A full-stack task management app with Kanban board and quarterly roadmap views.

**Stack:** FastAPI · SQLAlchemy · PostgreSQL · React · Vite · TypeScript · @dnd-kit

---

## Run locally (without Docker)

### 1. Start PostgreSQL

Make sure PostgreSQL is running locally and create the database:

```bash
psql -U postgres -c "CREATE DATABASE taskmanager;"
```

### 2. Backend

```bash
cd task-manager/backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt

# Copy and edit the env file
cp .env.example .env

uvicorn main:app --reload --port 8000
```

The API will be available at http://localhost:8000.
Interactive docs: http://localhost:8000/docs

### 3. Seed sample data

```bash
curl -X POST http://localhost:8000/seed
```

Or click the **Seed data** button in the UI.

### 4. Frontend

```bash
cd task-manager/frontend
npm install
npm run dev
```

App opens at http://localhost:3000. Requests to `/api/*` are proxied to the backend.

---

## Run with Docker Compose

```bash
cd task-manager
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- PostgreSQL: localhost:5432

Seed data after startup:

```bash
curl -X POST http://localhost:8000/seed
```

---

## Features

| Feature | Details |
|---|---|
| Board view | 3-column Kanban (Pending / In Progress / Done), drag & drop cards between columns |
| Roadmap view | Quarter grid (Q1–Q4 2026), colored bars per module, click to cycle status |
| Task modal | Create/edit with title, module, status, quarter, assignee, deadline, description |
| Filter bar | Filter by module, status; full-text search by title |
| Seed endpoint | `POST /seed` inserts 15 GreenNode AI Lab sample tasks |

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | /tasks | List all tasks |
| POST | /tasks | Create a task |
| PATCH | /tasks/{id} | Partial update |
| DELETE | /tasks/{id} | Delete a task |
| POST | /seed | Insert sample data |
