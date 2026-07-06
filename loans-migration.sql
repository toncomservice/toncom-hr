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
-- แอปใช้ login เอง (custom auth) บทบาทจริงคือ anon → policy ต้องเปิดให้ anon เขียนได้
-- เหมือนตารางอื่น ไม่งั้น insert จะโดน RLS block (error 42501)
DROP POLICY IF EXISTS "auth_all_loans" ON loans;
CREATE POLICY "anon_all_loans"
  ON loans FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- ยอดคงค้าง = ผลรวม borrow - ผลรวม repay (ทั้งระบบ และแยกตาม lender)
-- ============================================================
