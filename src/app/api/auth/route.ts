import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, destroySession } from "@/lib/auth";
const inputSchema=z.object({action:z.enum(["login","register","logout"]),email:z.string().email().optional(),password:z.string().min(8).max(128).optional(),firstName:z.string().trim().max(60).optional()});
export async function POST(request:Request){try{const input=inputSchema.parse(await request.json());if(input.action==="logout"){await destroySession();return Response.json({ok:true})}if(!input.email||!input.password)return Response.json({error:"Email and password are required."},{status:400});const email=input.email.toLowerCase();const [existing]=await db.select().from(users).where(eq(users.email,email));
  if(input.action==="register"){if(existing)return Response.json({error:"An account with this email already exists."},{status:409});const passwordHash=await bcrypt.hash(input.password,12);const [user]=await db.insert(users).values({email,passwordHash,firstName:input.firstName||null}).returning();await createSession(user.id);return Response.json({ok:true})}
  if(!existing?.passwordHash||!await bcrypt.compare(input.password,existing.passwordHash))return Response.json({error:"Email or password is incorrect."},{status:401});await createSession(existing.id);return Response.json({ok:true});
}catch(error){if(error instanceof z.ZodError)return Response.json({error:"Use a valid email and a password of at least 8 characters."},{status:400});return Response.json({error:"Account service is temporarily unavailable."},{status:500})}}
