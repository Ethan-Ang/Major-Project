const API_BASE_URL = "";

const BRANDS = ["Deer™ Brand", "Horsemen™ Brand", "Premier™ Brand", "Rhino™ Brand"];

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
    id: "1", name: "Deer™ Wood Contact Adhesive", brand: "Deer™ Brand", category: "Industrial",
    shortDescription: "High-strength contact adhesive for wood and laminates bonding.",
    fullDescription: "Deer™ Wood Contact Adhesive is a solvent-based neoprene contact adhesive formulated for bonding wood, laminates, and veneers. It forms an instant, durable bond on contact and is widely used in furniture manufacturing and interior fit-outs.",
    usage: "Apply evenly to both surfaces. Allow to dry for 5–10 minutes until tacky. Press surfaces firmly together. Full bond strength achieved within 24 hours.",
    industries: ["Carpentry", "Flooring"], surfaces: ["Wood", "Laminates"],
    features: ["Instant contact bond", "High solids content", "Excellent heat resistance", "Suitable for vertical surfaces"]
  },
  {
    id: "2", name: "Deer™ Neoprene Rubber Adhesive", brand: "Deer™ Brand", category: "Industrial",
    shortDescription: "Flexible neoprene adhesive for rubber, leather, and foam bonding.",
    fullDescription: "Deer™ Neoprene Rubber Adhesive provides a strong, flexible bond for rubber, leather, and foam materials. Ideal for automotive interiors, upholstery work, and soft furnishings requiring a pliable yet durable bond.",
    usage: "Clean surfaces thoroughly. Apply to both surfaces and allow to flash off for 5 minutes. Press together firmly.",
    industries: ["Automotive", "Upholstery"], surfaces: ["Rubber", "Leather", "Foam & Sponge"],
    features: ["Flexible bond", "Resistant to vibration", "Good chemical resistance", "Suitable for curved surfaces"]
  },
  {
    id: "10", name: "Deer™ Laminate Contact Adhesive", brand: "Deer™ Brand", category: "Industrial",
    shortDescription: "Premium contact adhesive for high-pressure laminates and veneers.",
    fullDescription: "Deer™ Laminate Contact Adhesive is a high-solids neoprene contact adhesive specifically formulated for bonding high-pressure laminates (HPL) to substrates including MDF, plywood, and particleboard. Provides a flat, bubble-free bond.",
    usage: "Apply to both surfaces with a roller or brush. Allow 10 minutes dry time. Align carefully and press from centre outward to eliminate air pockets.",
    industries: ["Carpentry"], surfaces: ["Laminates", "Wood"],
    features: ["High solids content", "Bubble-free bond", "Suitable for post-forming", "Fast setting"]
  },
  {
    id: "3", name: "Horsemen™ Industrial Spray Adhesive", brand: "Horsemen™ Brand", category: "Industrial",
    shortDescription: "Fast-tack spray adhesive for packaging, labels, and foam.",
    fullDescription: "Horsemen™ Industrial Spray Adhesive delivers a consistent, wide-coverage bond ideal for packaging lines, label application, and foam bonding. Its spray format allows fast, even application across large surface areas.",
    usage: "Shake can well. Hold 20–30 cm from surface and spray evenly. Bond immediately or allow to dry for repositionable tack.",
    industries: ["Packaging", "Fashion"], surfaces: ["Paper", "Labels", "Foam & Sponge"],
    features: ["360° spray valve", "Repositionable or permanent bond", "Fast tack", "Low VOC formulation"]
  },
  {
    id: "4", name: "Horsemen™ Waterproof Tile Adhesive", brand: "Horsemen™ Brand", category: "Industrial",
    shortDescription: "Waterproof adhesive for tiles, stone, and ceramic surfaces.",
    fullDescription: "Horsemen™ Waterproof Tile Adhesive is a polymer-modified adhesive designed for fixing tiles, stone, and ceramics in wet areas including bathrooms, kitchens, and pools. Provides excellent water and mould resistance.",
    usage: "Mix with water to paste consistency. Apply with notched trowel. Press tiles firmly and allow 24 hours before grouting.",
    industries: ["Plumbing & Sanitary", "Waterproof"], surfaces: ["Tiles", "Stone Ceramics", "Metal"],
    features: ["Waterproof formula", "Mould resistant", "Suitable for wet areas", "Non-slump on vertical surfaces"]
  },
  {
    id: "11", name: "Horsemen™ Foam Bond Adhesive", brand: "Horsemen™ Brand", category: "Industrial",
    shortDescription: "Specialist adhesive for bonding foam, sponge, and upholstery materials.",
    fullDescription: "Horsemen™ Foam Bond Adhesive is a solvent-based contact adhesive designed for bonding foam, sponge, and polyurethane materials used in upholstery, mattresses, and cushioning products. Maintains flexibility after cure.",
    usage: "Apply to both foam surfaces. Allow 5 minutes open time. Press surfaces together. Bond achieves full strength after 1 hour.",
    industries: ["Upholstery", "Packaging"], surfaces: ["Foam & Sponge", "Leather"],
    features: ["Remains flexible", "No foam attack", "High coverage rate", "Suitable for all foam densities"]
  },
  {
    id: "5", name: "Premier™ High Temperature Adhesive", brand: "Premier™ Brand", category: "Industrial",
    shortDescription: "Heat-resistant adhesive for automotive and insulation applications.",
    fullDescription: "Premier™ High Temperature Adhesive is engineered to maintain bond strength at elevated temperatures up to 200°C. Ideal for automotive engine bays, exhaust insulation, and industrial heat-shielding applications.",
    usage: "Apply to clean, dry surfaces. Allow 15 minutes open time. Cure under heat or at room temperature over 48 hours.",
    industries: ["Automotive", "Insulation"], surfaces: ["Metal", "Fibreglass Wool"],
    features: ["Rated to 200°C", "Chemical resistant", "Non-corrosive", "Paintable after cure"]
  },
  {
    id: "6", name: "Premier™ Carpet & Turf Adhesive", brand: "Premier™ Brand", category: "Industrial",
    shortDescription: "Strong floor adhesive for carpet and artificial turf installation.",
    fullDescription: "Premier™ Carpet & Turf Adhesive is a high-tack, water-resistant adhesive for securing carpets and artificial turf to concrete, timber, and screed subfloors. Designed for commercial and residential flooring projects.",
    usage: "Apply to subfloor using a notched trowel. Lay carpet or turf within 20 minutes. Roll firmly with a 50 kg roller.",
    industries: ["Flooring"], surfaces: ["Carpet", "Turf"],
    features: ["High initial tack", "Water resistant", "Low odour", "Compatible with underfloor heating"]
  },
  {
    id: "7", name: "Premier™ Wallpaper Paste", brand: "Premier™ Brand", category: "Commercial",
    shortDescription: "Ready-mix paste for wallpaper and wall covering installation.",
    fullDescription: "Premier™ Wallpaper Paste is a smooth, non-staining adhesive suitable for all standard wallpapers and wall coverings including vinyl, fabric, and textured papers. Easy to apply and clean up.",
    usage: "Apply paste to back of wallpaper using a brush. Allow paper to soak for 3–5 minutes before hanging.",
    industries: ["Fashion"], surfaces: ["Wallpaper"],
    features: ["Ready to use", "Non-staining", "Suitable for all wallpaper types", "Easy water clean-up"]
  },
  {
    id: "8", name: "Rhino™ Heavy Duty Metal Adhesive", brand: "Rhino™ Brand", category: "Industrial",
    shortDescription: "Industrial-strength adhesive for metal, plastic, and composite bonding.",
    fullDescription: "Rhino™ Heavy Duty Metal Adhesive is a two-part epoxy system providing structural bond strength for metals, plastics, and composites. Used extensively in marine fabrication, lift and escalator maintenance, and heavy engineering.",
    usage: "Mix Part A and Part B in equal ratio. Apply to clean degreased surfaces. Clamp for 30 minutes. Full cure in 24 hours.",
    industries: ["Marine", "Lift & Escalator"], surfaces: ["Metal", "Plastics & Acrylics"],
    features: ["Two-part epoxy", "Structural bond strength", "Saltwater resistant", "Gap filling capability"]
  },
  {
    id: "9", name: "Rhino™ Marine Sealant", brand: "Rhino™ Brand", category: "Industrial",
    shortDescription: "Flexible marine-grade sealant for below and above waterline use.",
    fullDescription: "Rhino™ Marine Sealant is a polyurethane-based sealant designed for the marine environment. It bonds and seals metal, rubber, and plastic fittings both above and below the waterline. Resists fuel, oil, and saltwater.",
    usage: "Clean surfaces with solvent. Apply sealant with caulking gun. Tool to smooth finish within 15 minutes. Cure: 48 hours.",
    industries: ["Marine", "Waterproof"], surfaces: ["Metal", "Rubber"],
    features: ["Above and below waterline", "Fuel and oil resistant", "Permanently flexible", "Paintable after cure"]
  },
  {
    id: "12", name: "Rhino™ Cooling Tower Adhesive", brand: "Rhino™ Brand", category: "Industrial",
    shortDescription: "High-performance adhesive for cooling tower and HVAC insulation.",
    fullDescription: "Rhino™ Cooling Tower Adhesive is formulated for bonding fibreglass wool, rock wool, and metal components in cooling towers and HVAC systems. Resistant to constant moisture, heat cycling, and chemical exposure.",
    usage: "Apply to cleaned metal surface. Press fibreglass wool firmly. Allow 2 hours before exposure to water. Full cure: 72 hours.",
    industries: ["Cooling Process", "Insulation"], surfaces: ["Fibreglass Wool", "Metal"],
    features: ["Moisture resistant", "Withstands heat cycling", "Non-corrosive to metal", "High peel strength"]
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
