import api from './api'

export const paymentService = {
  createIntent: (data) => api.post('/payments', data),
  listByJob: (jobId) => api.get(`/payments/job/${jobId}`),
}
