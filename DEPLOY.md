# Deploy บน Windows Server

ระบบรันเป็น **Windows service ตัวเดียว** (Node.js) ที่ให้บริการทั้งหน้าเว็บและ API ส่วน **IIS** อยู่ด้านหน้าเพื่อทำ HTTPS

```
ผู้ใช้ ──HTTPS──▶ IIS (ใบรับรอง, port 443) ──▶ Node service 127.0.0.1:3005 ──▶ SQL Server (SELECT เท่านั้น)
                                              ├─ หน้าเว็บ (web/dist)          └─ Firebase Auth
                                              └─ ข้อมูล Order (api/data)
```

> HTTPS จำเป็น: browser เปิดกล้องสแกนบาร์โค้ดให้เฉพาะเว็บ HTTPS และ Firebase ต้องรู้จัก domain ของเว็บ

> รัน Node เพียง **1 process / 1 instance** เท่านั้น ห้ามเปิด dev server ของ API, PM2 cluster หรือ service อีกตัวชี้ `api/data` เดียวกัน เพราะ write queue และ lock การเปลี่ยนสิทธิ์ผู้ใช้ทำงานภายใน process

## 1. เตรียมเครื่อง (ครั้งเดียว)

1. ติดตั้ง **Node.js 24 LTS** และ **Git for Windows** (รอบแก้นี้ทดสอบด้วย Node 24.15.0) ตรวจสถานะรุ่นจาก [Node.js releases](https://nodejs.org/en/about/previous-releases)
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

> ถ้าต้องเปลี่ยน port: ใช้ `install-service.ps1 -Port <เลข>` และแก้เลขเดียวกันใน `deploy\windows\iis\web.config`
> ตรวจ `node -v` และผลต่อโปรเจกต์อื่นก่อนเปลี่ยน Node ของเครื่อง หากใช้ Node แยกตำแหน่ง ให้ระบุ `install-service.ps1 -Node "C:\path\to\node.exe"` และใช้ Node รุ่นเดียวกันตอน build/test

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

### อัปเดตรอบแก้ Audit นี้

ไฟล์แก้ไขต้องถูก commit/push ไปยัง branch ที่ server ใช้งานก่อน `update.ps1` จึงจะ pull มาได้ หากส่งเป็น ZIP ให้แตกไปยังโฟลเดอร์ release ใหม่แล้วนำ `.env`, service-account key และข้อมูล server ปัจจุบันไปใช้ ห้ามนำ `api/data` จากเครื่องพัฒนาทับข้อมูล server

ก่อนอัปเดต เปิด PowerShell แบบ Administrator ในโฟลเดอร์โปรเจกต์ ใช้ path ของ server จริงแทนตัวอย่าง:

```powershell
cd C:\apps\Wholesale-order
git status --short
git rev-parse HEAD
Stop-Service WholesaleOrder
$releaseBackup = "C:\backups\WholesaleOrder\$(Get-Date -Format 'yyyy-MM-dd-HHmmss')"
New-Item -ItemType Directory -Path $releaseBackup -Force | Out-Null
Copy-Item -LiteralPath .\api\data -Destination $releaseBackup -Recurse
Copy-Item -LiteralPath .\web\dist -Destination $releaseBackup -Recurse
git rev-parse HEAD | Set-Content (Join-Path $releaseBackup 'commit.txt')
```

หาก backup ไม่สำเร็จ ให้หยุดขั้นตอน deploy และเปิด service เดิมกลับก่อน แยกเก็บ `.env` และ key อย่างปลอดภัยด้วย โฟลเดอร์ backup ต้องจำกัดสิทธิ์เพราะมีข้อมูลลูกค้า

เมื่อ backup สำเร็จ:

```powershell
.\deploy\windows\update.ps1
Get-Service WholesaleOrder
Invoke-RestMethod http://127.0.0.1:3005/api/health
```

สคริปต์ตรวจ read-only guard, schema ของ orders.json และ regression tests ที่ใช้ mock ก่อน build ถ้าขั้นตอนใดล้มเหลวอย่าถือว่า deploy สำเร็จ แม้ finally จะพยายามเปิด service กลับก็ตาม schema ที่ผิดจะถูกปฏิเสธเพื่อไม่ให้ข้อมูลถูกแทนด้วยค่าว่าง

ทดสอบผ่าน HTTPS: เข้าสู่ระบบลูกค้า/แอดมิน, เปิดสินค้า, เปลี่ยนหมวดแล้วกด Back/Forward, ตรวจ Order เดิม และทดสอบบันทึกร่าง/ส่ง Order ด้วยบัญชีทดสอบที่กำหนดไว้ `/api/health` ยืนยันการเชื่อมต่อ DB แต่ไม่ได้ยืนยัน Firebase หรือทุก workflow

### ย้อนกลับเมื่ออัปเดตไม่สำเร็จ

หยุด service ก่อน สลับกลับ commit ที่บันทึกใน `commit.txt` และติดตั้ง dependencies/build ของ commit นั้นใหม่ โดยตรวจว่าไม่มีไฟล์แก้ไขค้างก่อน switch:

```powershell
Stop-Service WholesaleOrder
$previousCommit = (Get-Content (Join-Path $releaseBackup 'commit.txt')).Trim()
git switch --detach $previousCommit
.\deploy\windows\update.ps1 -SkipPull
Get-Service WholesaleOrder
Invoke-RestMethod http://127.0.0.1:3005/api/health
```

คง `api/data` ปัจจุบันไว้เมื่อย้อนเฉพาะโค้ด เพราะการ restore backup จะทำให้ Order หลังเวลาสำรองหาย หากจำเป็นต้องกู้ข้อมูลจริง ให้เก็บสำเนาข้อมูลปัจจุบันก่อน แล้วกู้ทั้งชุด `data` รวม archive ขณะ service หยุดอยู่ หลังตรวจผลแล้วเลือก branch สำหรับอัปเดตครั้งถัดไปอีกครั้ง (สถานะ detached HEAD ใช้สำหรับ rollback)

รายละเอียด reverse proxy อ้างอิง [Microsoft: URL Rewrite + ARR](https://learn.microsoft.com/en-us/iis/extensions/url-rewrite-module/reverse-proxy-with-url-rewrite-v2-and-application-request-routing)

## แก้ปัญหา

| อาการ | ตรวจ |
|---|---|
| หน้าเว็บขึ้น 502 | service ไม่ทำงาน: `Get-Service WholesaleOrder` และดู `api\logs\service-error.log` |
| เข้าสู่ระบบไม่ได้ / auth/unauthorized-domain | ยังไม่ได้เพิ่ม domain ใน Firebase Authorized domains |
| ปุ่มสแกนเปิดกล้องไม่ได้ | เปิดผ่าน http หรือ IP แทน https |
| สินค้าไม่ขึ้น | `Invoke-RestMethod http://127.0.0.1:3005/api/health` — ถ้า `database: unavailable` ตรวจค่า SQL ใน `api\.env` และ firewall |
| ไฟล์ Order เสียหาย | หยุด service → copy ไฟล์ล่าสุดใน `api\data\backups\` ทับ `api\data\orders.json` → start service |
