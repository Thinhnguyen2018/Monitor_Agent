from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import sqlalchemy
from sqlalchemy import text, func, Integer as SAInteger
from typing import List
import os, json, httpx
import models, schemas
from database import engine, get_db, Base
from auth import get_current_org, get_current_user_id

Base.metadata.create_all(bind=engine)

# Auto-migrate: add new columns to existing tables
with engine.connect() as conn:
    migrations = [
        ("tasks", "month", "INTEGER"),
        ("tasks", "week", "INTEGER"),
        ("tasks", "meeting_note_id", "INTEGER"),
        ("tasks", "org_id", "INTEGER"),
        ("comments", "org_id", "INTEGER"),
        ("meeting_notes", "org_id", "INTEGER"),
    ]
    for table, col, coltype in migrations:
        try:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {coltype}"))
        except Exception:
            pass

    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS meeting_notes (
            id SERIAL PRIMARY KEY,
            org_id INTEGER,
            week_label VARCHAR(50) NOT NULL,
            content TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS organizations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            slug VARCHAR(100) NOT NULL UNIQUE,
            owner_clerk_user_id VARCHAR(200) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS org_members (
            id SERIAL PRIMARY KEY,
            org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            clerk_user_id VARCHAR(200) NOT NULL,
            role VARCHAR(20) NOT NULL DEFAULT 'member',
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS subtasks (
            id SERIAL PRIMARY KEY,
            task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            title VARCHAR(300) NOT NULL,
            completed BOOLEAN NOT NULL DEFAULT FALSE,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS task_activities (
            id SERIAL PRIMARY KEY,
            task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            field VARCHAR(50) NOT NULL,
            old_value TEXT,
            new_value TEXT,
            actor VARCHAR(200),
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """))
    conn.commit()

GREENNODE_URL = "https://maas-llm-aiplatform-hcm.api.vngcloud.vn/v1/chat/completions"
GREENNODE_MODEL = "minimax/minimax-m2.5"

app = FastAPI(title="TaskFlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Organization ──────────────────────────────────────────────

@app.get("/org", response_model=schemas.OrgOut)
def get_org(org: models.Organization = Depends(get_current_org)):
    return org

@app.patch("/org", response_model=schemas.OrgOut)
def update_org(
    data: schemas.OrgUpdate,
    org: models.Organization = Depends(get_current_org),
    db: Session = Depends(get_db),
):
    if data.name:
        org.name = data.name
    db.commit()
    db.refresh(org)
    return org

@app.get("/org/members", response_model=List[schemas.OrgMemberOut])
def get_members(
    org: models.Organization = Depends(get_current_org),
    db: Session = Depends(get_db),
):
    return db.query(models.OrgMember).filter(models.OrgMember.org_id == org.id).all()

@app.post("/org/members", response_model=schemas.OrgMemberOut)
def invite_member(
    data: schemas.InviteMember,
    org: models.Organization = Depends(get_current_org),
    db: Session = Depends(get_db),
):
    existing = db.query(models.OrgMember).filter(
        models.OrgMember.org_id == org.id,
        models.OrgMember.clerk_user_id == data.clerk_user_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Member already exists")
    member = models.OrgMember(org_id=org.id, clerk_user_id=data.clerk_user_id, role=data.role)
    db.add(member)
    db.commit()
    db.refresh(member)
    return member

# ── Tasks ─────────────────────────────────────────────────────

@app.get("/tasks", response_model=List[schemas.TaskOut])
def get_tasks(
    org: models.Organization = Depends(get_current_org),
    db: Session = Depends(get_db),
):
    tasks = db.query(models.Task).filter(
        (models.Task.org_id == org.id) | (models.Task.org_id == None)
    ).all()

    # attach subtask counts in one query
    task_ids = [t.id for t in tasks]
    if task_ids:
        rows = (
            db.query(
                models.Subtask.task_id,
                func.count(models.Subtask.id).label("total"),
                func.sum(models.Subtask.completed.cast(SAInteger)).label("done"),
            )
            .filter(models.Subtask.task_id.in_(task_ids))
            .group_by(models.Subtask.task_id)
            .all()
        )
        counts = {r.task_id: (r.done or 0, r.total) for r in rows}
        for t in tasks:
            t.subtask_done, t.subtask_total = counts.get(t.id, (0, 0))

    return tasks

@app.post("/tasks", response_model=schemas.TaskOut)
def create_task(
    task: schemas.TaskCreate,
    org: models.Organization = Depends(get_current_org),
    db: Session = Depends(get_db),
):
    db_task = models.Task(**task.model_dump(), org_id=org.id)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

TRACKED_FIELDS = {"status", "assignee", "title", "deadline", "module", "quarter", "description"}

@app.patch("/tasks/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: int,
    task: schemas.TaskUpdate,
    org: models.Organization = Depends(get_current_org),
    db: Session = Depends(get_db),
    actor: str = Depends(get_current_user_id),
):
    db_task = db.query(models.Task).filter(
        models.Task.id == task_id,
        (models.Task.org_id == org.id) | (models.Task.org_id == None)
    ).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    updates = task.model_dump(exclude_unset=True)
    for key, value in updates.items():
        if key in TRACKED_FIELDS:
            old_val = str(getattr(db_task, key)) if getattr(db_task, key) is not None else None
            new_val = str(value) if value is not None else None
            if old_val != new_val:
                db.add(models.TaskActivity(
                    task_id=task_id, field=key,
                    old_value=old_val, new_value=new_val, actor=actor
                ))
        setattr(db_task, key, value)
    if db_task.org_id is None:
        db_task.org_id = org.id
    db.commit()
    db.refresh(db_task)
    return db_task

@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(
    task_id: int,
    org: models.Organization = Depends(get_current_org),
    db: Session = Depends(get_db),
):
    db_task = db.query(models.Task).filter(
        models.Task.id == task_id,
        (models.Task.org_id == org.id) | (models.Task.org_id == None)
    ).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(db_task)
    db.commit()

# ── Comments ──────────────────────────────────────────────────

@app.get("/tasks/{task_id}/comments", response_model=List[schemas.CommentOut])
def get_comments(
    task_id: int,
    org: models.Organization = Depends(get_current_org),
    db: Session = Depends(get_db),
):
    return db.query(models.Comment).filter(
        models.Comment.task_id == task_id
    ).order_by(models.Comment.created_at).all()

@app.post("/tasks/{task_id}/comments", response_model=schemas.CommentOut)
def create_comment(
    task_id: int,
    comment: schemas.CommentCreate,
    org: models.Organization = Depends(get_current_org),
    db: Session = Depends(get_db),
):
    db_comment = models.Comment(task_id=task_id, org_id=org.id, **comment.model_dump())
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment

@app.delete("/comments/{comment_id}", status_code=204)
def delete_comment(
    comment_id: int,
    org: models.Organization = Depends(get_current_org),
    db: Session = Depends(get_db),
):
    db_comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not db_comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    db.delete(db_comment)
    db.commit()

# ── Subtasks ──────────────────────────────────────────────────

@app.get("/tasks/{task_id}/subtasks", response_model=List[schemas.SubtaskOut])
def get_subtasks(
    task_id: int,
    org: models.Organization = Depends(get_current_org),
    db: Session = Depends(get_db),
):
    return db.query(models.Subtask).filter(
        models.Subtask.task_id == task_id
    ).order_by(models.Subtask.sort_order, models.Subtask.id).all()

@app.post("/tasks/{task_id}/subtasks", response_model=schemas.SubtaskOut)
def create_subtask(
    task_id: int,
    subtask: schemas.SubtaskCreate,
    org: models.Organization = Depends(get_current_org),
    db: Session = Depends(get_db),
):
    count = db.query(models.Subtask).filter(models.Subtask.task_id == task_id).count()
    db_sub = models.Subtask(task_id=task_id, title=subtask.title, sort_order=count)
    db.add(db_sub)
    db.commit()
    db.refresh(db_sub)
    return db_sub

@app.patch("/subtasks/{subtask_id}", response_model=schemas.SubtaskOut)
def update_subtask(
    subtask_id: int,
    data: schemas.SubtaskUpdate,
    org: models.Organization = Depends(get_current_org),
    db: Session = Depends(get_db),
):
    sub = db.query(models.Subtask).filter(models.Subtask.id == subtask_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subtask not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(sub, k, v)
    db.commit()
    db.refresh(sub)
    return sub

@app.delete("/subtasks/{subtask_id}", status_code=204)
def delete_subtask(
    subtask_id: int,
    org: models.Organization = Depends(get_current_org),
    db: Session = Depends(get_db),
):
    sub = db.query(models.Subtask).filter(models.Subtask.id == subtask_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subtask not found")
    db.delete(sub)
    db.commit()

# ── Activity ──────────────────────────────────────────────────

@app.get("/tasks/{task_id}/activity", response_model=List[schemas.ActivityOut])
def get_activity(
    task_id: int,
    org: models.Organization = Depends(get_current_org),
    db: Session = Depends(get_db),
):
    return db.query(models.TaskActivity).filter(
        models.TaskActivity.task_id == task_id
    ).order_by(models.TaskActivity.created_at.desc()).all()

@app.post("/seed")
def seed(db: Session = Depends(get_db)):
    return {"message": "Seed not needed"}

# ── Meeting Notes ──────────────────────────────────────────────

@app.get("/meeting-notes", response_model=List[schemas.MeetingNoteOut])
def get_meeting_notes(
    org: models.Organization = Depends(get_current_org),
    db: Session = Depends(get_db),
):
    return db.query(models.MeetingNote).filter(
        (models.MeetingNote.org_id == org.id) | (models.MeetingNote.org_id == None)
    ).order_by(models.MeetingNote.created_at.desc()).all()

@app.post("/meeting-notes", response_model=schemas.MeetingNoteOut)
def create_meeting_note(
    note: schemas.MeetingNoteCreate,
    org: models.Organization = Depends(get_current_org),
    db: Session = Depends(get_db),
):
    db_note = models.MeetingNote(**note.model_dump(), org_id=org.id)
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note

@app.patch("/meeting-notes/{note_id}", response_model=schemas.MeetingNoteOut)
def update_meeting_note(
    note_id: int,
    note: schemas.MeetingNoteUpdate,
    org: models.Organization = Depends(get_current_org),
    db: Session = Depends(get_db),
):
    db_note = db.query(models.MeetingNote).filter(
        models.MeetingNote.id == note_id,
        (models.MeetingNote.org_id == org.id) | (models.MeetingNote.org_id == None)
    ).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    for k, v in note.model_dump(exclude_unset=True).items():
        setattr(db_note, k, v)
    if db_note.org_id is None:
        db_note.org_id = org.id
    db.commit()
    db.refresh(db_note)
    return db_note

@app.delete("/meeting-notes/{note_id}", status_code=204)
def delete_meeting_note(
    note_id: int,
    org: models.Organization = Depends(get_current_org),
    db: Session = Depends(get_db),
):
    db_note = db.query(models.MeetingNote).filter(
        models.MeetingNote.id == note_id,
        (models.MeetingNote.org_id == org.id) | (models.MeetingNote.org_id == None)
    ).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(db_note)
    db.commit()

@app.get("/meeting-notes/{note_id}/tasks", response_model=List[schemas.TaskOut])
def get_tasks_for_note(
    note_id: int,
    org: models.Organization = Depends(get_current_org),
    db: Session = Depends(get_db),
):
    return db.query(models.Task).filter(
        models.Task.meeting_note_id == note_id,
        (models.Task.org_id == org.id) | (models.Task.org_id == None)
    ).all()

@app.post("/meeting-notes/{note_id}/extract", response_model=schemas.ExtractResult)
def extract_from_note(
    note_id: int,
    org: models.Organization = Depends(get_current_org),
    db: Session = Depends(get_db),
):
    db_note = db.query(models.MeetingNote).filter(
        models.MeetingNote.id == note_id,
        (models.MeetingNote.org_id == org.id) | (models.MeetingNote.org_id == None)
    ).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    if not db_note.content.strip():
        raise HTTPException(status_code=400, detail="Note content is empty")

    api_key = os.getenv("AI_PLATFORM_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI_PLATFORM_API_KEY not set")

    existing_tasks = db.query(models.Task).filter(
        (models.Task.org_id == org.id) | (models.Task.org_id == None)
    ).all()
    existing_tasks_json = json.dumps([
        {"id": t.id, "title": t.title, "module": t.module, "status": t.status, "quarter": t.quarter}
        for t in existing_tasks
    ], ensure_ascii=False)

    prompt = f"""You are a project management assistant. Analyze this meeting note, extract new actionable items, AND compare with existing tasks to suggest status updates.

Meeting note ({db_note.week_label}):
---
{db_note.content}
---

Existing tasks in the system:
{existing_tasks_json}

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{{
  "tasks": [
    {{
      "title": "string",
      "module": "GreenRAG|Doc-Intelli|Infra|Integration",
      "status": "pending|progress|done",
      "quarter": "Q1|Q2|Q3|Q4",
      "year": 2026,
      "assignee": "string or null",
      "deadline": "YYYY-MM-DD or null",
      "description": "string or null"
    }}
  ],
  "milestones": [
    {{
      "title": "string",
      "deadline": "YYYY-MM-DD or null",
      "description": "string or null"
    }}
  ],
  "updates": [
    {{
      "task_id": 123,
      "task_title": "string",
      "current_status": "pending|progress|done",
      "suggested_status": "pending|progress|done",
      "reason": "short explanation"
    }}
  ]
}}

Rules:
- "tasks": Only extract genuinely NEW tasks not matching any existing task (semantic match). Skip if similar exists.
- "milestones": Only new milestones/releases.
- "updates": MOST IMPORTANT. For every existing task, check if note mentions anything related (fuzzy/semantic match). Vietnamese: "Đã có"/"xong"/"hoàn thành"=done; "đang làm"/"đang thực hiện"=progress; "cần làm"/"chưa làm"=pending. Only suggest if implied status differs from current.
- Infer module from context. Infer quarter from deadline or context (2026, Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec).
- Return empty arrays [] if nothing found."""

    try:
        resp = httpx.post(
            GREENNODE_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": GREENNODE_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 2000,
                "temperature": 0.2,
            },
            timeout=60,
        )
        resp.raise_for_status()
        resp_json = resp.json()
        choices = resp_json.get("choices", [])
        if not choices:
            raise HTTPException(status_code=502, detail=f"AI returned no choices")
        raw = choices[0].get("message", {}).get("content", "").strip()
        if not raw:
            raise HTTPException(status_code=502, detail="AI returned empty content")

        if "```" in raw:
            parts = raw.split("```")
            for part in parts:
                part = part.strip()
                if part.startswith("json"):
                    part = part[4:].strip()
                try:
                    return schemas.ExtractResult(**json.loads(part))
                except Exception:
                    continue

        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start != -1 and end > start:
            raw = raw[start:end]

        return schemas.ExtractResult(**json.loads(raw))
    except HTTPException:
        raise
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"AI API error: {e}")
    except (json.JSONDecodeError, KeyError) as e:
        raise HTTPException(status_code=502, detail=f"Failed to parse AI response: {e}")
