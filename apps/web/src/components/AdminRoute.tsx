import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { selectIsAdmin } from '../store/slices/authSlice';

export default function AdminRoute() {
  const isAdmin = useAppSelector(selectIsAdmin);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
