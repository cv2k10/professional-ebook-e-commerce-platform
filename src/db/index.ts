import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

// D1 binding declared in cloudflare.config.ts. D1 has no interactive transactions:
// use db.batch([...]) for statements that must commit together.
export const db = drizzle(env.DB);
