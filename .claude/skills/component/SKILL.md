---
name: component
description: สร้าง React Component ใหม่สำหรับ Money Tracker Pro ตาม pattern ที่มีอยู่
allowed-tools: Read, Write, Glob
---

# สร้าง React Component ใหม่

## ขั้นตอน
เมื่อต้องการสร้าง component ใหม่:

1. **วิเคราะห์ความต้องการ**: ถามว่าต้องการ component แบบไหน
2. **ตรวจสอบ pattern ที่มี**: อ่าน src/App.jsx เพื่อดู style ที่ใช้
3. **สร้าง component**: ตาม pattern เดียวกัน

## Code Style ของโปรเจกต์นี้
- ใช้ Functional Components + Hooks
- ใช้ Tailwind CSS สำหรับ styling
- ใช้ Lucide React Icons
- Mobile-First design
- สี Indigo สำหรับ Owner, Emerald สำหรับ Staff
- ภาษาไทยใน UI

## Template พื้นฐาน
```jsx
const ComponentName = ({ prop1, prop2 }) => {
  const [state, setState] = useState(initialValue);

  const computedValue = useMemo(() => {
    // คำนวณค่า
  }, [dependencies]);

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      {/* Content */}
    </div>
  );
};
```

## การตั้งชื่อ
- Component: PascalCase (เช่น TransactionCard)
- Functions: camelCase (เช่น handleSubmit)
- CSS classes: Tailwind utilities
