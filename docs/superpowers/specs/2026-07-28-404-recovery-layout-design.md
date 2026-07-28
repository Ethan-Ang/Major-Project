# Yee Lim 404 Recovery Layout Design

## Scope

Refine only the public `404.html` experience and its page-scoped styles and translations. Keep the existing industrial image, recovery copy, product search, and three destination cards. Reuse the established public navigation and footer. Do not modify Home, About, admin, API, database, production configuration, product upload components, or unrelated catalogue behavior.

## Problem

The current desktop layout forces the helpful-links section to fill all remaining viewport height and centers its content with flexbox. As the viewport becomes taller, the blank bands above and below the card row grow. The layout is mathematically centered but visually fragmented because the recovery tools no longer read as one connected page.

The compact logo-only header and missing footer also remove the orientation and lower visual boundary present on the rest of the site. The resulting page feels like a standalone poster rather than part of Yee Lim's product website.

## Approved Direction

Use the normal public site structure and natural document flow:

1. Inject the shared navigation at the top.
2. Keep the split hero with the existing adhesive-pails warehouse image.
3. Keep product search as the single primary recovery action.
4. Place the helpful-links heading and three cards directly after the hero using controlled spacing.
5. Inject the shared footer after the page content.
6. Allow a short natural scroll on desktop instead of forcing the complete page into one viewport.

The `/404.html` route must not activate Home, Products, About, or Contact in the shared navigation. The existing navbar route matching already treats `404` as a distinct page, so no navbar logic change is required.

## Desktop Layout

- Use the shared 60px public navigation.
- Give the 404 hero its natural content height with approximately 48px top and bottom padding. The rendered target is roughly 360 to 390px, adjusted by actual text wrapping.
- Limit the text column to the existing readable widths.
- Use approximately 48 to 56px between the hero boundary and the helpful-links heading.
- Use approximately 20 to 24px between the heading and card row.
- Keep the three cards equal and content-sized, with a minimum height near 120px.
- Use approximately 56 to 72px after the cards before the shared footer.
- Do not use `flex: 1`, viewport-height centering, stretched cards, negative margins, or filler content.

## Responsive Layout

- At 900px and below, stack the cards in one column.
- Preserve the shared mobile navigation and footer.
- Reduce hero and section padding at tablet and phone widths while keeping the search field comfortably tappable.
- Do not force a minimum viewport height; all content must scroll naturally.
- Keep cards at natural height on phones.

## Internationalisation

Load the existing shared i18n engine before the navbar and footer so the complete page switches language consistently. Add 404-specific English and Simplified Chinese dictionary keys for:

- eyebrow;
- heading;
- supporting paragraph;
- search label, placeholder, and submit label;
- helpful-links heading;
- three card titles and descriptions.

Use `data-i18n` and `data-i18n-attr` in the page markup. English remains the source HTML. The Chinese version must retain the same hierarchy and avoid mixed-language recovery content.

## Accessibility and Recovery Behavior

- Retain a descriptive document title and one H1.
- Add the established skip link so keyboard users can move directly to `main`.
- Keep a visible label for assistive technology on the search field.
- Use a real submit button for search and links for destinations.
- Preserve visible focus styling.
- Treat the hero image as decorative.
- Keep the real HTTP 404 status for unknown routes.
- Preserve the existing enquiry basket and language preference because the shared widgets use the same local storage state as other pages.

## Visual Character

The page should feel established, precise, and dependable. Use the existing warm cream canvas, dark site chrome, industrial photography, restrained red action color, and established typography. Do not add jokes, mascots, oversized 404 numerals, generic promotional cards, or decorative filler.

## Verification

Automated regression checks must prove that:

- the shared navbar and footer scripts are loaded;
- the standalone top bar is removed;
- no primary navigation link is marked active for `/404.html`;
- desktop uses natural flow rather than flex-centered leftover space;
- recovery content and destinations remain intact;
- 404 translation keys and markup hooks exist.

Browser verification must cover English and Chinese at 1600x900, 1440x900, 768x1024, and 390x844. It must check layout rhythm, text clipping, horizontal overflow, navigation state, mobile drawer behavior, footer rendering, search submission, and destination links.
