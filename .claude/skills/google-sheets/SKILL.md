---
name: google-sheets
description: คำแนะนำการเชื่อมต่อ Google Sheets สำหรับเก็บข้อมูลถาวร
allowed-tools: Read, Write, WebSearch
---

# Google Sheets Integration Guide

## ภาพรวม
แอปนี้ออกแบบโครงสร้างข้อมูลให้รองรับการเชื่อมต่อ Google Sheets ในอนาคต

## โครงสร้างข้อมูลปัจจุบัน

### 1. Transactions Sheet
| Column | Type | Description |
|--------|------|-------------|
| id | string | Transaction ID (T001, T002...) |
| type | string | 'income' หรือ 'expense' |
| amount | number | จำนวนเงิน |
| category | string | หมวดหมู่ |
| projectId | string | รหัสโปรเจกต์ |
| description | string | รายละเอียด |
| date | string | วันที่ (YYYY-MM-DD) |
| createdBy | string | ผู้บันทึก |

### 2. Projects Sheet
| Column | Type | Description |
|--------|------|-------------|
| id | string | Project ID (P001, P002...) |
| name | string | ชื่อโปรเจกต์ |
| client | string | ชื่อลูกค้า |
| status | string | 'in_progress' หรือ 'completed' |

### 3. Attendance Sheet
| Column | Type | Description |
|--------|------|-------------|
| staffId | string | รหัสพนักงาน |
| month | string | เดือน (YYYY-MM) |
| workDays | number | จำนวนวันทำงาน |
| lateDays | number | จำนวนวันมาสาย |
| absentDays | number | จำนวนวันขาด |
| leaveDays | number | จำนวนวันลา |

### 4. Advances Sheet
| Column | Type | Description |
|--------|------|-------------|
| id | string | Advance ID (A001, A002...) |
| staffId | string | รหัสพนักงาน |
| amount | number | จำนวนเงิน |
| date | string | วันที่เบิก |
| description | string | หมายเหตุ |
| month | string | เดือนที่หัก (YYYY-MM) |

## วิธีเชื่อมต่อ (อนาคต)

### Option 1: Google Apps Script
1. สร้าง Google Sheet
2. เปิด Extensions > Apps Script
3. เขียน doGet/doPost endpoints
4. Deploy as Web App
5. เรียกจาก React ผ่าน fetch

### Option 2: Google Sheets API
1. สร้าง Project ใน Google Cloud Console
2. Enable Google Sheets API
3. สร้าง Service Account
4. Share sheet กับ service account
5. ใช้ googleapis library

## Code Example (Future)
```javascript
// ฟังก์ชันสำหรับบันทึกลง Google Sheets
const saveToSheets = async (data, sheetName) => {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'insert', sheet: sheetName, data })
  });
  return response.json();
};
```
