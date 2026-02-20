import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('auth_token');
    const location = useLocation();

    if (!token) {
        // 🛡️ SECURITY FIX: Send unauthorized scans to the Login Page, 
        // not the Visitor Page! We also save the URL they were trying 
        // to visit so we can send them back there after they log in.
        return <Navigate to="/nud-security-portal" state={{ from: location }} replace />;
    }

    return children;
};

export default ProtectedRoute;