import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import App from './App.jsx'
import TechnicianApp from './TechnicianApp.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import NewReportPage from './pages/NewReportPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import ReportViewPage from './pages/ReportViewPage.jsx'
import { canAccessRoute } from './utils/roles.js'
import './index.css'

function ProtectedRoute({ children }) {
  const techName = localStorage.getItem('technicianName')
  if (!techName) return <Navigate to="/login" replace />
  return children
}

function RoleGate({ children }) {
  const location = useLocation()
  if (!canAccessRoute(location.pathname)) {
    return <Navigate to="/" replace />
  }
  return children
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/specs" element={<App />} />
        <Route path="/" element={<ProtectedRoute><TechnicianApp /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="new-report" element={<RoleGate><NewReportPage /></RoleGate>} />
          <Route path="reports" element={<RoleGate><ReportsPage /></RoleGate>} />
          <Route path="reports/:id" element={<RoleGate><ReportViewPage /></RoleGate>} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
