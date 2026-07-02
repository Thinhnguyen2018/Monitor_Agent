export interface Task {
  id: number
  title: string
  module: 'GreenRAG' | 'Doc-Intelli' | 'Infra' | 'Integration'
  status: 'pending' | 'progress' | 'done'
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  year: number
  assignee?: string
  deadline?: string
  description?: string
}

export type TaskCreate = Omit<Task, 'id'>
export type TaskUpdate = Partial<TaskCreate>
