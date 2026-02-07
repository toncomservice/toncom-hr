---
name: project
description: จัดการโปรเจกต์งานและการติดตามความคืบหน้า
allowed-tools: Read, Write, Grep
---

# Project Management

## โครงสร้างข้อมูล Project

```javascript
{
  id: 'P001',
  name: 'ติดตั้งกล้อง บ้านคุณสมศักดิ์',
  client: 'คุณสมศักดิ์',
  status: 'completed' | 'in_progress'
}
```

## สถานะโปรเจกต์

### in_progress (กำลังดำเนินการ)
- แสดงสีเหลือง
- ยังมีรายการเพิ่มเติมได้

### completed (เสร็จสิ้น)
- แสดงสีเขียว
- ปิดงานแล้ว

## ฟีเจอร์

### เพิ่มโปรเจกต์ใหม่
1. กดปุ่ม "เพิ่มโปรเจกต์"
2. ใส่ชื่อโปรเจกต์
3. ใส่ชื่อลูกค้า
4. เลือกสถานะ
5. กดบันทึก

### แก้ไขโปรเจกต์
1. กดไอคอน Edit
2. แก้ไขข้อมูล
3. กดบันทึก

### ดูสถิติโปรเจกต์
- รายรับรวมของโปรเจกต์
- รายจ่ายรวมของโปรเจกต์
- กำไร/ขาดทุน
- จำนวนรายการ
- Progress Bar

## Component Structure

```jsx
const OwnerProjects = ({ projects, transactions, onAdd, onEdit }) => {
  const projectStats = useMemo(() => {
    return projects.map(project => {
      const projectTx = transactions.filter(t => t.projectId === project.id);
      // คำนวณ income, expense, profit
      return { ...project, income, expense, profit };
    });
  }, [projects, transactions]);

  return (
    // แสดงรายการโปรเจกต์พร้อมสถิติ
  );
};
```

## Handlers

```javascript
// บันทึกโปรเจกต์
const handleSaveProject = (project) => {
  if (editingProject) {
    setProjects(prev =>
      prev.map(p => p.id === project.id ? project : p)
    );
  } else {
    setProjects(prev => [...prev, project]);
  }
};
```

## ตัวอย่างโปรเจกต์
- ติดตั้งกล้อง บ้านคุณสมศักดิ์
- เดินสาย Fiber บริษัท ABC
- ติดตั้งระบบ Network โรงแรม XYZ
