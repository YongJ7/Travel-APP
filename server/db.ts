import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  expenses,
  expenseSplits,
  places,
  preparationCosts,
  tripMembers,
  trips,
  users,
  type InsertExpense,
  type InsertPlace,
  type InsertPreparationCost,
  type InsertTrip,
  type InsertTripMember,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ── Users ──────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value !== undefined) {
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ── Trips ──────────────────────────────────────────────────────────────────
export async function createTrip(data: InsertTrip) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(trips).values(data);
  return result.insertId;
}

export async function getTripsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  // trips where user is owner or member
  const ownedTrips = await db.select().from(trips).where(eq(trips.ownerId, userId)).orderBy(desc(trips.createdAt));
  const memberTripIds = await db
    .select({ tripId: tripMembers.tripId })
    .from(tripMembers)
    .where(eq(tripMembers.userId, userId));
  const memberIds = memberTripIds.map((m) => m.tripId);
  if (memberIds.length === 0) return ownedTrips;
  const memberTrips = await db
    .select()
    .from(trips)
    .where(sql`${trips.id} IN (${sql.join(memberIds.map((id) => sql`${id}`), sql`, `)}) AND ${trips.ownerId} != ${userId}`)
    .orderBy(desc(trips.createdAt));
  return [...ownedTrips, ...memberTrips];
}

export async function getTripById(tripId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
  return result[0];
}

export async function getTripByInviteCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(trips).where(eq(trips.inviteCode, code)).limit(1);
  return result[0];
}

export async function updateTrip(tripId: number, data: Partial<InsertTrip>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(trips).set(data).where(eq(trips.id, tripId));
}

export async function deleteTrip(tripId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Delete related data first
  await db.delete(places).where(eq(places.tripId, tripId));
  await db.delete(preparationCosts).where(eq(preparationCosts.tripId, tripId));
  // Delete expense splits before expenses
  const tripExpenses = await db.select({ id: expenses.id }).from(expenses).where(eq(expenses.tripId, tripId));
  for (const e of tripExpenses) {
    await db.delete(expenseSplits).where(eq(expenseSplits.expenseId, e.id));
  }
  await db.delete(expenses).where(eq(expenses.tripId, tripId));
  await db.delete(tripMembers).where(eq(tripMembers.tripId, tripId));
  await db.delete(trips).where(eq(trips.id, tripId));
}

// ── Trip Members ───────────────────────────────────────────────────────────
export async function addTripMember(data: InsertTripMember) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(tripMembers).values(data);
  return result.insertId;
}

export async function getTripMembers(tripId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tripMembers).where(eq(tripMembers.tripId, tripId));
}

export async function isTripMember(tripId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select({ id: tripMembers.id })
    .from(tripMembers)
    .where(eq(tripMembers.tripId, tripId))
    .limit(20);
  // Check if user is a member (by userId) or is the owner
  const trip = await getTripById(tripId);
  if (trip?.ownerId === userId) return true;
  return result.some((m) => (m as any).userId === userId);
}

export async function updateTripMember(memberId: number, data: Partial<InsertTripMember>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(tripMembers).set(data).where(eq(tripMembers.id, memberId));
}

export async function deleteTripMember(memberId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(tripMembers).where(eq(tripMembers.id, memberId));
}

// ── Expenses ───────────────────────────────────────────────────────────────
export async function createExpense(data: InsertExpense) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(expenses).values(data);
  return result.insertId;
}

export async function getExpensesByTrip(tripId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(expenses).where(eq(expenses.tripId, tripId)).orderBy(desc(expenses.expenseDate), desc(expenses.createdAt));
}

export async function getExpenseById(expenseId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(expenses).where(eq(expenses.id, expenseId)).limit(1);
  return result[0];
}

export async function updateExpense(expenseId: number, data: Partial<InsertExpense>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(expenses).set(data).where(eq(expenses.id, expenseId));
}

export async function deleteExpense(expenseId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(expenseSplits).where(eq(expenseSplits.expenseId, expenseId));
  await db.delete(expenses).where(eq(expenses.id, expenseId));
}

// ── Preparation Costs ──────────────────────────────────────────────────────
export async function createPrepCost(data: InsertPreparationCost) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(preparationCosts).values(data);
  return result.insertId;
}

export async function getPrepCostsByTrip(tripId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(preparationCosts).where(eq(preparationCosts.tripId, tripId)).orderBy(desc(preparationCosts.createdAt));
}

export async function updatePrepCost(id: number, data: Partial<InsertPreparationCost>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(preparationCosts).set(data).where(eq(preparationCosts.id, id));
}

export async function deletePrepCost(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(preparationCosts).where(eq(preparationCosts.id, id));
}

// ── Places ─────────────────────────────────────────────────────────────────
export async function createPlace(data: InsertPlace) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(places).values(data);
  return result.insertId;
}

export async function getPlacesByTrip(tripId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(places).where(eq(places.tripId, tripId)).orderBy(places.visitDate, places.visitOrder);
}

export async function updatePlace(id: number, data: Partial<InsertPlace>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(places).set(data).where(eq(places.id, id));
}

export async function deletePlace(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(places).where(eq(places.id, id));
}
