import { Routes, Route, Navigate } from 'react-router-dom';
import VisitorRegistration from './components/VisitorRegistration';
import AdminDashboard from './components/AdminDashboard';

function App() {
  return (
    <div>
      <Routes>
        {/* 1. Default Page (QR Code Scan) -> Shows Registration Form */}
        <Route path="/" element={<VisitorRegistration />} />

        {/* 2. Admin Page (Hidden) -> Shows Dashboard */}
        <Route path="/admin" element={<AdminDashboard />} />

        {/* 3. Catch-all -> Redirects random links back to Registration */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;