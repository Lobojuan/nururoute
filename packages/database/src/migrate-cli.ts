import { createPgDb } from "./pg";
import { migrate } from "./index";

const url = process.env["DATABASE_URL"];
if (!url) {
  console.error("DATABASE_URL is required (see .env.example)");
  process.exit(1);
}
const db = createPgDb(url);
const ran = await migrate(db);
console.log(ran.length ? `Applied: ${ran.join(", ")}` : "Database already up to date");
await db.close();
