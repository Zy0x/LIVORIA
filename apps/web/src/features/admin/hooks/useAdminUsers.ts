import { useCallback, useState } from 'react';

import { toast } from '@/hooks/use-toast';
import { adminService, type AdminSession } from '../services/admin.service';
import type { AdminUser, AdminUserDetailMap } from '../types/admin.types';

export function useAdminUsers(adminSession: AdminSession | null) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<AdminUserDetailMap>({});

  const fetchUsers = useCallback(async () => {
    if (!adminSession) return;
    setUsersLoading(true);
    try {
      const { data, error } = await adminService.fetchUsers(adminSession);
      if (!error && data?.users) setUsers(data.users);
    } catch {
      // Keep legacy silent behavior.
    }
    setUsersLoading(false);
  }, [adminSession]);

  const fetchUserDetail = useCallback(async (userId: string) => {
    if (!adminSession || userDetails[userId]) return;
    try {
      const { data, error } = await adminService.fetchUserDetail(adminSession, userId);
      if (!error && data) {
        setUserDetails(prev => ({ ...prev, [userId]: data }));
      }
    } catch {
      // Keep legacy silent behavior.
    }
  }, [adminSession, userDetails]);

  const toggleUser = useCallback((userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
      return;
    }
    setExpandedUser(userId);
    fetchUserDetail(userId);
  }, [expandedUser, fetchUserDetail]);

  const deleteUser = useCallback(async (userId: string, email: string) => {
    if (!adminSession) return;
    if (!confirm(`Hapus pengguna ${email}? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      const { error } = await adminService.deleteUser(adminSession, userId);
      if (error) throw error;
      toast({ title: 'Pengguna dihapus' });
      fetchUsers();
    } catch {
      toast({ title: 'Gagal menghapus', variant: 'destructive' });
    }
  }, [adminSession, fetchUsers]);

  return {
    users,
    usersLoading,
    expandedUser,
    userDetails,
    fetchUsers,
    fetchUserDetail,
    toggleUser,
    deleteUser,
  };
}
