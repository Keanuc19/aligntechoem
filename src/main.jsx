import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App.jsx'
import TechnicianApp from './TechnicianApp.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import NewReportPage from './pages/NewReportPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import ReportViewPage from './pages/ReportViewPage.jsx'
import './index.css'

function ProtectedRoute({ children }) {
  const techName = localStorage.getItem('technicianName')
  if (!techName) return <Navigate to="/login" replace />
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
          <Route path="new-report" element={<NewReportPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="reports/:id" element={<ReportViewPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
