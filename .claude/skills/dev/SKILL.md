---
name: dev
description: เริ่ม Development Server สำหรับทดสอบแอป Money Tracker Pro ในเครื่อง
allowed-tools: Bash(npm run dev:*)
---

# เริ่ม Development Server

## วิธีใช้
รัน Vite development server สำหรับทดสอบแอป:

1. รันคำสั่ง `npm run dev` จาก root โปรเจกต์
2. Server จะเริ่มที่ http://localhost:3000
3. แอปจะ Hot Reload อัตโนมัติเมื่อแก้ไขไฟล์
4. กด Ctrl+C เพื่อหยุด server

## ใช้เมื่อไหร่
- ต้องการทดสอบ UI ที่แก้ไข
- ต้องการดูผลลัพธ์ของ React component
- Debug styling หรือ layout
- ทดสอบฟีเจอร์ใหม่

## หมายเหตุ
- Server รันที่ port 3000 (กำหนดใน vite.config.js)
- ใช้ Tailwind CSS สำหรับ styling
- รองรับ Mobile-First design
