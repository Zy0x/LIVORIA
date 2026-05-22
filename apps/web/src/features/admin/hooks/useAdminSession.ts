import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@/app/route-paths';
import { clearAdminSession, getAdminSession } from '../services/admin-session';

export function useAdminSession() {
  const navigate = useNavigate();
  const [adminSession] = useState(() => getAdminSession());

  const logout = useCallback(() => {
    clearAdminSession();
    navigate(ROUTES.AUTH, { replace: true });
  }, [navigate]);

  return { adminSession, logout };
}
