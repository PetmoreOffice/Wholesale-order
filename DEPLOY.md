# Deploy บน Windows Server

ระบบรันเป็น **Windows service ตัวเดียว** (Node.js) ที่ให้บริการทั้งหน้าเว็บและ API ส่วน **IIS** อยู่ด้านหน้าเพื่อทำ HTTPS

```
ผู้ใช้ ──HTTPS──▶ IIS (ใบรับรอง, port 443) ──▶ Node service 127.0.0.1:3005 ──▶ SQL Server (SELECT เท่านั้น)
                                              ├─ หน้าเว็บ (web/dist)          └─ Firebase Auth
                                              └─ ข้อมูล Order (api/data)
```

> HTTPS จำเป็น: browser เปิดกล้องสแกนบาร์โค้ดให้เฉพาะเว็บ HTTPS และ Firebase ต้องรู้จัก domain ของเว็บ

## 1. เตรียมเครื่อง (ครั้งเดียว)

1. ติดตั้ง **Node.js LTS** (https://nodejs.org) และ **Git for Windows**
2. ติดตั้ง **IIS** พร้อมโมดูล **URL Rewrite** และ **Application Request Routing (ARR)**
   แล้วเปิด proxy: IIS Manager → คลิกชื่อ server → *Application Request Routing Cache* → *Server Proxy Settings* → ติ๊ก **Enable proxy** → Apply
3. ดาวน์โหลด **NSSM** (https://nssm.cc) แตกไฟล์ไว้ เช่น `C:\Tools\nssm\win64\nssm.exe`
4. ตรวจว่าเครื่องนี้ต่อ SQL Server ได้ (port 1433 / firewall) และ login SQL ที่ใช้ควรมีสิทธิ์ **db_datareader เท่านั้น**

## 2. ดึงโค้ด

```powershell
cd C:\apps
git clone https://github.com/PetmoreOffice/Wholesale-order.git
cd Wholesale-order
```

## 3. คัดลอกไฟล์ที่ไม่ได้อยู่ใน Git

ไฟล์เหล่านี้ **ไม่อยู่บน GitHub** ต้องนำมาจากเครื่องพัฒนาเอง (ผ่าน USB หรือโฟลเดอร์แชร์ภายใน — ห้ามส่งทางอีเมลหรือแชท)

| ไฟล์ | หมายเหตุ |
|---|---|
| `api\.env` | ค่าเชื่อม SQL และ Firebase — แก้ตามหัวข้อด้านล่าง |
| `api\secrets\…firebase-adminsdk….json` | service account key ของ Firebase |
| `web\.env` | ค่า Firebase ฝั่งเว็บ (`VITE_FIREBASE_*`) |
| `api\data\` | เฉพาะถ้าต้องการ Order / ข้อมูลลูกค้าเดิม (ไม่ copy = เริ่มใหม่ว่าง) |

ใน `api\.env` บน server ตรวจ/เพิ่ม:

```ini
GOOGLE_APPLICATION_CREDENTIALS=C:\apps\Wholesale-order\api\secrets\<ชื่อไฟล์ key>.json
CLIENT_ORIGIN=https://order.yourcompany.co.th
# ไม่บังคับ: เก็บถาวร Order ที่ปิดแล้วหลังกี่วัน (0 = ปิด)
ORDER_ARCHIVE_DAYS=365
```

`NODE_ENV=production`, `HOST=127.0.0.1` และ `PORT=3005` ถูกตั้งให้โดย service อยู่แล้ว (port 3000 และ 3001 บน server ถูกโปรเจคอื่นใช้อยู่)

> ถ้าต้องเปลี่ยน port: ใช้ `install-service.ps1 -Port <เลข>` และแก้เลขเดียวกันใน `deploywindowsiisweb.config`
> Node.js บน server ต้องเป็น **v22 ขึ้นไป** (`node -v`) — ถ้าต่ำกว่านั้น อย่าอัปเกรดทับจนกว่าจะเช็คว่าโปรเจคอื่นบนเครื่องใช้ v22 ได้

## 4. Build และติดตั้ง service

เปิด **PowerShell แบบ Run as administrator**:

```powershell
cd C:\apps\Wholesale-order
Set-ExecutionPolicy -Scope Process Bypass
.\deploy\windows\update.ps1 -SkipPull
.\deploy\windows\install-service.ps1 -Nssm "C:\Tools\nssm\win64\nssm.exe"
```

สคริปต์จะติดตั้ง package, ตรวจ SQL read-only guard, build หน้าเว็บ, สร้าง service ชื่อ **WholesaleOrder** (เริ่มเองตอนเปิดเครื่อง และเปิดใหม่เองถ้าล่ม) แล้วเช็ค `/api/health`
Log อยู่ที่ `api\logs\`

## 5. ตั้ง IIS (HTTPS)

1. สร้างโฟลเดอร์ว่าง เช่น `C:\inetpub\wholesale-order` แล้ว copy `deploy\windows\iis\web.config` ไปไว้ในนั้น
2. IIS Manager → *Sites* → *Add Website*
   - Physical path: `C:\inetpub\wholesale-order`
   - Binding: **https**, port 443, host name `order.yourcompany.co.th`, เลือกใบรับรอง
   - เพิ่ม binding **http** port 80 ด้วย (web.config จะ redirect ไป https ให้)
3. ใบรับรอง:
   - มี domain จริงที่ออกอินเทอร์เน็ตได้ → ใช้ **win-acme** (https://www.win-acme.com) ขอ Let's Encrypt ฟรีและต่ออายุอัตโนมัติ
   - ใช้เฉพาะในวงแลน → ใช้ใบรับรองจาก CA ภายในบริษัท (ให้เครื่องลูกค้า/มือถือเชื่อถือ CA นั้น)
4. Firebase Console → Authentication → Settings → **Authorized domains** → เพิ่ม `order.yourcompany.co.th`
5. Firebase Console → Authentication → Settings → **User actions** → ปิด **Enable create (sign-up)**

เปิด `https://order.yourcompany.co.th` ควรเห็นหน้าเข้าสู่ระบบ

## 6. สำรองข้อมูลออกนอกเครื่อง

ระบบสำรองอัตโนมัติลง `api\data\backups\` อยู่แล้ว แต่ถ้าเครื่องเสียจะหายพร้อมกัน ให้ตั้ง copy `api\data` ไป NAS ทุกวัน:

```powershell
$script = "C:\apps\Wholesale-order\deploy\windows\backup-data.ps1"
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`" -Destination `"\\nas01\backup\wholesale-order`""
Register-ScheduledTask -TaskName 'Wholesale Order data backup' -Action $action -Trigger (New-ScheduledTaskTrigger -Daily -At 23:00) -User 'SYSTEM' -RunLevel Highest
```

(บัญชี SYSTEM ต้องมีสิทธิ์เขียน share นั้น ถ้าไม่มีให้รัน task ด้วย service account ที่มีสิทธิ์) เก็บย้อนหลัง 60 วัน

## อัปเดตเวอร์ชัน

หลัง push โค้ดใหม่ขึ้น GitHub แล้ว บน server (PowerShell แบบ administrator):

```powershell
cd C:\apps\Wholesale-order
.\deploy\windows\update.ps1
```

ระบบจะหยุดประมาณ 1 นาทีระหว่างติดตั้งและ build — `.env`, `secrets` และ `data` ไม่ถูกแตะ

## แก้ปัญหา

| อาการ | ตรวจ |
|---|---|
| หน้าเว็บขึ้น 502 | service ไม่ทำงาน: `Get-Service WholesaleOrder` และดู `api\logs\service-error.log` |
| เข้าสู่ระบบไม่ได้ / auth/unauthorized-domain | ยังไม่ได้เพิ่ม domain ใน Firebase Authorized domains |
| ปุ่มสแกนเปิดกล้องไม่ได้ | เปิดผ่าน http หรือ IP แทน https |
| สินค้าไม่ขึ้น | `Invoke-RestMethod http://127.0.0.1:3005/api/health` — ถ้า `database: unavailable` ตรวจค่า SQL ใน `api\.env` และ firewall |
| ไฟล์ Order เสียหาย | หยุด service → copy ไฟล์ล่าสุดใน `api\data\backups\` ทับ `api\data\orders.json` → start service |
