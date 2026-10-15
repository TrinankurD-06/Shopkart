// Usage:
//   npm run seed         -> inserts sample products only if the products collection is empty
//   npm run seed:fresh   -> deletes ShopKart products and inserts the sample set again
//   npm run seed:stock   -> resets stock and sold counts of the existing sample products
//                           (matched by name, so product ids, carts and orders stay intact)
// Only touches the "products" collection of the database named in MONGO_URI.
import "dotenv/config";
import mongoose from "mongoose";
import Product from "../models/product.model.js";
import products from "./products.js";

const fresh = process.argv.includes("--fresh");
const syncStock = process.argv.includes("--sync-stock");

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is missing in backend/.env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to database "${mongoose.connection.name}"`);

  const existing = await Product.countDocuments();

  if (syncStock) {
    const result = await Product.bulkWrite(
      products.map(({ stock, sold, ...details }) => ({
        updateOne: {
          filter: { name: details.name },
          // Missing products are added; existing ones only get new stock numbers
          update: { $set: { stock, sold }, $setOnInsert: details },
          upsert: true,
        },
      })),
      { ordered: false }
    );
    console.log(`Stock synced: ${result.modifiedCount} updated, ${result.upsertedCount} added`);
  } else if (existing > 0 && !fresh) {
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
