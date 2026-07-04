import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { logout, fetchMe } from '../store/authSlice';
import { useCallback } from 'react';

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading, error, isAuthenticated } = useSelector((s: RootState) => s.auth);

  const doLogout = useCallback(() => {
    dispatch(logout());
  }, [dispatch]);

  const refreshUser = useCallback(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  return { user, loading, error, isAuthenticated, logout: doLogout, refreshUser };
}
