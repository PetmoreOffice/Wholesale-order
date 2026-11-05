---
name: Wholesale Order
description: A pet-food wholesaler's ordering app where every order wears a hang tag naming the next step and who takes it.
colors:
  bag-teal: "#0E5E5A"
  bag-teal-deep: "#0A4643"
  bag-teal-soft: "#C3E6E0"
  bag-teal-tint: "#E0F2EE"
  kibble-orange: "#F07A3A"
  kibble-soft: "#FDE7DA"
  mint-ground: "#F1F7F5"
  panel-white: "#FFFFFF"
  sunken-mint: "#F5FAF8"
  ink: "#16262B"
  ink-2: "#41535A"
  ink-3: "#5A6C72"
  line: "#DCE8E4"
  line-strong: "#BCD0CA"
  info-blue: "#2A63C9"
  info-soft: "#E4EDFB"
  danger-red: "#CC3344"
  danger-soft: "#FCE8EA"
typography:
  display:
    fontFamily: "Mitr, Anuphan, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 500
    lineHeight: 1.15
  headline:
    fontFamily: "Mitr, Anuphan, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 500
    lineHeight: 1.3
  numeral:
    fontFamily: "Mitr, Anuphan, system-ui, sans-serif"
    fontSize: "46px"
    fontWeight: 500
    lineHeight: 1
    fontFeature: "\"tnum\""
  title:
    fontFamily: "Mitr, Anuphan, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: 1.375
  body:
    fontFamily: "Anuphan, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Anuphan, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
  sku:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    letterSpacing: "0"
    fontFeature: "\"tnum\""
rounded:
  sm: "8px"
  md: "10px"
  lg: "16px"
  xl: "20px"
  full: "9999px"
spacing:
  page-x-phone: "16px"
  page-x-tablet: "24px"
  page-x-desktop: "32px"
  panel: "20px"
  row-y: "14px"
  rail: "232px"
  content-max: "1480px"
components:
  button-primary:
    backgroundColor: "{colors.bag-teal}"
    textColor: "{colors.panel-white}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
    height: "36px"
  button-primary-large:
    backgroundColor: "{colors.bag-teal}"
    textColor: "{colors.panel-white}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "40px"
  button-outline:
    backgroundColor: "{colors.panel-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
    height: "36px"
  button-outline-hover:
    backgroundColor: "{colors.bag-teal-tint}"
    textColor: "{colors.bag-teal-deep}"
  button-secondary:
    backgroundColor: "{colors.bag-teal-tint}"
    textColor: "{colors.bag-teal-deep}"
    rounded: "{rounded.full}"
  button-destructive:
    backgroundColor: "{colors.danger-red}"
    textColor: "{colors.panel-white}"
    rounded: "{rounded.full}"
  input:
    backgroundColor: "{colors.panel-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  panel:
    backgroundColor: "{colors.panel-white}"
    rounded: "{rounded.xl}"
    padding: "20px"
  rail-link-active:
    backgroundColor: "{colors.panel-white}"
    textColor: "{colors.bag-teal}"
    rounded: "{rounded.full}"
    padding: "10px 16px"
  rail-link:
    backgroundColor: "{colors.bag-teal}"
    textColor: "{colors.bag-teal-soft}"
    rounded: "{rounded.full}"
    padding: "10px 16px"
  turn-chip:
    backgroundColor: "{colors.kibble-orange}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "4px 10px"
  hang-tag-road:
    backgroundColor: "{colors.bag-teal}"
    textColor: "{colors.panel-white}"
    rounded: "{rounded.xl}"
  hang-tag-yours:
    backgroundColor: "{colors.kibble-orange}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
  hang-tag-closed:
    backgroundColor: "{colors.danger-red}"
    textColor: "{colors.panel-white}"
    rounded: "{rounded.xl}"
  hang-tag-done:
    backgroundColor: "{colors.bag-teal-deep}"
    textColor: "{colors.panel-white}"
    rounded: "{rounded.xl}"
  count-block:
    backgroundColor: "{colors.panel-white}"
    textColor: "{colors.ink}"
    typography: "{typography.numeral}"
    rounded: "{rounded.xl}"
  count-block-turn:
    backgroundColor: "{colors.kibble-orange}"
    textColor: "{colors.ink}"
    typography: "{typography.numeral}"
    rounded: "{rounded.xl}"
---

# Design System: Wholesale Order

## Overview

**Creative North Star: "The Kibble Bag"**

The app looks like a bright bag of pet food on a shop shelf. Deep bag teal is the printed panel: the navigation rail and the primary actions. White panels sit on a pale morning sky like labels, carrying on from the meadow on the sign-in page. Kibble orange is the sticker that tells you what to do. Each order wears one hang tag. It is chamfered at the eyelet end and rounded at the other, and it says in Thai what happens next and who does it. Under the tag, a trail of paw prints shows how far the order has come.

Customers use it on phones and admins use it on office PCs during the day, so the type is large and friendly and the screens are light-only. The work surfaces (tables, forms, lists) are quiet and dense. The life comes from a small set of vendored react-bits effects that each stay in one place: a morning meadow on sign-in, a sky with sun rays and drifting pollen behind the work area, a hill with a walking dog and cat at the foot of the rail, falling leaves on every click, and count numerals that roll up in a patch of sunlight. Every effect falls back to a still, complete state under reduced motion.

The build leaves out three things on purpose: coloured status pills in tables, side-stripe accents, and kicker or eyebrow labels above headings. Status is always an icon plus written Thai words. Orange is reserved for one meaning.

**Key Characteristics:**
- Deep teal shell, morning-sky ground, white panels with 20px corners (24px on count blocks), pill-shaped buttons.
- Kibble orange only for "the viewer must act", plus paws and the brand mark.
- One hang tag per order view; a paw-print trail beneath it.
- Mitr for headings and numerals, Anuphan for body, JetBrains Mono only for SKU and barcode.
- Big rolling numerals for counts, numeral above label.
- Effects at full strength but confined to their own place, all reduced-motion safe.

## Colors

The palette is a pet-food bag: one deep teal, one loud orange, on calm mint and white.

### Primary
- **Bag Teal** (`bag-teal`): the desktop rail, the phone bottom bar, the meadow's foreground grass, primary buttons, filled (passed) paw stops, the "road" hang tag and the "success" status tone. It means "we are on it".
- **Deep Bag Teal** (`bag-teal-deep`): rail hover, the "done" hang tag, and text on teal-tint surfaces.
- **Rail Mint Text** (`bag-teal-soft`): inactive rail labels and secondary copy on teal.
- **Teal Tint** (`bag-teal-tint`): selected list and table rows, secondary and quiet buttons, hover on icon buttons, the current paw when the step is not the viewer's.

### Secondary
- **Kibble Orange** (`kibble-orange`, also exposed as `--turn`): the viewer's turn. It fills the "yours" hang tag, the "ถึงตาคุณ" chip in lists, the "รอรับงาน" and "ถึงตาคุณ" count blocks when their value is above zero, the admin "ค้าง" stale marker, the cart count on the rail, and the current paw when the step waits on the viewer. Outside that meaning it appears only as a material: click sparks, DotGrid's active dots and the paw on the brand mark. Text on it is always dark ink.
- **Kibble Soft** (`kibble-soft`): text selection, and the "แวะรอ: ข้อมูลจากลูกค้า" detour note under the trail.

### Tertiary
- **Info Blue** (`info-blue` / `info-soft`): the focus ring (3px outline, 2px offset) and the informational status tone.
- **Stop Red** (`danger-red` / `danger-soft`): rejected and cancelled orders, the "closed" hang tag, the stopped paw marker, destructive buttons, errors.

### Neutral
- **Mint Ground** (`mint-ground`): page background where the sky does not reach (sign-in fallback, under overlays), also visible through the hang tag's eyelet.
- **Panel White** (`panel-white`): panels, cards, sheets, dialogs, the top bar (at 95% with backdrop blur).
- **Sunken Mint** (`sunken-mint`): table headers, row hover, the last-message strip, the neutral status tone.
- **Ink** (`ink`): primary text and text on orange.
- **Ink 2** (`ink-2`, at least 7:1 on panel): secondary copy, table header text, count labels.
- **Ink 3** (`ink-3`, at least 4.5:1 on panel and ground): metadata, future paw stops, status text in lists.
- **Line / Line Strong** (`line`, `line-strong`): dividers and panel borders; input borders, the dashed future trail, scrollbars.

### Named Rules
**The One Orange Rule.** Kibble orange as a filled surface always means "the viewer must act now". If the person looking at the screen does not hold the next step, it is not orange. Teal means someone else is on it, and red means it has stopped.

**The Dark-On-Orange Rule.** Text on kibble orange is always dark ink, never white.

**The Never-Colour-Alone Rule.** Every status carries an icon and a written Thai label (StatusBadge, StatusIcon plus text, the hang tag's icon and sentence, the paw trail's labels and screen-reader suffixes). Colour reinforces the status but never carries it alone.

## Typography

**Display Font:** Mitr (with Anuphan, system-ui)
**Body Font:** Anuphan (with system-ui)
**Label/Mono Font:** JetBrains Mono, only for SKU and barcode

**Character:** Mitr's rounded, friendly Thai letterforms give headings and numerals the voice of a pet-food label. Anuphan keeps long Thai text calm and readable. Mono is for things a person has to match character by character.

Loaded weights: Anuphan 400/500/600/700, Mitr 400/500/600, JetBrains Mono 500. `font-synthesis: none` is set, so unloaded weights fall back to the nearest loaded one rather than being faked.

### Hierarchy
- **Display** (Mitr 500, 52px, 1.1, brand-deep on the sky): the sign-in headline "สั่งอาหารสัตว์ทั้งร้าน ในไม่กี่คลิก" only.
- **Headline** (Mitr 500, 28px on phones / 34px from sm, 1.3, balanced wrap): one page title per screen, via PageHeader.
- **Numeral** (Mitr 500, 34px on phones / 46px from sm, line-height 1, tabular): count blocks.
- **Title** (Mitr 500, 20px on phones / 24px from sm): the hang tag's next-step sentence.
- **Body** (Anuphan 400, 16px base, 1.6; most UI copy at 15px): lists, descriptions, forms.
- **Label** (Anuphan 600, 13–14px): table headers, rail and bottom-bar labels, badges, paw-stop labels.
- **SKU** (JetBrains Mono 500, 13px, ink, tabular): SKU and barcode cells.

### Named Rules
**The Tabular Rule.** Order numbers, quantities, counts and dates always set tabular figures, so columns line up.

**The Mono-Is-For-Codes Rule.** JetBrains Mono appears only on SKU and barcode, always in full ink and never greyed out. It is never used for decoration or headings.

**The No-Kicker Rule.** Headings stand alone. No small uppercase or letter-spaced label sits above a title, and no letter-spaced uppercase is used anywhere in the UI.

## Layout

The app is a rail plus a work area. From `lg` (1024px) there is a sticky 232px teal rail on the left, and the work area has a sticky top bar (56px on phones, 64px on desktop) and content capped at 1480px. Content padding is 16px on phones, 24px from sm and 32px from lg. Below `lg` the rail becomes a fixed teal bottom bar with the same destinations within thumb reach, and the content gets 76px of bottom padding to clear it.

Every screen opens with a PageHeader: the title and one line of context on the left, actions on the right (actions go full width on phones). Count blocks follow as an equal-column grid (gaps of 8px, 16px from sm; the admin queue uses two columns on phones). Then comes the work. The customer home is a list and detail pair from `lg` (open orders on the left; the selected order, 420–520px, on the right with its tag above the trail). On phones, choosing an order navigates to it instead of opening a side panel.

The rhythm is 20px panel padding, rows of about 14px vertical by 16–20px horizontal, and 20px between stacked blocks inside a panel. Lists are rows divided by hairlines inside one panel, not stacks of cards. Sign-in fills the screen with the meadow. From `lg` the headline sits in the sky on the left and the form on a 440px white card (24px corners, overlay shadow) on the right. On phones the card stands alone over the scene, and the "no account" note sits in white on the grass.

## Elevation & Depth

Surfaces are flat at rest. Panels separate from the sky by colour and a 1px line border, not by shadow. Shadow is kept for things that sit physically above the page: the hang tag (which hangs), the current paw stop, and overlays. Dialog and sheet backdrops are a 45% dark wash.

### Shadow Vocabulary
- **Lift** (`box-shadow: 0 10px 28px -10px rgb(14 60 58 / 0.28)`): the current, enlarged paw stop.
- **Tag hang** (`filter: drop-shadow(0 10px 18px rgb(14 60 58 / 0.22))`): the NextStepTag. It is a drop-shadow rather than a box-shadow so it follows the clipped silhouette.
- **Overlay** (`box-shadow: 0 24px 60px -12px rgb(14 60 58 / 0.36)`): dialogs and side sheets.
- **Hairline** (shadcn `shadow-xs`): outline buttons and inputs only.

### Named Rules
**The Teal Shadow Rule.** Shadows are tinted with the bag's teal (rgb 14 60 58), never neutral black, and they always fall softly downward. Hard offset shadows do not belong in this world.

## Shapes

The shapes are soft and friendly, like a bag. Buttons, rail links, bottom-bar indicators, badges and the brand mark are full pills or circles. Panels, cards, count blocks and dialogs use 20px corners (`xl`). Inner strips and skeletons use 16px (`lg`). Inputs, chips such as "ถึงตาคุณ", and icon buttons use 10px (`md`).

The one sharp geometry is the hang tag. Its eyelet end is chamfered by a clip-path polygon (28px corners cut at 45 degrees), its far end is rounded to 20px, and a punched eyelet (a translucent dark ring with the mint ground showing through an inset-shadowed hole) sits near the chamfer. Paw stops are circles on a 3px rule: dashed `line-strong` ahead, solid teal behind.

## Components

### Buttons
Buttons are friendly, confident pills.
- **Shape:** fully round (9999px), semibold 14px, 8px gap to an optional 16px icon.
- **Primary:** bag teal with white text. Default height is 36px (`px-4`). Large is 40px (`px-6`), and the sign-in submit is 48px at 17px.
- **Hover / Focus:** primary darkens to 90% teal. Focus shows a 3px info-blue ring at 50% (global `:focus-visible` uses a solid 3px info-blue outline offset by 2px). Disabled drops to 50% opacity.
- **Outline:** white with a `line-strong` border and hairline shadow; on hover it turns teal tint with deep teal text. Used for a secondary action next to a primary one, and for the main action when the order is not the viewer's turn.
- **Secondary / Ghost / Link:** teal tint pill, transparent with a teal-tint hover, and teal text with an underline on hover.
- **Destructive:** stop red with white text.

### Chips
- **Turn chip:** kibble orange with dark ink, extra-bold 14px, 10px corners. It reads "ถึงตาคุณ" in customer lists, shows the next-step text in the admin queue when the step is the admin's, and reads "ค้าง" for stale admin work.
- **StatusBadge:** a pill with a 1px inset ring, an icon and the Thai label, in one of six tones (neutral sunken, info blue-soft, progress teal-tint, attention orange, success solid teal, danger red-soft). It is used in the notification list, not in tables.
- **In list rows and tables,** non-turn status is plain text: StatusIcon plus label in ink-3 (red text for rejected), with no fill.

### Cards / Containers
- **Corner Style:** 20px.
- **Background:** panel white on mint ground; teal tint marks the selected row.
- **Shadow Strategy:** none at rest (see Elevation & Depth).
- **Border:** 1px `line`.
- **Internal Padding:** 20px. Headers inside panels are separated by a `line` rule, not by a nested card.

### Inputs / Fields
- **Style:** 10px corners, 1px `line-strong` border, hairline shadow, 36px default height (48px on sign-in, set on white panel), teal caret.
- **Focus:** the border turns info blue with a 3px info-blue ring at 50%; the global outline is removed on inputs to avoid a double ring.
- **Error / Disabled:** red border and red ring at 20%, with the error written below in red; disabled at 50% opacity.

### Navigation
- **Desktop rail:** bag teal, 232px, sticky full height. The brand mark (orange disc with ink paw) and "Wholesale Order" sit in Mitr. Links are full pills at 16px semibold in teal-soft. Hover turns deep teal with white text. The active link is a white pill with teal text. The cart count is a small orange pill with dark text. The user name, role and sign-out sit at the foot above a 20% white rule.
- **Top bar:** white at 95% with backdrop blur and a `line` bottom border. On phones it holds the brand, the cart and sign-out; everywhere it holds notifications.
- **Phone bottom bar:** bag teal, equal columns, a 20px icon over a 13px label. The active item gets a 28×48px white pill behind its icon.

### Hang Tag (NextStepTag), signature
One per order view, above the paw trail. It is never repeated in lists. It states the next step as a Mitr sentence (20–24px), a 15px note underneath, and a large icon (40–48px) on the right. When the order is still on the road, a tabular "อีก N ขั้น" sits under the icon. It has four variants:
- **road** (bag teal, white text, paw icon): someone else is on it.
- **yours** (kibble orange, ink text, send / hand / reply icon): the viewer must act. The note begins "ถึงตาคุณ".
- **closed** (stop red, white text, X icon): rejected or cancelled. For a rejection, the note gives the admin's reason.
- **done** (deep teal, white text, check icon): completed.

### Paw Route, signature
The main route drawn as evenly spaced paw stops on a 3px line. Passed stops are 36px solid teal circles whose labels collapse to screen-reader text (a finished order keeps every label). The current stop is a larger 44px paw with the lift shadow. It is kibble orange only when the step waits on the viewer, and teal tint otherwise. A rejected or cancelled order shows a red-soft stop with a red X and "หยุดที่นี่" in place of the paw. Detours print a pill under the trail: kibble-soft for "แวะรอ: ข้อมูลจากลูกค้า", red-soft for "หยุด: ปฏิเสธ" and "หยุด: ยกเลิก". Drafts show no trail.

### Count Blocks, signature
The numeral comes first and the label sits under it (a reversed definition list). Each block is a 24px-corner SpotlightCard with a patch of warm sunlight that follows the pointer (golden on white blocks, pale yellow on the orange block) and a soft lift shadow. The numeral rolls up with CountUp over 1.1s on load. A `turn` block with a value above zero fills kibble orange with ink text and is the only block wrapped in a StarBorder: two sun-yellow glints running a 2px track around the same 24px corner. Under reduced motion the full number is written out plainly and never left at 0.

### Effects inventory
- **Meadow** (sign-in only, `features/auth/MeadowScene.jsx`, drawn in code with no images): sky gradient, low sun, drifting clouds, three ridges of hills, a dog and a cat walking the middle ridge, 140 swaying grass blades and a few leaves on the wind. Each layer shifts a little with the pointer for depth. Under reduced motion the scene holds still: clouds and animals rest in place, the leaves are left out and the pointer has no effect.
- **BlurText** (sign-in headline): words blur in at a 120ms stagger. Under reduced motion the headline renders as plain text.
- **Sky** (behind the work area, fixed, desktop-offset past the rail, `components/meadow/SkyBackdrop.jsx`): a pale blue-to-cream gradient, sun rays from the top-left corner that turn slowly and lean a few degrees toward the pointer, a sun glow, two hazy hills along the bottom, and 46 grains of golden pollen drifting up that brighten near the pointer. Under reduced motion the rays and pollen hold still.
- **Rail meadow** (foot of the desktop rail, `components/meadow/RailMeadow.jsx`): two ridges, a dog and a cat walking across, and swaying grass; the phone bottom bar has a fringe of grass on its top edge. Under reduced motion the animals rest on the ridge and the grass holds still.
- **ClickSpark** (the whole shell, `leaf` shape added to the vendored component): eight leaves in greens and gold burst from each click, tumble and fall over 760ms. Nothing waits on them, and they shorten to a brief fade under reduced motion.
- **AnimatedContent** (page entrance): each area sprouts up once, keyed by area: it rises 28px from 98.5% scale over 0.6s while an upward wipe reveals it from the bottom. Once it settles, transform, filter and the wipe mask are cleared so fixed action bars and sheets are not trapped. It is skipped under reduced motion.
- **Overlays:** dialogs fade and rise 8px over 200ms; sheets slide 24px from the right over 220ms, both on `cubic-bezier(0.16, 1, 0.3, 1)`.
- A global reduced-motion rule clamps all CSS animation and transition to 0.01ms.

### shadcn/ui interaction parts (`web/src/components/ui/`)
- **Toaster (Sonner):** every success is a toast, never an inline banner. White panel, 16px corners, overlay shadow, teal check for success, red for errors, orange for warnings. Top centre under the top bar below 1024px (the bottom nav owns the bottom), bottom right on desktop (clear of the Ctrl+K search). Add-to-cart toasts carry a "ดูตะกร้า" action. Failures stay inline next to the action that failed.
- **Drawer (vaul):** below 640px the cart, order review and scanner open as a bottom drawer with a grab handle and 24px top corners that can be swiped down; locked while a request is in flight. From 640px up the same content is a centred dialog.
- **Command (cmdk):** Ctrl+K / ⌘K, or the search pill in the top bar. Matching orders come first (number, and shop name for admins), then "ค้นหาสินค้า …" which opens the catalog with that term, then pages. Selected rows take the teal tint.
- **Tabs (Radix):** the order list and admin queue tabs use the `line` variant: one 15px size, active by weight and a 3px teal bar, count chip after the label; arrow keys, Home and End move between tabs and the tab is kept in the URL.
- **Tooltip:** ink background, white 13px text, 300ms delay; every icon-only button (bell, cart, sign-out, search on phones) has one.
- **Skeleton:** all loading placeholders use one fill, `brand-tint` at 70%.

## Do's and Don'ts

### Do:
- **Do** fill with kibble orange only what waits on the viewer right now, and put dark ink on it.
- **Do** give every order view exactly one hang tag, with the paw trail beneath it.
- **Do** write status as icon plus Thai words; colour only reinforces it.
- **Do** set order numbers, counts, quantities and dates in tabular figures, and SKU and barcode in JetBrains Mono 500 at full ink.
- **Do** show counts as Mitr numerals above their label, rolling up with CountUp, and written out plainly under reduced motion.
- **Do** keep each effect in its own place (the meadow behind sign-in, the sky behind the work area, the meadow at the foot of the rail, ClickSpark on clicks, AnimatedContent on page entrance) and give each a still, complete reduced-motion state.
- **Do** use pill buttons, 20px panels, 10px inputs and chips, and teal-tinted soft shadows only for things that hang or float.
- **Do** keep prices off every customer surface. Reference prices appear only on admin screens (product list column, order detail), and the API never sends them to customers.

### Don't:
- **Don't** use orange for decoration, emphasis, brand flourish on surfaces, or for someone else's turn.
- **Don't** put coloured status pills in tables or list rows; use the turn chip for the viewer's turn and StatusIcon plus text otherwise.
- **Don't** repeat the hang tag in lists or stack two on one view.
- **Don't** use side-stripe borders as accents on rows, cards or alerts.
- **Don't** add kickers or eyebrow labels above headings, or letter-spaced uppercase labels.
- **Don't** nest cards in cards; divide a panel with hairline rules instead.
- **Don't** give tables or forms an effect of their own.
- **Don't** add a dark theme; the app is light-only by design.
- **Don't** use hard offset or neutral-black shadows.
