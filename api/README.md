# Wholesale Order API

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in database credentials and choose `DB_DIALECT=mysql` or `DB_DIALECT=mssql`.
3. Install packages: `npm install`.
4. Add Firebase Admin service-account values from `firebase.env.example` to `.env`.
5. Start the API: `npm run dev`.

## Authentication and roles

- Firebase Authentication handles Email/Password sign-in and password reset.
- Every product and order request must send a valid Firebase ID token.
- A user without a custom role claim is treated as `customer`.
- Only `admin` can open the Admin queue, claim orders, or change order status.
- Customer order ownership is checked with the Firebase UID, not a name supplied by the browser.

Set a role after creating the user in Firebase Authentication:

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
- `POST /api/notifications/read` — marks the feed read for the signed-in user (stored in `data/orders.json`).

## Database safety

The API uses SQL only to read the product catalog. It does not run INSERT, UPDATE,
DELETE, CREATE, ALTER, or DROP commands against the database.

Orders, workflow history, customer messages, and Admin assignment logs are stored
only in data/orders.json. Back up this file before deploying or updating the app.

## Schema mapping

The catalog is mapped to your SQL Server tables:

- `GOODSMASTER` is the sellable product/unit row (`GOODS_KEY`, `GOODS_CODE`, `GOODS_ALIAS`, `GOODS_PRICE`).
- `SKUMASTER` provides SKU, barcode, name, minimum order, stock tracking, and publishing flags.
- `ICCAT` supplies the group attached through `SKU_ICCAT`.
- `UOFQTY` supplies the unit of sale attached through `GOODS_UTQ`.

Only rows with both GOODS and SKU flags `ENABLE='Y'` and `P_ENABLE='Y'` are returned. Rows whose alias or SKU name includes `เลิกผลิต` are excluded. A scan can return more than one GOODS row because one SKU may be sold in several units; the UI must show those choices and require a customer confirmation before adding an item to the cart.

`basePrice` maps from `GOODSMASTER.GOODS_PRICE`. Customer-specific pricing needs a separate price-table mapping before it is shown as a final sell price.

For SQL Server authentication, map `server`, `port`, `database`, `username`, and `password` to `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` respectively. Set `DB_ENCRYPT` and `DB_TRUST_SERVER_CERTIFICATE` to match the existing database connection configuration.
