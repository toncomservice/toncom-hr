---
name: transaction
description: จัดการรายการรายรับ-รายจ่าย และการบันทึกข้อมูล
allowed-tools: Read, Write, Grep
---

# Transaction Management

## โครงสร้างข้อมูล Transaction

```javascript
{
  id: 'T001',
  type: 'income' | 'expense',
  amount: 15000,
  category: 'ค่าติดตั้ง',
  projectId: 'P001',
  description: 'ค่าติดตั้งกล้อง 8 ตัว',
  date: '2025-01-15',
  createdBy: 'admin'
}
```

## Categories

### รายรับ (INCOME_CATEGORIES)
- ค่าติดตั้ง
- ค่าบริการ
- ค่าซ่อมบำรุง
- ค่าอุปกรณ์
- อื่นๆ

### รายจ่าย (EXPENSE_CATEGORIES)
- ค่าอุปกรณ์
- ค่าเดินทาง
- ค่าแรงช่าง
- ค่าอาหาร
- ค่าเบ็ดเตล็ด
- อื่นๆ

## ฟีเจอร์

### การบันทึก
1. เลือกประเภท (รายรับ/รายจ่าย)
2. ใส่จำนวนเงิน
3. เลือกโปรเจกต์
4. เลือกหมวดหมู่
5. ใส่รายละเอียด (มี Autocomplete)
6. เลือกวันที่
7. กดบันทึก

### OCR สแกนใบเสร็จ
1. กดถ่ายรูป/เลือกรูป
2. ใส่ Gemini API Key (ครั้งแรก)
3. ระบบดึงข้อมูลจากใบเสร็จ
4. กรอกยอดเงินและรายการอัตโนมัติ

### การแก้ไข/ลบ
- กดไอคอน Edit เพื่อแก้ไข
- กดไอคอน Trash เพื่อลบ
- มี confirm ก่อนลบ

## Handlers

```javascript
// บันทึกรายการ
const handleSaveTransaction = (transaction) => {
  if (editingTransaction) {
    // แก้ไข
    setTransactions(prev =>
      prev.map(t => t.id === transaction.id ? transaction : t)
    );
  } else {
    // เพิ่มใหม่
    setTransactions(prev => [...prev, transaction]);
  }
};

// ลบรายการ
const handleDeleteTransaction = (id) => {
  setTransactions(prev => prev.filter(t => t.id !== id));
};
```

## Filter
- สามารถ filter ตามโปรเจกต์
- แสดงรายการล่าสุดก่อน
