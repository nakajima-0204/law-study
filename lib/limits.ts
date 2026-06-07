import { auth, currentUser } from "@clerk/nextjs/server";

export const FREE_LIMITS = {
  chat: 5,
  quiz: 10,
  cases: 3,
} as const;

export type LimitType = keyof typeof FREE_LIMITS;

export async function checkLimit(type: LimitType): Promise<
  | { allowed: true; isPremium: boolean }
  | { allowed: false; reason: string }
> {
  const { userId } = await auth();
  if (!userId) {
    return { allowed: false, reason: "ログインが必要です" };
  }

  const user = await currentUser();
  const isPremium = user?.publicMetadata?.stripeSubscriptionStatus === "active";

  if (isPremium) return { allowed: true, isPremium: true };

  return { allowed: true, isPremium: false };
}
