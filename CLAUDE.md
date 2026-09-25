# Wholesale Order — กฎของโปรเจค

## 🔒 ฐานข้อมูล SQL: อ่านอย่างเดียว (SELECT เท่านั้น)

ฐานข้อมูล SQL Server (GOODSMASTER, SKUMASTER, ICCAT, ICDEPT, UOFQTY ฯลฯ) เป็นระบบจริงของบริษัท ห้ามแก้ไขโดยเด็ดขาด

- ใช้ได้เฉพาะคำสั่ง `SELECT` เท่านั้น
- ห้าม `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `CREATE`, `ALTER`, `DROP`, `TRUNCATE`, `EXEC`/stored procedure, `SELECT ... INTO`, `GRANT`/`REVOKE` หรือคำสั่งใด ๆ ที่เปลี่ยนข้อมูล โครงสร้าง หรือสิทธิ์
- ห้ามสร้างตาราง, view, index, migration หรือ seed ในฐานข้อมูลนี้
- ห้ามรันคำสั่งกับฐานข้อมูลโดยตรงจาก terminal (`sqlcmd`, `mysql`, script เชื่อมต่อ DB ฯลฯ) เว้นแต่ผู้ใช้สั่งเองในแชท และต้องเป็น `SELECT` เท่านั้น
- query ทุกตัวในโค้ดต้องผ่าน `query()` ใน `api/src/config/db.js` ซึ่งเรียก `assertReadOnly()` อยู่แล้ว ห้ามเลี่ยง ห้ามลบ และห้ามทำให้การตรวจนี้อ่อนลง
- ถ้าแก้ `assertReadOnly()` หรือ SQL ใน `api/src/catalog/sql.js` ให้รัน `node api/scripts/check-read-only.mjs` ทุกครั้ง
- ฟีเจอร์ใหม่ที่ต้อง "เขียน" ข้อมูล (Order, ประวัติ, ข้อความ, การแจ้งเตือน, การสั่งซ้ำ) ให้เก็บใน `api/data/orders.json` ผ่าน `api/src/orders/store.js` เท่านั้น ห้ามเขียนลง SQL
- ห้ามเสนอหรือทำงาน "ย้ายไปฐานข้อมูลจริง" เว้นแต่ผู้ใช้ขอเองอีกครั้ง
