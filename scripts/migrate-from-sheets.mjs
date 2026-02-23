/**
 * Migration Script: Google Sheets → Supabase
 * วิธีใช้:
 *   1. ใส่ SUPABASE_SERVICE_ROLE_KEY ด้านล่าง
 *      (หาได้ที่ Supabase Dashboard → Settings → API → service_role key)
 *   2. รัน: node scripts/migrate-from-sheets.mjs
 */

import { createClient } from '@supabase/supabase-js';

// ===================== CONFIG =====================
const SUPABASE_URL = 'https://awnswjeviqnkktjvovqv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE'; // ← ใส่ key ที่นี่

const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbyJUwOE_Cy9fj-txRNs7o5YKMZeTJvWmdT6bliK0utSapFStRxI5ZY4ObmCY9Rh3nug/exec';
// ===================================================

if (SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
  console.error('❌ กรุณาใส่ SUPABASE_SERVICE_ROLE_KEY ในไฟล์ก่อนรัน');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ===================== FETCH FROM SHEETS =====================
async function fetchFromSheets() {
  console.log('📥 ดึงข้อมูลจาก Google Sheets...');
  const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAll`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const data = await res.json();
  if (data.error) throw new Error(`Google Sheets error: ${data.error}`);
  console.log('✅ ดึงข้อมูลสำเร็จ');
  return data;
}

// ===================== MIGRATE FUNCTIONS =====================

async function migrateTransactions(transactions) {
  if (!transactions?.length) { console.log('⏭  transactions: ไม่มีข้อมูล'); return; }

  const rows = transactions.map(t => ({
    id: String(t.id),
    type: t.type || 'expense',
    amount: parseFloat(t.amount) || 0,
    category: t.category || '',
    project_id: t.projectId || null,
    description: t.description || '',
    date: formatDate(t.date),
    created_by: t.createdBy || '',
    advance_staff_id: t.advanceStaffId || null,
  })).filter(t => t.id && t.date);

  const { error } = await supabase.from('transactions').upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`transactions: ${error.message}`);
  console.log(`✅ transactions: ${rows.length} รายการ`);
}

async function migrateProjects(projects) {
  if (!projects?.length) { console.log('⏭  projects: ไม่มีข้อมูล'); return; }

  const rows = projects.map(p => ({
    id: String(p.id),
    name: p.name || '',
    client: p.client || '',
    status: p.status || 'in_progress',
  })).filter(p => p.id && p.name);

  const { error } = await supabase.from('projects').upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`projects: ${error.message}`);
  console.log(`✅ projects: ${rows.length} รายการ`);
}

async function migrateAttendance(attendance) {
  if (!attendance || typeof attendance !== 'object') { console.log('⏭  attendance: ไม่มีข้อมูล'); return; }

  const rows = [];
  for (const [staffId, months] of Object.entries(attendance)) {
    for (const [month, data] of Object.entries(months)) {
      rows.push({
        staff_id: String(staffId),
        month: String(month),
        work_days: Number(data.workDays) || 0,
        late_days: Number(data.lateDays) || 0,
        absent_days: Number(data.absentDays) || 0,
        leave_days: Number(data.leaveDays) || 0,
        bonus_amount: parseFloat(data.bonusAmount) || 0,
      });
    }
  }

  if (!rows.length) { console.log('⏭  attendance: ไม่มีข้อมูล'); return; }

  const { error } = await supabase.from('attendance').upsert(rows, { onConflict: 'staff_id,month' });
  if (error) throw new Error(`attendance: ${error.message}`);
  console.log(`✅ attendance: ${rows.length} รายการ`);
}

async function migrateAdvances(advances) {
  if (!advances?.length) { console.log('⏭  advances: ไม่มีข้อมูล'); return; }

  const rows = advances.map(a => ({
    id: String(a.id),
    staff_id: String(a.staffId),
    amount: parseFloat(a.amount) || 0,
    date: formatDate(a.date),
    month: a.month || '',
    description: a.description || '',
  })).filter(a => a.id && a.staff_id && a.date);

  const { error } = await supabase.from('advances').upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`advances: ${error.message}`);
  console.log(`✅ advances: ${rows.length} รายการ`);
}

async function migrateBonuses(bonuses) {
  if (!bonuses?.length) { console.log('⏭  bonuses: ไม่มีข้อมูล'); return; }

  const rows = bonuses.map(b => ({
    id: String(b.id),
    staff_id: String(b.staffId),
    amount: parseFloat(b.amount) || 0,
    date: formatDate(b.date),
    month: b.month || '',
    description: b.description || '',
  })).filter(b => b.id && b.staff_id && b.date);

  const { error } = await supabase.from('bonuses').upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`bonuses: ${error.message}`);
  console.log(`✅ bonuses: ${rows.length} รายการ`);
}

async function migrateStaffData(staff) {
  if (!staff?.length) { console.log('⏭  staff/wage_history: ไม่มีข้อมูล'); return; }

  // 1. wage_history จาก wageHistory field ใน Staff sheet
  const wageRows = [];
  for (const s of staff) {
    if (!s.username) continue;
    let history = [];
    if (s.wageHistory) {
      try {
        history = typeof s.wageHistory === 'string' ? JSON.parse(s.wageHistory) : s.wageHistory;
      } catch { /* skip invalid */ }
    }
    // ถ้าไม่มี wageHistory แต่มี dailyWage ให้สร้าง entry เดียว
    if ((!history || !history.length) && s.dailyWage) {
      const effectiveDate = s.startDate ? formatDate(s.startDate) : '2024-01-01';
      history = [{ dailyWage: s.dailyWage, effectiveDate }];
    }
    for (const entry of history) {
      if (!entry.dailyWage || !entry.effectiveDate) continue;
      wageRows.push({
        staff_id: String(s.username),
        daily_wage: parseFloat(entry.dailyWage) || 0,
        effective_date: formatDate(entry.effectiveDate),
      });
    }
  }

  if (wageRows.length) {
    const { error } = await supabase
      .from('wage_history')
      .upsert(wageRows, { onConflict: 'staff_id,effective_date' });
    if (error) throw new Error(`wage_history: ${error.message}`);
    console.log(`✅ wage_history: ${wageRows.length} รายการ`);
  } else {
    console.log('⏭  wage_history: ไม่มีข้อมูล');
  }

  // 2. อัปเดต profiles: position, start_date, daily_wage
  let profileUpdates = 0;
  for (const s of staff) {
    if (!s.username) continue;
    const updates = {};
    if (s.position) updates.position = String(s.position);
    if (s.startDate) updates.start_date = formatDate(s.startDate);
    if (s.dailyWage) updates.daily_wage = parseFloat(s.dailyWage) || 0;

    if (Object.keys(updates).length === 0) continue;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('username', String(s.username));
    if (error) {
      console.warn(`  ⚠️  profiles update ${s.username}: ${error.message}`);
    } else {
      profileUpdates++;
    }
  }
  if (profileUpdates > 0) console.log(`✅ profiles updated: ${profileUpdates} คน`);
}

// ===================== UTILS =====================
function formatDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  const s = String(val).trim();
  // รูปแบบ DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // รูปแบบ YYYY-MM-DD หรือ ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.split('T')[0];
  return null;
}

// ===================== CLEAR TABLES =====================
async function clearAllTables() {
  console.log('🗑️  ลบข้อมูลเก่าออกจาก Supabase...');
  const tables = ['transactions', 'projects', 'attendance', 'advances', 'bonuses', 'wage_history'];
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().gte('created_at', '2000-01-01');
    if (error) {
      // attendance และ wage_history ไม่มี created_at — ใช้ filter อื่น
      const { error: e2 } = await supabase.from(table).delete().not('id', 'is', null);
      if (e2) {
        // fallback: ลบด้วย staff_id (attendance)
        const { error: e3 } = await supabase.from(table).delete().not('staff_id', 'is', null);
        if (e3) console.warn(`  ⚠️  ลบ ${table} ไม่สำเร็จ: ${e3.message}`);
        else console.log(`  ✅ cleared ${table}`);
      } else {
        console.log(`  ✅ cleared ${table}`);
      }
    } else {
      console.log(`  ✅ cleared ${table}`);
    }
  }
  console.log('');
}

// ===================== MAIN =====================
async function main() {
  console.log('🔄 รีเฟรชข้อมูล: Google Sheets → Supabase\n');

  try {
    const data = await fetchFromSheets();

    console.log('📊 ข้อมูลที่พบใน Google Sheets:');
    console.log(`  Transactions : ${data.transactions?.length ?? 0} รายการ`);
    console.log(`  Projects     : ${data.projects?.length ?? 0} รายการ`);
    console.log(`  Attendance   : ${Object.keys(data.attendance ?? {}).length} คน`);
    console.log(`  Advances     : ${data.advances?.length ?? 0} รายการ`);
    console.log(`  Bonuses      : ${data.bonuses?.length ?? 0} รายการ`);
    console.log(`  Staff        : ${data.staff?.length ?? 0} คน\n`);

    await clearAllTables();

    await migrateTransactions(data.transactions);
    await migrateProjects(data.projects);
    await migrateAttendance(data.attendance);
    await migrateAdvances(data.advances);
    await migrateBonuses(data.bonuses);
    await migrateStaffData(data.staff);

    console.log('\n🎉 รีเฟรชสำเร็จ! ตรวจสอบข้อมูลได้ที่ Supabase Table Editor');
  } catch (err) {
    console.error('\n❌ ล้มเหลว:', err.message);
    process.exit(1);
  }
}

main();
