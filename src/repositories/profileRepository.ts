import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { PaymentStatus, UserProfile, UserRole } from '@/types/auth';

type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  payment_status: string;
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
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('payment_status', 'paid');

  if (error) throw new Error(`profiles.count paid failed: ${error.message}`);
  return count ?? 0;
};

export const countAllProfiles = async (
  supabase: SupabaseClient,
): Promise<number> => {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  if (error) throw new Error(`profiles.count all failed: ${error.message}`);
  return count ?? 0;
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
