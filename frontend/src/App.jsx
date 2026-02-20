import { Routes, Route, Navigate } from 'react-router-dom';
import VisitorRegistration from './components/VisitorRegistration';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import SelfCheckout from './components/SelfCheckout';

// ✅ Import the child components so the Router can see them
import LiveDashboard from './components/LiveDashboard';
import VisitorMasterList from './components/VisitorMasterList';
import AnalyticsDashboard from './components/AnalyticsDashboard';

function App() {
  return (
    <div>
      <Routes>
        {/* 1. Public: Visitor Registration (Default Page for QR Code) */}
        <Route path="/" element={<VisitorRegistration />} />
        
        {/* 2. Hidden: Admin Login Page */}
        <Route path="/nud-security-portal" element={<Login />} />

        {/* 3. Protected: Admin Dashboard with Nested Routes */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        >
          {/* 🛡️ These are NESTED. They show up where you put the <Outlet /> */}
          <Route index element={<Navigate to="monitoring" replace />} />
          <Route path="monitoring" element={<LiveDashboard />} />
          <Route path="records" element={<VisitorMasterList />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
        </Route>

        {/* 4. Public: Self Checkout */}
        <Route path="/exit" element={<SelfCheckout />} />

        {/* 5. Catch-all: Redirect unknown links back to Registration */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;