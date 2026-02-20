import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
    // 1. Check if the user has the "Key" (auth_token) in their browser storage
    const isAuthenticated = localStorage.getItem('auth_token');

    // 2. If NO key, play dumb and kick them back to the Visitor Registration page!
    if (!isAuthenticated) {
        return <Navigate to="/" replace />; // 👈 Changed from "/login" to "/"
    }

    // 3. If YES key, let them inside (show the Dashboard)
    return children;
}