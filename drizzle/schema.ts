import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  date,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Trips ──────────────────────────────────────────────────────────────────
export const trips = mysqlTable("trips", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  destination: varchar("destination", { length: 200 }),
  emoji: varchar("emoji", { length: 10 }).default("✈️"),
  startDate: date("startDate"),
  endDate: date("endDate"),
  currency: varchar("currency", { length: 10 }).default("KRW").notNull(),
  budget: decimal("budget", { precision: 15, scale: 2 }),
  inviteCode: varchar("inviteCode", { length: 20 }).unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Trip = typeof trips.$inferSelect;
export type InsertTrip = typeof trips.$inferInsert;

// ── Trip Members ───────────────────────────────────────────────────────────
export const tripMembers = mysqlTable("trip_members", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  userId: int("userId"),
  nickname: varchar("nickname", { length: 100 }).notNull(),
  color: varchar("color", { length: 20 }).default("#6366f1"),
  isGuest: boolean("isGuest").default(false).notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type TripMember = typeof tripMembers.$inferSelect;
export type InsertTripMember = typeof tripMembers.$inferInsert;

// ── Expense Categories ─────────────────────────────────────────────────────
export const EXPENSE_CATEGORIES = [
  "식비",
  "교통",
  "숙소",
  "관광",
  "쇼핑",
  "기타",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const PREP_CATEGORIES = [
  "항공",
  "숙소",
  "비자",
  "여행자보험",
  "eSIM",
  "환전",
  "기타",
] as const;
export type PrepCategory = (typeof PREP_CATEGORIES)[number];

// ── Expenses (daily) ───────────────────────────────────────────────────────
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  memberId: int("memberId").notNull(), // who paid
  title: varchar("title", { length: 200 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  category: varchar("category", { length: 50 }).notNull().default("기타"),
  expenseDate: date("expenseDate").notNull(),
  placeName: varchar("placeName", { length: 200 }),
  note: text("note"),
  splitType: mysqlEnum("splitType", ["equal", "custom"]).default("equal").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

// ── Expense Splits ─────────────────────────────────────────────────────────
export const expenseSplits = mysqlTable("expense_splits", {
  id: int("id").autoincrement().primaryKey(),
  expenseId: int("expenseId").notNull(),
  memberId: int("memberId").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
});

export type ExpenseSplit = typeof expenseSplits.$inferSelect;

// ── Preparation Costs ──────────────────────────────────────────────────────
export const preparationCosts = mysqlTable("preparation_costs", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  memberId: int("memberId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  category: varchar("category", { length: 50 }).notNull().default("기타"),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PreparationCost = typeof preparationCosts.$inferSelect;
export type InsertPreparationCost = typeof preparationCosts.$inferInsert;

// ── Places ─────────────────────────────────────────────────────────────────
export const places = mysqlTable("places", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  address: text("address"),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  category: varchar("category", { length: 50 }).default("관광"),
  visitDate: date("visitDate"),
  visitOrder: int("visitOrder").default(0),
  status: mysqlEnum("status", ["planned", "visited"]).default("planned").notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Place = typeof places.$inferSelect;
export type InsertPlace = typeof places.$inferInsert;
