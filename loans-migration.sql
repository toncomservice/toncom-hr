-- ============================================================
-- เพิ่มระบบเงินกู้ (Loans)
-- วิธีใช้: Copy ทั้งหมด แล้ว Paste ใน Supabase > SQL Editor > Run
-- ============================================================

CREATE TABLE IF NOT EXISTS loans (
  id          TEXT PRIMARY KEY,
  lender      TEXT NOT NULL,                 -- ผู้ให้กู้
  type        TEXT NOT NULL DEFAULT 'borrow',-- 'borrow' = กู้เข้ามา, 'repay' = จ่ายคืน
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  date        DATE NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_loans"
  ON loans FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- ยอดคงค้าง = ผลรวม borrow - ผลรวม repay (ทั้งระบบ และแยกตาม lender)
-- ============================================================
