import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@/app/route-paths';
import { getAdminSession } from '../services/admin.service';

export function useAdminSession() {
  const navigate = useNavigate();
  const [adminSession] = useState(() => getAdminSession());

  const logout = useCallback(() => {
    sessionStorage.removeItem('livoria_admin');
    navigate(ROUTES.AUTH, { replace: true });
  }, [navigate]);

  return { adminSession, logout };
}
