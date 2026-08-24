# Prompt พัฒนาแอป: Trading Journal System (PWA)

คัดลอกข้อความด้านล่างทั้งหมดไปวางใน AI coding tool (เช่น Claude Code, Cursor, v0, Bolt ฯลฯ) เพื่อเริ่มพัฒนาแอปได้ทันที

---

## PROMPT

คุณคือ Senior Full-Stack Developer ช่วยพัฒนาเว็บแอปพลิเคชัน **"Trading Journal System"** — ระบบบันทึกและวิเคราะห์การเทรด ที่รองรับการใช้งานทั้งบน Desktop และ Mobile แบบ Responsive (PWA)

### 1. ภาพรวมโปรเจกต์
สร้างแอปสำหรับเทรดเดอร์ใช้บันทึกทุกออเดอร์ที่เปิด/ปิด พร้อมแนบรูปภาพ วิเคราะห์สถิติผลการเทรด (Win Rate, PnL, Equity Curve) เพื่อนำไปพัฒนากลยุทธ์การเทรดในอนาคต

### 2. Tech Stack ที่ต้องใช้
- **Frontend:** Next.js (React) + Tailwind CSS
- **Backend/Database/Auth/Storage:** Supabase (Postgres, Auth, Storage สำหรับรูปภาพ)
- **รูปแบบแอป:** PWA — ต้องติดตั้งลงหน้าจอหลักมือถือได้ (manifest.json, service worker, icon set)
- ใช้ Chart library ที่เหมาะกับ Equity Curve และกราฟสถิติ (เช่น Recharts)

### 3. Database Schema (ออกแบบเบื้องต้น ให้ปรับปรุงตามความเหมาะสม)
- `portfolios`: id, user_id, name, initial_balance, currency, created_at
- `strategies`: id, portfolio_id, name
- `trades`: id, portfolio_id, asset, side (long/short), entry_price, sl, tp, exit_price, size, fee, entry_time, exit_time, strategy_id, emotion_tag, notes, lessons_learned, status (open/closed), pnl (คำนวณอัตโนมัติ), created_at
- `trade_images`: id, trade_id, image_url, type (setup/result), uploaded_at

### 4. ฟังก์ชันหลัก (Core Features)

**4.1 การบันทึกเทรด (Trade Entry)**
- ข้อมูลพื้นฐาน: วันเวลาเข้า-ออก, สินทรัพย์ (EURUSD, BTC, หุ้น ฯลฯ), ฝั่ง Long/Short
- ตัวเลข: Entry, TP, SL, Exit, ขนาด Lot/Size, ค่าธรรมเนียม
- บริบท: กลยุทธ์ (dropdown จาก strategies ของผู้ใช้), Emotion Tags, Notes
- แนบรูปภาพ Screenshot กราฟ (อัปโหลดจากคลังภาพ หรือถ่ายรูปตรงจากมือถือ — ใช้ `<input capture>`)

**4.2 Dashboard & Analytics**
- Overview: Balance ปัจจุบัน, Net PnL รวม, Win Rate (%), Average Risk/Reward
- Equity Curve: กราฟเส้นแสดงการเติบโตของพอร์ตตามเวลา
- Performance Metrics: สรุปผลตามกลยุทธ์, ตามช่วงเวลา/วันในสัปดาห์, Max Drawdown

**4.3 ประวัติการเทรด (Trade History)**
- Desktop: แสดงเป็น Data Table เรียงหลายคอลัมน์ ซอร์ตได้
- Mobile: แสดงเป็น Card List เน้นข้อมูลสำคัญ (asset, ผลลัพธ์, วันที่)
- Filter/Search: ตามช่วงเวลา, สินทรัพย์, สถานะ (win/loss/open), กลยุทธ์
- หน้า Trade Detail: แสดงข้อมูลเต็มของออเดอร์ + รูปภาพขยายได้ (lightbox)

### 5. UX/UI Requirements (Desktop vs Mobile)

| ส่วน | Desktop | Mobile |
|---|---|---|
| Navigation | Sidebar | Bottom Navigation Bar |
| หน้าประวัติเทรด | Data Table | Card List |
| ฟอร์มบันทึกข้อมูล | หน้าเดียว แบ่ง 2-3 คอลัมน์ | Step Wizard (แบ่งเป็นขั้นตอน) |
| กรอกตัวเลข | คีย์บอร์ดปกติ | เด้ง Numpad อัตโนมัติ (`inputMode="decimal"`) |

ให้ใช้ Tailwind responsive breakpoints ตรวจจับและสลับ layout ตามอุปกรณ์จริง ไม่ใช่แค่ CSS ซ่อน/แสดง

### 6. User Flows ที่ต้อง implement ให้ครบ

**Flow 1 — Onboarding**
1. สมัครสมาชิก/เข้าสู่ระบบ (Supabase Auth)
2. สร้าง Portfolio ใหม่ (ชื่อพอร์ต, ทุนเริ่มต้น, สกุลเงิน)
3. สร้างชุด Strategy Tags ที่ใช้ประจำ

**Flow 2 — เปิดออเดอร์ (Trade Entry)**
1. กดปุ่ม "+ เพิ่มการเทรดใหม่"
2. Step 1: เลือกสินทรัพย์ / ทิศทาง / วันเวลาเข้า
3. Step 2: กรอกตัวเลข (Entry, SL, TP, Size)
4. Step 3: เลือกกลยุทธ์ + แนบรูป Setup + เหตุผลการเข้าเทรด
5. บันทึก → สถานะ "กำลังเปิด (Open)"

**Flow 3 — ปิดออเดอร์และประเมินผล**
1. เลือกออเดอร์ที่เปิดอยู่ → "ปิดออเดอร์"
2. กรอก Exit Price หรือกำไร/ขาดทุนจริง
3. ระบบคำนวณ PnL และสถานะ Win/Loss อัตโนมัติ
4. เลือก Emotion Tag + พิมพ์ Lessons Learned + แนบรูปหลังจบเทรด
5. บันทึก → สถานะ "ปิดแล้ว (Closed)"

**Flow 4 — วิเคราะห์และพัฒนา**
1. Dashboard อัปเดตทันทีที่ปิดออเดอร์ (real-time หรือ re-fetch)
2. ผู้ใช้ดู Win Rate / Equity Curve
3. ใช้ Filter วิเคราะห์ว่ากลยุทธ์ไหนกำไรดีที่สุด / คู่เงินไหนขาดทุนบ่อย

### 7. ขอบเขตงานที่ต้องการให้เริ่มทำ
กรุณาเริ่มต้นด้วย:
1. Setup โปรเจกต์ Next.js + Tailwind + Supabase client + PWA config
2. สร้าง Database schema ใน Supabase (SQL migration)
3. ทำหน้า Auth + Onboarding (Flow 1)
4. ทำฟอร์ม Trade Entry แบบ responsive (Step Wizard บนมือถือ, single-page บน desktop) (Flow 2)
5. ทำหน้า Trade History (Table/Card) + Trade Detail
6. ทำ Flow ปิดออเดอร์ + คำนวณ PnL อัตโนมัติ (Flow 3)
7. ทำ Dashboard พร้อมกราฟ Equity Curve และสถิติ (Flow 4)

ให้เขียนโค้ดที่ clean, แยก component ชัดเจน, ใช้ TypeScript, และอธิบายสั้น ๆ ก่อนเริ่มแต่ละขั้นตอนว่าจะทำอะไร

---

*หมายเหตุ: ปรับ Tech Stack (เช่น เปลี่ยน Supabase เป็น Firebase) หรือขอบเขตงานในข้อ 7 ได้ตามความต้องการจริงก่อนนำไปใช้*
