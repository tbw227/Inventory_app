import api from './api'

export const jobService = {
  list: (params) => api.get('/jobs', { params }),
  get: (id) => api.get(`/jobs/${id}`),
  create: (data) => api.post('/jobs', data),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  complete: (id, data) => api.post(`/jobs/${id}/complete`, data),
}
