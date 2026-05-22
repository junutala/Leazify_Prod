'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MimicTarget {
  id: string;
  name: string;
  email: string | null;
  role: 'tenant' | 'service_provider';
  person_id?: string;
  provider_id?: string;
}

interface AuthContextValue {
  user: any;
  session: any;
  loading: boolean;
  /** null = superadmin/full access. string[] = allowed nav-item IDs from responsibilities */
  allowedNavKeys: string[] | null;
  /** null = full access. string[] = project IDs the staff member is assigned to */
  assignedProjectIds: string[] | null;
  /** true while staff permissions are still being loaded */
  authLoading: boolean;
  mimicTarget: MimicTarget | null;
  startMimic: (target: MimicTarget) => void;
  stopMimic: () => void;
  isSuperAdmin: () => boolean;
  signUp: (email: string, password: string, metadata?: { fullName?: string; avatarUrl?: string }) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  getCurrentUser: () => Promise<any>;
  isEmailVerified: () => boolean;
  getUserProfile: () => Promise<any>;
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Module-level singleton — never recreated across renders
const supabase = createClient();

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {

  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);

  // null = no restriction (superadmin / full-access)
  // string[] = allowed nav-item IDs from role_permissions
  const [allowedNavKeys, setAllowedNavKeys] = useState<string[] | null>(null);

  // null = full access (superadmin)
  // string[] = project IDs assigned to this staff member (may be empty)
  const [assignedProjectIds, setAssignedProjectIds] = useState<string[] | null>(null);

  const [mimicTarget, setMimicTarget] = useState<MimicTarget | null>(null);

  // Prevent duplicate concurrent loads
  const loadingRef = useRef(false);

  // ─── Core permission loader ────────────────────────────────────────────────
  // Strategy (fresh, no loops):
  //   1. Check if user exists in `staff` table (by user_id)
  //   2. If NOT staff → full access (superadmin/admin)
  //   3. If staff:
  //      a. Load nav keys from staff_role_assignments → roles → role_permissions
  //      b. Load project IDs from staff_project_assignments
  // RLS is disabled on all tables so these queries always succeed.
  const loadStaffPermissions = async (userId: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setAuthLoading(true);

    try {
      // Step 1: Is this user a staff member?
      const { data: staffRow, error: staffErr } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (staffErr) {
        console.error('[AuthContext] staff lookup error:', staffErr.message);
      }

      if (!staffRow) {
        // Not a staff member → superadmin / full access
        setAllowedNavKeys(null);
        setAssignedProjectIds(null);
        return;
      }

      // Step 2a: Load nav keys via staff_role_assignments → role_permissions
      const { data: roleAssignments } = await supabase
        .from('staff_role_assignments')
        .select('role_id')
        .eq('staff_id', staffRow.id);

      if (roleAssignments && roleAssignments.length > 0) {
        const roleIds = [...new Set(roleAssignments.map((r: any) => r.role_id))];
        const { data: perms } = await supabase
          .from('role_permissions')
          .select('nav_key')
          .in('role_id', roleIds);

        const keys = [...new Set((perms || []).map((p: any) => p.nav_key as string))];
        setAllowedNavKeys(keys);
      } else {
        // Staff member with no role assigned → no nav items
        setAllowedNavKeys([]);
      }

      // Step 2b: Load assigned project IDs
      // NOTE: The assignment UI writes to staff_role_assignments (staff_id → project_id),
      // NOT to staff_project_assignments. So we derive project IDs from staff_role_assignments.
      const { data: projectAssignments, error: projErr } = await supabase
        .from('staff_role_assignments')
        .select('project_id')
        .eq('staff_id', staffRow.id);

      if (projErr) {
        console.error('[AuthContext] project assignments error:', projErr.message);
      }

      const projectIds = [...new Set((projectAssignments || []).map((a: any) => a.project_id as string))];
      setAssignedProjectIds(projectIds);

    } catch (err: any) {
      console.error('[AuthContext] loadStaffPermissions failed:', err?.message);
      // On unexpected error → grant full access to avoid lockout
      setAllowedNavKeys(null);
      setAssignedProjectIds(null);
    } finally {
      loadingRef.current = false;
      setAuthLoading(false);
    }
  };

  // ─── Auth state management ─────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);

      if (initialSession?.user) {
        await loadStaffPermissions(initialSession.user.id);
      } else {
        setAllowedNavKeys(null);
        setAssignedProjectIds(null);
        setAuthLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setAllowedNavKeys(null);
        setAssignedProjectIds(null);
        setMimicTarget(null);
        setLoading(false);
        setAuthLoading(false);
        loadingRef.current = false;
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
        if (newSession?.user) {
          loadingRef.current = false; // allow reload on sign-in
          await loadStaffPermissions(newSession.user.id);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ─── Auth helpers ──────────────────────────────────────────────────────────

  const signUp = async (email: string, password: string, metadata: { fullName?: string; avatarUrl?: string } = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: metadata?.fullName || '', avatar_url: metadata?.avatarUrl || '' },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  };

  const isEmailVerified = () => user?.email_confirmed_at !== null;

  const getUserProfile = async () => {
    if (!user) return null;
    const { data, error } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();
    if (error) throw error;
    return data;
  };

  const isSuperAdmin = (): boolean => {
    if (!user) return false;
    return (
      user.email === 'junutala@gmail.com' ||
      user.user_metadata?.role === 'superadmin' ||
      allowedNavKeys === null
    );
  };

  const startMimic = (target: MimicTarget) => setMimicTarget(target);
  const stopMimic = () => setMimicTarget(null);

  // ─── Context value ─────────────────────────────────────────────────────────
  const value: AuthContextValue = {
    user,
    session,
    loading,
    authLoading,
    allowedNavKeys,
    assignedProjectIds,
    mimicTarget,
    startMimic,
    stopMimic,
    isSuperAdmin,
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    isEmailVerified,
    getUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
