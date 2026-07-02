from sqlalchemy import Column, Integer, String, Date, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    module = Column(String(50), nullable=False)  # GreenRAG | Doc-Intelli | Infra | Integration
    status = Column(String(20), nullable=False, default="pending")  # pending | progress | done
    quarter = Column(String(2), nullable=False)  # Q1 | Q2 | Q3 | Q4
    year = Column(Integer, nullable=False, default=2026)
    assignee = Column(String(100), nullable=True)
    deadline = Column(Date, nullable=True)
    description = Column(Text, nullable=True)
    month = Column(Integer, nullable=True)   # 1-12
    week = Column(Integer, nullable=True)    # 1-4 (week within month)


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    author = Column(String(100), nullable=False, default="Me")
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
