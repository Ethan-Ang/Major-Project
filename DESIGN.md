# Design

## Theme

Light mode. B2B users operate in offices and procurement environments under normal ambient light. The product catalogue must feel like a reference document — clean, scannable, professional. The admin panel uses the same light foundation with a dark sidebar for clear orientation.

## Color

Strategy: **Restrained** — tinted neutrals with one functional accent.

| Role | Value | Usage |
|------|-------|-------|
| Brand red | `#CC2929` | CTAs, active nav, brand mark, badges |
| Red dark | `#a82020` | Hover states on red elements |
| Dark | `#1a1a1a` | Nav, footer, admin sidebar |
| Page background | `#f5f5f5` | Public pages |
| Admin background | `#f3f4f6` | Admin panel |
| Card | `#ffffff` | Product cards, modals, panels |
| Border | `#e0e0e0` (public) / `#e5e7eb` (admin) | Dividers, input borders |
| Text primary | `#222222` | All body text |
| Text muted | `#666666` | Secondary labels, descriptions |
| Success green | `#16a34a` | Status indicators, confirmations |

The red is the only saturated colour. All neutrals tilt slightly warm. No blue, no purple, no gradient fills.

## Typography

System stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

No web fonts currently loaded. Hierarchy achieved through weight and size contrast.

| Role | Size | Weight |
|------|------|--------|
| Page title | 2rem | 700 |
| Section heading | 1.4–1.6rem | 700 |
| Card heading | 0.95rem | 600 |
| Body | 0.875–1rem | 400 |
| Label / meta | 0.78–0.85rem | 400–600 |
| Badge / tag | 0.7–0.78rem | 600 |

## Spacing

Base unit: 4px. Consistent rhythm using multiples of 4 (0.25rem increments). Cards padded at 1rem (16px). Section gaps at 1.25–2rem.

## Border radius

- `6px` (0.375rem) — standard for cards, buttons, inputs (public)
- `8px` (0.5rem) — standard elements (admin)
- `12px` (0.75rem) — large modals, stat cards (admin)

## Elevation

- Level 0: flat, no shadow (default)
- Level 1: `0 1px 3px rgba(0,0,0,0.08)` — cards, table containers
- Level 2: `0 4px 6px rgba(0,0,0,0.07)` — dropdowns, tooltips
- Level 3: `0 16px 48px rgba(0,0,0,0.2)` — modals, slide panels

## Motion

Durations: 150–250ms standard interactions, 300–400ms entrances. Easing: `ease` or `cubic-bezier(0.4,0,0.2,1)`. No bounce, no spring. Entrance animations use `slideUp` / `fadeInPage` / `slideInLeft`. No animating layout properties.

## Components

### Nav
Dark background (#1a1a1a), CSS grid (1fr auto 1fr) for true centre alignment, sticky. Brand mark left, links centred, basket + sign-in right.

### Product card
White card, 6px radius, subtle border, hover lifts 2px with shadow. Brand badge top-left in red tint. Actions row at bottom.

### Filter sidebar
240px fixed width on desktop. Checkbox groups by Brand, Industry, Surface. Collapsible drawer on mobile.

### Admin sidebar
240px, dark (#111827), sticky full height. Brand mark + section labels + icon nav links. Never scrolls with content.

### Status badges
Pill shape, 20px border-radius. Green for Available, red-tint for Unavailable. Dot prefix.

### Buttons
Primary: red fill. Outline: 1px border, transparent. Ghost: no border, hover bg only. All use `inline-flex` with gap for icons.

### Modals
Scale + fade entrance (modalIn keyframe). Backdrop blur 2px. Max-width 580px standard, 420px for confirms.
