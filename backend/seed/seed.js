// Usage:
//   npm run seed         -> inserts sample products only if the products collection is empty
//   npm run seed:fresh   -> deletes ShopKart products and inserts the sample set again
// Only touches the "products" collection of the database named in MONGO_URI.
import "dotenv/config";
import mongoose from "mongoose";
import Product from "../models/product.model.js";
import products from "./products.js";

const fresh = process.argv.includes("--fresh");

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is missing in backend/.env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to database "${mongoose.connection.name}"`);

  const existing = await Product.countDocuments();

  if (existing > 0 && !fresh) {
    console.log(`Found ${existing} products already - nothing to do. Use "npm run seed:fresh" to reset them.`);
  } else {
    if (fresh) {
      const { deletedCount } = await Product.deleteMany({});
      console.log(`Removed ${deletedCount} old products`);
    }
    await Product.insertMany(products);
    console.log(`Inserted ${products.length} sample products`);
  }

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Seeding failed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
