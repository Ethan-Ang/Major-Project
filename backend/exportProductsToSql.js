require("dotenv").config();
const fs = require("fs");
const mongoose = require("mongoose");
const Product = require("./models/product");

function sqlEscape(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function jsonEscape(value) {
  return sqlEscape(JSON.stringify(value || []));
}

function mysqlDate(date) {
  if (!date) return "CURRENT_TIMESTAMP";
  const d = new Date(date);
  return sqlEscape(d.toISOString().slice(0, 19).replace("T", " "));
}

async function exportProducts() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const products = await Product.find().lean();

    if (!products.length) {
      console.log("No products found.");
      process.exit(0);
    }

    const rows = products.map((p) => {
      return `(
        ${sqlEscape(String(p._id))},
        ${sqlEscape(p.name)},
        ${sqlEscape(p.brand || "Yee Lim")},
        ${sqlEscape(p.category)},
        ${sqlEscape(p.shortDescription)},
        ${sqlEscape(p.fullDescription || "")},
        ${sqlEscape(p.usage || "")},
        ${sqlEscape(p.imageUrl || "")},
        ${jsonEscape(p.images)},
        ${sqlEscape(p.status || "Available")},
        ${jsonEscape(p.industries)},
        ${jsonEscape(p.surfaces)},
        ${jsonEscape(p.features)},
        ${mysqlDate(p.createdAt)},
        ${mysqlDate(p.updatedAt)}
      )`;
    });

    const sql = `
INSERT INTO products (
  mongo_id,
  name,
  brand,
  category,
  short_description,
  full_description,
  usage_text,
  image_url,
  images,
  status,
  industries,
  surfaces,
  features,
  created_at,
  updated_at
)
VALUES
${rows.join(",\n")};
`;

    fs.writeFileSync("products.sql", sql);
    console.log(`Exported ${products.length} products to products.sql`);

    process.exit(0);
  } catch (err) {
    console.error("Export failed:", err);
    process.exit(1);
  }
}

exportProducts();