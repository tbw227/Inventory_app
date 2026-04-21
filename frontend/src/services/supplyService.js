import api from './api'

export const supplyService = {
  list: (params) => api.get('/supplies', { params }),
  create: (data) => api.post('/supplies', data),
  update: (id, data) => api.put(`/supplies/${id}`, data),
  remove: (id) => api.delete(`/supplies/${id}`),
}
