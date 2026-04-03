import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  AccountStatus,
  PaymentStatus,
  UserProfile,
  UserRole,
} from '@/types/auth';

type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  payment_status: string;
  account_status: string;
  created_at: string;
  updated_at: string;
};

const mapRow = (row: ProfileRow): UserProfile => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name,
  avatarUrl: row.avatar_url,
  role: row.role as UserRole,
  paymentStatus: row.payment_status as PaymentStatus,
  accountStatus: (row.account_status as AccountStatus) ?? 'active',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const getProfileById = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(`profiles.select failed: ${error.message}`);
  if (!data) return null;
  return mapRow(data as ProfileRow);
};

export const updateProfileDisplayName = async (
  supabase: SupabaseClient,
  userId: string,
  displayName: string,
): Promise<UserProfile> => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw new Error(`profiles.update display_name failed: ${error.message}`);
  return mapRow(data as ProfileRow);
};

export const isPaymentPaid = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('payment_status')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(`profiles.select payment_status failed: ${error.message}`);
  if (!data) return false;
  return (data as { payment_status: string }).payment_status === 'paid';
};

export const listAllProfiles = async (
  supabase: SupabaseClient,
): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`profiles.select all failed: ${error.message}`);
  return (data as ProfileRow[]).map(mapRow);
};

export const countPaidProfiles = async (
  supabase: SupabaseClient,
): Promise<number> => {
  const { data, error } = await supabase.rpc('count_paid_profiles');

  if (error) throw new Error(`count_paid_profiles rpc failed: ${error.message}`);
  return (data as number) ?? 0;
};

export const countAllProfiles = async (
  supabase: SupabaseClient,
): Promise<number> => {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('account_status', 'active');

  if (error) throw new Error(`profiles.count all failed: ${error.message}`);
  return count ?? 0;
};

export const updateAccountStatus = async (
  supabase: SupabaseClient,
  userId: string,
  status: AccountStatus,
): Promise<UserProfile> => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ account_status: status })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw new Error(`profiles.update account_status failed: ${error.message}`);
  return mapRow(data as ProfileRow);
};

export const updatePaymentStatus = async (
  supabase: SupabaseClient,
  userId: string,
  status: PaymentStatus,
): Promise<UserProfile> => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ payment_status: status })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw new Error(`profiles.update payment_status failed: ${error.message}`);
  return mapRow(data as ProfileRow);
};

export const listDisplayNames = async (
  supabase: SupabaseClient,
): Promise<{ id: string; displayName: string }[]> => {
  const { data, error } = await supabase.rpc('list_profile_display_names');

  if (error) throw new Error(`list_profile_display_names rpc failed: ${error.message}`);
  return ((data ?? []) as { id: string; display_name: string }[]).map((r) => ({
    id: r.id,
    displayName: r.display_name,
  }));
};

export const listProfilesForPublicLeaderboard = async (
  supabase: SupabaseClient,
): Promise<{ id: string; displayName: string; avatarUrl: string | null }[]> => {
  const { data, error } = await supabase.rpc('list_profiles_for_public_leaderboard');

  if (error) {
    throw new Error(`list_profiles_for_public_leaderboard rpc failed: ${error.message}`);
  }
  return ((data ?? []) as { id: string; display_name: string; avatar_url: string | null }[]).map(
    (r) => ({
      id: r.id,
      displayName: r.display_name,
      avatarUrl: r.avatar_url,
    }),
  );
};

export const updateProfileAvatarUrl = async (
  supabase: SupabaseClient,
  userId: string,
  avatarUrl: string | null,
): Promise<UserProfile> => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw new Error(`profiles.update avatar_url failed: ${error.message}`);
  return mapRow(data as ProfileRow);
};

export const hasAdminRole = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> => {
  const profile = await getProfileById(supabase, userId);
  return profile?.role === 'admin';
};
