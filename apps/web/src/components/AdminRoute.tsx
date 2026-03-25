import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { selectIsAdmin } from '../store/slices/authSlice';

export default function AdminRoute() {
  const authStatus = useAppSelector((state) => state.auth.status);
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const isAdmin = useAppSelector(selectIsAdmin);

  if (authStatus === 'loading' || authStatus === 'idle') {
    return null;
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
