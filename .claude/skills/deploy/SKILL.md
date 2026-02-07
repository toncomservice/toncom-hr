---
name: deploy
description: คำแนะนำการ deploy แอป Money Tracker Pro ขึ้น production
disable-model-invocation: true
allowed-tools: Read, Bash(npm run build:*)
---

# Deploy to Production

## Build Production Bundle
```bash
npm run build
```

ผลลัพธ์จะอยู่ในโฟลเดอร์ `dist/`

## Deploy Options

### 1. Vercel (แนะนำ)
```bash
# ติดตั้ง Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deploy
vercel --prod
```

หรือเชื่อมต่อ GitHub repo กับ Vercel dashboard

### 2. Netlify
```bash
# ติดตั้ง Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy

# Production deploy
netlify deploy --prod
```

### 3. GitHub Pages
1. ติดตั้ง gh-pages: `npm i -D gh-pages`
2. เพิ่มใน package.json:
```json
{
  "homepage": "https://username.github.io/repo-name",
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```
3. รัน: `npm run deploy`

### 4. Firebase Hosting
```bash
# ติดตั้ง Firebase CLI
npm i -g firebase-tools

# Login
firebase login

# Init
firebase init hosting

# Deploy
firebase deploy
```

## Pre-deploy Checklist
- [ ] ทดสอบ production build (`npm run preview`)
- [ ] ตรวจสอบว่าไม่มี console.log ที่ไม่จำเป็น
- [ ] ตรวจสอบ environment variables
- [ ] ตรวจสอบ API keys (ไม่ hardcode)
- [ ] ทดสอบบน mobile device
- [ ] ตรวจสอบ bundle size

## Environment Variables
สำหรับ Gemini API Key ควรใช้ environment variable:

```env
# .env.local (ไม่ commit)
VITE_GEMINI_API_KEY=your_api_key
```

```jsx
// ใช้ในโค้ด
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
```
