---
name: feature
description: เพิ่มฟีเจอร์ใหม่ให้แอป Money Tracker Pro ตาม pattern ที่มีอยู่
allowed-tools: Read, Write, Glob, Grep
---

# เพิ่มฟีเจอร์ใหม่

## ขั้นตอนการเพิ่มฟีเจอร์

### 1. วิเคราะห์ความต้องการ
- ถามรายละเอียดฟีเจอร์ที่ต้องการ
- ระบุว่าเป็นฟีเจอร์สำหรับ Owner หรือ Staff

### 2. ศึกษาโค้ดที่มี
- อ่าน src/App.jsx เพื่อเข้าใจโครงสร้าง
- ดู pattern ของ components ที่มีอยู่
- ตรวจสอบ state management ที่ใช้

### 3. วางแผนการพัฒนา
- ระบุ state ที่ต้องเพิ่ม
- ระบุ components ที่ต้องสร้าง/แก้ไข
- วางแผน UI/UX

### 4. Implement
- เพิ่ม state ใน App component
- สร้าง/แก้ไข components
- เพิ่ม navigation ถ้าจำเป็น
- ทดสอบทั้ง Owner และ Staff view

## Pattern ที่ใช้ในโปรเจกต์

### State Management
```jsx
const [data, setData] = useState(INITIAL_DATA);

const computedValue = useMemo(() => {
  // คำนวณจาก data
}, [data]);
```

### Component Structure
```jsx
const FeaturePage = ({ data, onAction }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">หัวข้อ</h2>
        <button className="bg-indigo-500 text-white px-4 py-2 rounded-xl">
          ปุ่ม
        </button>
      </div>
      {/* Content */}
    </div>
  );
};
```

### Modal Pattern
```jsx
const FeatureModal = ({ isOpen, onClose, onSave }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl">
        {/* Modal content */}
      </div>
    </div>
  );
};
```

## Checklist
- [ ] ใช้ Tailwind CSS ตาม design system
- [ ] รองรับ Mobile-First
- [ ] ใช้สีตาม role (Indigo/Emerald)
- [ ] UI เป็นภาษาไทย
- [ ] ใช้ useMemo สำหรับการคำนวณ
- [ ] ทดสอบทั้ง Owner และ Staff
