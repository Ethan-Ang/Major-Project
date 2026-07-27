# Public Catalogue UI Consistency Design

**Date:** 2026-07-28
**Status:** Approved in conversation, pending written-spec review

## Goal

Correct five related catalogue and comparison interface inconsistencies while preserving Yee Lim Adhesives Industries' established, precise, dependable industrial B2B character.

The result must help procurement and trade customers scan and act quickly. It must not resemble consumer e-commerce, playful mobile UI, or a decorative redesign.

## Design Direction

Use the existing warm, restrained product design system:

- Red remains reserved for actions, active controls, and meaningful state.
- White and warm-neutral surfaces carry the interface.
- Controls remain compact, familiar, and visually precise.
- Interaction states are clear without becoming loud.
- English and Simplified Chinese use the same structural layout.
- Existing information density and catalogue hierarchy remain unchanged.

## Root Causes

1. Desktop checked filter rows use a pale-red background even though the red checkbox already communicates selection.
2. The shared navbar treats Product Detail and Compare as active Product contexts, which keeps Products highlighted outside the catalogue route.
3. Compare-product removal controls use three different silhouettes and sizes across the tray, selection panel, and portrait comparison table.
4. The collapsed Compare trigger uses a flex-start content group plus a negative count margin. The shorter Chinese label makes that imbalance visible.
5. The desktop sort label uses the lightest muted caption colour and medium weight, making `排序方式` too faint beside the dropdown.

## Design Decisions

### 1. Filter selection

Checked filter rows use a plain background on desktop and mobile.

- Keep the existing red checked checkbox.
- Keep the selected label at semibold weight.
- Keep counts aligned and unchanged.
- Do not add a red wash, pill, or selected-row border.
- A checked row remains plain when hovered so the selection does not become visually heavier.

This restores the red accent's signal value and keeps dense filter lists professional.

### 2. Navbar active state

Products is active only on the main Products catalogue route.

- Product Detail has no highlighted primary navigation item.
- Compare has no highlighted primary navigation item.
- Home, About, and Contact continue to use exact-route highlighting.
- `aria-current="page"` follows the same exact-route rule.

### 3. Compare-product remove control

Use one shared industrial control vocabulary for product removal in:

- the expandable Compare tray;
- the Compare page selection panel;
- the portrait-mobile comparison table.

The selected treatment is option A:

- 44 by 44 pixel touch target;
- 6 pixel rounded-square silhouette;
- white default surface;
- neutral one-pixel border;
- red `×` icon;
- pale-red surface and red-tinted border on hover or press;
- existing red focus outline retained;
- consistent icon stroke and optical centring.

The control remains secondary to Add to Enquiry and Compare actions. It must not use a permanent red fill.

The Compare sheet-collapse `×` is excluded. It dismisses a layer rather than removing a product, so it keeps its quieter unboxed treatment and distinct accessible label.

### 4. Compare trigger alignment

Centre the icon, translated label, count, and chevron as one balanced content group.

- Use equal-sized leading and trailing icons.
- Remove the negative count offset.
- Centre the complete group within the trigger.
- Preserve natural text width instead of assigning English- or Chinese-specific coordinates.
- Keep the current compact height, border, white surface, and restrained shadow.
- Preserve the mobile side-tab structure and touch target.

This makes both `Compare (1)` and `对比 (1)` visually centred without fragile language-specific nudges.

### 5. Sort-label legibility

Increase the visibility of the desktop label `Sort by` / `排序方式` without competing with the selected sort value.

- Use the stronger muted text token.
- Increase weight from medium to semibold.
- Preserve the mono label style and compact size.
- Preserve the existing gap, dropdown dimensions, and red focus state.

## Accessibility

- Product-removal targets remain at least 44 by 44 pixels.
- Existing accessible remove labels remain intact.
- Keyboard focus remains visible with a two-pixel red outline.
- The sort label gains contrast rather than relying on size alone.
- Active navigation semantics match the visible active state.
- Selection is communicated by both checkbox shape and label weight, not background colour alone.

## Responsive and Internationalisation Behaviour

Verify the catalogue and comparison interfaces in English and Simplified Chinese at:

- desktop: 1440 by 900;
- tablet: 768 by 1024;
- phone: 390 by 844.

The shared structural rules must accommodate both languages. Language-specific positional offsets are not allowed. Existing translations and product data are not changed.

## Implementation Boundaries

Expected production files:

- `frontend/css/products.css`
- `frontend/js/widgets/navbar.js`

Additional files may be changed only if a failing regression test proves the shared rules cannot be corrected within these boundaries.

## Testing

Create regression checks before production edits for:

1. exact-route Products navigation;
2. plain checked filter backgrounds;
3. one shared 44-pixel rounded-square product-removal treatment;
4. centred Compare-trigger content with no negative count offset;
5. stronger sort-label colour and weight.

Then run:

- the focused regression checks;
- the existing public-site validation suite;
- HTML, CSS, and JavaScript syntax checks;
- responsive visual checks at all specified widths in both languages;
- keyboard-focus checks for every affected control.

## Deployment

After all verification passes:

1. create a fresh rollback backup of every live file to be replaced;
2. upload only the verified runtime files;
3. compare local and remote checksums;
4. smoke-test Products, Product Detail, and Compare in English and Chinese;
5. retain the rollback backup and report its exact path.

## Acceptance Criteria

- Selected desktop filter rows no longer have a pale-red wash.
- Products is not highlighted on Product Detail or Compare.
- All compare-product remove controls match option A.
- English and Chinese Compare-trigger content is visibly centred.
- `排序方式` is clearly readable while remaining visually secondary.
- The result reads as a professional industrial B2B catalogue.
- No translation, product data, admin interface, or unrelated public-page behaviour changes.
