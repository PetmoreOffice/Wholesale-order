<!-- SEED: established with the user before implementation; re-run $impeccable document once there's code to capture the actual tokens and components. -->
---
name: Wholesale Control Desk
description: A role-based wholesale ordering workspace with transparent order progress.
---

# Design System: Wholesale Control Desk

## Overview

**Creative North Star: "The Wholesale Control Desk"**

This is an operational web system, not a storefront. It turns the familiar artifacts of wholesale work—an order sheet, a dispatch queue, and a handoff log—into a calm shared workspace. Customer screens reduce uncertainty: every order answers where it is, who owns the next step, and whether the customer needs to act. Admin screens privilege queue clarity, fast review, and accountable handoff.

**Key Characteristics:**

- Intentional density that preserves scanning and decision clarity.
- A shared progress rail makes order state legible across roles.
- Product truth and actions lead; decoration never competes with work.

## Colors

Restrained, role-neutral surfaces with a single operational accent. Exact tokens are resolved during implementation after contrast testing.

**The Status Is More Than Color Rule.** Every state pairs its color with a written label, icon, and placement in the progress rail.

## Typography

Thai-first workhorse UI typography with clear numerical alignment for SKU, quantities, and dates. The typeface and implemented scale are resolved during implementation.

**The Order Number Rule.** SKU, order number, quantity, and date use stable numeric alignment; labels remain plain Thai language.

## Layout

Desktop uses a persistent navigation rail and a task-focused main canvas. Customer views lead with current work and order context; Admin views lead with queue state and filters. On smaller screens, navigation collapses and the primary action remains reachable without hiding status or next actions.

## Elevation & Depth

Depth is structural rather than decorative: panels separate queues, order detail, and actions only when simultaneous context is needed. Resting surfaces remain calm; overlay and active states may lift subtly.

## Shapes

Gently rounded, practical containers distinguish working regions without creating a dashboard of identical cards. Pills are reserved for short statuses and filters, not primary content.

## Do's and Don'ts

### Do:

- **Do** expose the current order stage and the next required action together.
- **Do** retain order context while a user reviews, comments on, or changes a stage.
- **Do** label all controls and provide keyboard-visible focus states.

### Don't:

- **Don't** reduce a multi-step order to an unexplained colored status badge.
- **Don't** show customer-only and admin-only actions in the same role surface.
- **Don't** invent prices, stock, delivery dates, or commercial claims in prototypes.
