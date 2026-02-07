---
name: fix
description: แก้ไข bug หรือปัญหาในแอป Money Tracker Pro
allowed-tools: Read, Write, Glob, Grep, Bash(npm run dev:*)
---

# แก้ไข Bug

## ขั้นตอนการแก้ไข

### 1. ทำความเข้าใจปัญหา
- ถามรายละเอียดของ bug
- ขั้นตอนการ reproduce
- Expected vs Actual behavior
- Error message (ถ้ามี)

### 2. หาสาเหตุ
- อ่านโค้ดที่เกี่ยวข้อง
- ตรวจสอบ console errors
- ดู state และ props flow
- ใช้ Grep หา pattern ที่เกี่ยวข้อง

### 3. แก้ไข
- แก้ไขโค้ดที่มีปัญหา
- ไม่ทำ over-engineering
- รักษา pattern เดิมของโปรเจกต์

### 4. ทดสอบ
- รัน dev server ทดสอบ
- ทดสอบ case ที่ bug เกิด
- ทดสอบ case อื่นๆ ที่อาจได้รับผลกระทบ

## Common Issues

### State ไม่ update
```jsx
// ผิด - mutate state โดยตรง
data.push(newItem);
setData(data);

// ถูก - สร้าง array ใหม่
setData([...data, newItem]);
```

### useEffect infinite loop
```jsx
// ผิด - ไม่มี dependency array
useEffect(() => {
  fetchData();
});

// ถูก - มี dependency array
useEffect(() => {
  fetchData();
}, []);
```

### useMemo ไม่ทำงาน
```jsx
// ตรวจสอบว่า dependencies ถูกต้อง
const computed = useMemo(() => {
  return expensiveCalculation(data);
}, [data]); // ต้องใส่ทุก dependency
```

### Event handler
```jsx
// ผิด - เรียกฟังก์ชันทันที
onClick={handleClick(id)}

// ถูก - ส่ง function reference
onClick={() => handleClick(id)}
```

## Debug Tips
- ใช้ `console.log` ดู state/props
- ตรวจสอบ Network tab สำหรับ API calls
- ดู React DevTools (ถ้ามี)
