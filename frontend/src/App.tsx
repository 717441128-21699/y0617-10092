import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from './contexts/AuthContext';
import MainLayout from './components/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import QrCode from './pages/QrCode';
import Scan from './pages/Scan';
import Attendance from './pages/Attendance';
import Visitors from './pages/Visitors';
import MyVisitors from './pages/MyVisitors';
import Display from './pages/Display';
import HRDashboard from './pages/HRDashboard';
import Employees from './pages/Employees';
import Config from './pages/Config';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="qrcode" element={<QrCode />} />
        <Route path="scan" element={<Scan />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="visitors" element={<Visitors />} />
        <Route path="my-visitors" element={<MyVisitors />} />
        <Route path="display" element={<Display />} />
        <Route path="hr-dashboard" element={<HRDashboard />} />
        <Route path="employees" element={<Employees />} />
        <Route path="config" element={<Config />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
