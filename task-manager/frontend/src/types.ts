export interface Task {
  id: number
  title: string
  module: 'GreenRAG' | 'Doc-Intelli' | 'Infra' | 'Integration' | 'Milestone' | 'Release'
  status: 'pending' | 'progress' | 'done'
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  year: number
  assignee?: string
  deadline?: string
  description?: string
  month?: number
  week?: number
  meeting_note_id?: number
  subtask_done?: number
  subtask_total?: number
}

export interface Comment {
  id: number
  task_id: number
  author: string
  content: string
  created_at: string
}

export interface Subtask {
  id: number
  task_id: number
  title: string
  completed: boolean
  sort_order: number
  created_at: string
}

export interface Activity {
  id: number
  task_id: number
  field: string
  old_value: string | null
  new_value: string | null
  actor: string | null
  created_at: string
}

export type TaskCreate = Omit<Task, 'id'>
export type TaskUpdate = Partial<TaskCreate>
