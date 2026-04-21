import React, { useState, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { unwrapList } from '../utils/unwrapList'
import { useAuth } from '../context/AuthContext'
import AuthedImg from '../components/ui/AuthedImg'
import { getInitials, avatarColor } from '../utils/initials'

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'technician',
  phone: '',
  bio: '',
  location: '',
  birthday: '',
  skillsText: '',
}

function parseSkillsText(raw) {
  if (!raw || typeof raw !== 'string') return []
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30)
}

export default function Users() {
  const { user: currentUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/users')
      setUsers(unwrapList(res.data))
      setError(null)
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  useEffect(() => {
    const editId = location.state?.editUserId
    if (!editId || users.length === 0) return
    const u = users.find((x) => String(x._id) === String(editId))
    if (u) {
      openEdit(u)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [users, location.state, location.pathname, navigate])

  function openCreate() {
    setEditing(null)
    setFormData(EMPTY_FORM)
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(user) {
    setEditing(user._id)
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      phone: user.phone || '',
      bio: user.bio || '',
      location: user.location || '',
      birthday: user.birthday || '',
      skillsText: Array.isArray(user.skills) ? user.skills.join(', ') : '',
    })
    setFormError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    setSaving(true)
    try {
      const { skillsText, ...rest } = formData
      const skills = parseSkillsText(skillsText)
      if (editing) {
        const payload = { ...rest, skills }
        if (!payload.password) delete payload.password
        await api.put(`/users/${editing}`, payload)
      } else {
        await api.post('/users', { ...rest, skills })
      }
      closeForm()
      fetchUsers()
    } catch (err) {
      const errData = err?.response?.data
      const msg = errData?.details
        ? errData.details.map(d => d.message).join(', ')
        : errData?.error || 'Failed to save user'
      setFormError(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this team member? This cannot be undone.')) return
    try {
      await api.delete(`/users/${id}`)
      fetchUsers()
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to delete user')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Team</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Company: {currentUser?.company_id}
          </p>
        </div>
        <button
          onClick={showForm ? closeForm : openCreate}
          className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Cancel' : 'Add Member'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 mb-6 space-y-3">
          <h3 className="font-medium text-gray-900">{editing ? 'Edit Member' : 'New Member'}</h3>

          <div className="bg-blue-50 border border-blue-100 rounded-md px-3 py-2 text-sm text-blue-700">
            This member will be added to your company (ID: {currentUser?.company_id})
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={formData.name}
                onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData(d => ({ ...d, email: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password {editing && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={e => setFormData(d => ({ ...d, password: e.target.value }))}
                required={!editing}
                minLength={editing ? 0 : 8}
                placeholder={editing ? 'Unchanged' : 'Min 8 characters'}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={formData.role}
                onChange={e => setFormData(d => ({ ...d, role: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="technician">Technician</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                value={formData.phone}
                onChange={e => setFormData(d => ({ ...d, phone: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Biography</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData((d) => ({ ...d, bio: e.target.value }))}
                rows={2}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                value={formData.location}
                onChange={(e) => setFormData((d) => ({ ...d, location: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Birthday</label>
              <input
                value={formData.birthday}
                onChange={(e) => setFormData((d) => ({ ...d, birthday: e.target.value }))}
                placeholder="e.g. March 15"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Skills (comma or line separated)
              </label>
              <textarea
                value={formData.skillsText}
                onChange={(e) => setFormData((d) => ({ ...d, skillsText: e.target.value }))}
                rows={2}
                placeholder="Inspections, NFPA 10, …"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {formError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {formError}
            </div>
          )}
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : editing ? 'Update Member' : 'Add Member'}
          </button>
        </form>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map(u => (
                <tr key={u._id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3">
                    <Link
                      to={`/users/${u._id}`}
                      className="flex items-center gap-3 group min-w-0"
                    >
                      {u.photo_url ? (
                        <AuthedImg
                          src={u.photo_url}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover shrink-0 ring-1 ring-gray-200"
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold text-white ${avatarColor(u.name)}`}
                        >
                          {getInitials(u.name)}
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 truncate">
                        {u.name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{u.phone || '-'}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => openEdit(u)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    {u._id !== currentUser?._id && (
                      <button
                        onClick={() => handleDelete(u._id)}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">
                    No team members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
