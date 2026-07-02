import { Task, TaskCreate, TaskUpdate, Comment } from './types'

const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const getTasks = (): Promise<Task[]> => request('/tasks')

export const createTask = (task: TaskCreate): Promise<Task> =>
  request('/tasks', { method: 'POST', body: JSON.stringify(task) })

export const updateTask = (id: number, task: TaskUpdate): Promise<Task> =>
  request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(task) })

export const deleteTask = (id: number): Promise<void> =>
  request(`/tasks/${id}`, { method: 'DELETE' })

export const seedTasks = (): Promise<{ message: string }> =>
  request('/seed', { method: 'POST' })

export const getComments = (taskId: number): Promise<Comment[]> =>
  request(`/tasks/${taskId}/comments`)

export const createComment = (taskId: number, author: string, content: string): Promise<Comment> =>
  request(`/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ author, content }) })

export const deleteComment = (commentId: number): Promise<void> =>
  request(`/comments/${commentId}`, { method: 'DELETE' })
