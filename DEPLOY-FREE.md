# Deploy ฟรีสำหรับ Wholesale Order

ตรวจโค้ดและเอกสารผู้ให้บริการวันที่ 5 ตุลาคม 2026

## ข้อเสนอที่เหมาะกับโค้ดปัจจุบัน

ใช้ Windows Server เดิมที่เชื่อม SQL Server ได้ รัน Node หนึ่ง process ด้วย Task Scheduler แล้วเผยแพร่ผ่าน Cloudflare Tunnel พร้อม HTTPS ใช้สคริปต์ deploy ที่มีอยู่ได้ ไม่ต้องเพิ่ม IIS สำหรับเส้นทางนี้

คำว่า “ฟรี” หมายถึงไม่มีค่าเช่าโฮสติ้งหรือ Tunnel เพิ่ม หากมีเครื่องและโดเมนอยู่แล้ว ยังมีค่าไฟ อินเทอร์เน็ต โดเมน และบริการ Firebase ตามการใช้งาน เครื่องกับอินเทอร์เน็ตต้องทำงานตลอด ไม่มีการรับประกัน uptime จากการจัดวางนี้

```text
ผู้ใช้ → HTTPS / Cloudflare → Tunnel → 127.0.0.1:3005
                                      ├─ React ที่ build แล้ว + Express API
                                      ├─ SQL Server ภายใน (อ่านอย่างเดียว)
                                      ├─ Firebase Auth
                                      └─ api/data บนดิสก์ถาวร
```

เหตุผลจากโค้ด: React/Vite อยู่ใน `web`, Express อยู่ใน `api`, API เสิร์ฟ `web/dist` ได้โดยตรง ข้อมูลออร์เดอร์และลูกค้าอยู่ใน `api/data/orders.json` พร้อม backups/archive และคิวเขียนอยู่ในหน่วยความจำ จึงต้องมีดิสก์ถาวรและรันเพียงหนึ่ง instance การนำ backend ไป cloud ยังต้องจัดเส้นทางเครือข่ายกลับมา SQL ของบริษัท

## เปรียบเทียบ

| ทางเลือก | เหมาะกับระบบนี้หรือไม่ |
|---|---|
| เครื่องเดิม + Cloudflare Tunnel | แนะนำเมื่อมีเครื่องเปิดตลอดและโดเมน: เก็บข้อมูลถาวรและใช้ SQL ในเครือข่ายเดิม |
| Windows + IIS เดิม | เหมาะหากมี HTTPS และเส้นทางเข้าใช้งานอยู่แล้ว ไม่จำเป็นต้องเปลี่ยนไป Tunnel |
| Render Free | ไม่เหมาะกับ production นี้: ไม่มี persistent disk และพักเมื่อไม่มี request 15 นาที ไฟล์ที่เขียนจะหายเมื่อ restart/redeploy |
| Vercel Hobby | ไม่เหมาะกับระบบขายส่งของบริษัท: จำกัดการใช้ส่วนตัวที่ไม่ใช่เชิงพาณิชย์ และโค้ดนี้ต้องมี backend ที่เก็บไฟล์ถาวร |
| Static hosting อย่างเดียว | วางได้เฉพาะหน้าเว็บ ยังต้องมี Express, SQL connectivity และที่เก็บออร์เดอร์ |

แหล่งข้อมูล: [Cloudflare published applications](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/) ระบุว่าไม่ต้องใช้ Access แบบเสียเงิน, [Render Free](https://render.com/docs/free), [Vercel fair use](https://vercel.com/docs/limits/fair-use-guidelines)

## ขั้นตอนติดตั้งบนเครื่องปลายทาง

1. ใช้เครื่อง Windows ที่เข้าถึง SQL ของบริษัทได้ มี Node.js ตามคู่มือ [DEPLOY.md](DEPLOY.md) และโค้ด release ที่ต้องการ อย่านำข้อมูล development ไปทับ `api/data` ของ production
2. สร้าง `api/.env` จาก `api/.env.example` เฉพาะเมื่อยังไม่มีไฟล์ กรอก SQL login แบบอ่านอย่างเดียวและ Firebase service-account path เก็บ key ที่ `api/secrets` ตั้ง `CLIENT_ORIGIN=https://order.<โดเมนจริง>`
3. สร้าง `web/.env` โดยใช้ค่าจาก `web/.env.firebase.example` ให้ครบทั้ง `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` ตั้ง `VITE_API_URL=/api` ห้ามใส่ Admin private key ในตัวแปร `VITE_*`
4. สำรอง `api/data` ของระบบเดิมก่อนอัปเดต แล้วเปิด PowerShell แบบ Administrator ที่โฟลเดอร์โปรเจกต์:

```powershell
.\deploy\windows\update.ps1 -SkipPull
# ทำต่อเมื่อคำสั่งก่อนหน้าสำเร็จเท่านั้น
.\deploy\windows\install-task.ps1
Invoke-RestMethod http://127.0.0.1:3005/api/health
```

ต้องได้ `status: ok` และ `database: connected` สคริปต์ build กำหนด API เป็น `/api` อยู่แล้ว ใช้ Task Scheduler หรือ NSSM เพียงตัวเดียว และไม่เปิด API dev server คู่กัน

5. ใช้บัญชี Cloudflare และโดเมนที่อยู่บน Cloudflare ตาม [คู่มือ Tunnel](https://developers.cloudflare.com/tunnel/get-started/) สร้าง Tunnel ชื่อ `wholesale-order` เลือก Windows แล้วทำตามคำสั่งติดตั้ง connector ที่ dashboard แสดงบนเครื่องเดียวกับ Node ติดตั้งเป็น Windows service เพื่อให้กลับมาทำงานหลัง reboot เก็บ Tunnel token เป็นความลับ
6. เพิ่ม Published application route: hostname `order.<โดเมนจริง>`, Service URL `http://127.0.0.1:3005` โดย cloudflared ต้องอยู่เครื่องเดียวกับแอป ไม่ต้องเปิด inbound port 3005 หรือ SQL สู่อินเทอร์เน็ต Firewall ต้องอนุญาต outbound ตามคู่มือ Cloudflare (Tunnel ใช้ port 7844)
7. ตั้ง Cloudflare Cache Rule ให้ bypass `/api/*` และอย่าใช้ Cache Everything กับเว็บนี้ เพื่อไม่ cache ข้อมูลเฉพาะผู้ใช้
8. เพิ่ม hostname จริงใน Firebase Authentication → Settings → Authorized domains ปิดการสมัครเองตาม [DEPLOY.md](DEPLOY.md) และตรวจว่ามีบัญชี admin ที่กำหนด role แล้ว
9. เปิด HTTPS ผ่านอินเทอร์เน็ตภายนอก ทดสอบเข้าสู่ระบบ สินค้า กล้องสแกน ออร์เดอร์ทดสอบ และหน้า admin ทดสอบ reboot ในช่วงบำรุงรักษาว่า Node กับ Tunnel กลับมาทำงานและออร์เดอร์ยังอยู่ `/api/health` อย่างเดียวไม่ได้ยืนยัน Firebase หรือ workflow ทั้งหมด
10. ตั้ง backup ออกนอกเครื่องด้วย `deploy/windows/backup-data.ps1` ตามคู่มือเดิม และตรวจว่ากู้คืนได้

ถ้ามี IIS/HTTPS เดิมที่ใช้งานได้อยู่แล้ว ให้ใช้เส้นทางเดิมต่อได้ การเปลี่ยน DNS/route ของระบบจริงควรทำหลังทดสอบ hostname ใหม่แล้ว และเก็บค่าก่อนหน้าไว้ย้อนกลับ

## หากยังไม่มีโดเมนหรือเครื่องเปิดตลอด

Cloudflare Quick Tunnel ให้ URL ชั่วคราวเพื่อทดสอบได้ แต่ไม่เหมาะเป็น URL ระบบออร์เดอร์ production ดู [ข้อจำกัด Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) หากไม่มีเครื่องเดิมด้วย ยังไม่มีข้อสรุปว่าโฮสต์ฟรีใดให้ทั้งดิสก์ถาวร การเข้าถึง SQL ภายใน และ uptime ที่เหมาะสมโดยไม่ปรับสถาปัตยกรรม

## สถานะการเตรียม

สำรวจโค้ดและเตรียมตัวอย่าง config/คู่มือแล้ว ยังไม่ได้ติดตั้งบน server หรือเผยแพร่เว็บไซต์จริง ต้องทราบเครื่องปลายทางและโดเมนที่ใช้ และเข้าถึงการตั้งค่า Cloudflare/Firebase บนบัญชีของผู้ดูแล ไม่ต้องส่งรหัสผ่านหรือ private key ผ่านแชท
