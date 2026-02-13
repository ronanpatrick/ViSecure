import { Routes, Route, Navigate } from 'react-router-dom';
import VisitorRegistration from './components/VisitorRegistration';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import SelfCheckout from './components/SelfCheckout';

function App() {
  return (
    <div>
      <Routes>
        {/* 1. Public: Visitor Registration (Default Page for QR Code) */}
        <Route path="/" element={<VisitorRegistration />} />
        
        {/* 2. Public: Admin Login Page */}
        <Route path="/login" element={<Login />} />

        {/* 3. Protected: Admin Dashboard (The "Bouncer" checks this door) */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* 4. Catch-all: Redirect unknown links back to Registration */}
        <Route path="*" element={<Navigate to="/" />} />

        <Route path="/exit" element={<SelfCheckout />} />
        
      </Routes>
    </div>
  );
}

export default App;