---
name: explain
description: อธิบายโค้ดพร้อม diagram และตัวอย่างที่เข้าใจง่าย
allowed-tools: Read, Glob, Grep
---

# อธิบายโค้ด

## วิธีอธิบาย
เมื่ออธิบายโค้ด ให้ทำตามขั้นตอนนี้:

1. **เริ่มด้วยการเปรียบเทียบ**: เปรียบโค้ดกับสิ่งในชีวิตประจำวัน
2. **แสดง Flow**: ใช้ ASCII art หรือ diagram แสดง execution flow
3. **อธิบายทีละขั้น**: บอกว่าแต่ละบรรทัดทำอะไร
4. **ชี้ Pattern สำคัญ**: React patterns, hooks, state management
5. **เตือน Gotchas**: ข้อผิดพลาดที่มักเจอ

## สำหรับ React Components
- อธิบาย Props และ State
- แสดงวิธีทำงานของ Hooks (useState, useMemo, useCallback)
- วาด Component hierarchy ถ้าจำเป็น
- อธิบาย Data flow

## ตัวอย่าง Diagram
```
┌─────────────────────────────────────┐
│           App Component             │
│  ┌─────────┐    ┌─────────────┐    │
│  │ State   │───▶│ Child       │    │
│  │ (user)  │    │ Components  │    │
│  └─────────┘    └─────────────┘    │
└─────────────────────────────────────┘
```

## ภาษาที่ใช้
- อธิบายเป็นภาษาไทย
- ใช้ศัพท์ทางเทคนิคเมื่อจำเป็น
- ยกตัวอย่างที่เข้าใจง่าย
