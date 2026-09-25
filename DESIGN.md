---
name: Wholesale Control Desk
description: A role-based wholesale ordering workspace with transparent order progress.
---

# Design System: Wholesale Control Desk

<!-- Documented from the implementation (Sprint 3). Source of truth for tokens: web/src/index.css -->

## Overview

**Creative North Star: "The Wholesale Control Desk"**

This is an operational web system, not a storefront. It turns the familiar artifacts of wholesale work—an order sheet, a dispatch queue, and a handoff log—into a calm shared workspace. Customer screens reduce uncertainty: every order answers where it is, who owns the next step, and whether the customer needs to act. Admin screens privilege queue clarity, fast review, and accountable handoff.

**Key Characteristics:**

- Intentional density that preserves scanning and decision clarity.
- A shared progress rail makes order state legible across roles.
- Product truth and actions lead; decoration never competes with work.

## Colors

Restrained, role-neutral surfaces with a single operational accent (green) and one highlight (lime) reserved for the brand mark, the active nav item and the cart's primary action.

| Token | Value | Use |
|---|---|---|
| `--canvas` | `#f4f7f3` | Page background |
| `--surface` | `#ffffff` | Panels, dialogs, inputs |
| `--surface-sunken` | `#f8faf8` | Table heads, row hover, form footers |
| `--ink` / `--ink-2` / `--ink-3` | `#10241d` / `#3d5549` / `#5b6f65` | Text: primary / secondary / muted (all ≥ 4.5:1 on surface) |
| `--line` / `--line-strong` | `#dbe5de` / `#c2d2c8` | Dividers / control borders |
| `--green-800` | `#07563f` | Primary action, focus of progress, selected tab |
| `--green-900` / `--green-950` | `#063f31` / `#052e25` | Cart surface / sidebar |
| `--lime` | `#b7db71` | Brand mark, cart CTA only |
| `--ring` | `#b17a13` | Keyboard focus outline (amber, distinct from every status tone) |

Status tones — each a `fg / bg / line` triple set through `data-tone`:

| Tone | Statuses | Icon examples |
|---|---|---|
| neutral | draft | FilePen |
| info | submitted | Inbox |
| progress | assigned, approved, erp_entry, preparing, shipped | UserCheck, BadgeCheck, ClipboardList |
| attention | need_information | MessageCircleQuestion |
| success (solid green) | completed | CircleCheckBig |
| danger | rejected | CircleX |

**The Status Is More Than Color Rule.** `StatusBadge` always renders tone + lucide icon + Thai label together. Never render a status as color alone.

## Typography

- **IBM Plex Sans Thai** (self-hosted via `@fontsource`, weights 400/500/600/700) for all UI text. Body 15px / 1.6 for Thai legibility.
- **IBM Plex Mono 500** for SKU codes only (`.sku`).
- Scale: 12 (column heads, meta) · 13 (secondary) · 14 (controls, rows) · 15 (body, item names) · 17 (panel titles) · 20 (dialog titles) · 24/28 (page titles, mobile/desktop).
- No negative letter-spacing on Thai text.

**The Order Number Rule.** Order numbers, quantities, counts, prices and dates use `.num` (tabular figures). Labels stay plain Thai; no decorative English eyebrow labels.

## Layout

- Shell: 240px dark sidebar (collapses to a 72px icon rail on desktop; becomes a drawer ≤ 760px) + 64px white topbar + content max 1480px.
- Page header pattern: title, one-line description, actions on the right (full width on phones).
- Catalog: product table + sticky cart column (340px); cart drops below the list ≤ 1024px.
- Admin queue: master–detail. Tabs with live counts (รอรับงาน / งานของฉัน / รอลูกค้าตอบ / เปิดอยู่ทั้งหมด / ปิดแล้ว) over a row list; the detail panel is sticky beside it, and becomes a right-hand sheet ≤ 1024px and a full-screen sheet ≤ 760px. The selected order and tab live in the URL.
- Customer orders: tabs (ต้องดำเนินการ / กำลังดำเนินการ / ปิดแล้ว / ทั้งหมด); each row states the next step and who owns it ("ถึงตาคุณ").

## Elevation & Depth

Depth is structural: panels use a 1px `--line` border plus `--shadow-sm`. Only the cart (`--shadow-md`) and overlays — dialogs, sheets, the mobile drawer (`--shadow-lg`) — lift further. No glass, no gradients on working surfaces.

## Shapes

Controls 10px radius, panels 14px, dialogs 16px. Pills (999px) are reserved for statuses, tab counts and filter chips.

## Motion

Restrained and optional (React Bits, adapted):

- `AnimatedContent`: one-time CSS entrance on page mount, `fill-mode: backwards` so nothing stays transformed (fixed sheets must anchor to the viewport). Not used on the admin page.
- `CountUp`: tab counts ease to their new value; jumps instantly in background tabs.
- Skeleton shimmer while loading; dialog/sheet enter at ≤ 220ms.
- Everything collapses to instant under `prefers-reduced-motion`.

## Theme

Light theme only. Tailwind's `dark:` variant is bound to a `.dark` class so the OS dark setting cannot produce half-dark controls.

## Do's and Don'ts

### Do:

- **Do** expose the current order stage and the next required action together.
- **Do** retain order context while a user reviews, comments on, or changes a stage.
- **Do** label all controls and provide keyboard-visible focus states.
- **Do** use shadcn `Button` variants (`default`, `outline`, `secondary`, `ghost`, `link`) instead of ad-hoc button classes.

### Don't:

- **Don't** reduce a multi-step order to an unexplained colored status badge.
- **Don't** show customer-only and admin-only actions in the same role surface.
- **Don't** invent prices, stock, delivery dates, or commercial claims in prototypes.
- **Don't** nest cards inside cards, or add English uppercase eyebrow labels above Thai headings.
