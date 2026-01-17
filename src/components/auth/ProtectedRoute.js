// src/components/auth/ProtectedRoute.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login');
      } else if (allowedRoles.length > 0 && !allowedRoles.includes(userProfile?.role)) {
        // Redirect to appropriate dashboard based on role
        switch (userProfile?.role) {
          case 'admin':
            router.push('/admin');
            break;
          case 'caretaker':
            router.push('/caretaker');
            break;
          case 'user':
            router.push('/user');
            break;
          default:
            router.push('/');
        }
      }
    }
  }, [user, userProfile, loading, router, allowedRoles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || (allowedRoles.length > 0 && !allowedRoles.includes(userProfile?.role))) {
    return null;
  }

  return children;
};

export default ProtectedRoute;