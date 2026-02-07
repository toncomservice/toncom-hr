# Money Tracker Pro

ระบบจัดการรายรับ-รายจ่ายสำหรับธุรกิจบริการทางเทคนิค (ติดตั้งกล้อง, Fiber Optic)

## Tech Stack
- **Framework**: React 18.3.1
- **Build Tool**: Vite 6.x
- **Styling**: Tailwind CSS 3.4.x
- **Icons**: Lucide React
- **Package Manager**: npm

## Project Structure
```
src/
├── App.jsx          # โค้ดหลักทั้งหมด (Single File Component)
├── main.jsx         # Entry point
└── index.css        # Tailwind imports
```

## Key Scripts
- `npm run dev` - Start dev server (port 3000)
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build

## Authentication
- **Owner**: username `admin`, password `1234`
- **Staff**: username `staff1` หรือ `staff2`, password `1234`

## Design System
- **Owner Theme**: Indigo (สีม่วงน้ำเงิน)
- **Staff Theme**: Emerald (สีเขียวมรกต)
- **Mobile-First**: ออกแบบสำหรับมือถือเป็นหลัก

## Features

### Owner (เจ้าของกิจการ)
1. Dashboard ภาพรวมธุรกิจ
2. บันทึกรายรับ/รายจ่าย + Autocomplete
3. AI OCR สแกนใบเสร็จ (Gemini API)
4. วิเคราะห์กำไร-ขาดทุนแยกตามโปรเจกต์
5. จัดการพนักงาน + บันทึกเงินเบิกล่วงหน้า

### Staff (พนักงาน)
1. Dashboard เงินเดือนสุทธิ
2. สรุปขาด/ลา/สาย (หักสาย 50฿, ขาด 300฿)
3. ประวัติเบิกเงินล่วงหน้า
4. ยอดคงเหลือที่เบิกได้

## Code Conventions
- ใช้ Functional Components + Hooks
- ใช้ `useMemo` สำหรับการคำนวณที่ซับซ้อน
- ใช้ Tailwind utility classes
- UI ทั้งหมดเป็นภาษาไทย
- ไม่ใช้ emoji ใน code เว้นแต่ user ขอ

## Data Structure
โครงสร้างข้อมูลรองรับการเชื่อมต่อ Google Sheets:
- `transactions`: รายการรายรับ-รายจ่าย
- `projects`: โปรเจกต์งาน
- `attendance`: บันทึกเวลาทำงาน
- `advances`: เงินเบิกล่วงหน้า

## Google Sheets Integration
แอปรองรับการเชื่อมต่อ Google Sheets เพื่อเก็บข้อมูลถาวร

### วิธีตั้งค่า
1. สร้าง Google Sheet ใหม่
2. สร้าง 4 sheets ตามชื่อนี้:
   - `Transactions`: id, type, amount, category, projectId, description, date, createdBy
   - `Projects`: id, name, client, status
   - `Attendance`: staffId, month, workDays, lateDays, absentDays, leaveDays
   - `Advances`: id, staffId, amount, date, description, month
3. ไปที่ Extensions > Apps Script
4. วางโค้ดจากไฟล์ `google-apps-script.js`
5. Deploy > New deployment > Web app
6. ตั้งค่า: Execute as: Me, Who has access: Anyone
7. Copy URL มาใส่ในแอป (ปุ่ม Settings)

### Offline Mode
- แอปทำงานได้แม้ไม่มีการเชื่อมต่อ Google Sheets
- ข้อมูลจะถูกเก็บใน localStorage
- รายการที่ยังไม่ได้ sync จะแสดงจำนวนที่ header
- สามารถ sync ทีหลังได้เมื่อเชื่อมต่อสำเร็จ

## Gemini API Integration
ใช้สำหรับ OCR สแกนใบเสร็จ:
- Model: `gemini-1.5-flash`
- Input: base64 image (inlineData)
- Output: JSON { amount, items, date, vendor }
