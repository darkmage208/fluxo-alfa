import React, { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { setTokens } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import LoadingSpinner from '@/components/LoadingSpinner';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (accessToken && refreshToken) {
      setTokens(accessToken, refreshToken);
      checkAuth();
    }
  }, [searchParams, checkAuth]);

  const error = searchParams.get('error');
  
  if (error) {
    return <Navigate to="/login?error=oauth" replace />;
  }

  const accessToken = searchParams.get('accessToken');
  const refreshToken = searchParams.get('refreshToken');

  if (accessToken && refreshToken) {
    return <Navigate to="/chat" replace />;
  }

  return <LoadingSpinner />;
};

export default AuthCallback;