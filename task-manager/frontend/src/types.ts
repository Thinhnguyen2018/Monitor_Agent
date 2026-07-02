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
  month?: number   // 1-12
  week?: number    // 1-4
}

export type TaskCreate = Omit<Task, 'id'>
export type TaskUpdate = Partial<TaskCreate>

export interface Comment {
  id: number
  task_id: number
  author: string
  content: string
  created_at: string
}
