import React, {useState} from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function Login(){
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [error,setError] = useState(null)
  const navigate = useNavigate()

  async function handleSubmit(e){
    e.preventDefault()
    setError(null)
    try{
      const res = await axios.post('/api/auth/login',{ email, password })
      // store token (if backend implements it)
      if(res.data.token) localStorage.setItem('token', res.data.token)
      navigate('/jobs')
    }catch(err){
      setError(err?.response?.data?.error || 'Login failed')
    }
  }

  return (
    <div className="max-w-md mx-auto mt-24 bg-white p-6 rounded shadow">
      <h1 className="text-2xl font-semibold mb-4">Sign In</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 block w-full border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 block w-full border rounded p-2" />
        </div>
        {error && <div className="text-red-600">{error}</div>}
        <div>
          <button className="w-full bg-blue-600 text-white py-2 rounded">Sign In</button>
        </div>
      </form>
    </div>
  )
}
