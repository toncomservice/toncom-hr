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

// ==================== TRANSACTIONS ====================
export const getAllTransactions = async () => {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });
  if (error) { console.error('getAllTransactions error:', error); return []; }
  return data.map(t => ({
    id: t.id, type: t.type, amount: parseFloat(t.amount) || 0,
    category: t.category || '', projectId: t.project_id || '',
    description: t.description || '', date: t.date,
    createdBy: t.created_by || '', advanceStaffId: t.advance_staff_id || null,
  }));
};

export const upsertTransaction = async (transaction) => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('transactions').upsert({
    id: transaction.id, type: transaction.type,
    amount: parseFloat(transaction.amount) || 0,
    category: transaction.category || '',
    project_id: transaction.projectId || null,
    description: transaction.description || '',
    date: transaction.date, created_by: transaction.createdBy || '',
    advance_staff_id: transaction.advanceStaffId || null,
  });
  if (error) throw error;
};

export const deleteTransactionById = async (id) => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
};

// ==================== PROJECTS ====================
export const getAllProjectsFromDB = async () => {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('projects').select('*').order('created_at', { ascending: true });
  if (error) { console.error('getAllProjects error:', error); return []; }
  return data.map(p => ({ id: p.id, name: p.name, client: p.client || '', status: p.status }));
};

export const upsertProject = async (project) => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('projects').upsert({
    id: project.id, name: project.name,
    client: project.client || '', status: project.status || 'in_progress',
  });
  if (error) throw error;
};

// ==================== ATTENDANCE ====================
export const getAllAttendanceFromDB = async () => {
  const supabase = getSupabase();
  if (!supabase) return {};
  const { data, error } = await supabase.from('attendance').select('*');
  if (error) { console.error('getAllAttendance error:', error); return {}; }
  const nested = {};
  for (const row of data) {
    if (!nested[row.staff_id]) nested[row.staff_id] = {};
    nested[row.staff_id][row.month] = {
      workDays: row.work_days, lateDays: row.late_days,
      absentDays: row.absent_days, leaveDays: row.leave_days,
      bonusAmount: parseFloat(row.bonus_amount) || 0,
    };
  }
  return nested;
};

export const upsertAttendance = async (data) => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('attendance').upsert({
    staff_id: data.staffId, month: data.month,
    work_days: data.workDays || 0, late_days: data.lateDays || 0,
    absent_days: data.absentDays || 0, leave_days: data.leaveDays || 0,
    bonus_amount: parseFloat(data.bonusAmount) || 0,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'staff_id,month' });
  if (error) throw error;
};

// ==================== ADVANCES ====================
export const getAllAdvancesFromDB = async () => {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('advances').select('*').order('date', { ascending: false });
  if (error) { console.error('getAllAdvances error:', error); return []; }
  return data.map(a => ({
    id: a.id, staffId: a.staff_id, amount: parseFloat(a.amount) || 0,
    date: a.date, month: a.month, description: a.description || '',
  }));
};

export const insertAdvance = async (advance) => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('advances').insert({
    id: advance.id, staff_id: advance.staffId,
    amount: parseFloat(advance.amount) || 0,
    date: advance.date, month: advance.month,
    description: advance.description || '',
  });
  if (error) throw error;
};

export const deleteAdvanceById = async (id) => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('advances').delete().eq('id', id);
  if (error) throw error;
};

// ==================== BONUSES ====================
export const getAllBonusesFromDB = async () => {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('bonuses').select('*').order('date', { ascending: false });
  if (error) { console.error('getAllBonuses error:', error); return []; }
  return data.map(b => ({
    id: b.id, staffId: b.staff_id, amount: parseFloat(b.amount) || 0,
    date: b.date, month: b.month, description: b.description || '',
  }));
};

export const insertBonus = async (bonus) => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('bonuses').insert({
    id: bonus.id, staff_id: bonus.staffId,
    amount: parseFloat(bonus.amount) || 0,
    date: bonus.date, month: bonus.month,
    description: bonus.description || '',
  });
  if (error) throw error;
};

// ==================== WAGE HISTORY ====================
export const getAllWageHistory = async () => {
  const supabase = getSupabase();
  if (!supabase) return {};
  const { data, error } = await supabase
    .from('wage_history').select('*').order('effective_date', { ascending: true });
  if (error) { console.error('getAllWageHistory error:', error); return {}; }
  const map = {};
  for (const row of data) {
    if (!map[row.staff_id]) map[row.staff_id] = [];
    map[row.staff_id].push({
      dailyWage: parseFloat(row.daily_wage) || 0,
      effectiveDate: row.effective_date,
    });
  }
  return map;
};

export const upsertWageHistoryEntry = async (staffId, dailyWage, effectiveDate) => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('wage_history').upsert({
    staff_id: staffId, daily_wage: parseFloat(dailyWage) || 0, effective_date: effectiveDate,
  }, { onConflict: 'staff_id,effective_date' });
  if (error) throw error;
};

export const deleteWageHistoryEntry = async (staffId, effectiveDate) => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('wage_history').delete()
    .eq('staff_id', staffId).eq('effective_date', effectiveDate);
  if (error) throw error;
};

export const updateWageHistoryDate = async (staffId, originalDate, newDate) => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('wage_history')
    .update({ effective_date: newDate })
    .eq('staff_id', staffId).eq('effective_date', originalDate);
  if (error) throw error;
};

// ==================== PROFILE FIELDS ====================
export const updateProfileFields = async (username, fields) => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('profiles').update(fields).eq('username', username);
  if (error) throw error;
};
