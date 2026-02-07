---
name: preview
description: ทดสอบ Production build ในเครื่องก่อน deploy
allowed-tools: Bash(npm run preview:*)
---

# Preview Production Build

## วิธีใช้
ทดสอบ production build ก่อน deploy:

1. ต้อง build ก่อนด้วย `npm run build`
2. รันคำสั่ง `npm run preview`
3. เปิด browser ไปที่ URL ที่แสดง
4. ทดสอบว่าทุกอย่างทำงานเหมือน production

## ใช้เมื่อไหร่
- หลังจาก build เสร็จ
- ต้องการทดสอบ production mode
- ตรวจสอบ performance ก่อน deploy
- ทดสอบ routing และ lazy loading

## ความแตกต่างจาก dev
- ใช้ไฟล์ที่ build แล้ว (minified)
- ไม่มี HMR (Hot Module Replacement)
- แสดงผลเหมือน production จริง
