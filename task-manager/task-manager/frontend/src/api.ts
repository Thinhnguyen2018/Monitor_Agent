import { Task, TaskCreate, TaskUpdate } from './types'

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
