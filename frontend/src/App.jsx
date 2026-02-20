import { Routes, Route, Navigate } from 'react-router-dom';
import VisitorRegistration from './components/VisitorRegistration';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import SelfCheckout from './components/SelfCheckout';
import VerifyPass from './components/VerifyPass'; // 👈 Import it here

import LiveDashboard from './components/LiveDashboard';
import VisitorMasterList from './components/VisitorMasterList';
import AnalyticsDashboard from './components/AnalyticsDashboard';

function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<VisitorRegistration />} />
        <Route path="/nud-security-portal" element={<Login />} />
        
        {/* 🟢 NEW: Completely Public Verification Route */}
        <Route path="/verify/:id" element={<VerifyPass />} />
        
        <Route path="/exit" element={<SelfCheckout />} />

        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>}>
          <Route index element={<Navigate to="monitoring" replace />} />
          <Route path="monitoring" element={<LiveDashboard />} />
          <Route path="records" element={<VisitorMasterList />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;