---
name: commit
description: สร้าง Git commit พร้อมข้อความที่เหมาะสมสำหรับการเปลี่ยนแปลง
allowed-tools: Bash(git *)
---

# Git Commit

## ขั้นตอน
เมื่อต้องการ commit การเปลี่ยนแปลง:

1. **ตรวจสอบสถานะ**: รัน `git status` และ `git diff`
2. **วิเคราะห์การเปลี่ยนแปลง**: ดูว่าแก้ไขอะไรบ้าง
3. **Stage ไฟล์**: เลือก stage เฉพาะไฟล์ที่เกี่ยวข้อง
4. **เขียน commit message**: ตาม format ด้านล่าง
5. **Commit**: สร้าง commit

## Commit Message Format
```
<type>: <description>

[optional body]

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

## Types
- `feat`: ฟีเจอร์ใหม่
- `fix`: แก้ bug
- `style`: แก้ไข styling/UI
- `refactor`: ปรับปรุงโค้ดไม่เปลี่ยนพฤติกรรม
- `docs`: เอกสาร
- `chore`: งานทั่วไป (config, dependencies)

## ตัวอย่าง
```
feat: เพิ่มระบบ OCR สแกนใบเสร็จ

- เชื่อมต่อ Gemini API สำหรับวิเคราะห์รูปภาพ
- ดึงยอดเงินและรายการจากใบเสร็จอัตโนมัติ
- รองรับถ่ายรูปและเลือกไฟล์

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

## ข้อควรระวัง
- ไม่ commit ไฟล์ .env หรือ API keys
- ไม่ใช้ --force push
- ไม่ amend commit เว้นแต่จะถูกร้องขอ
