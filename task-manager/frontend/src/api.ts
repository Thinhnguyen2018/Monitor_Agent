import { Task, TaskCreate, TaskUpdate, Comment, Subtask, Activity } from './types'

const BASE = '/api'

let _getToken: (() => Promise<string | null>) | null = null

export function setTokenProvider(fn: () => Promise<string | null>) {
  _getToken = fn
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (_getToken) {
    const token = await _getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = await authHeaders()
  const res = await fetch(`${BASE}${path}`, {
    headers,
    ...options,
    // merge caller headers over auth headers
    ...(options?.headers ? { headers: { ...headers, ...options.headers } } : {}),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Tasks ─────────────────────────────────────────────────────
export const getTasks = (): Promise<Task[]> => request('/tasks')
export const createTask = (task: TaskCreate): Promise<Task> =>
  request('/tasks', { method: 'POST', body: JSON.stringify(task) })
export const updateTask = (id: number, task: TaskUpdate): Promise<Task> =>
  request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(task) })
export const deleteTask = (id: number): Promise<void> =>
  request(`/tasks/${id}`, { method: 'DELETE' })
export const seedTasks = (): Promise<{ message: string }> =>
  request('/seed', { method: 'POST' })

// ── Comments ──────────────────────────────────────────────────
export const getComments = (taskId: number): Promise<Comment[]> =>
  request(`/tasks/${taskId}/comments`)
export const createComment = (taskId: number, author: string, content: string): Promise<Comment> =>
  request(`/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ author, content }) })
export const deleteComment = (commentId: number): Promise<void> =>
  request(`/comments/${commentId}`, { method: 'DELETE' })

// ── Subtasks ──────────────────────────────────────────────────
export const getSubtasks = (taskId: number): Promise<Subtask[]> =>
  request(`/tasks/${taskId}/subtasks`)
export const createSubtask = (taskId: number, title: string): Promise<Subtask> =>
  request(`/tasks/${taskId}/subtasks`, { method: 'POST', body: JSON.stringify({ title }) })
export const updateSubtask = (subtaskId: number, data: { title?: string; completed?: boolean }): Promise<Subtask> =>
  request(`/subtasks/${subtaskId}`, { method: 'PATCH', body: JSON.stringify(data) })
export const deleteSubtask = (subtaskId: number): Promise<void> =>
  request(`/subtasks/${subtaskId}`, { method: 'DELETE' })

// ── Activity ──────────────────────────────────────────────────
export const getActivity = (taskId: number): Promise<Activity[]> =>
  request(`/tasks/${taskId}/activity`)

// ── Org ───────────────────────────────────────────────────────
export interface OrgOut {
  id: number
  name: string
  slug: string
  owner_clerk_user_id: string
  created_at: string
}
export const getOrg = (): Promise<OrgOut> => request('/org')
export const updateOrg = (name: string): Promise<OrgOut> =>
  request('/org', { method: 'PATCH', body: JSON.stringify({ name }) })
