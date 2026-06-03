import { COOKIE_NAME } from "@shared/const";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  addTripMember,
  createExpense,
  createPlace,
  createPrepCost,
  createTrip,
  deleteExpense,
  deletePlace,
  deletePrepCost,
  deleteTripMember,
  deleteTrip,
  getExpensesByTrip,
  getPlacesByTrip,
  getPrepCostsByTrip,
  getTripById,
  getTripByInviteCode,
  getTripMembers,
  getTripsByUserId,
  isTripMember,
  updateExpense,
  updatePlace,
  updatePrepCost,
  updateTrip,
  updateTripMember,
} from "./db";

// Helper: assert user is a member of the trip
async function assertTripMember(tripId: number, userId: number) {
  const ok = await isTripMember(tripId, userId);
  if (!ok) throw new TRPCError({ code: "FORBIDDEN", message: "이 여행에 접근 권한이 없습니다." });
}

// ── Trips Router ───────────────────────────────────────────────────────────
const tripsRouter = router({
  list: protectedProcedure.query(({ ctx }) => getTripsByUserId(ctx.user.id)),

  get: protectedProcedure
    .input(z.object({ tripId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertTripMember(input.tripId, ctx.user.id);
      return getTripById(input.tripId);
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        destination: z.string().optional(),
        emoji: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        currency: z.string().default("KRW"),
        budget: z.string().optional(),
        memberNicknames: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const inviteCode = nanoid(8).toUpperCase();
      const tripId = await createTrip({
        ownerId: ctx.user.id,
        title: input.title,
        destination: input.destination,
        emoji: input.emoji ?? "✈️",
        startDate: input.startDate as any,
        endDate: input.endDate as any,
        currency: input.currency,
        budget: input.budget as any,
        inviteCode,
      });

      // Add owner as first member
      const ownerName = ctx.user.name ?? "나";
      await addTripMember({
        tripId,
        userId: ctx.user.id,
        nickname: ownerName,
        color: "#6366f1",
        isGuest: false,
      });

      // Add extra members as guests
      const colors = ["#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];
      for (let i = 0; i < input.memberNicknames.length; i++) {
        const nick = input.memberNicknames[i];
        if (nick?.trim()) {
          await addTripMember({
            tripId,
            nickname: nick.trim(),
            color: colors[i % colors.length],
            isGuest: true,
          });
        }
      }

      return { tripId, inviteCode };
    }),

  update: protectedProcedure
    .input(
      z.object({
        tripId: z.number(),
        title: z.string().min(1).optional(),
        destination: z.string().optional(),
        emoji: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        currency: z.string().optional(),
        budget: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertTripMember(input.tripId, ctx.user.id);
      const { tripId, ...data } = input;
      await updateTrip(tripId, data as any);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ tripId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await assertTripMember(input.tripId, ctx.user.id);
      await deleteTrip(input.tripId);
      return { success: true };
    }),

  joinByCode: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const trip = await getTripByInviteCode(input.code.toUpperCase());
      if (!trip) throw new Error("유효하지 않은 초대 코드입니다.");
      const members = await getTripMembers(trip.id);
      const alreadyMember = members.some((m) => m.userId === ctx.user.id);
      if (alreadyMember) return { tripId: trip.id, alreadyMember: true };
      await addTripMember({
        tripId: trip.id,
        userId: ctx.user.id,
        nickname: ctx.user.name ?? "게스트",
        isGuest: false,
      });
      return { tripId: trip.id, alreadyMember: false };
    }),
});

// ── Members Router ─────────────────────────────────────────────────────────
const membersRouter = router({
  list: protectedProcedure
    .input(z.object({ tripId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertTripMember(input.tripId, ctx.user.id);
      return getTripMembers(input.tripId);
    }),

  add: protectedProcedure
    .input(
      z.object({
        tripId: z.number(),
        nickname: z.string().min(1),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertTripMember(input.tripId, ctx.user.id);
      const colors = ["#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];
      const id = await addTripMember({
        tripId: input.tripId,
        nickname: input.nickname,
        color: input.color ?? colors[Math.floor(Math.random() * colors.length)],
        isGuest: true,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        memberId: z.number(),
        nickname: z.string().min(1).optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { memberId, ...data } = input;
      await updateTripMember(memberId, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ memberId: z.number() }))
    .mutation(async ({ input }) => {
      await deleteTripMember(input.memberId);
      return { success: true };
    }),
});

// ── Expenses Router ────────────────────────────────────────────────────────
const expensesRouter = router({
  list: protectedProcedure
    .input(z.object({ tripId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertTripMember(input.tripId, ctx.user.id);
      return getExpensesByTrip(input.tripId);
    }),

  create: protectedProcedure
    .input(
      z.object({
        tripId: z.number(),
        memberId: z.number(),
        title: z.string().min(1),
        amount: z.string(),
        category: z.string().default("기타"),
        expenseDate: z.string(),
        placeName: z.string().optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertTripMember(input.tripId, ctx.user.id);
      const id = await createExpense({
        tripId: input.tripId,
        memberId: input.memberId,
        title: input.title,
        amount: input.amount as any,
        category: input.category,
        expenseDate: input.expenseDate as any,
        placeName: input.placeName,
        note: input.note,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        expenseId: z.number(),
        title: z.string().min(1).optional(),
        amount: z.string().optional(),
        category: z.string().optional(),
        expenseDate: z.string().optional(),
        memberId: z.number().optional(),
        placeName: z.string().optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { expenseId, ...data } = input;
      await updateExpense(expenseId, data as any);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ expenseId: z.number() }))
    .mutation(async ({ input }) => {
      await deleteExpense(input.expenseId);
      return { success: true };
    }),
});

// ── Preparation Costs Router ───────────────────────────────────────────────
const prepCostsRouter = router({
  list: protectedProcedure
    .input(z.object({ tripId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertTripMember(input.tripId, ctx.user.id);
      return getPrepCostsByTrip(input.tripId);
    }),

  create: protectedProcedure
    .input(
      z.object({
        tripId: z.number(),
        memberId: z.number(),
        title: z.string().min(1),
        amount: z.string(),
        category: z.string().default("기타"),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertTripMember(input.tripId, ctx.user.id);
      const id = await createPrepCost({
        tripId: input.tripId,
        memberId: input.memberId,
        title: input.title,
        amount: input.amount as any,
        category: input.category,
        note: input.note,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        amount: z.string().optional(),
        category: z.string().optional(),
        memberId: z.number().optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updatePrepCost(id, data as any);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deletePrepCost(input.id);
      return { success: true };
    }),
});

// ── Places Router ──────────────────────────────────────────────────────────
const placesRouter = router({
  list: protectedProcedure
    .input(z.object({ tripId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertTripMember(input.tripId, ctx.user.id);
      return getPlacesByTrip(input.tripId);
    }),

  create: protectedProcedure
    .input(
      z.object({
        tripId: z.number(),
        name: z.string().min(1),
        address: z.string().optional(),
        lat: z.string().optional(),
        lng: z.string().optional(),
        category: z.string().optional(),
        visitDate: z.string().optional(),
        visitOrder: z.number().optional(),
        status: z.enum(["planned", "visited"]).default("planned"),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertTripMember(input.tripId, ctx.user.id);
      const id = await createPlace({
        tripId: input.tripId,
        name: input.name,
        address: input.address,
        lat: input.lat as any,
        lng: input.lng as any,
        category: input.category,
        visitDate: input.visitDate as any,
        visitOrder: input.visitOrder ?? 0,
        status: input.status,
        note: input.note,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        address: z.string().optional(),
        lat: z.string().optional(),
        lng: z.string().optional(),
        category: z.string().optional(),
        visitDate: z.string().optional(),
        visitOrder: z.number().optional(),
        status: z.enum(["planned", "visited"]).optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updatePlace(id, data as any);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deletePlace(input.id);
      return { success: true };
    }),
});

// ── AI Router ──────────────────────────────────────────────────────────────
const aiRouter = router({
  analyzeExpenses: protectedProcedure
    .input(
      z.object({
        tripId: z.number(),
        tripTitle: z.string(),
        currency: z.string(),
        budget: z.string().optional(),
        totalExpenses: z.number(),
        totalPrepCosts: z.number(),
        memberCount: z.number(),
        categoryBreakdown: z.array(
          z.object({ category: z.string(), amount: z.number(), count: z.number() })
        ),
        dailyTotals: z.array(z.object({ date: z.string(), amount: z.number() })),
        topExpenses: z.array(z.object({ title: z.string(), amount: z.number(), category: z.string() })),
      })
    )
    .mutation(async ({ input }) => {
      const {
        tripTitle, currency, budget, totalExpenses, totalPrepCosts,
        memberCount, categoryBreakdown, dailyTotals, topExpenses,
      } = input;

      const grandTotal = totalExpenses + totalPrepCosts;
      const perPerson = memberCount > 0 ? grandTotal / memberCount : grandTotal;
      const budgetNum = budget ? parseFloat(budget) : null;
      const overBudget = budgetNum ? grandTotal > budgetNum : false;

      const categoryText = categoryBreakdown
        .map((c) => `${c.category}: ${c.amount.toLocaleString()}${currency} (${c.count}건)`)
        .join(", ");

      const topText = topExpenses
        .slice(0, 5)
        .map((e) => `${e.title}(${e.category}) ${e.amount.toLocaleString()}${currency}`)
        .join(", ");

      const prompt = `당신은 여행 지출 분석 전문가입니다. 다음 여행 데이터를 분석하여 친근하고 유익한 한국어 분석 리포트를 작성해주세요.

여행명: ${tripTitle}
총 지출: ${grandTotal.toLocaleString()}${currency} (준비비용 ${totalPrepCosts.toLocaleString()} + 현지 지출 ${totalExpenses.toLocaleString()})
1인당 금액: ${perPerson.toLocaleString()}${currency}
멤버 수: ${memberCount}명
${budgetNum ? `예산: ${budgetNum.toLocaleString()}${currency} (${overBudget ? "초과" : "여유"})` : ""}
카테고리별 지출: ${categoryText}
주요 지출: ${topText}
일별 지출 추이: ${dailyTotals.map((d) => `${d.date}: ${d.amount.toLocaleString()}`).join(", ")}

다음 항목을 포함하여 분석해주세요:
1. 전체 지출 패턴 요약 (2-3문장)
2. 가장 많이 쓴 카테고리 분석 및 특징
3. 절약 팁 2-3가지
4. ${overBudget ? "예산 초과 경고 및 개선 방안" : "잘한 점 칭찬"}
5. 다음 여행을 위한 조언

친근하고 실용적인 톤으로 작성해주세요. 마크다운 형식 없이 자연스러운 문장으로 작성해주세요.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "당신은 여행 지출 분석 전문가입니다. 친근하고 실용적인 분석을 제공합니다." },
          { role: "user", content: prompt },
        ],
      });

      const content = response.choices?.[0]?.message?.content ?? "분석 결과를 가져올 수 없습니다.";
      return { analysis: content };
    }),
});

// ── App Router ─────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  trips: tripsRouter,
  members: membersRouter,
  expenses: expensesRouter,
  prepCosts: prepCostsRouter,
  places: placesRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
