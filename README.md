# 📈 Trading Journal System (PWA)

เว็บแอปพลิเคชัน **ระบบบันทึกและวิเคราะห์สถิติการเทรด (Trading Journal PWA)** ออกแบบสำหรับเทรดเดอร์มืออาชีพ รองรับการใช้งานแบบ Responsive ทั้งบนคอมพิวเตอร์ (Desktop) และมือถือ (Mobile) ติดตั้งลงหน้าจอหลักได้ทันที (Progressive Web App)

---

## ✨ ฟังก์ชันหลัก (Core Features)

1. **📊 Dashboard & Performance Analytics**
   - คำนวณ Net PnL, Win Rate (%), Profit Factor, Max Drawdown, และ Average Risk:Reward (R:R) แบบเรียลไทม์
   - กราฟเส้น **Equity Curve** แสดงการเติบโตของพอร์ตตามลำดับเวลา (สร้างด้วย Recharts)
   - สรุปผลตอบแทนแยกตามกลยุทธ์ (Strategy Breakdown)
   - สัดส่วนสินทรัพย์ที่เทรดบ่อย (Asset Distribution) และผลงานตามวันในสัปดาห์ (Day of Week Performance)

2. **📝 การบันทึกการเทรดแบบ Responsive (Trade Entry)**
   - **บน Desktop:** ฟอร์ม 3 คอลัมน์ กรอกง่าย พร้อมคำนวณ Planned Risk:Reward Preview แบบสด
   - **บน Mobile:** Step Wizard 3 ขั้นตอน พร้อมเปิดแป้นพิมพ์ตัวเลขทศนิยมอัตโนมัติ (`inputMode="decimal"`)
   - แนบรูปภาพ Screenshot กราฟก่อนเข้าเทรด (Setup Chart) ถ่ายรูปตรงจากกล้องมือถือได้ (`capture="environment"`)

3. **🎯 การปิดออเดอร์และสรุปผล (Close Trade & Evaluation)**
   - คำนวณกำไร/ขาดทุน ($ และ %) รวมถึงค่า R-Multiple อัตโนมัติจาก Stop Loss
   - บันทึกสภาวะจิตใจและอารมณ์ (Emotion Tags เช่น Disciplined, FOMO, Revenge, Patient ฯลฯ)
   - บันทึกสิ่งที่ได้เรียนรู้ (Lessons Learned) และแนบรูปผลลัพธ์หลังจบเทรด (Result Screenshot)

4. **🗂️ ประวัติการเทรดและ Lightbox (Trade History & Detail)**
   - **บน Desktop:** Data Table เรียง/ค้นหาตามคอลัมน์ต่าง ๆ ได้
   - **บน Mobile:** Card List กะทัดรัด แตะเพื่อดูรายละเอียด
   - Modal ดูรายละเอียดเต็ม พร้อมระบบซูมภาพกราฟ Setup vs Result (Lightbox)

5. **💼 จัดการพอร์ตและกลยุทธ์ (Portfolios & Strategies)**
   - สร้างได้หลายพอร์ต แยกสกุลเงิน (USD, THB, EUR, USDT ฯลฯ)
   - สร้างกลยุทธ์พร้อมกำหนดสี Tag ประจำกลยุทธ์

6. **📱 รองรับ PWA เต็มรูปแบบ (Progressive Web App)**
   - ไฟล์ `manifest.json`, Service Worker สำหรับออฟไลน์ และระบบแจ้งเตือนติดตั้งบน iOS / Android

---

## 🚀 วิธีเริ่มใช้งานโปรเจกต์ (Quick Start)

### 1. ติดตั้ง Dependencies (ทำครั้งแรก)
```bash
npm install
```

### 2. รันโหมดพัฒนา (Development Server)
```bash
npm run dev
```
เปิดเบราว์เซอร์ไปที่: `http://localhost:3000`

> 💡 **หมายเหตุ:** ระบบมี **Offline / Demo Mode** ในตัว ทำให้เปิดใช้งานและทดสอบฟังก์ชันทั้งหมดได้ทันทีโดยไม่ต้องตั้งค่าฐานข้อมูลล่วงหน้า

---

## 🗄️ การเชื่อมต่อกับ Supabase Cloud (ทางเลือก)

หากต้องการบันทึกข้อมูลขึ้น Cloud ของ Supabase:

1. สร้างโปรเจกต์ที่ [supabase.com](https://supabase.com)
2. ไปที่ **SQL Editor** ใน Supabase Dashboard แล้วคัดลอกคำสั่งในไฟล์ `supabase/schema.sql` ไปรัน
3. สร้างไฟล์ `.env.local` ที่ Root Directory แล้วระบุ:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here
```
4. รีสตาร์ท Server ด้วย `npm run dev` ระบบจะเชื่อมต่อไปยัง Supabase โดยอัตโนมัติ

---

## 🛠️ โครงสร้างไฟล์ในโปรเจกต์

```
├── public/
│   ├── manifest.json            # PWA Web Manifest
│   ├── sw.js                    # Service Worker แคชไฟล์
│   └── icons/                   # ไอคอน PWA ขนาด 192px และ 512px
├── supabase/
│   └── schema.sql               # โครงสร้างตาราง Postgres, RLS และ Storage
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root Layout (Sidebar, Header, BottomNav)
│   │   ├── page.tsx             # หน้า Dashboard กราฟ Equity Curve & สถิติ
│   │   ├── trades/              # หน้าประวัติการเทรด และหน้าบันทึกเทรดใหม่
│   │   ├── strategies/          # หน้าจัดการกลยุทธ์
│   │   ├── portfolios/          # หน้าจัดการพอร์ตการลงทุน
│   │   └── auth/                # หน้าเข้าสู่ระบบ / Onboarding
│   ├── components/
│   │   ├── dashboard/           # วิดเจ็ต StatCards, กราฟ Recharts ต่าง ๆ
│   │   ├── trades/              # ฟอร์ม Desktop/Mobile Wizard, ตาราง, การ์ด, Lightbox
│   │   ├── layout/              # Sidebar, BottomNav, Header, PWAInstallPrompt
│   │   └── ui/                  # Button, Input, Modal, Select, Badge, Card
│   └── lib/
│       ├── calculations.ts      # สูตรคำนวณ PnL, Win Rate, Drawdown, R:R
│       ├── storage/             # Unified Storage (Supabase + LocalStorage)
│       └── types.ts             # Data Types ทั้งหมดของระบบ
```
