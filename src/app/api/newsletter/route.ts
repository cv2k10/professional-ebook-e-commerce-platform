import { z } from "zod";
import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
export async function POST(request:Request){try{const {email}=z.object({email:z.string().email().max(254)}).parse(await request.json());await db.insert(newsletterSubscribers).values({email:email.toLowerCase()}).onConflictDoUpdate({target:newsletterSubscribers.email,set:{active:true}});return Response.json({message:"Welcome to the Sunday list — check your inbox soon."})}catch{return Response.json({message:"Please enter a valid email address."},{status:400})}}
