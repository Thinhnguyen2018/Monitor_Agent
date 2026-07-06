from pydantic import BaseModel, field_validator
from typing import Optional, Any
from datetime import datetime, date

# ── Organization ──────────────────────────────────────────────

class OrgUpdate(BaseModel):
    name: Optional[str] = None

class OrgOut(BaseModel):
    id: int
    name: str
    slug: str
    owner_clerk_user_id: str
    created_at: datetime
    model_config = {"from_attributes": True}

class OrgMemberOut(BaseModel):
    id: int
    clerk_user_id: str
    role: str
    created_at: datetime
    model_config = {"from_attributes": True}

class InviteMember(BaseModel):
    clerk_user_id: str
    role: str = "member"

# ── Task ──────────────────────────────────────────────────────

class TaskBase(BaseModel):
    title: str
    module: str
    status: str = "pending"
    quarter: str
    year: int = 2026
    assignee: Optional[str] = None
    deadline: Optional[str] = None

    @field_validator('deadline', mode='before')
    @classmethod
    def coerce_deadline(cls, v: Any) -> Optional[str]:
        if isinstance(v, date):
            return v.isoformat()
        return v

    description: Optional[str] = None
    month: Optional[int] = None
    week: Optional[int] = None
    meeting_note_id: Optional[int] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    module: Optional[str] = None
    status: Optional[str] = None
    quarter: Optional[str] = None
    year: Optional[int] = None
    assignee: Optional[str] = None
    deadline: Optional[str] = None
    description: Optional[str] = None
    month: Optional[int] = None
    week: Optional[int] = None
    meeting_note_id: Optional[int] = None

class TaskOut(TaskBase):
    id: int
    org_id: Optional[int] = None
    subtask_done: Optional[int] = 0
    subtask_total: Optional[int] = 0
    model_config = {"from_attributes": True}

# ── Comment ───────────────────────────────────────────────────

class CommentCreate(BaseModel):
    author: str = "Me"
    content: str

class CommentOut(BaseModel):
    id: int
    task_id: int
    author: str
    content: str
    created_at: datetime
    model_config = {"from_attributes": True}

# ── MeetingNote ───────────────────────────────────────────────

class MeetingNoteCreate(BaseModel):
    week_label: str
    content: str = ""

class MeetingNoteUpdate(BaseModel):
    week_label: Optional[str] = None
    content: Optional[str] = None

class MeetingNoteOut(BaseModel):
    id: int
    week_label: str
    content: str
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

# ── Subtask ───────────────────────────────────────────────────

class SubtaskCreate(BaseModel):
    title: str
    sort_order: int = 0

class SubtaskUpdate(BaseModel):
    title: Optional[str] = None
    completed: Optional[bool] = None
    sort_order: Optional[int] = None

class SubtaskOut(BaseModel):
    id: int
    task_id: int
    title: str
    completed: bool
    sort_order: int
    created_at: datetime
    model_config = {"from_attributes": True}

# ── Activity ──────────────────────────────────────────────────

class ActivityOut(BaseModel):
    id: int
    task_id: int
    field: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    actor: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}

# ── AI Extract ────────────────────────────────────────────────

class ExtractedTask(BaseModel):
    title: str
    module: str
    status: str
    quarter: str
    year: int
    assignee: Optional[str] = None
    deadline: Optional[str] = None
    description: Optional[str] = None

class ExtractedMilestone(BaseModel):
    title: str
    deadline: Optional[str] = None
    description: Optional[str] = None

class SuggestedUpdate(BaseModel):
    task_id: int
    task_title: str
    current_status: str
    suggested_status: str
    reason: str

class ExtractResult(BaseModel):
    tasks: list[ExtractedTask]
    milestones: list[ExtractedMilestone]
    updates: list[SuggestedUpdate] = []
