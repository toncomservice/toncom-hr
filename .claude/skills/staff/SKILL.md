---
name: staff
description: จัดการข้อมูลพนักงาน เงินเดือน และการเบิกล่วงหน้า
allowed-tools: Read, Write, Grep
---

# Staff Management

## โครงสร้างข้อมูลพนักงาน

### Users (ใน USERS constant)
```javascript
{
  staff1: {
    password: '1234',
    role: 'staff',
    name: 'สมชาย ช่างติดตั้ง',
    salary: 18000
  }
}
```

### Attendance
```javascript
{
  staff1: {
    '2025-01': {
      workDays: 22,
      lateDays: 2,
      absentDays: 1,
      leaveDays: 0
    }
  }
}
```

### Advances (เงินเบิกล่วงหน้า)
```javascript
{
  id: 'A001',
  staffId: 'staff1',
  amount: 3000,
  date: '2025-01-10',
  description: 'เบิกล่วงหน้า',
  month: '2025-01'
}
```

## การคำนวณเงินเดือน

```javascript
// หักสาย: 50 บาท/วัน
// หักขาด: 300 บาท/วัน
const deductions = (lateDays * 50) + (absentDays * 300);

// เงินเดือนสุทธิ
const netSalary = baseSalary - deductions;

// คงเหลือหลังหักเบิก
const balance = netSalary - totalAdvance;

// เบิกได้ไม่เกิน 50% ของเงินเดือน
const maxAdvance = baseSalary * 0.5;
const remainingAdvance = maxAdvance - totalAdvance;
```

## ฟีเจอร์ที่มี

### Owner สามารถ:
- ดูสรุปพนักงานทั้งหมด
- บันทึกเงินเบิกล่วงหน้า
- ดูสถิติขาด/ลา/สาย
- ดูยอดเงินเดือนสุทธิ

### Staff สามารถ:
- ดู Dashboard ส่วนตัว
- ดูเงินเดือนสุทธิ
- ดูประวัติเบิกเงิน
- ดูยอดคงเหลือที่เบิกได้

## เพิ่มพนักงานใหม่
1. เพิ่มใน USERS constant
2. เพิ่ม attendance data เริ่มต้น
3. ทดสอบ login
