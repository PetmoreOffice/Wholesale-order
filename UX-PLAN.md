# Wholesale Order — UX Blueprint

<!--
THESIS: An order should read like a shared work item, not a black box after checkout.
OWN-WORLD: Wholesale Control Desk uses restrained operational surfaces and a status rail with explicit ownership.
STORY: Customers find, submit, and follow an order; admins process it without losing context.
FIRST VIEWPORT: Customer opens to priority order actions; admin opens to an actionable queue with order detail on demand.
FORM: Role-specific operational workspace, using the committed Wholesale Control Desk direction.
-->

## 1. Roles and access

| Capability | Customer | Admin |
|---|---|---|
| View catalog, SKU, account price | Yes | Optional support view |
| Create/edit draft order | Yes | No, unless acting on behalf of customer |
| Submit order | Yes | No |
| See own order timeline and messages | Yes | Yes |
| Request information / add internal note | Reply to request | Yes |
| Approve, reject, move order stage | No | Yes |
| View all customers and all orders | No | Yes |

## 2. Shared order lifecycle

| Stage | Customer sees | Admin action | Customer next action |
|---|---|---|---|
| Draft | ยังไม่ได้ส่ง | — | แก้ไขและส่งคำสั่งซื้อ |
| Submitted | ส่งคำสั่งซื้อแล้ว | ตรวจสอบ | รอการตรวจสอบ |
| Need information | ต้องการข้อมูลเพิ่ม | ระบุคำถาม/สิ่งที่ขาด | ตอบหรือแนบเอกสาร |
| Approved | อนุมัติแล้ว | ส่งต่องานเตรียมสินค้า | รอการเตรียมสินค้า |
| Preparing | กำลังเตรียมสินค้า | อัปเดตความคืบหน้า | รอการจัดส่ง |
| Shipped | จัดส่งแล้ว | บันทึกเลขติดตาม/ข้อมูลจัดส่ง | ติดตามการจัดส่ง |
| Completed | เสร็จสิ้น | ปิดงาน | สั่งซ้ำหรือดูเอกสาร |
| Rejected | ไม่สามารถดำเนินการได้ | ระบุเหตุผลและแนวทาง | แก้ไข/สร้างใหม่/ติดต่อแอดมิน |

Payment and shipping must remain separate state models until their business rules are confirmed.

## 3. Customer information architecture

1. หน้าหลัก — ออเดอร์ที่ต้องดำเนินการ, สถานะล่าสุด, ปุ่มสร้างคำสั่งซื้อ
2. สินค้า — ค้นหาด้วยชื่อหรือ SKU, filter หมวดหมู่, จำนวนขั้นต่ำ, ราคาตามบัญชี และปุ่มสแกนบาร์โค้ดบนมือถือ
3. ตะกร้า — รายการ, จำนวน, หมายเหตุ, ตรวจสอบก่อนส่ง
4. คำสั่งซื้อ — รายการทั้งหมด, filter สถานะ, สั่งซ้ำ
5. รายละเอียดคำสั่งซื้อ — progress rail, activity log, ข้อความ/เอกสาร, สรุปรายการ
6. บัญชี — ข้อมูลบริษัท, ที่อยู่, ผู้ติดต่อ, เอกสารที่บันทึกไว้

## 4. Admin information architecture

1. คิวงาน — grouped by stage, filter ลูกค้า/วัน/สถานะ, saved views
2. รายละเอียด Order — order summary, line items, customer context, timeline, action panel
3. ลูกค้า — ประวัติคำสั่งซื้อ, เงื่อนไขการค้า, ผู้ติดต่อ
4. การตั้งค่า workflow — stage definitions, request templates, role permissions (later phase)

## 5. Core flows

### Customer: create order

ค้นหาสินค้า → ตรวจราคาและ MOQ → เพิ่มเข้าตะกร้า → ตรวจรายการ/หมายเหตุ → ส่งคำสั่งซื้อ → เห็น Submitted พร้อมเวลาส่งและขั้นตอนถัดไป

### Customer: scan a barcode on mobile

แตะ “สแกนบาร์โค้ด” → ขอสิทธิ์ใช้กล้องพร้อมคำอธิบาย → สแกนรหัส → แสดงแผ่นยืนยันสินค้าที่พบ (ชื่อ, SKU, หน่วยขาย, ราคา, MOQ, สถานะสต็อก) → เลือกจำนวน → เพิ่มลงตะกร้า

หากไม่พบรหัส, กล้องใช้ไม่ได้, หรือสิทธิ์ถูกปฏิเสธ ระบบต้องแสดงทางเลือกค้นหาด้วย SKU/ชื่อทันที โดยไม่ทำให้ตะกร้าหรือข้อมูลที่กรอกไว้หาย

### Customer: respond to an information request

เปิด order ที่ขึ้นว่า “ต้องการข้อมูลเพิ่ม” → อ่านคำถามเฉพาะเจาะจง → ตอบ/แนบไฟล์ → timeline แสดงว่า “ส่งข้อมูลแล้ว” → กลับสู่คิวแอดมิน

### Admin: process order

เปิดคิว Submitted → ตรวจสินค้า/จำนวน/ข้อมูลลูกค้า → อนุมัติ หรือขอข้อมูลเพิ่มพร้อม template → ระบบเพิ่ม activity log และแจ้งลูกค้า → ส่งต่อ Preparing เมื่อเริ่มจัดสินค้า

## 6. Planning decisions required before implementation

- SQL schema/API และกฎราคาตามลูกค้า, MOQ, สต็อก
- ฟิลด์ barcode ที่เชื่อมกับ SKU, รูปแบบบาร์โค้ดที่รองรับ และกรณีสินค้าหนึ่งรายการมีหลายรหัส
- ผู้มีสิทธิ์อนุมัติและการส่งต่องานระหว่างแอดมิน
- ความหมายเชิงธุรกิจของ payment และ shipping states
- การแจ้งเตือน: in-app, email, LINE, หรือช่องทางอื่น
- เอกสารที่ลูกค้าแนบได้, ขนาดไฟล์ และสิทธิ์ในการเข้าถึง
- นโยบายแก้ไข/ยกเลิก order หลังส่งแล้ว

## 7. Recommended phased delivery

### Phase 1 — usable ordering

Authentication, role guard, catalog from SQL, cart, submit order, customer order list/detail, admin queue, approve/request information/reject, shared activity log.

Mobile barcode scanning is included in Phase 1 only when the SQL/API mapping from barcode to sellable SKU is confirmed; otherwise ship search first and place scanning in Phase 2.

### Phase 2 — operational confidence

Preparing/shipped workflow, notification center, file attachments, order search/filter, audit log, repeat order.

### Phase 3 — scale

Bulk SKU order entry, CSV/Excel import, saved admin views, customer price tiers, delivery integration, analytics.

## 8. Acceptance criteria for first release

- Customer creates and submits an order without needing to contact an admin.
- Customer can identify the current stage, last update, owner, and next action in under five seconds.
- Admin can process an order from Submitted to Approved or Need information without leaving its detail context.
- Every stage-changing action creates a visible, timestamped history entry.
- Customer cannot access other customers' data or any admin action.
