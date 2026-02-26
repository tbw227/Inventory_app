import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Jobs from './pages/Jobs'

export default function App(){
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/login" element={<Login/>} />
        <Route path="/jobs" element={<Jobs/>} />
        <Route path="/" element={<Navigate to="/jobs" replace />} />
      </Routes>
    </div>
  )
}
