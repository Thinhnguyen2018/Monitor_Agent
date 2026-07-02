from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class TaskBase(BaseModel):
    title: str
    module: str
    status: str = "pending"
    quarter: str
    year: int = 2026
    assignee: Optional[str] = None
    deadline: Optional[date] = None
    description: Optional[str] = None
    month: Optional[int] = None
    week: Optional[int] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    module: Optional[str] = None
    status: Optional[str] = None
    quarter: Optional[str] = None
    year: Optional[int] = None
    assignee: Optional[str] = None
    deadline: Optional[date] = None
    description: Optional[str] = None
    month: Optional[int] = None
    week: Optional[int] = None


class TaskOut(TaskBase):
    id: int

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    author: str = "Me"
    content: str


class CommentOut(BaseModel):
    id: int
    task_id: int
    author: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True
