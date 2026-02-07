---
name: analytics
description: วิเคราะห์กำไร-ขาดทุน และสถิติทางธุรกิจ
allowed-tools: Read, Grep
---

# Analytics & Reports

## การคำนวณกำไร-ขาดทุน

### ภาพรวมธุรกิจ
```javascript
const stats = useMemo(() => {
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    totalIncome,
    totalExpense,
    totalProfit: totalIncome - totalExpense
  };
}, [transactions]);
```

### แยกตามโปรเจกต์
```javascript
const projectStats = useMemo(() => {
  return projects.map(project => {
    const projectTx = transactions.filter(t => t.projectId === project.id);
    const income = projectTx
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = projectTx
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      ...project,
      income,
      expense,
      profit: income - expense,
      profitPercent: income > 0 ? ((income - expense) / income * 100) : 0
    };
  });
}, [projects, transactions]);
```

### แยกตามเดือน
```javascript
const currentMonth = getCurrentMonth(); // 'YYYY-MM'
const monthTransactions = transactions.filter(t =>
  t.date.startsWith(currentMonth)
);
```

## Progress Bar

```javascript
const ProgressBar = ({ income, expense }) => {
  const total = income + expense;
  const incomePercent = total > 0 ? (income / total) * 100 : 50;

  return (
    <div className="flex h-4 rounded-full overflow-hidden bg-gray-200">
      <div
        className="bg-emerald-500"
        style={{ width: `${incomePercent}%` }}
      />
      <div
        className="bg-red-400"
        style={{ width: `${100 - incomePercent}%` }}
      />
    </div>
  );
};
```

## Dashboard Cards

### StatsCard Component
```javascript
<StatsCard
  title="รายรับทั้งหมด"
  value={formatCurrency(stats.totalIncome)}
  icon={TrendingUp}
  color="emerald"
/>
```

## รายงานที่แสดง

### Owner Dashboard
- รายรับรวม
- รายจ่ายรวม
- กำไรสุทธิ
- โปรเจกต์กำลังทำ
- สรุปเดือนนี้ (Progress Bar)
- รายการล่าสุด 5 รายการ

### Project Analytics
- กำไร/ขาดทุนแต่ละโปรเจกต์
- Progress Bar เปรียบเทียบรายรับ-รายจ่าย
- เปอร์เซ็นต์กำไร
- จำนวนรายการ
