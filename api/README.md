# Wholesale Order API

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in database credentials and choose `DB_DIALECT=mysql` or `DB_DIALECT=mssql`.
3. Install packages: `npm install`.
4. Add Firebase Admin service-account values from `firebase.env.example` to `.env`.
5. Start the API: `npm run dev`.

## Production

When `web/dist` exists (after `npm run build` in `web/`), the API also serves the website and answers browser routes such as `/settings` with the app, so one Node process runs everything. Unknown `/api/*` paths return a JSON 404. `HOST` sets the listen address (use `127.0.0.1` behind IIS) and `WEB_DIST` overrides the site folder. Windows Server steps are in [../DEPLOY.md](../DEPLOY.md).

## Authentication and roles

- Firebase Authentication handles Email/Password sign-in and password reset.
- Every product and order request must send a valid Firebase ID token.
- Every account needs a `role` custom claim (`admin` or `customer`). An account without one is refused (HTTP 403 `NO_ROLE`), so a self sign-up gets no access. Turn off "Enable create (sign-up)" in Firebase Authentication settings as well.
- Disabled accounts and revoked sessions are refused immediately (account status is re-checked with Firebase at most once a minute).
- Only `admin` can open the Admin queue, claim orders, or change order status.
- Customer order ownership is checked with the Firebase UID, not a name supplied by the browser.

Admins create users, change roles and disable accounts from the web app's **ตั้งค่าผู้ใช้งาน** page. To bootstrap the first admin, set a role from the terminal:

```powershell
npm run role:set -- FIREBASE_UID admin
npm run role:set -- FIREBASE_UID customer
```

The user must sign out and sign in again after a role change.

## Endpoints

- `GET /api/health` — verifies database connectivity.
- `GET /api/products?q=SKU-or-name&departmentId=&groupId=&limit=50&offset=0` — searches published, sellable catalog rows. `departmentId` accepts a department (includes its sub-departments) or a sub-department; `groupId` (`dog`, `cat`, `other-pets`, `supplies`, `other`) filters a whole shelf group.
- `GET /api/products/departments` — shelf tree for the catalog: group → `ICDEPT` level 0 → level 1, each with its sellable product count (cached 10 minutes). Groups are derived from the department code's leading digit in `src/catalog/departments.js`.
- `GET /api/products/categories` — lists `ICCAT` rows that have published products. Note: `ICCAT` holds suppliers, not product groups.
- `GET /api/products/barcode/:barcode` — looks up every matching sellable unit after a mobile scan.
- `GET /api/products/:goodsId` — returns a product detail by its sellable GOODS row.
- POST /api/orders/drafts — saves a server-validated draft to the local JSON order store.
- POST /api/orders/:orderId/submit — moves a draft to submitted and creates timeline history in the local JSON order store.
- `GET /api/orders/:orderId` — returns order, items, customer-visible history, and messages.
- `GET /api/orders` — returns only orders owned by the signed-in Customer UID.
- `GET /api/orders/admin/queue?status=...` — Admin-only order queue.
- `POST /api/orders/:orderId/status` — Admin status transition with timeline history.
- POST /api/orders/:orderId/assign — records the Admin who accepts or takes over an order in the local JSON order store.
- `POST /api/orders/:orderId/reply` — Customer answers a need-information request; the order returns to the Admin queue.
- `GET /api/orders/:orderId/reorder-items` — Customer repeat order. Read-only: re-reads each line from the catalog with SELECT and returns cart-ready items plus any unavailable or quantity-adjusted lines. Nothing is written.
- `GET /api/notifications` — in-app feed derived from order history (Customers: Admin actions on their orders; Admins: new submissions and customer replies) with an unread count.
- `GET /api/admin/users` — Admin: every Firebase account with role, disabled flag, last sign-in / activity, "online now" (in-memory, last 5 minutes) and the customer profile.
- `POST /api/admin/users` — Admin: creates a Firebase account (no password; the web app then sends Firebase's set-password email), sets its role and saves the profile.
- `PATCH /api/admin/users/:uid` — Admin: updates display name, role (signs the user out so it applies) and profile. An admin cannot change their own role or demote the last admin.
- `PATCH /api/admin/users/:uid/status` — Admin: `{ "disabled": true|false }`. Disabling also revokes the user's sessions. An admin cannot disable themselves or the last active admin.
- `DELETE /api/orders/:orderId` — Customer deletes their own draft (drafts only).
- `POST /api/orders/:orderId/cancel` — Customer cancels an order before approval (`submitted`, `assigned`, `need_information`) with an optional `reason`; status becomes `cancelled` and admins are notified.
- `GET /api/admin/data` — Admin: order file size, counts, backups and archive files.
- `POST /api/admin/data/backups` — Admin: take a backup now.
- `GET /api/admin/data/backups/:name` and `GET /api/admin/data/export` — Admin: download a backup or the current data (logged in the activity log).
- `GET /api/admin/data/activity` — Admin: activity log (accounts created/disabled/role changes, backups, downloads, archiving).
- `GET /api/profile` — the signed-in user's shop name, phone, address and tax ID (used to prefill the delivery address).
- `POST /api/notifications/read` — marks the feed read for the signed-in user (stored in `data/orders.json`).

## Database safety

The API uses SQL only to read the product catalog. It does not run INSERT, UPDATE,
DELETE, CREATE, ALTER, or DROP commands against the database.

Orders, workflow history, customer messages, Admin assignment logs, and customer profiles (`customers`, keyed by Firebase UID) are stored
only in data/orders.json.

- Backups: a copy goes to `data/backups/` before a write when the last copy is over an hour old, and on demand from Settings → ข้อมูลและการสำรอง. Copies older than 30 days are pruned (the newest 10 are always kept). If orders.json is ever unreadable the API refuses to overwrite it and logs which backup to restore: stop the API and copy that file over `data/orders.json`.
- Archive: closed orders (`completed`, `rejected`, `cancelled`) untouched for `ORDER_ARCHIVE_DAYS` (default 365; `0` turns it off) move to `data/archive/orders-<year>.json` at start-up and daily. They stay readable at `GET /api/orders/:orderId`.
- Keep a copy of `data/` outside the server too; it holds customer details.

## Schema mapping

The catalog is mapped to your SQL Server tables:

- `GOODSMASTER` is the sellable product/unit row (`GOODS_KEY`, `GOODS_CODE`, `GOODS_ALIAS`, `GOODS_PRICE`).
- `SKUMASTER` provides SKU, barcode, name, minimum order, stock tracking, and publishing flags.
- `ICCAT` supplies the group attached through `SKU_ICCAT`.
- `UOFQTY` supplies the unit of sale attached through `GOODS_UTQ`.

Only rows with both GOODS and SKU flags `ENABLE='Y'` and `P_ENABLE='Y'` are returned. Rows whose alias or SKU name includes `เลิกผลิต` are excluded. A scan can return more than one GOODS row because one SKU may be sold in several units; the UI must show those choices and require a customer confirmation before adding an item to the cart.

`basePrice` maps from `GOODSMASTER.GOODS_PRICE` and is sent to admins only; customer responses (catalog, barcode, product detail, repeat order) never include a price.

For SQL Server authentication, map `server`, `port`, `database`, `username`, and `password` to `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` respectively. Set `DB_ENCRYPT` and `DB_TRUST_SERVER_CERTIFICATE` to match the existing database connection configuration.
