-- ============================================================
-- Migration: Google Sheets → Supabase
-- วิธีใช้: Copy ทั้งหมด แล้ว Paste ใน Supabase > SQL Editor > Run
-- ============================================================

-- 1. เพิ่ม columns ใน profiles (staff data)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS daily_wage  NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS start_date  DATE,
  ADD COLUMN IF NOT EXISTS position    TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS resign_date DATE;   -- วันที่ลาออก (หยุดคิดค่าแรง ณ วันนี้)

-- 2. wage_history (ย้ายจาก localStorage)
CREATE TABLE IF NOT EXISTS wage_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id       TEXT NOT NULL,
  daily_wage     NUMERIC(10,2) NOT NULL,
  effective_date DATE NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, effective_date)
);
ALTER TABLE wage_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_wage_history"
  ON wage_history FOR ALL USING (auth.role() = 'authenticated');

-- 3. transactions
CREATE TABLE IF NOT EXISTS transactions (
  id               TEXT PRIMARY KEY,
  type             TEXT NOT NULL,
  amount           NUMERIC(12,2) NOT NULL DEFAULT 0,
  category         TEXT,
  project_id       TEXT,
  description      TEXT,
  date             DATE NOT NULL,
  created_by       TEXT,
  advance_staff_id TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_transactions"
  ON transactions FOR ALL USING (auth.role() = 'authenticated');

-- 4. projects
CREATE TABLE IF NOT EXISTS projects (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  client     TEXT,
  status     TEXT DEFAULT 'in_progress',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_projects"
  ON projects FOR ALL USING (auth.role() = 'authenticated');

-- 5. attendance
CREATE TABLE IF NOT EXISTS attendance (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id     TEXT NOT NULL,
  month        TEXT NOT NULL,
  work_days    INTEGER DEFAULT 0,
  late_days    INTEGER DEFAULT 0,
  absent_days  INTEGER DEFAULT 0,
  leave_days   INTEGER DEFAULT 0,
  bonus_amount NUMERIC(10,2) DEFAULT 0,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, month)
);
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_attendance"
  ON attendance FOR ALL USING (auth.role() = 'authenticated');

-- 6. advances
CREATE TABLE IF NOT EXISTS advances (
  id          TEXT PRIMARY KEY,
  staff_id    TEXT NOT NULL,
  amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  date        DATE NOT NULL,
  month       TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE advances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_advances"
  ON advances FOR ALL USING (auth.role() = 'authenticated');

-- 7. bonuses
CREATE TABLE IF NOT EXISTS bonuses (
  id          TEXT PRIMARY KEY,
  staff_id    TEXT NOT NULL,
  amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  date        DATE NOT NULL,
  month       TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bonuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_bonuses"
  ON bonuses FOR ALL USING (auth.role() = 'authenticated');

-- 8. loans (เงินกู้เข้ามาหมุนในระบบ + การจ่ายคืน)
CREATE TABLE IF NOT EXISTS loans (
  id          TEXT PRIMARY KEY,
  lender      TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'borrow',  -- 'borrow' | 'repay'
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  date        DATE NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_loans" ON loans;
CREATE POLICY "anon_all_loans"
  ON loans FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- เสร็จแล้ว! ตรวจสอบได้ที่ Table Editor ใน Supabase Dashboard
-- ============================================================
