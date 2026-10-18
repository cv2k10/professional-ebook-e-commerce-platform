import crypto from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { hashToken } from "./payments";
export const SESSION_COOKIE="folio_session";
export async function createSession(userId:string){const token=crypto.randomBytes(32).toString("base64url");const expiresAt=new Date(Date.now()+1000*60*60*24*30);await db.insert(sessions).values({userId,tokenHash:hashToken(token),expiresAt});const jar=await cookies();jar.set(SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",expires:expiresAt});}
export async function getCurrentUser(){const token=(await cookies()).get(SESSION_COOKIE)?.value;if(!token)return null;const [row]=await db.select({user:users}).from(sessions).innerJoin(users,eq(sessions.userId,users.id)).where(and(eq(sessions.tokenHash,hashToken(token)),gt(sessions.expiresAt,new Date())));return row?.user||null;}
export async function destroySession(){const jar=await cookies();const token=jar.get(SESSION_COOKIE)?.value;if(token)await db.delete(sessions).where(eq(sessions.tokenHash,hashToken(token)));jar.delete(SESSION_COOKIE);}
