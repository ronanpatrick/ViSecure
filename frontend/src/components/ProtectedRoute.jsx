import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
    // 1. Check if the user has the "Key" (auth_token) in their browser storage
    const isAuthenticated = localStorage.getItem('auth_token');

    // 2. If NO key, kick them to the Login page
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // 3. If YES key, let them inside (show the Dashboard)
    return children;
}