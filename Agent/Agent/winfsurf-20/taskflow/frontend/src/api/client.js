import axios from 'axios'

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8060'

export const api = axios.create({
  baseURL: API_BASE
})

export function wsUrlForTask(taskId) {
  const base = API_BASE.replace('http://', 'ws://').replace('https://', 'wss://')
  return `${base}/ws/tasks/${taskId}`
}
