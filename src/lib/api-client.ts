import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

// API base configuration
// Use mock server (8080) by default, real ArgoCD via nginx CORS proxy (8090) when VITE_USE_REAL_API is set
const API_BASE_URL = import.meta.env.VITE_USE_REAL_API
  ? 'http://localhost:8090/api/v1'
  : import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
const API_TIMEOUT = 30000

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
})

// Request interceptor - add auth token and Content-Type
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('argocd_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Always set Content-Type to application/json for all requests
    config.headers['Content-Type'] = 'application/json'
    config.headers['Accept'] = 'application/json'

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('argocd_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API client wrapper methods
export const api = {
  get: <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.get<T>(url, config)
  },

  post: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.post<T>(url, data, config)
  },

  put: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.put<T>(url, data, config)
  },

  patch: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.patch<T>(url, data, config)
  },

  delete: <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.delete<T>(url, config)
  },
}

export default api
