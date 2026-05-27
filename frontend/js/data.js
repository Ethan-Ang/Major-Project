const API_BASE_URL = "http://localhost:5050";

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
    status: product.status || "Available",
    industries: Array.isArray(product.industries) ? product.industries : [],
    surfaces: Array.isArray(product.surfaces) ? product.surfaces : [],
    features: Array.isArray(product.features) ? product.features : []
  };
}

async function loadProductsFromBackend() {
  const response = await fetch(`${API_BASE_URL}/api/products`);

  if (!response.ok) {
    throw new Error("Failed to load products from backend.");
  }

  const data = await response.json();
  PRODUCTS = data.map(normaliseProduct);
  return PRODUCTS;
}
