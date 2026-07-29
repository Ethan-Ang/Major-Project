# 04. Content and Product Data Guide

**Project ReBond, Yee Lim Adhesives Industries Pte Ltd**
**Audience: whoever writes and maintains product content.**

This guide sets the standards for what goes into the catalogue. The website faithfully
publishes whatever is typed into the admin, so the quality of the site is the quality of
the data.

For the click by click steps, see [02_ADMIN_USER_GUIDE.md](02_ADMIN_USER_GUIDE.md).

---

## Contents

1. [Approved terminology](#1-approved-terminology)
2. [Required and optional product fields](#2-required-and-optional-product-fields)
3. [Product naming standards](#3-product-naming-standards)
4. [Brand name standards](#4-brand-name-standards)
5. [Category standards](#5-category-standards)
6. [Product Type standards](#6-product-type-standards)
7. [Industries](#7-industries)
8. [Surfaces and materials](#8-surfaces-and-materials)
9. [Features: application method, sizes and characteristics](#9-features-application-method-sizes-and-characteristics)
10. [Descriptions](#10-descriptions)
11. [Application instructions and suitable uses](#11-application-instructions-and-suitable-uses)
12. [Product status and availability wording](#12-product-status-and-availability-wording)
13. [SDS and TDS standards](#13-sds-and-tds-standards)
14. [Image standards](#14-image-standards)
15. [Translation standards](#15-translation-standards)
16. [How wording affects search](#16-how-wording-affects-search)
17. [Quality control checklist](#17-quality-control-checklist)
18. [Product entry checklist, before publishing](#18-product-entry-checklist-before-publishing)

---

# 1. Approved terminology

| Use this | Not this | Why |
| --- | --- | --- |
| `Available` | "In stock", "Ready stock" | The website does not track stock levels. "In stock" would be a claim the system cannot support. **Approved wording, do not change.** |
| `Pricing & lead time confirmed on enquiry` | "Call for price", "POA" | This is the approved line shown beside `Available` on the product detail page. **Do not change.** |
| `Unavailable` | "Out of stock", "Discontinued" | The site has exactly two states. |
| **Product Enquiry** | "Cart", "Basket", "Quote request" | The site is business to business, not e-commerce. |
| **Add to Enquiry** | "Add to cart", "Buy" | Same reason. |
| Adhesive, adhesives | "Glue" in product content | "Glue" is fine in conversational contexts such as the advisor, but product content uses the trade term. |
| Yee Lim Adhesives Industries Pte Ltd | "Yee Lim Adhesive", "YLAI" in customer facing copy | Use the full registered name in formal copy. |
| Project ReBond | Any other project name | Internal consistency. |
| "We usually respond within 1 to 2 business days" | Any other commitment | Must match the Contact page, the enquiry page and the confirmation email. |

---

# 2. Required and optional product fields

*(Verified from code. These are the only fields the product form has.)*

## Required

| Field | Limit | Consequence if missing |
| --- | --- | --- |
| **Product Name** | 200 characters | The product cannot be saved. |
| **Category** | Industrial, Commercial or Others | Defaults to Industrial. |
| **Short Description** | 5000 characters | The product cannot be saved. |

## Optional but strongly recommended

| Field | Why it matters |
| --- | --- |
| **Brand** | Drives the public Brand filter and the brand mark on the card. |
| **Product Type** | Drives the Product Type filter. Auto assigned if left blank. |
| **Industries** | Drives the Industry filter and is searchable. |
| **Surfaces** | Drives the Surface filter, the Bond Finder, and is searchable. |
| **Features** | Produces three separate rows on the public specification table. See section 9. |
| **Full Description** | The main body text on the detail page. |
| **How to Use** | Populates the Application & Suitable Uses tab. |
| **Main image** | Without it the card shows a placeholder. |
| **SDS and TDS** | Without them the Downloads tab shows an honest empty state. |

## Fields that do not exist

There is **no** separate field for Available Sizes, Application Method, Suitable Uses,
Key Benefits, price, weight, or SKU. Sizes, application method and characteristics all go
into **Features**; suitable uses go into **How to Use**.

**Status** exists, but is changed from the product list, not from the form.

---

# 3. Product naming standards

**Rule.** Use the official product designation exactly, including the brand and the
trademark mark.

| Correct | Incorrect |
| --- | --- |
| `Deer™ Brand 212` | `Deer Brand 212`, `DEER 212`, `Deer™ 212 Heavy Duty Super Adhesive` |
| `Premier™ Brand G100` | `G100`, `Premier G100 (Green Label)` |

**Additional rules:**

- Do not put marketing adjectives in the name. Put them in the description.
- Do not put the size in the name. Sizes go in Features.
- Do not put "New" or a year in the name.
- Keep the exact product number, including letters, for example `212G`, `232ST`, `232-FG`,
  `969-A`. These distinguish genuinely different products.
- The first letter is automatically capitalised on save. Everything else is stored as you
  type it, so check your capitalisation.

---

# 4. Brand name standards

Exactly five values are available, and they must be used exactly as written:

| Value | Use for |
| --- | --- |
| `Deer™ Brand` | Deer branded adhesives |
| `Horsemen™ Brand` | Horsemen branded adhesives |
| `Premier™ Brand` | Premier branded adhesives |
| `Rhino™ Brand` | Rhino branded adhesives |
| `Others & Accessories` | Spray guns and other non adhesive items |

**Notes:**

- The trademark mark is part of the value. Do not remove it.
- `Others & Accessories` is deliberately hidden from the public Brand filter, but products
  assigned to it still appear in the catalogue under the "Spray Guns & Accessories"
  product type.
- To add a new brand, add it in **Admin, Catalogue Filters** first. Note that the brand
  choices on the **product form itself** are a fixed list in the page, so adding a brand
  to Catalogue Filters makes it appear in the public sidebar but does not automatically
  add it to the form's dropdown. `[DEVELOPER TO VERIFY]` a new brand on the product form
  requires a developer change.

---

# 5. Category standards

Three values: **Industrial**, **Commercial**, **Others**.

| Value | Use for |
| --- | --- |
| `Industrial` | Adhesives for manufacturing, construction and trade use. The majority of the range. |
| `Commercial` | Adhesives aimed at commercial and general purpose applications. |
| `Others` | Non adhesive items. Setting this also causes the product type to default to Spray Guns & Accessories. |

Category feeds the dashboard's catalogue breakdown and the analytics grouping, so keep it
consistent.

---

# 6. Product Type standards

Two values in the form: **Adhesives**, and **Spray Guns & Accessories**.

If left blank, the system assigns:

- `Spray Guns & Accessories` when the brand is `Others & Accessories` **or** the category
  is `Others`.
- `Adhesives` otherwise.

*(Verified from code.)*

New product types can be added in **Admin, Catalogue Filters**, which makes them appear in
the public sidebar. `[DEVELOPER TO VERIFY]` adding them to the product form's dropdown
requires a developer change.

---

# 7. Industries

Enter as a **comma separated list**, for example `Carpentry, Flooring, Upholstery`.

The twelve seeded values are:

Automotive, Carpentry, Cooling Process, Fashion, Flooring, Insulation, Lift & Escalator,
Marine, Packaging, Plumbing & Sanitary, Upholstery, Waterproof.

**Rules:**

- Spell them **exactly** as they appear in **Catalogue Filters**. `Flooring` and `Floors`
  become two separate filters, splitting your products.
- Add a new industry in **Catalogue Filters** before tagging any product with it.
- Tag every industry the product genuinely serves. Under tagging hides the product from
  customers browsing by industry.
- Do not invent an industry to boost visibility. It misleads buyers.

---

# 8. Surfaces and materials

Enter as a **comma separated list**, for example `Wood, Laminates, Metal`.

The fifteen seeded values are:

Carpet, Fibreglass Wool, Foam & Sponge, Labels, Laminates, Leather, Metal, Paper,
Plastics & Acrylics, Rubber, Stone Ceramics, Tiles, Turf, Wallpaper, Wood.

**Rules:**

- Same exact spelling rule as industries.
- **Surfaces drive the Bond Finder.** A customer choosing "first surface: Wood, second
  surface: Laminates" will only be shown products tagged with those surfaces. Incomplete
  surface tagging is the single most common reason a suitable product does not appear in
  a Bond Finder result.
- Tag both sides of a typical bond where relevant.

---

# 9. Features: application method, sizes and characteristics

**This field needs the most care.** It is one comma separated list, but the public product
page splits it into three different specification rows using two exact prefixes.
*(Verified from code.)*

| What you type | Where it appears |
| --- | --- |
| `Application: Brush or Roll` | The **Application Method** row |
| `Available in 300G, 1/4 US Gallon, 1 US Gallon` | The **Available Sizes** row |
| `Solvent-based` or `Water-based` | Hidden, because the Product Type row already says this |
| Anything else | The **Characteristics** row |

## 9.1 Correct format

```
Solvent-based, Application: Brush or Roll, Liquid, Yellow, Available in 75G Tube, 300G, 1/4 US Gallon, 1 US Gallon
```

Renders publicly as:

- **Application Method**: Brush or Roll
- **Available Sizes**: 75G Tube, 300G, 1/4 US Gallon, 1 US Gallon
- **Characteristics**: Liquid, Yellow

## 9.2 Common mistakes

| Wrong | What happens | Correct |
| --- | --- | --- |
| `Applied by brush` | Falls into Characteristics, no Application Method row | `Application: Brush or Roll` |
| `Application method: Spray` | Falls into Characteristics, the prefix must be exactly `Application:` | `Application: Spray` |
| `Sizes: 300G, 1L` | Falls into Characteristics, no Available Sizes row | `Available in 300G, 1L` |
| `Available: 300G` | Same, the prefix must be exactly `Available in ` | `Available in 300G` |

## 9.3 Approved application methods

*(Recommendation)* Keep these consistent so filtering and the Bond Finder work well:
`Brush or Roll`, `Spray`, `Trowel`, `Notched Trowel`, `Brush`, `Roller`.
`[CLIENT TO CONFIRM]` the definitive internal list.

## 9.4 Characteristics

Genuine recorded properties only, for example `Liquid`, `Yellow`, `Low VOC`,
`Fast setting`, `Heat resistant`, `Green Label`.

Avoid subjective claims: "best in class", "unbeatable", "premium quality".

---

# 10. Descriptions

## 10.1 Short Description

**One factual sentence.** It is shown on the product card, at the top of the detail page,
in the Product Advisor's answers, and in search results.

**Good:**
> Deer™ Brand 212 is a heavy duty solvent based adhesive for tiles, stone, marble, metal
> and raised flooring works.

**Poor:**
> Our amazing best selling adhesive, perfect for all your bonding needs!

**Rules:**
- State what it is and what it is formulated for.
- Include the product name at the start where it reads naturally.
- Keep it under about 200 characters so it does not overflow the card.
- No pricing, no availability language, no exclamation marks.

## 10.2 Full Description

**Two to four sentences** expanding on the short description. Cover the genuine
properties: strength, water resistance, cure characteristics, working time.

**Rules:**
- Every property stated must be traceable to a Yee Lim data sheet or internal approval.
- Do not imply regulatory approval the product does not hold.
- Do not compare with a competitor's product by name.
- If a product carries the Singapore Green Label or a low VOC classification, say so
  plainly and only if it genuinely does.

---

# 11. Application instructions and suitable uses

Both go into the **How to Use** field.

## 11.1 Format

```
Apply by brush or roll.
Suitable for: Leather product bonding; Shoe in-soles; General purpose.
```

The public page looks for the `Suitable for:` marker and renders the list separately from
the instructions.

## 11.2 The delimiter rule (important)

> **Warning.** Some existing records lost the separators between their suitable use items,
> so the list reads as one run on sentence, for example
> "Leather product bonding Shoe in-soles General purpose."
>
> The website **deliberately refuses to guess** where to split such a sentence, because
> guessing would invent product claims. It shows the text as clean prose instead.
>
> When you edit a product, **always** separate the uses with semicolons.
> *(Verified from code.)*

Use **semicolons** between items. Commas also work, but semicolons are unambiguous when an
individual use itself contains a comma.

## 11.3 Writing suitable uses

- One clear application per item.
- Phrase them as the customer would think of the job: "Shoe in-soles", not "sole bonding
  substrate adhesion".
- Do not list an application the product is not genuinely suitable for.

---

# 12. Product status and availability wording

| State | Public appearance |
| --- | --- |
| `Available` | Shown with the line `Pricing & lead time confirmed on enquiry` |
| `Unavailable` | Labelled Unavailable. The Product Advisor will explicitly say it is currently unavailable rather than recommending it as if it were in stock. |

> **The wording `Available` and `Pricing & lead time confirmed on enquiry` is approved and
> must not be changed to "In stock".** *(Project decision.)*

**Rules:**

- Change status from the product list, not from the edit form.
- For a discontinued or temporarily unavailable product, mark it **Unavailable**. Do not
  delete it. Deleting also destroys its photographs and data sheets permanently.
- Review Unavailable products periodically. A product left Unavailable for a year is
  probably a delete or a genuine relaunch decision, not a status.

---

# 13. SDS and TDS standards

| Rule | Value |
| --- | --- |
| Format | PDF only *(Verified from code)* |
| Maximum size | 10 MB *(Verified from code)* |
| One per product per type | Uploading a new SDS replaces the old SDS. Same for TDS. |
| How customers get it | Through the download gate: name, work email and company required, then a single use link valid for about 15 minutes. |

**Rules:**

- Upload only the current approved revision.
- `[CLIENT TO CONFIRM]` Who inside Yee Lim approves a data sheet before it is published.
- *(Recommendation)* Name the source file so the customer can see what it is and when it
  was issued: `Deer-Brand-101-SDS-2026-03.pdf`.
- After uploading, test the download yourself from the public product page.
- Record the change in [10_CHANGE_LOG_TEMPLATE.md](10_CHANGE_LOG_TEMPLATE.md), including
  who approved the document.
- Never upload a data sheet from a supplier or a competitor.

---

# 14. Image standards

| Rule | Value |
| --- | --- |
| Formats | JPG, PNG, WEBP *(Verified from code)* |
| Maximum size | 5 MB per image *(Verified from code)* |
| Dimensions | Not enforced by the code. `[DEVELOPER TO VERIFY]` |

*(Recommendations, not enforced by the system:)*

- Roughly square, around 1200 by 1200 pixels.
- Plain, light, consistent background across the catalogue.
- The product clearly centred, filling most of the frame.
- Under about 500 KB per file, so mobile pages stay fast.
- The main image shows the product as a customer would recognise it on a shelf.
  Additional images can show labels, application shots or size variants.
- Consistency across the range matters more than any single perfect photograph.

**Limitations to plan around:**

- There is no per image delete and no drag to reorder. Re upload in the order you want.
- There is no alternative text field. The product name is used as the image description.
- A product with no image shows a neutral placeholder, which is intentional.

---

# 15. Translation standards

| Content | Who maintains it |
| --- | --- |
| Interface text, English and Chinese | Developer, in the code |
| Product content in **English** | Yee Lim staff, in the admin |
| Product content in **Chinese** | Developer, in the code, keyed by product number |

**Rules:**

1. The admin portal is **English only**. Write English product content there.
2. Adding or editing a product does **not** update its Chinese description. Ask the
   developer to add or refresh it, or accept that the product shows in English on the
   Chinese site until they do.
3. The current Chinese product text is a **first pass draft** and needs native speaker
   review before the Chinese site is promoted.
4. Never machine translate technical or safety wording without a native speaker review.
5. Brand names stay in Latin script: Yee Lim, Deer, Horsemen, Premier, Rhino.
6. The "Suitable for" application lists stay in English by design. Changing that requires
   a code change.
7. Record every translation review in [10_CHANGE_LOG_TEMPLATE.md](10_CHANGE_LOG_TEMPLATE.md).

---

# 16. How wording affects search

The catalogue search matches the **start of a word**, and searches these fields:
name, brand, category, short description, full description, How to Use, industries,
surfaces and features. *(Verified from code)*

**Practical consequences:**

| If a customer searches | They will only find it when |
| --- | --- |
| `waterproof` | The word "waterproof" appears somewhere in the product's recorded data. Tagging the `Waterproof` industry achieves this. |
| `spray` | The product's features say `Application: Spray`, or the description mentions spraying. |
| `marine` | The `Marine` industry is tagged. |
| `212` | The product name contains `212`. |
| `p` (single letter) | Only the **name and brand** are searched for single letter queries, so one letter jumps to a brand such as Premier. |

**Rule.** Use the words your customers use. If they ask for "contact adhesive" and your
description says "solvent based bonding agent", they will not find it. Include both where
it reads naturally.

---

# 17. Quality control checklist

Run this over the whole catalogue quarterly.

- [ ] Every product has a Short Description that is one clear factual sentence.
- [ ] Every product has a main image, or a documented reason it does not.
- [ ] Every product has at least one Industry and at least one Surface tagged.
- [ ] Every product's Features use the exact `Application:` and `Available in ` prefixes.
- [ ] Every "Suitable for" list is properly separated with semicolons.
- [ ] No industry or surface value is a near duplicate of another.
- [ ] Every Unavailable product is genuinely unavailable.
- [ ] Every SDS and TDS is the current approved revision.
- [ ] No product name contains marketing adjectives, sizes or years.
- [ ] The availability wording is untouched: `Available` and
      `Pricing & lead time confirmed on enquiry`.
- [ ] No unsupported technical or regulatory claim appears anywhere.
- [ ] Spot check five products on a phone as well as a desktop.

---

# 18. Product entry checklist, before publishing

Complete this for **every** new or substantially edited product before you consider it
done.

## Factual verification
- [ ] The product name matches the official designation exactly, including the trademark mark.
- [ ] Every technical claim is traceable to a Yee Lim data sheet or an internal approval.
- [ ] The listed suitable uses are genuinely suitable.
- [ ] The sizes listed are sizes Yee Lim actually supplies.

## Spelling and wording
- [ ] Product name spelled correctly, including the product number.
- [ ] Descriptions read cleanly, with no typographical errors.
- [ ] Industry and surface values match the Catalogue Filters values character for character.
- [ ] The Features field uses the exact prefixes.

## Brand and classification
- [ ] Correct brand selected.
- [ ] Correct category selected.
- [ ] Correct product type selected, or deliberately left blank so the default applies.

## Images
- [ ] Main image uploaded, JPG, PNG or WEBP, under 5 MB.
- [ ] Additional images uploaded in the order you want them displayed.
- [ ] The image looks correct on the product card, not awkwardly cropped.

## Documents
- [ ] SDS uploaded, if one exists, as a genuine PDF under 10 MB.
- [ ] TDS uploaded, if one exists, as a genuine PDF under 10 MB.
- [ ] Both are the current approved revision.

## Public verification, do all of these
- [ ] **Desktop preview**: open the public product page and read it end to end.
- [ ] **Mobile preview**: open the same page on a phone. Check the card, the accordion and
      the sticky action bar.
- [ ] **Search test**: search for the product name, and for a keyword a customer would
      actually use. It must appear.
- [ ] **Filter test**: apply each industry and surface you tagged, and confirm the product
      appears under each one.
- [ ] **Bond Finder test**: choose the two surfaces this product bonds and confirm it is
      ranked.
- [ ] **Compare test**: add it to compare with another product and confirm the rows are
      populated as expected.
- [ ] **Enquiry test**: add it to the enquiry basket and confirm the correct name reaches
      the enquiry page.
- [ ] **Download test**: complete the download form on the public page and confirm the
      correct PDF downloads.
- [ ] **Specification test**: confirm the Application Method and Available Sizes rows
      appear, and are not buried in Characteristics.

## Record keeping
- [ ] Change recorded in [10_CHANGE_LOG_TEMPLATE.md](10_CHANGE_LOG_TEMPLATE.md).
- [ ] Chinese translation requested from the developer, if this product needs one.
