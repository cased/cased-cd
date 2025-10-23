import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

// API base configuration
// In production, use relative path (nginx proxies /api to ArgoCD)
// In development, use relative path (Vite proxy handles routing to ArgoCD or mock server)
const API_BASE_URL = import.meta.env.PROD
  ? '/api/v1'
  : '/api/v1'
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

    // ArgoCD 2.9.4+ requires Content-Type header for non-GET requests that have data
    // See: https://github.com/argoproj/argo-cd/pull/16860
    // However, DELETE requests without a body should not have Content-Type
    const isNonGetRequest = config.method?.toLowerCase() !== 'get'
    const hasData = config.data !== undefined && config.data !== null

    if (isNonGetRequest && hasData) {
      config.headers['Content-Type'] = 'application/json'
    }
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
    // Send empty JSON body with DELETE requests to satisfy ArgoCD's Content-Type requirement
    // while avoiding 415 errors from proxies that reject DELETE with Content-Type but no body
    return apiClient.delete<T>(url, { ...config, data: config?.data ?? {} })
  },
}

export default api
