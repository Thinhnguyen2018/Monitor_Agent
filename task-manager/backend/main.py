from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from datetime import date

import models
import schemas
from database import engine, get_db
from sqlalchemy import text

models.Base.metadata.create_all(bind=engine)

# Add month/week columns if they don't exist yet (safe to run repeatedly)
with engine.connect() as conn:
    for col, coltype in [("month", "INTEGER"), ("week", "INTEGER")]:
        conn.execute(text(
            f"ALTER TABLE tasks ADD COLUMN IF NOT EXISTS {col} {coltype}"
        ))
    conn.commit()

app = FastAPI(title="Task Manager API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/tasks", response_model=List[schemas.TaskOut])
def get_tasks(db: Session = Depends(get_db)):
    return db.query(models.Task).all()


@app.post("/tasks", response_model=schemas.TaskOut, status_code=201)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):
    db_task = models.Task(**task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


@app.patch("/tasks/{task_id}", response_model=schemas.TaskOut)
def update_task(task_id: int, task: schemas.TaskUpdate, db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    update_data = task.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_task, field, value)
    db.commit()
    db.refresh(db_task)
    return db_task


@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(db_task)
    db.commit()


# ── Comments ────────────────────────────────────────────────────

@app.get("/tasks/{task_id}/comments", response_model=List[schemas.CommentOut])
def get_comments(task_id: int, db: Session = Depends(get_db)):
    return db.query(models.Comment).filter(models.Comment.task_id == task_id).order_by(models.Comment.created_at).all()


@app.post("/tasks/{task_id}/comments", response_model=schemas.CommentOut, status_code=201)
def create_comment(task_id: int, comment: schemas.CommentCreate, db: Session = Depends(get_db)):
    db_comment = models.Comment(task_id=task_id, **comment.model_dump())
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment


@app.delete("/comments/{comment_id}", status_code=204)
def delete_comment(comment_id: int, db: Session = Depends(get_db)):
    c = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Comment not found")
    db.delete(c)
    db.commit()


@app.post("/seed", status_code=201)
def seed_tasks(db: Session = Depends(get_db)):
    existing = db.query(models.Task).count()
    if existing > 0:
        return {"message": "Database already has data, skipping seed"}

    sample_tasks = [
        # Done / Q1
        {
            "title": "Hạ tầng production",
            "module": "Infra",
            "status": "done",
            "quarter": "Q1",
            "year": 2026,
            "assignee": "Team",
            "deadline": date(2026, 3, 31),
            "description": "Thiết lập và cấu hình hạ tầng production cho toàn bộ hệ thống.",
        },
        {
            "title": "PostgreSQL migration",
            "module": "Infra",
            "status": "done",
            "quarter": "Q1",
            "year": 2026,
            "assignee": "Team",
            "deadline": date(2026, 3, 15),
            "description": "Di chuyển toàn bộ dữ liệu sang PostgreSQL và tối ưu schema.",
        },
        {
            "title": "Benchmark OpenRAG",
            "module": "GreenRAG",
            "status": "done",
            "quarter": "Q1",
            "year": 2026,
            "assignee": "Team",
            "deadline": date(2026, 3, 20),
            "description": "Chạy benchmark so sánh hiệu suất OpenRAG với các baseline khác.",
        },
        # Done / Q2
        {
            "title": "Pipeline preprocessing",
            "module": "Doc-Intelli",
            "status": "done",
            "quarter": "Q2",
            "year": 2026,
            "assignee": "Thành+Hoàng",
            "deadline": date(2026, 5, 30),
            "description": "Xây dựng pipeline tiền xử lý tài liệu đầu vào cho Doc-Intelli.",
        },
        # In Progress / Q2
        {
            "title": "Table chunking & query",
            "module": "GreenRAG",
            "status": "progress",
            "quarter": "Q2",
            "year": 2026,
            "assignee": "Team",
            "deadline": date(2026, 6, 30),
            "description": "Phát triển module chunking cho bảng dữ liệu và cải thiện query engine.",
        },
        {
            "title": "Dashboard golden dataset",
            "module": "GreenRAG",
            "status": "progress",
            "quarter": "Q2",
            "year": 2026,
            "assignee": "Team",
            "deadline": date(2026, 6, 25),
            "description": "Xây dựng dashboard theo dõi golden dataset và kết quả đánh giá.",
        },
        {
            "title": "Migrate sang cloud",
            "module": "Infra",
            "status": "progress",
            "quarter": "Q2",
            "year": 2026,
            "assignee": "Team",
            "deadline": date(2026, 6, 28),
            "description": "Di chuyển toàn bộ dịch vụ lên cloud infrastructure.",
        },
        {
            "title": "Authen MCP — Kim",
            "module": "Integration",
            "status": "progress",
            "quarter": "Q2",
            "year": 2026,
            "assignee": "Kim",
            "deadline": date(2026, 6, 20),
            "description": "Tích hợp xác thực MCP vào hệ thống, phụ trách bởi Kim.",
        },
        {
            "title": "Tìm thêm public dataset",
            "module": "GreenRAG",
            "status": "progress",
            "quarter": "Q2",
            "year": 2026,
            "assignee": "Team",
            "deadline": date(2026, 6, 15),
            "description": "Thu thập và đánh giá thêm public dataset cho việc training và benchmark.",
        },
        # Pending / Q3
        {
            "title": "Automation benchmark",
            "module": "GreenRAG",
            "status": "pending",
            "quarter": "Q3",
            "year": 2026,
            "assignee": "Team",
            "deadline": date(2026, 9, 30),
            "description": "Xây dựng hệ thống tự động hóa benchmark định kỳ.",
        },
        {
            "title": "AWS SNS/SQS",
            "module": "Infra",
            "status": "pending",
            "quarter": "Q3",
            "year": 2026,
            "assignee": "Team",
            "deadline": date(2026, 8, 31),
            "description": "Tích hợp AWS SNS và SQS vào kiến trúc messaging.",
        },
        {
            "title": "Kiến trúc RAG Engine",
            "module": "GreenRAG",
            "status": "pending",
            "quarter": "Q3",
            "year": 2026,
            "assignee": "Team",
            "deadline": date(2026, 9, 15),
            "description": "Thiết kế và triển khai kiến trúc RAG Engine thế hệ mới.",
        },
        {
            "title": "OCR service — HN",
            "module": "Doc-Intelli",
            "status": "pending",
            "quarter": "Q3",
            "year": 2026,
            "assignee": "Thịnh+HN",
            "deadline": date(2026, 8, 15),
            "description": "Phát triển OCR service xử lý tài liệu scan, phụ trách Thịnh và HN.",
        },
        {
            "title": "Multi-tenant + RBAC",
            "module": "GreenRAG",
            "status": "pending",
            "quarter": "Q3",
            "year": 2026,
            "assignee": "Team",
            "deadline": date(2026, 9, 20),
            "description": "Triển khai hỗ trợ multi-tenant và phân quyền RBAC.",
        },
        {
            "title": "Evaluate Temporal",
            "module": "Infra",
            "status": "pending",
            "quarter": "Q3",
            "year": 2026,
            "assignee": "Team",
            "deadline": date(2026, 9, 10),
            "description": "Đánh giá Temporal workflow engine cho orchestration pipeline.",
        },
    ]

    for task_data in sample_tasks:
        db_task = models.Task(**task_data)
        db.add(db_task)

    db.commit()
    return {"message": f"Seeded {len(sample_tasks)} tasks successfully"}
