const API_BASE_URL = "";

// Shared HTML-escape for any product/user text rendered via innerHTML on the
// public pages. Product fields are admin-controlled, so this is defense in depth
// plus correctness (names with & or < render properly). Escapes the quote and
// apostrophe too, so values are safe inside attribute strings.
function ylEscapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, ch =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

// Shared accessibility helper for modal overlays (advisor, compare sheet, filter
// drawer). Traps Tab focus inside `container`, runs `onEscape` on the Escape key,
// and on release returns focus to whatever was focused when it opened (mirrors
// how the custom-select widget returns focus to its trigger). Returns a release()
// function the caller invokes when the overlay closes.
function ylFocusTrap(container, opts = {}) {
  if (!container) return function () {};
  const prevFocus = document.activeElement;
  const onEscape  = typeof opts.onEscape === "function" ? opts.onEscape : null;
  const SEL = 'a[href], button:not([disabled]), input:not([disabled]),' +
              ' select:not([disabled]), textarea:not([disabled]),' +
              ' [tabindex]:not([tabindex="-1"])';

  function focusables() {
    return Array.from(container.querySelectorAll(SEL))
      .filter(el => el.offsetParent !== null || el === document.activeElement);
  }

  function onKeydown(e) {
    if (e.key === "Escape") { if (onEscape) { e.preventDefault(); onEscape(); } return; }
    if (e.key !== "Tab") return;
    const f = focusables();
    if (!f.length) { e.preventDefault(); return; }
    const first = f[0], last = f[f.length - 1], active = document.activeElement;
    if (e.shiftKey && (active === first || !container.contains(active))) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && (active === last || !container.contains(active))) {
      e.preventDefault(); first.focus();
    }
  }

  document.addEventListener("keydown", onKeydown, true);

  const initial = opts.initialFocus || focusables()[0] || container;
  setTimeout(() => { try { initial.focus(); } catch (e) {} }, opts.focusDelay || 0);

  return function release(restoreFocus = true) {
    document.removeEventListener("keydown", onKeydown, true);
    if (restoreFocus && prevFocus && typeof prevFocus.focus === "function") {
      try { prevFocus.focus(); } catch (e) {}
    }
  };
}

const BRANDS = ["Deer™ Brand", "Horsemen™ Brand", "Premier™ Brand", "Rhino™ Brand", "Others & Accessories"];

// The four real Yee Lim adhesive brands. "Others & Accessories" is a catalogue
// grouping for non-adhesive items (spray guns), not a brand, so it is excluded
// from the public Brand filter. Admin keeps the full BRANDS list for assignment.
const PUBLIC_BRANDS = ["Deer™ Brand", "Horsemen™ Brand", "Premier™ Brand", "Rhino™ Brand"];

// Display label for a product's brand field. Accessories carry the grouping
// value "Others & Accessories" in the data, but should never read as a product
// brand in the UI, so show "Accessory" instead. Real brands pass through.
function brandDisplay(brand) {
  return brand === "Others & Accessories" ? "Accessory" : brand;
}

// Public Product Type filter. Derived from existing data (no schema change):
// non-adhesive items carry category "Others" / brand "Others & Accessories".
// This is the clear discovery path for the spray guns now that they no longer
// appear under Brand.
const PRODUCT_TYPES = ["Adhesives", "Spray Guns & Accessories"];

function productType(product) {
  const isAccessory = product.brand === "Others & Accessories" || product.category === "Others";
  return isAccessory ? "Spray Guns & Accessories" : "Adhesives";
}

const INDUSTRIES = [
  "Automotive", "Carpentry", "Cooling Process", "Fashion", "Flooring",
  "Insulation", "Lift & Escalator", "Marine", "Packaging",
  "Plumbing & Sanitary", "Upholstery", "Waterproof"
];

const SURFACES = [
  "Carpet", "Fibreglass Wool", "Foam & Sponge", "Labels", "Laminates",
  "Leather", "Metal", "Paper", "Plastics & Acrylics", "Rubber",
  "Stone Ceramics", "Tiles", "Turf", "Wallpaper", "Wood"
];

let PRODUCTS = [];

function normaliseProduct(product) {
  const id = String(product._id || product.id || "");
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];

  return {
    ...product,
    id,
    _id: product._id || id,
    brand: product.brand || "Yee Lim",
    category: product.category || "Others",
    shortDescription: product.shortDescription || "",
    fullDescription: product.fullDescription || "",
    usage: product.usage || "",
    imageUrl: product.imageUrl || "",
    images: images.length ? images : (product.imageUrl ? [product.imageUrl] : []),
    sdsUrl: product.sdsUrl || product.sds_url || "",
    tdsUrl: product.tdsUrl || product.tds_url || "",
    status: product.status || "Available",
    industries: Array.isArray(product.industries) ? product.industries : [],
    surfaces: Array.isArray(product.surfaces) ? product.surfaces : [],
    features: Array.isArray(product.features) ? product.features : []
  };
}

// Shared UI helper: if a product image URL fails to load (missing file, wrong
// path, or images not uploaded yet), swap it for the branded text placeholder so
// the catalogue shows a clean professional placeholder instead of a broken icon.
function ylImageFallback(img, label) {
  const box = img.parentElement;
  if (box) box.classList.add("no-image");
  const mark = document.createElement("div");
  mark.className = "no-image-mark";
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = label || "";
  img.replaceWith(mark);
}

// ─── Demo catalogue fallback ─────────────────────────────────────
// Mirrors the products seeded in database/seed_products.sql so the site
// still shows the real Yee Lim catalogue if PHP/MySQL is unavailable
// (e.g. during a demo). Loaded only when the backend cannot be reached.
// IDs mirror the seeded MySQL auto-increment ids (seed file order), so
// products selected in one mode still resolve in the other.
let YL_DEMO_MODE = false;

const DEMO_PRODUCTS = [
  {
    id: "1", name: "Deer™ Brand 101", brand: "Deer™ Brand", category: "Industrial",
    shortDescription: "Deer™ Brand 101 is a solvent based adhesive formulated to work best for shoe and leather crafting works.",
    fullDescription: "Deer™ Brand 101 is a solvent based adhesive formulated to work best for shoe and leather crafting works. This adhesive is a classic in Yee Lim Adhesives Industries and had proven to work well for these craftsmen. When used accurately, this adhesive provides optimal result for the delivery of the final product.",
    usage: "Apply by brush or roll. Suitable for: Leather product bonding Shoe in-soles General purpose.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2017/07/101_DeerBrand_1USGal.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2017/07/101_DeerBrand_1USGal.jpg"], status: "Available",
    industries: ["Fashion", "Upholstery"], surfaces: ["Leather"],
    features: ["Solvent-based", "Application: Brush or Roll", "Liquid, Yellow", "Available in 75G Tube, 300G, 1/4 US Gallon, 1 US Gallon"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "2", name: "Deer™ Brand 129", brand: "Deer™ Brand", category: "Industrial",
    shortDescription: "Deer™ Brand 129, a higher grade solvent based adhesive formulated to work best for lamination and leather crafting works.",
    fullDescription: "Deer™ Brand 129, a higher grade solvent based adhesive formulated to work best for lamination and leather crafting works. With almost similar properties to our Deer™ Brand 101, Deer™ Brand 129 delivers higher durability and strength for bonding of leather materials with rougher surface. This adhesive is also suitable for lamination works for furniture and wood surfaces.",
    usage: "Apply by brush or roll. Suitable for: Leather crafting Adhesion of laminates (E.g. Carpentry, Door, Cabinet and etc.) Marine supplies - Building and repair works General purpose.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2017/07/129_DeerBrand_1USGal.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2017/07/129_DeerBrand_1USGal.jpg"], status: "Available",
    industries: ["Carpentry", "Fashion", "Marine"], surfaces: ["Laminates", "Leather"],
    features: ["Solvent-based", "Application: Brush or Roll", "Liquid, Yellow", "Available in 1/4 US Gallon, 1 US Gallon", "Low VOC (as stated by Yee Lim)", "Low / non-detectable formaldehyde (lab-tested)"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "3", name: "Deer™ Brand 212", brand: "Deer™ Brand", category: "Industrial",
    shortDescription: "Deer™ Brand 212, a heavy-duty solvent based adhesive that is suitable for tiles, stones, marbles, metals and raised works.",
    fullDescription: "Deer™ Brand 212, a heavy-duty solvent based adhesive that is suitable for tiles, stones, marbles, metals and raised works. This adhesive is specially formulated to be high strength, water resistant, low sagging and lasting. The slow curing properties of this adhesive gives user the time for positioning and readjustments. These properties allow user to leverage its advantages to meet the demand for tough and durable solution.",
    usage: "Apply by brush or roll. Suitable for: Tile bonding Marble bonding Stone bonding Metal bonding Raised flooring joint works Fish ponds.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2017/07/212_DeerBrand_18L.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2017/07/212_DeerBrand_18L.jpg"], status: "Available",
    industries: ["Flooring"], surfaces: ["Metal", "Stone Ceramics", "Tiles", "Turf"],
    features: ["Solvent-based", "Application: Brush or Roll", "Paste, Ivory White", "Available in 5KGs, 20KGs"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "4", name: "Deer™ Brand 212G", brand: "Deer™ Brand", category: "Industrial",
    shortDescription: "Deer™ Brand 212G, a heavy-duty solvent based adhesive that is suitable for artificial grass/carpet grass.",
    fullDescription: "Deer™ Brand 212G, a heavy-duty solvent based adhesive that is suitable for artificial grass/carpet grass. This adhesive is specially formulated to be high strength, water resistant, low sagging, lasting and most importantly, colour matching with the turf. The slow curing properties of this adhesive gives user the time for positioning and readjustments.",
    usage: "Apply by brush or roll. Suitable for: Artificial Turf Artificial Grass/Carpet Grass Synthetic Tiles/Turf.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2017/07/212G_DeerBrand_18L.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2017/07/212G_DeerBrand_18L.jpg"], status: "Available",
    industries: ["Flooring"], surfaces: ["Carpet", "Tiles", "Turf"],
    features: ["Solvent-based", "Application: Brush or Roll", "Paste, Green", "Available in 5KGs, 20KGs"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "5", name: "Deer™ Brand 232", brand: "Deer™ Brand", category: "Industrial",
    shortDescription: "Deer™ Brand 232 is a low-odour solvent-based foam and plastic adhesive for foam, insulation and interior landscaping work.",
    fullDescription: "Deer™ Brand 232 is a less toxic and low odor solvent based adhesive. It delivers high tensile strength and fast curing properties that helps to improve work effectiveness and efficiency. These properties allows the adhesive to be used in an extensive range of industries from foam industries producing packaging materials, mattresses, pillows to interior landscaping and vertical gardening.",
    usage: "Apply by brush or roll. Suitable for: Foam, Styrofoam Polyfoam PVC foam Plastic Insulation materials Interior landscaping Vertical Gardening.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2017/07/232_DeerBrand_1USGal.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2017/07/232_DeerBrand_1USGal.jpg"], status: "Available",
    industries: ["Insulation", "Packaging"], surfaces: ["Foam & Sponge", "Plastics & Acrylics"],
    features: ["Solvent-based", "Application: Brush or Roll", "Liquid, Transparent, Slight amber", "Available in 1 US Gallon, 18L"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "6", name: "Deer™ Brand 232-FG", brand: "Deer™ Brand", category: "Industrial",
    shortDescription: "Deer™ Brand 232-FG, commonly known as credit card glue or fugitive glue, is a less toxic solvent based adhesives formulated to work best for marketing and advertising purpose.",
    fullDescription: "Deer™ Brand 232-FG, commonly known as credit card glue or fugitive glue, is a less toxic solvent based adhesives formulated to work best for marketing and advertising purpose. This adhesives delivers adequate holding strength for your cards and marketing samples and yet leaving no trace of residue or tear. Applying the adhesives holds no restriction as user can apply the glue dots of their preferred size and quantity.",
    usage: "Apply by dip. Suitable for: Marketing, Advertisements, Labels, Letters, Magazine, Credit Card.",
    imageUrl: "", images: [], status: "Available",
    industries: ["Packaging"], surfaces: ["Labels"],
    features: ["Solvent-based", "Application: Dip", "Liquid (Slight Paste), Transparent", "Available in 200ml, 1/4 US Gallon"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "7", name: "Deer™ Brand 232ST", brand: "Deer™ Brand", category: "Industrial",
    shortDescription: "Deer™ Brand 232ST is a low-odour, lower-viscosity solvent-based foam and plastic adhesive suitable for spray application.",
    fullDescription: "Deer™ Brand 232ST is a less toxic and low odor solvent based adhesive. It can be classified under the same category as Deer™ Brand 232. With its lower viscosity, the 232ST allows application to be done using spray method. It delivers high tensile strength and fast curing properties that helps to improve work effectiveness and efficiency.",
    usage: "Apply by spray, brush or roll. Suitable for: Foam, Styrofoam Polyfoam PVC foam Plastic Insulation materials Interior landscaping Vertical Gardening.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2017/07/232ST_DeerBrand_1USGal.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2017/07/232ST_DeerBrand_1USGal.jpg"], status: "Available",
    industries: ["Packaging"], surfaces: ["Foam & Sponge", "Plastics & Acrylics"],
    features: ["Solvent-based", "Application: Spray, Brush or Roll", "Liquid, Transparent, Slight amber", "Available in 1 US Gallon, 18L"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "8", name: "Deer™ Brand 313", brand: "Deer™ Brand", category: "Industrial",
    shortDescription: "Deer™ Brand 313 PVC adhesive is suitable for PVC pipe to PVC pipe adhesion.",
    fullDescription: "Deer Brand 313 PVC adhesive is suitable for PVC pipe to PVC pipe adhesion. The adhesive is colourless and fast drying. Bonding can be made immediately after application and the drying and setting time is approximately 3 - 5 minutes. Once set, the pipe creates a non-removable joint. For most effective bonding, allow adhesion to cure at least 24 hours after bonding to achieve greater strength.",
    usage: "Ensure bonding pipes/surface are cleaned, dried and free from any contaminants. Apply adhesive on the both entire bonding surface (e.g. the entire circumference of both pipe). Push and twist both pipes in one full cycle to ensure proper spread and coverage of adhesive. End the twist in its final bonding position and let dry for at least 3 - 5 minutes. Initial strength achieve within short period of time. For best adhesion effect, allow up to 24 hours curing time.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2018/10/DeerBrand313_UPVC.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2018/10/DeerBrand313_UPVC.jpg"], status: "Available",
    industries: ["Plumbing & Sanitary"], surfaces: ["Plastics & Acrylics"],
    features: ["Solvent-based", "Application: Brush or Roll", "Liquid, Colourless", "Available in 400ml"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "9", name: "Deer™ Brand 500 Acrylic Glue Adhesive", brand: "Deer™ Brand", category: "Industrial",
    shortDescription: "Deer™ Brand 500, acrylic glue and adhesive is suitable for acrylic to acrylic bonding.",
    fullDescription: "Deer Brand 500, acrylic glue and adhesive is suitable for acrylic to acrylic bonding. The adhesive is colourless and fast drying. Bonding can be made immediately after application and the drying and setting time is approximately 3 - 5 minutes. Once set, the acrylic cement creates a non-removable joint. For most effective bonding, allow adhesion to cure at least 24 hours after bonding to achieve greater strength. Application method: 1.",
    usage: "1. Ensure bonding surface are cleaned, dried and free from any contaminants. 2. Ensure the bonding edges of both surface are well aligned and smooth. 3. Apply adhesive on both bonding surface using a injection kit or brush and bond immediately. 4. Allow both bonding pieces to lay and set for at least 30 - 45mins before shifting or lifting up. 5. Initial strength achieve within short period of time. For best adhesion effect, allow up to 24 hours curing time",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2018/10/DeerBrand500_AcrylicCement_AcrylicSolvent_400ml.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2018/10/DeerBrand500_AcrylicCement_AcrylicSolvent_400ml.jpg"], status: "Available",
    industries: [], surfaces: ["Plastics & Acrylics"],
    features: ["Solvent-based", "Application: Brush, Roll or Injection", "Liquid, Colourless", "Available in 400ml"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "10", name: "Deer™ Brand 969A", brand: "Deer™ Brand", category: "Industrial",
    shortDescription: "Deer™ Brand 969A is a solvent-based insulation adhesive for bonding fibreglass/mineral wool to aluminium sheet.",
    fullDescription: "Deer™ Brand 969 series is a solvent based adhesive formulated to work best across several industries. The properties of Deer™ Brand 969-A ensures easy-spray with a relatively fast drying time. This adhesive is formulated to bond firebreglass insulation wool to aluminum sheets.",
    usage: "Apply by spray, brush or roll. Suitable for: Fiberglass/Mineral wool to aluminum sheet bonding.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2017/07/969A_DeerBrand_1USGal.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2017/07/969A_DeerBrand_1USGal.jpg"], status: "Available",
    industries: ["Insulation", "Cooling Process"], surfaces: ["Fibreglass Wool", "Metal"],
    features: ["Solvent-based", "Application: Spray, Brush or Roll", "Liquid, Yellow", "Available in 1 US Gallon, 18 Litres"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "11", name: "Deer™ Brand 969H", brand: "Deer™ Brand", category: "Industrial",
    shortDescription: "Solvent-based cushion & sponge adhesive for automotive and insulation applications.",
    fullDescription: "Base: Solvent Based Method: Spray Brush Roll Bonds: Foam & Sponge Vehicle upholstery Rubber Fibreglass wool",
    usage: "Apply by spray, brush or roll. Suitable for: Foam & Sponge bonding Sofa manufacturing Adhesion for vehicle interior upholstery Rubber mat tiles Fibreglass wool bonding General Purpose.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2017/07/969H_DeerBrand_1USGal.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2017/07/969H_DeerBrand_1USGal.jpg"], status: "Available",
    industries: ["Automotive", "Insulation", "Packaging", "Upholstery"], surfaces: ["Fibreglass Wool", "Foam & Sponge", "Leather", "Rubber", "Tiles"],
    features: ["Solvent-based", "Application: Spray, Brush or Roll", "Liquid, Yellow", "Available in 1 US Gallon, 18 Litres"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "12", name: "Deer™ Brand 969NT", brand: "Deer™ Brand", category: "Industrial",
    shortDescription: "Deer™ Brand 969NT is a low odor, solvent based adhesives that is suitable for carpet works.",
    fullDescription: "Deer™ Brand 969NT is a low odor, solvent based adhesives that is suitable for carpet works. The adhesive is rigid enough to withstand high amount of friction caused by walking and stepping on the carpet roll(s). Solvent based adhesives are known to carry pungent smell during use and could possibly cause discomfort to some. Thus, this adhesive had been specially formulated to lower odor so that carpet laying works could be conducted at ease.",
    usage: "Apply by brush or roll. Suitable for: Bonding of carpet roll General purpose.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2017/07/969NT_DeerBrand_1USGal.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2017/07/969NT_DeerBrand_1USGal.jpg"], status: "Available",
    industries: ["Flooring"], surfaces: ["Carpet"],
    features: ["Solvent-based", "Application: Brush or Roll", "Liquid, Transparent, Slight amber", "Available in 1 US Gallon"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "13", name: "Deer™ Brand 969WT", brand: "Deer™ Brand", category: "Industrial",
    shortDescription: "Solvent-based fiberglass adhesive for fiberglass to aluminum bonding.",
    fullDescription: "No in depth information on Deer™ Brand 969WT. Usage Fiberglass to aluminum bonding",
    usage: "Apply by spray, brush or roll. Suitable for: Fiberglass to aluminum bonding.",
    imageUrl: "", images: [], status: "Available",
    industries: ["Insulation", "Cooling Process"], surfaces: ["Fibreglass Wool", "Metal"],
    features: ["Solvent-based", "Application: Spray, Brush or Roll", "Liquid, Transparent Yellow", "Available in 1 US Gallon, 18L"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "14", name: "Deer™ Brand PVA", brand: "Deer™ Brand", category: "Industrial",
    shortDescription: "Deer™ Brand PVA, also commonly known as PVAC, is a water-based adhesive used for craft works.",
    fullDescription: "Deer™ Brand PVA, also commonly known as PVAC, is a water-based adhesive used for craft works. When applied, the adequate open time allows for re-adjustments and re-alignment to be made so as to achieve the final desired product. When dried, the adhesive is slightly flexible and delivers strong bond. The PVA glue does not gives off dangerous fumes or toxic and thus, it is one of the safest adhesives to be handled by non professional.",
    usage: "Apply by brush or roll. Suitable for: Wood to wood bonding Paper Cloth Paper & Book Binding General Art & Craft General purpose.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2017/07/PVA_DeerBrand_1USGal.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2017/07/PVA_DeerBrand_1USGal.jpg"], status: "Available",
    industries: ["Carpentry"], surfaces: ["Paper", "Wallpaper", "Wood"],
    features: ["Water-based", "Application: Brush or Roll", "Liquid, White", "Available in 150ml, 250ml, 3KG, 6KG, 20KG"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "15", name: "Horsemen™ 707", brand: "Horsemen™ Brand", category: "Industrial",
    shortDescription: "Horsemen™ Brand 707 adhesive is a solvent based adhesive that is largely used by waterproofing specialist.",
    fullDescription: "Horsemen™ Brand 707 adhesive is a solvent based adhesive that is largely used by waterproofing specialist. The formulation of this adhesive provides great tensile strength to provide sufficient grip on waterproofing membrane. The adhesive also provides great adhesion to a variety of materials such as cushion, carpet and other general purpose work. Therefore, this adhesive is also largely popular in certain region for shoe making purpose.",
    usage: "Apply by brush or roll. Suitable for: Adhesion of waterproofing membrane to concrete Adhesion of rubber mat tiles to concrete Marine supplies - Building and repair works General purpose.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2017/10/707_HorsemenBrand_1USGal.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2017/10/707_HorsemenBrand_1USGal.jpg"], status: "Available",
    industries: ["Marine", "Waterproof"], surfaces: ["Rubber", "Tiles"],
    features: ["Solvent-based", "Application: Brush or Roll", "Liquid, Yellow", "Available in 1/4 US Gallon, 1 US Gallon"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "16", name: "Horsemen™ 707A5", brand: "Horsemen™ Brand", category: "Industrial",
    shortDescription: "Horsemen™ Brand 707A5 adhesive is a solvent based adhesive that is largely used by carpenters.",
    fullDescription: "Horsemen™ Brand 707A5 adhesive is a solvent based adhesive that is largely used by carpenters. The formulation of this adhesive provides easy spread and quick drying.",
    usage: "Apply by scrape, brush or roll. Suitable for: Bonding of Laminates General Purpose.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2020/04/707C_HorsemenBrand_1USGal.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2020/04/707C_HorsemenBrand_1USGal.jpg"], status: "Available",
    industries: ["Carpentry"], surfaces: ["Laminates"],
    features: ["Solvent-based", "Application: Scrape, Brush or Roll", "Liquid, Yellow", "Available in 1 US Gallon"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "17", name: "Horsemen™ 707C", brand: "Horsemen™ Brand", category: "Industrial",
    shortDescription: "Horsemen™ Brand 707C adhesive is a solvent based adhesive that is largely used by carpet installers and specialist.",
    fullDescription: "Horsemen™ Brand 707C adhesive is a solvent based adhesive that is largely used by carpet installers and specialist. The formulation of this adhesive provides easy spread, sufficient adhesion strength and flexibility for daily traffic.",
    usage: "Apply by brush or roll. Suitable for: For bonding of carpet roll General purpose.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2020/04/707C_HorsemenBrand_1USGal.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2020/04/707C_HorsemenBrand_1USGal.jpg"], status: "Available",
    industries: ["Flooring"], surfaces: ["Carpet"],
    features: ["Solvent-based", "Application: Brush or Roll", "Liquid, Yellow", "Available in 1 US Gallon"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "18", name: "Horsemen™ 707S", brand: "Horsemen™ Brand", category: "Industrial",
    shortDescription: "Horsemen™ Brand 707S adhesive is a solvent based adhesive that is largely used across multiple industries.",
    fullDescription: "Horsemen™ Brand 707S adhesive is a solvent based adhesive that is largely used across multiple industries. The formulation of this adhesive provides excellent spray capabilities and dry time and thus, is being widely used in industries that requires efficiency and short working time. The adhesive also provides great adhesion to a variety of materials such as cushion, leather, waterproofing membranes and other general purpose work.",
    usage: "Apply by spray, brush or roll. Suitable for: Adhesion for vehicle interior upholstery Adhesion of rubber mat tiles to concrete Furniture upholstery (Sofa making) Packaging General purpose.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2020/05/707S_HorsemenBrand_1USGal.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2020/05/707S_HorsemenBrand_1USGal.jpg"], status: "Available",
    industries: ["Automotive", "Insulation", "Packaging", "Upholstery"], surfaces: ["Foam & Sponge", "Leather", "Rubber", "Tiles"],
    features: ["Solvent-based", "Application: Spray, Brush or Roll", "Liquid, Yellow", "Available in 1 US Gallon, 18L"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "19", name: "Premier™ Brand 100", brand: "Premier™ Brand", category: "Industrial",
    shortDescription: "Premier™ Brand 100 is a water-based, pressure-sensitive carpet tile adhesive that also suits pressure-sensitive label making.",
    fullDescription: "Premier Brand 100 series water based adhesives is a range of pressure sensitive adhesive that delivers high bonding strength to meet the demanding requirements. Premier™ Brand 100 adhesive is widely used for carpet tiling purpose and had proven to work for both soft and rigid base carpet tiles.",
    usage: "Apply by scrape, brush or roll. Suitable for: Carpet tile bonding Labels bonding.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2020/05/100_PremierBrand_18L.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2020/05/100_PremierBrand_18L.jpg"], status: "Available",
    industries: ["Flooring"], surfaces: ["Carpet", "Labels", "Tiles"],
    features: ["Water-based", "Application: Scrape, Brush or Roll", "Liquid, White (Transparent when dried.)", "Available in 18L"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "20", name: "Premier™ Brand 100B", brand: "Premier™ Brand", category: "Industrial",
    shortDescription: "Premier™ Brand 100B is a higher-grade, water-based pressure-sensitive carpet tile adhesive.",
    fullDescription: "Premier Brand 100 series water based adhesives is a range of pressure sensitive adhesive that delivers high bonding strength to meet the demanding requirements. Premier™ Brand 100B, 100B2, 100E, 100E2 and 110 adhesive is widely used for carpet tiling purpose and had proven to work for both soft and rigid base carpet tiles.",
    usage: "Apply by scrape, brush or roll. Suitable for: Carpet tile bonding.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2017/07/100B_PremierBrand_18L.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2017/07/100B_PremierBrand_18L.jpg"], status: "Available",
    industries: ["Flooring"], surfaces: ["Carpet", "Tiles"],
    features: ["Water-based", "Application: Scrape, Brush or Roll", "Liquid, White (Transparent when dried.)", "Available in 18L"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "21", name: "Premier™ Brand 100B2", brand: "Premier™ Brand", category: "Industrial",
    shortDescription: "Premier™ Brand 100B2 is a higher-grade, water-based pressure-sensitive carpet tile adhesive.",
    fullDescription: "Premier Brand 100 series water based adhesives is a range of pressure sensitive adhesive that delivers high bonding strength to meet the demanding requirements. Premier™ Brand 100B, 100B2, 100E, 100E2 and 110 adhesive is widely used for carpet tiling purpose and had proven to work for both soft and rigid base carpet tiles.",
    usage: "Apply by scrape, brush or roll. Suitable for: Carpet tile bonding.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2017/07/100B_PremierBrand_18L.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2017/07/100B_PremierBrand_18L.jpg"], status: "Available",
    industries: ["Flooring"], surfaces: ["Carpet", "Tiles"],
    features: ["Water-based", "Application: Scrape, Brush or Roll", "Liquid, White (Transparent when dried.)", "Available in 18L"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "22", name: "Premier™ Brand 110", brand: "Premier™ Brand", category: "Industrial",
    shortDescription: "Premier™ Brand 110 is a lower-grade, water-based pressure-sensitive carpet tile adhesive.",
    fullDescription: "Premier Brand 100 series water based adhesives is a range of pressure sensitive adhesive that delivers high bonding strength to meet the demanding requirements. Premier™ Brand 100B, 100B2, 100E, 100E2 and 110 adhesive is widely used for carpet tiling purpose and had proven to work for both soft and rigid base carpet tiles.",
    usage: "Apply by scrape, brush or roll. Suitable for: Carpet tile bonding.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2020/05/110_PremierBrand_18L.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2020/05/110_PremierBrand_18L.jpg"], status: "Available",
    industries: ["Flooring"], surfaces: ["Carpet", "Tiles"],
    features: ["Water-based", "Application: Scrape, Brush or Roll", "Liquid, White (Transparent when dried.)", "Available in 18L"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "23", name: "Premier™ Brand 138", brand: "Premier™ Brand", category: "Industrial",
    shortDescription: "Premier™ Brand 138 is a solvent based adhesive formulated to work best for shoe and many leather crafting works.",
    fullDescription: "Premier™ Brand 138 is a solvent based adhesive formulated to work best for shoe and many leather crafting works. This adhesive had proven to work well for these craftsmen and when used accurately, this adhesive provides optimal result for the delivery of the final product.",
    usage: "Apply by brush or roll. Suitable for: Rubber-typed shoe soles Leather-typed shoes Shoe in-soles Leather crafting Shoe repair clobbering works.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2017/07/138_PremierBrand_1USGal.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2017/07/138_PremierBrand_1USGal.jpg"], status: "Available",
    industries: ["Fashion"], surfaces: ["Leather", "Rubber"],
    features: ["Solvent-based", "Application: Brush or Roll", "Liquid, Yellow", "Available in 1/4 US Gallon, 1 US Gallon"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "24", name: "Premier™ Brand 2000", brand: "Premier™ Brand", category: "Industrial",
    shortDescription: "Premier™ Brand 2000 is a water-based, pressure-sensitive adhesive for PVC and vinyl tile flooring.",
    fullDescription: "Premier™ Brand 2000 is a water based, pressure sensitive adhesive that delivers high bonding strength to meet the demanding requirements. Premier™ Brand 2000 is widely used for PVC & vinyl tile adhesion. The flexibility and resiliency of the adhesive gives users a peace of mind in the harsh environment as the adhesive can withhold long term friction caused by user interaction (such as walking) after fully cured.",
    usage: "Apply by brush or roll. Suitable for: PVC & Vinyl tile.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2017/07/2000_PremierBrand_18L.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2017/07/2000_PremierBrand_18L.jpg"], status: "Available",
    industries: ["Flooring"], surfaces: ["Carpet", "Plastics & Acrylics", "Rubber", "Tiles"],
    features: ["Water-based", "Application: Brush or Roll", "Liquid, White", "Available in 5KGs, 10KGs, 20KGs"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "25", name: "Premier™ Brand 202", brand: "Premier™ Brand", category: "Industrial",
    shortDescription: "Premier™ Brand 202 is a solvent-based adhesive for waterproofing membrane, gasket bonding and lift/escalator lamination.",
    fullDescription: "Premier™ Brand 202 is a solvent based adhesives that delivers high bonding strength to meet demanding requirements. This adhesives is applicable for adhesion of waterproofing membrane, gasket bonding and lamination used for lift, elevators and escalators.",
    usage: "Apply by brush or roll. Suitable for: Waterproofing membrane works Gasket bonding Lift lamination Marine supplies - Building and repair works Rubber bonding General purpose.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2017/07/202_PremierBrand_1USGal.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2017/07/202_PremierBrand_1USGal.jpg"], status: "Available",
    industries: ["Lift & Escalator", "Marine", "Waterproof"], surfaces: ["Laminates", "Metal", "Rubber"],
    features: ["Solvent-based", "Application: Brush or Roll", "Liquid, Yellow", "Available in 1/4 US Gallon, 1 US Gallon"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "26", name: "Premier™ Brand 3000 Series Wallpaper Adhesives", brand: "Premier™ Brand", category: "Industrial",
    shortDescription: "Premier™ Brand 3000 series is a range of environmental friendly wallpaper adhesive that is made from natural ingredients.",
    fullDescription: "Premier™ Brand 3000 series is a range of environmental friendly wallpaper adhesive that is made from natural ingredients. These adhesive also delivers the following properties: - Easy to mix (Add water + Stir) - Good holding strength - Control own viscosity & stickiness - Allows re-alignment and flattening before curing - Environmental friendly & Safe to use - Odorless during and after application Premier™ Brand 3001: Higher grade & strength Premier™ Brand…",
    usage: "Apply by brush or roll. Suitable for: Wallpaper covering works.",
    imageUrl: "", images: [], status: "Available",
    industries: [], surfaces: ["Paper", "Wallpaper"],
    features: ["Water-based", "Application: Brush or Roll", "Powder, White", "Available in 200g"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "27", name: "Premier™ Brand 5050", brand: "Premier™ Brand", category: "Industrial",
    shortDescription: "Premier™ Brand 5050 is an environmental friendly wallpaper adhesive that is made from plant fibre.",
    fullDescription: "Premier™ Brand 5050 is an environmental friendly wallpaper adhesive that is made from plant fibre. This adhesive also delivers the following properties: Premixed Good holding strength Allows re-alignment and flattening before curing Environmental friendly & Safe to use Odorless during and after application",
    usage: "Apply by brush or roll. Suitable for: Heavy duty wallpaper covering.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2017/07/5050_PremierBrand_5L.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2017/07/5050_PremierBrand_5L.jpg"], status: "Available",
    industries: [], surfaces: ["Paper", "Wallpaper"],
    features: ["Water-based", "Application: Brush or Roll", "Paste, Transparent White", "Available in 5KGs"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "28", name: "Premier™ Brand G100 Carpet Tile Adhesive", brand: "Premier™ Brand", category: "Industrial",
    shortDescription: "Premier™ Brand G100 is an eco-friendly, low-VOC water-based carpet tile adhesive listed under the Singapore Green Label scheme.",
    fullDescription: "Premier™ Brand G100 water based adhesives is a pressure sensitive adhesive that delivers high bonding strength to meet the demanding requirements. The shift towards green and eco-friendly products resulted in the formulation of G100, an environmental friendly adhesive that produces low VOC and low emission. With fairly similar properties as the other 100 series adhesive, G100 can also be used for both soft and rigid base carpet tiles.",
    usage: "Apply by brush or roll. Suitable for: Carpet tile works Pressure Sensitive Adhesive Singapore Green Label Scheme.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2018/05/G100_PremierBrand_18L.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2018/05/G100_PremierBrand_18L.jpg"], status: "Available",
    industries: ["Flooring"], surfaces: ["Carpet", "Tiles"],
    features: ["Water-based", "Application: Brush or Roll", "Liquid, White (Transparent when dried.)", "Available in 18L", "Low VOC (as stated by Yee Lim)", "Singapore Green Label scheme"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "29", name: "Rhino™ Brand 909", brand: "Rhino™ Brand", category: "Industrial",
    shortDescription: "Rhino™ Brand 909 is a solvent based adhesive formulated to work best for laminate works.",
    fullDescription: "Rhino™ Brand 909 is a solvent based adhesive formulated to work best for laminate works. Rhino™ Brand 909 is specially formulated to allow easy and sufficient time for application. When cured and adhered properly, this adhesive delivers excellent finish, durability and strength for bonding of laminating sheets (E.g. Formica Sheets) to carpentry works and furniture.",
    usage: "Apply by brush or roll. Suitable for: Adhesion of laminates (E.g. Carpentry, Door, Cabinet and etc.) General purpose.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2017/07/909_RhinoBrand_1USGal.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2017/07/909_RhinoBrand_1USGal.jpg"], status: "Available",
    industries: ["Carpentry"], surfaces: ["Laminates"],
    features: ["Solvent-based", "Application: Brush or Roll", "Liquid, Yellow", "Available in 1 US Gallon"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "30", name: "ASG001 Adhesive Spray Gun 001", brand: "Others & Accessories", category: "Others",
    shortDescription: "Professional adhesive spray gun with a 2.5mm nozzle for applying spray-grade adhesives.",
    fullDescription: "Adhesive spray gun designed for spray-grade adhesives. Easy to handle and built for long-term, high-volume workloads while delivering an even spray finish. Features three spray controls (volume, fan and air) and comes with a cleaning kit and quick-attachment mouthpiece.",
    usage: "For use with spray-grade adhesives. Adjust the three spray controls (volume, fan and air) to suit the job; clean after use with the supplied cleaning kit.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2020/05/ASG001_AdhesiveSprayGun.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2020/05/ASG001_AdhesiveSprayGun.jpg"], status: "Available",
    industries: [], surfaces: [],
    features: ["2.5mm nozzle", "3 spray controls (volume, fan, air)", "Includes cleaning kit & quick-attach mouthpiece"],
    sdsUrl: "", tdsUrl: ""
  },
  {
    id: "31", name: "ASG002 Adhesive Spray Gun 002", brand: "Others & Accessories", category: "Others",
    shortDescription: "Professional adhesive spray gun with a 2.0mm nozzle for applying spray-grade adhesives.",
    fullDescription: "Adhesive spray gun designed for spray-grade adhesives. Easy to handle and built for long-term, high-volume workloads while delivering an even spray finish. Features three spray controls (volume, fan and air) and comes with a cleaning kit and quick-attachment mouthpiece.",
    usage: "For use with spray-grade adhesives. Adjust the three spray controls (volume, fan and air) to suit the job; clean after use with the supplied cleaning kit.",
    imageUrl: "https://www.yeelim.com.sg/wp-content/uploads/2020/05/ASG002_GlueSprayGun.jpg.jpg", images: ["https://www.yeelim.com.sg/wp-content/uploads/2020/05/ASG002_GlueSprayGun.jpg.jpg"], status: "Available",
    industries: [], surfaces: [],
    features: ["2.0mm nozzle", "3 spray controls (volume, fan, air)", "Includes cleaning kit & quick-attach mouthpiece"],
    sdsUrl: "", tdsUrl: ""
  }
];

// Public pages fall back to the bundled catalogue when the backend is down.
// Admin pages must pass { demoFallback: false } so staff never see demo data
// presented as live data (the call then throws, as it did before the fallback).
async function loadProductsFromBackend(opts = {}) {
  const useFallback = opts.demoFallback !== false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(`${API_BASE_URL}/api/products.php`, { signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) {
      throw new Error("Backend responded with status " + response.status);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("Backend returned an unexpected payload.");
    }

    PRODUCTS = data.map(normaliseProduct);
    YL_DEMO_MODE = false;
    return PRODUCTS;
  } catch (err) {
    if (!useFallback) {
      PRODUCTS = [];
      YL_DEMO_MODE = false;
      throw err;
    }
    // Backend unreachable: fall back to the bundled catalogue so public
    // visitors see a working product page instead of a technical error.
    console.warn("Yee Lim: backend unavailable, using bundled demo catalogue.", err);
    PRODUCTS = DEMO_PRODUCTS.map(normaliseProduct);
    YL_DEMO_MODE = true;
    return PRODUCTS;
  }
}
