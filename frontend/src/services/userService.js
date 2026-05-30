import api from './api'

export const userService = {
  list: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  updateVehicleInventory: (id, vehicle_inventory) =>
    api.put(`/users/${id}/vehicle-inventory`, { vehicle_inventory }),
  updateMyVehicleInventory: (vehicle_inventory) =>
    api.put('/users/me/vehicle-inventory', { vehicle_inventory }),
  remove: (id) => api.delete(`/users/${id}`),
}
