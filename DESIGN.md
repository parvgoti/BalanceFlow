# BalanceFlow UI/UX Design System & Stitch Specification (DESIGN.md)

> This document serves as the **authoritative visual reference and design token specification** for generating screens in **Google Stitch**, Figma, or any AI UI generator for the **BalanceFlow** web and mobile application.

---

## 🎨 1. Core Brand & Aesthetic Identity

BalanceFlow ("Financial Zen") is a premium, high-contrast, modern Fintech SaaS application designed for effortless expense sharing and intelligent debt simplification.

### Typography
- **Primary Interface Font**: `Inter` (weights: 400 Regular, 500 Medium, 600 SemiBold, 700 Bold, 800 ExtraBold). Used for all numbers, labels, forms, and tables.
- **Brand Logo Font**: `Playfair Display` (serif, italic & bold). Used **exclusively** for the "BalanceFlow" wordmark logo in the TopBar.
- **Number Styling**: Currency amounts should always use tabular numbers (`font-feature-settings: "cv11", "ss01"`) with high-contrast sizing.

### Color Palette & Semantic Tokens

```css
/* Brand Greens */
--brand-default:   #1A5C38; /* Primary buttons, active sidebar highlights */
--brand-light:     #2D9D5C; /* Hover states, subtle badges */
--brand-subtle:    #F0F7F2; /* Light mode hero card gradient start */
--brand-dark:      #0F2E1C; /* Dark mode hero card gradient start */

/* Balance & Validation Colors (Strict) */
--balance-positive:#10B981; /* Emerald: You are owed, Matched split total */
--balance-negative:#F43F5E; /* Rose Red: You owe money, Unmatched split total */
--balance-zero:    #64748B; /* Slate: All settled up */

/* Backgrounds & Surface Cards */
--bg-light:        #FFFFFF; /* Pure white light mode */
--bg-dark:         #070B14; /* Near-black navy dark mode background */
--card-light:      #FFFFFF; /* Light mode card with #F3F4F6 border */
--card-dark:       #111827; /* Dark mode card with rgba(255,255,255,0.05) border */
```

### Surfaces, Radii & Shadows
- **Card Surfaces**: All cards use `rounded-2xl` (16px) with a soft 1px border (`border-gray-100` in light mode, `border-gray-800` in dark mode).
- **Interactive Buttons & Inputs**: All inputs, buttons, and modals use `rounded-xl` (12px).
- **Glassmorphism (`.glass`)**: Sidebar and TopBar use `.glass` (`backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20`).
- **Primary CTA Glow**: All primary green buttons have a subtle green glow (`box-shadow: 0 0 20px -5px rgba(45, 157, 92, 0.4)`).

---

## 📐 2. Navigation Architecture

### Desktop Layout (>= 1024px)
- **TopBar (h-16)**:
  - Left: Logo icon + Wordmark (`BalanceFlow`) + uppercase tracking subtitle (`FINANCIAL ZEN`).
  - Center/Right: Current page title + Theme switcher (Sun/Moon) + Notification Bell (with red unread count badge).
- **Sidebar (w-[220px])**:
  - Glassmorphic panel on the left.
  - Primary CTA button at top: `+ Add Expense` (`bg-brand text-white shadow-glow`).
  - Navigation Items: `Dashboard`, `Groups`, `Activity`, `Settings`. Active tab has `#1A5C38` background with `#D1FAE5` text.
  - Footer: Help Center icon + User profile avatar card with logout icon.

### Mobile & Tablet Layout (< 1024px)
- **Header**: Simplified TopBar showing back arrow / logo and notification bell.
- **Bottom Navigation Bar (Fixed Bottom)**:
  - 5 Icon Tabs: **Dashboard**, **Groups**, **Activity**, **Analytics**, **Settlements**.
  - Active Tab: Forest green icon and label with a light emerald pill highlight behind the icon.
  - Inactive Tabs: Muted slate icons without labels.

---

## 🖥️ 3. Screen-by-Screen UI Specifications

### Screen 1: Dashboard Page (Overview)
- **Hero Total Balance Card (2/3 width)**:
  - Background: Subtle green-to-white gradient (`#F0F7F2` to `#FFFFFF` in light mode; `#0F2E1C/20%` to `#111827` in dark mode).
  - Title: `TOTAL NET BALANCE` (small uppercase tracking-wider text).
  - Main Display: Large currency value (`e.g., +₹3,350.00`) with colored pill badge (`↗ You are owed` in emerald green or `↘ You owe money` in rose red).
  - Sub-Cards Grid:
    - Left Card: `YOU ARE OWED` (`+₹4,550.00` emerald text).
    - Right Card: `YOU OWE` (`-₹1,200.00` red text).
- **Top Categories Sidebar Card (1/3 width)**:
  - Title: `Top Categories`.
  - Content: Vertical list of categories with rounded icon badges (Food & Drink, Travel, Rent, Utilities) and currency totals right-aligned.
- **Recent Activity Feed Card**:
  - Header: `Recent Activity` + `View All ↗` link.
  - Rows: Category icon + bold title + group name & relative timestamp (`2h ago`) + amount + status pill badge (`SPLIT` in blue or `SETTLED` in emerald).
- **Your Groups Shortcut Grid**:
  - 4-column responsive grid of card shortcuts with group emoji, bold name, and member count.

---

### Screen 2: Group Detail & Expense Feed
- **Group Header Card**:
  - Title: Group name (`Goa Vacation 2026`) in bold 2xl text.
  - Metadata: Currency tag (`INR ₹`) + created date tag.
  - Member Avatars: Overlapping avatar stack (`+2 members`) + `+ Invite` button.
  - Primary CTA: Full-width `+ Add Expense` forest green button (`#1A5C38`).
- **Navigation Tabs**: `Expenses` | `Members` | `Settlements` | `Analytics` (active tab has a bold underline).
- **Day-Grouped Expense List**:
  - Section Headers: `Today`, `Yesterday`, etc.
  - Expense Cards: Category icon square + description + `Paid by [Name]` pill badge + total receipt amount + colored individual balance indicator (`You owe ₹15,000` in red or `You get ₹5,666` in emerald).

---

### Screen 3: Add Expense Modal (With Exact Split Validation Banner)
- **Modal Container**: `max-w-md` dialog with dark glass surface and rounded-2xl border.
- **Header**: `Add Expense` + `×` close button.
- **Amount Section**:
  - Label: `Total Amount` (centered, muted text).
  - Value: Currency symbol (`₹` in green) + giant bold number (`100.00`).
- **Form Fields**:
  - Description input: `Description (e.g., Dinner at Mario's)`.
  - Two-column dropdown row: Category selector (`🍽 Food & Drink`) + Date selector (`📅 Today`).
- **Split Method Selector**:
  - Segmented button control with three tabs: `= Equal` | `% Pct` | `$ Exact`.
- **Exact Split Live Validation Banner (CRITICAL UI REQUIREMENT)**:
  - Displayed immediately below the Split Method selector and above the member list when `$ Exact` is selected.
  - **MATCHED STATE (GREEN)**:
    - Background: `bg-emerald-50 dark:bg-emerald-950/30`.
    - Border: `border-emerald-200 dark:border-emerald-800`.
    - Icon: Checkmark `✓`.
    - Text: `MATCHED: SPLIT TOTAL 100.00 OUT OF 100.00` (emerald green text).
  - **UNMATCHED STATE (RED)**:
    - Background: `bg-red-50 dark:bg-red-950/30`.
    - Border: `border-red-200 dark:border-red-800`.
    - Icon: Alert triangle `⚠`.
    - Text: `UNMATCHED: SPLIT TOTAL 50.00 OUT OF 100.00` (rose red text).
- **Member Split Rows**:
  - Toggle checkbox + Member avatar + Member name (`Sarah Jenkins`) + Currency input box (`₹ 60.00`).
- **Footer**: `CANCEL` (ghost button) + `SAVE EXPENSE` (solid forest green button).

---

### Screen 4: Analytics & Insights View
- **Hero Monthly Summary Card**:
  - Title: `TOTAL SPENT THIS MONTH`.
  - Main Number: Large currency value (`$1,245.50`).
  - Trend Indicator: `↗ +12.5% vs last month` (emerald green text).
- **Spending Trends Line Chart Card**:
  - Soft green area fill line chart with weekly intervals (`W1`, `W2`, `W3`, `W4`).
  - Legend: `● You` vs `● Group Avg`.
- **Member Contributions Horizontal Bar Card**:
  - Progress bar list comparing total spending per member with dollar amounts right-aligned.

---

## 🛠️ 4. Google Stitch Prompting Guidelines

When uploading this specification to **Google Stitch** to generate new UI layouts:
1. **Reference Design Tokens First**: Always instruct Stitch to use `--brand-default: #1A5C38` for primary buttons and `#070B14` for dark backgrounds.
2. **Specify Card Hierarchy**: Request `rounded-2xl` for containers and `rounded-xl` for interactive elements.
3. **Include Validation Banners**: Explicitly ask Stitch to show both the **Matched Green Pill (`100.00 out of 100.00`)** and **Unmatched Red Pill (`50.00 out of 100.00`)** in any expense splitting mockup.
