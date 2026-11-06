---
version: 1
slug: "web-src"
primary_target: "web/src"
related_targets: []
---

# Surface: Wholesale Order web app (whole app rebuild)

Mode: Operate. Customers and field sales on phones; admins on desktop PCs in an office. The company wholesales pet food and supplies.
Job: customers find and order SKUs, then always know where each order stands and whose turn it is. Admins clear the queue with nothing dropped.
Scope: new `web/` on the existing API. Customer home, orders, order detail, catalog + cart + scanner + SKU paste, admin queue + detail, settings, login.
Unresolved: sales-rep role, out-of-app notifications, attachments, post-submit edit policy (see PRODUCT.md).

## Direction contract

THESIS: An order wears a hang tag, like a bag of pet food on the shelf: one tag per order view naming the next step and who does it, instead of a coloured status pill in a table.

OWN-WORLD: User-pinned "bright pet-food bag" (replaces the Highway world, 2026-11-05). Deep bag teal #0E5E5A rail and primary actions; kibble orange #F07A3A only for "your turn" (tag, chips, count block) with dark ink text, plus paws; mint-white ground #F1F7F5, white panels, ink #16262B; info blue #2A63C9, danger red #CC3344. Mitr for headings and numerals, Anuphan for body, JetBrains Mono for SKU/barcode only. Pill buttons, 20px panel radius. Paw-print progress trail.

STORY: The customer sees at once which order waits on them (orange), reads the tag, acts. The admin sees counts as big rolling numerals, takes an order, moves it along.

FIRST VIEWPORT: Customer home: teal rail left (bottom bar on phone); title row with "สร้างคำสั่งซื้อ"; three count cards as big numerals, the "ถึงตาคุณ" one filled orange; open orders left, selected order right with its hang tag above the paw trail.

FORM: user-pinned world (pet-food bag) over the earlier direction roll seed:a18a15b296fbf4df (whose assigned Highway world the user replaced). Effects are user-requested at full strength via react-bits: a code-drawn morning meadow behind sign-in (replaced Ballpit on 2026-11-05 at the user's request), BlurText headline, a morning sky with slowly turning sun rays behind the work area plus a meadow at the foot of the rail (replaced DotGrid on 2026-11-05; pollen and the ClickSpark click effect were removed the same day at the user's request), SpotlightCard sunlight + CountUp count blocks, CSS sun glints round the orange ถึงตาคุณ count card (replaced the canvas StarBorder for CPU cost), CSS page entrance (replaced AnimatedContent/gsap for bundle size). All respect prefers-reduced-motion; tables and forms carry no effect of their own.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
