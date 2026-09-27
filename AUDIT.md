# Wholesale Order — Review & Audit

วันที่ตรวจ: 25 กันยายน 2026

อัปเดตหลังแก้ไข: แก้ทั้ง 5 ประเด็นแล้วใน working tree โดยเพิ่ม schema validation, CSV formula neutralization, ตรวจ catalog ก่อน submit ภายใน write queue, serialize การเปลี่ยนสิทธิ์/สถานะแอดมิน และ reset pagination เมื่อ category URL เปลี่ยน รายการด้านล่างเป็นหลักฐานก่อนแก้ ไม่ใช่สถานะข้อผิดพลาดที่ยังเปิดอยู่ ตรวจ regression ด้วย `npm --prefix api test` (ใช้ mock SQL/Firebase และ store ใน memory) และดูขั้นตอน deploy/rollback ใน `DEPLOY.md` ยังไม่ได้ deploy server จริง

ขอบเขต: สำรวจ source code ของ React/Vite, Express API, Firebase authentication, SQL catalog, JSON order store และ Windows deployment scripts ในโปรเจกต์ Wholesale Order ตรวจแบบ static และทดสอบในเครื่องโดยไม่เชื่อม SQL หรือเปลี่ยนข้อมูลธุรกิจ ไม่ได้ตรวจโปรเจกต์ตรวจเช็ค SKU

## ผลตรวจเรียงตามความสำคัญ

### 1. [P1] ไฟล์ Order ที่เป็น JSON ถูกต้องแต่ schema ผิดอาจถูกเขียนทับเป็นข้อมูลว่าง

ตำแหน่ง: `api/src/orders/store.js:57–79`

`normalize()` เปลี่ยน `orders` ที่ไม่ใช่ array เป็น `[]` และตั้ง `nextOrderId` ที่หายไปเป็น 1 โดยไม่แจ้งข้อผิดพลาด เมื่อไฟล์ถูก restore ผิดโครงสร้างหรือเสียหายเฉพาะ schema การเขียนครั้งถัดไปผ่าน `changeStore()` จะบันทึกข้อมูลที่ถูก normalize กลับลงไฟล์ การตรวจ STORE_CORRUPT ปัจจุบันป้องกันเฉพาะ parse error เป็นหลัก ไม่ป้องกันกรณีนี้

ยืนยันด้วยการรันฟังก์ชันที่สกัดจาก source ใน memory: `{orders:{unexpected:true},nextOrderId:10}` ได้ `orders:[]`; `{orders:[{orderId:100}]}` ได้ `nextOrderId:1` ไม่ได้เปิดหรือแก้ orders.json จริง

แนวทางแก้: validate schema และความสัมพันธ์ของ ID ก่อนยอมรับไฟล์ที่มีอยู่ แยกการสร้าง store ใหม่กรณี ENOENT ออกจากการอ่าน store เดิม และปฏิเสธการเขียนเมื่อข้อมูลผิดโครงสร้าง

### 2. [P1] CSV ส่งต่อข้อความลูกค้าที่ขึ้นต้นด้วยสูตรโดยไม่ทำให้เป็นข้อความ

ตำแหน่ง: `web/src/lib/csv.js:3–11`

ฟังก์ชัน cell escape เฉพาะเครื่องหมายคำพูด แต่ส่ง customerNote และ deliveryDetails ที่ลูกค้ากรอกลง CSV โดยตรง จึงมีความเสี่ยง formula injection เมื่อแอดมินเปิดในโปรแกรม spreadsheet ที่ตีความค่าเหล่านี้เป็นสูตร

ยืนยันจาก output ของ `orderCsv()` ด้วยหมายเหตุทดสอบ `=1+1`: CSV ยังคงมีเซลล์ `"=1+1"` การใส่ double quotes อย่างเดียวไม่บังคับชนิดข้อมูลเป็น text ไม่ได้ทดสอบเปิดไฟล์ใน Excel จริง

แนวทางแก้: neutralize formula prefixes ในช่องข้อความที่ควบคุมจากภายนอก หรือส่งออกเป็น workbook ที่กำหนดชนิดเซลล์ข้อความชัดเจน และตรวจว่ารหัส SKU ที่มีเลขศูนย์นำหน้ายังคงอยู่

### 3. [P2] ส่งร่างเก่าได้โดยไม่ตรวจสินค้าปัจจุบันอีกครั้ง

ตำแหน่ง: `api/src/routes/orders.js:192–207`

ตอนสร้างร่างมี `resolveItems()` อ่านสินค้าปัจจุบันและตรวจขั้นต่ำ/สูงสุด แต่ endpoint submit ตรวจเพียงเจ้าของและสถานะ draft แล้วเปลี่ยนเป็น submitted หากสินค้าถูกปิดขายหรือเปลี่ยนข้อจำกัดหลังบันทึกร่าง ลูกค้ายังส่งร่างนั้นได้ การแก้ร่างก็ตรวจข้อจำกัดจาก snapshot เดิม

หลักฐาน: static control-flow review; ไม่เปลี่ยนสินค้าจริงเพื่อทดสอบ

แนวทางแก้: resolve รายการจาก catalog ก่อน submit แล้วตรวจเจ้าของและสถานะซ้ำภายใน write queue ก่อนบันทึก แจ้งรายการที่ต้องแก้ให้ลูกค้าทราบ

### 4. [P2] แอดมินสองคนอาจปิดใช้งานกันพร้อมกันจนไม่เหลือแอดมิน

ตำแหน่ง: `api/src/routes/users.js:170–175` และ `:138–154`

การตรวจ `assertOtherAdmin()` และการแก้บัญชี Firebase ไม่อยู่ใน critical section เดียวกัน หากมีแอดมิน A/B สองคนและส่งคำขอปิดบัญชีกันพร้อมกัน ทั้งสองคำขออาจตรวจผ่านก่อนอีกคำขอเขียนสถานะ ทำให้ทั้งคู่ถูกปิดใช้งานได้ กรณีลดบทบาทมีโครงสร้างเดียวกัน ส่วน writeQueue ของ store ครอบเฉพาะการเขียน JSON ภายหลัง

หลักฐาน: static concurrency review; ไม่ดำเนินการกับบัญชีจริง

แนวทางแก้: serialize ขั้นตอนตรวจและแก้สิทธิ์แอดมินร่วมกัน พร้อมตรวจสถานะใหม่ภายใน lock สำหรับรูปแบบ deployment ที่ใช้งาน

### 5. [P2] เปลี่ยนหมวดด้วยปุ่ม Back อาจค้างที่เลขหน้าของหมวดก่อนหน้า

ตำแหน่ง: `web/src/pages/Catalog.jsx:87–113`, `:134–139`

หมวดอยู่ใน URL แต่เลขหน้าเป็น local state และ reset เฉพาะผ่าน chooseCategory เมื่อเลือกหมวด B แล้วไปหน้าที่ 3 จากนั้นกด browser Back กลับหมวด A ค่า page ยังเป็น 3 และคำขอไม่ส่ง includeTotal เพราะส่งเฉพาะหน้า 1 จึงใช้จำนวนหน้าของ B ต่อไป หาก A มีเพียงหน้าเดียวจะแสดงไม่พบสินค้า ทั้งที่หมวดมีสินค้า

หลักฐาน: static state/effect review; ยังไม่ได้ยืนยันด้วย browser session ที่เข้าสู่ระบบ

แนวทางแก้: ให้เลขหน้าเป็นส่วนหนึ่งของ URL หรือ reset page และ total เมื่อ category URL เปลี่ยนทุกช่องทาง โดยไม่ปล่อยให้ผลคำขอเก่าทับผลใหม่

## สิ่งที่ตรวจผ่านและข้อจำกัด

- Production build ผ่าน: `npm --prefix web run build` มีคำเตือน main JavaScript chunk 632.55 kB ก่อน gzip
- Read-only guard ผ่าน: 7 allowed / 18 refused โดยไม่เชื่อมฐานข้อมูล
- ตรวจพบ role middleware, การตรวจเจ้าของ Order, parameter binding ของ catalog queries และการตัด basePrice ออกจากผลสินค้าสำหรับลูกค้าในเส้นทางที่อ่าน
- ทดสอบ CSV และ normalize ด้วยข้อมูลจำลองใน memory เท่านั้น
- ไม่ได้แก้ source code ไม่ได้แก้ข้อมูลจริง และไม่ได้เริ่ม API ซึ่งมีงาน archive ตอน startup
- ยังไม่ได้ทำ authenticated end-to-end, ตรวจหน้าจอจริง/การเข้าถึงด้วยคีย์บอร์ด, ทดสอบ restore บน Windows service, ตรวจสิทธิ์ SQL จริง หรือสแกน dependency advisories จึงยังไม่ใช่การรับรองความปลอดภัยหรือความพร้อม production ทั้งระบบ

## รอบตรวจซ้ำ — 27 กันยายน 2026

ยืนยันการแก้ 5 ประเด็นด้านบน: `npm --prefix api test` ผ่าน, schema ของ orders.json จริงผ่าน `check-store.mjs`, read-only guard ผ่าน, web build ผ่าน, API boot ได้และ `/api/health` ต่อ DB ได้ (ทดสอบบน port ชั่วคราว ไม่ได้ต่อ Firebase ด้วยบัญชีจริง)

แก้เพิ่มในรอบนี้:

1. [P2] ตรวจสินค้าตอน submit ยิง SQL ทีละบรรทัด *ภายใน write queue* — ร่าง 200 บรรทัดทำให้การบันทึกอื่นทั้งระบบรอหลายวินาที → รวมเป็น SELECT เดียวด้วย `GOODS_KEY IN (@goods0, …)` (ใช้ทั้ง submit, สร้างร่าง และสั่งซ้ำ) เพิ่ม query นี้ใน `check-read-only.mjs`
2. [P3] เลขที่ Order ใช้เดือนตาม UTC — Order ช่วง 00:00–07:00 วันที่ 1 ได้เดือนก่อนหน้า → ใช้เวลา Asia/Bangkok
3. [P3] กดอ่านการแจ้งเตือนบันทึกเวลา "ตอนนี้" — event ที่เกิดระหว่างโหลดกับเปิดถูกนับว่าอ่านแล้ว → บันทึกถึงเวลาของ event ล่าสุดที่แสดง
4. [P3] ลูกค้าได้ UID ของแอดมินในประวัติ Order → ตัด `actorId` ออกจากมุมมองลูกค้า
5. [P3] งาน archive เขียน orders.json ทุกครั้งที่ API start แม้ไม่มีอะไรต้องย้าย → ข้ามการเขียนเมื่อไม่มีรายการ
6. [P3] ข้อความ error ใน `install-service.ps1` เสีย backslash (`deploywindowsiisweb.config`) → แก้แล้ว

Regression tests เพิ่มใน `api/tests/review.test.mjs` (mock SQL/Firebase/store ทั้งหมด)

ความเสี่ยงที่ยังเหลือ (ไม่ใช่ bug): ไม่มี rate limit ที่ API, main JS bundle ~630 kB, ต้องรัน API เพียง 1 process เท่านั้น, และยังไม่ได้ทดสอบแบบ login จริงครบทุก workflow
