---
name: ocr
description: ตั้งค่าและทดสอบระบบ OCR สแกนใบเสร็จด้วย Gemini API
allowed-tools: Read, Write, WebFetch
---

# OCR Receipt Scanner Setup

## วิธีใช้งาน OCR ในแอป
1. ไปที่หน้า "เพิ่มรายการใหม่"
2. กดปุ่ม "ถ่ายรูป / เลือกรูปใบเสร็จ"
3. ใส่ Gemini API Key (ครั้งแรก)
4. เลือกรูปใบเสร็จ
5. ระบบจะดึงยอดเงินและรายการมากรอกอัตโนมัติ

## ขอ Gemini API Key
1. ไปที่ https://aistudio.google.com/apikey
2. Login ด้วย Google Account
3. กด "Create API Key"
4. Copy key มาใส่ในแอป

## โครงสร้าง API Call
```javascript
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent

Body:
{
  "contents": [{
    "parts": [
      { "text": "prompt..." },
      { "inlineData": { "mimeType": "image/jpeg", "data": "base64..." } }
    ]
  }]
}
```

## Expected Response
```json
{
  "amount": 1500,
  "items": "สาย LAN 2 ม้วน",
  "date": "2025-01-15",
  "vendor": "ร้านคอมพิวเตอร์ ABC"
}
```

## Troubleshooting
- **"กรุณาใส่ Gemini API Key"**: ต้องใส่ API key ก่อนใช้งาน
- **"ไม่สามารถเชื่อมต่อ API"**: ตรวจสอบ internet และ API key
- **"ไม่สามารถอ่านข้อมูล"**: รูปอาจไม่ชัดหรือไม่ใช่ใบเสร็จ
