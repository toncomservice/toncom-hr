import { createClient } from '@supabase/supabase-js';

// Supabase Configuration - ค่าคงที่สำหรับ production
const DEFAULT_SUPABASE_URL = 'https://awnswjeviqnkktjvovqv.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3bnN3amV2aXFua2t0anZvdnF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDk3NzAsImV4cCI6MjA4NTc4NTc3MH0.fh4xvhZEo06012esxsf_bCXciPQyyXWviARXQQrxMck';

// ดึงค่า config (ใช้ค่าคงที่)
export const getSupabaseConfig = () => {
  return {
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_ANON_KEY
  };
};

// สำหรับ backward compatibility
export const saveSupabaseConfig = () => {};
export const clearSupabaseConfig = () => {};

// ตรวจสอบว่า config ครบถ้วนหรือไม่ (เสมอ true)
export const isSupabaseConfigured = () => true;

// สร้าง Supabase client
let supabaseInstance = null;

export const getSupabase = () => {
  const { url, anonKey } = getSupabaseConfig();

  if (!url || !anonKey) {
    return null;
  }

  // สร้าง instance ใหม่ถ้ายังไม่มี หรือถ้า config เปลี่ยน
  if (!supabaseInstance) {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: localStorage,
        storageKey: 'money_tracker_auth',
      },
    });
  }

  return supabaseInstance;
};

// Reset instance (ใช้เมื่อเปลี่ยน config)
export const resetSupabaseInstance = () => {
  supabaseInstance = null;
};

// Auth helper functions
export const signIn = async (email, password) => {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase ยังไม่ได้ตั้งค่า');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentSession = async () => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export const getCurrentUser = async () => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Profile functions
export const getProfile = async (userId) => {
  console.log('getProfile called with userId:', userId);
  const supabase = getSupabase();
  if (!supabase) {
    console.log('Supabase client is null');
    return null;
  }

  try {
    const { data, error } = await Promise.race([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )
    ]);

    console.log('getProfile result - data:', data, 'error:', error);

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('getProfile error:', err);
    return null;
  }
};

export const getAllProfiles = async () => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }

  return data;
};

// Reset password for a user (admin only) - updates profiles table
export const resetUserPassword = async (userId, newPassword) => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const { error } = await supabase
    .from('profiles')
    .update({ password_hash: newPassword })
    .eq('id', userId);

  if (error) throw error;
  return { success: true };
};

// Verify password from profiles table
export const verifyPassword = async (username, password) => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .eq('password_hash', password)
    .eq('active', true)
    .single();

  if (error || !data) return null;
  return data;
};

// Get profile by username
export const getProfileByUsername = async (username) => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .eq('active', true)
    .single();

  if (error) return null;
  return data;
};

// Get setting from database
export const getSetting = async (key) => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error) return null;
  return data?.value;
};

// Save setting to database
export const saveSetting = async (key, value) => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const { error } = await supabase
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() });

  if (error) throw error;
  return { success: true };
};

// Get Google Script URL from database
export const getGoogleScriptUrl = async () => {
  return await getSetting('google_script_url');
};

// Save Google Script URL to database
export const saveGoogleScriptUrl = async (url) => {
  return await saveSetting('google_script_url', url);
};

// Get Gemini API Key from database
export const getGeminiApiKey = async () => {
  return await getSetting('gemini_api_key');
};

// Save Gemini API Key to database
export const saveGeminiApiKey = async (key) => {
  return await saveSetting('gemini_api_key', key);
};

// Subscribe to auth state changes
export const onAuthStateChange = (callback) => {
  const supabase = getSupabase();
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };

  return supabase.auth.onAuthStateChange(callback);
};

export default getSupabase;
