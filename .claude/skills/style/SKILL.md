---
name: style
description: ปรับแต่ง styling และ UI ของแอป Money Tracker Pro
allowed-tools: Read, Write, Glob
---

# ปรับแต่ง Styling

## Design System

### Colors
```
Owner Theme (Indigo):
- Primary: indigo-600 (#4F46E5)
- Light: indigo-50, indigo-100
- Gradient: from-indigo-600 to-purple-600

Staff Theme (Emerald):
- Primary: emerald-600 (#059669)
- Light: emerald-50, emerald-100
- Gradient: from-emerald-600 to-teal-600

Status Colors:
- Success: emerald-500
- Error: red-500
- Warning: yellow-500
- Info: blue-500
```

### Typography
```
Headings:
- text-2xl font-bold (Page title)
- text-lg font-bold (Section title)
- text-sm font-medium (Label)

Body:
- text-sm text-gray-600 (Normal)
- text-xs text-gray-400 (Caption)
- font-semibold (Emphasis)
```

### Spacing
```
- p-4 (Card padding)
- space-y-4 (Section gap)
- gap-2, gap-3 (Grid/flex gap)
- mb-3, mb-4 (Margin bottom)
```

### Components

#### Cards
```jsx
<div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
  {/* content */}
</div>
```

#### Buttons
```jsx
// Primary
<button className="bg-indigo-500 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-600 transition">

// Secondary
<button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition">

// Icon Button
<button className="p-2 hover:bg-gray-100 rounded-full transition">
```

#### Inputs
```jsx
<input className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" />
```

#### Modals
```jsx
<div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
  <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl">
```

### Responsive
```
Mobile-First approach:
- Default: mobile styles
- sm: (640px) tablet/desktop adjustments
- ใช้ items-end sm:items-center สำหรับ modal
```

### Icons
```jsx
import { IconName } from 'lucide-react';

// ขนาดมาตรฐาน
<Icon className="w-5 h-5" />  // Normal
<Icon className="w-4 h-4" />  // Small
<Icon className="w-6 h-6" />  // Large
```
