import Stripe from "stripe";
import { clerkClient } from "@clerk/nextjs/server";
import { headers } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = (await headers()).get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return Response.json({ error: "Webhook signature error" }, { status: 400 });
  }

  const clerk = await clerkClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (userId) {
        await clerk.users.updateUserMetadata(userId, {
          publicMetadata: {
            stripeSubscriptionStatus: "active",
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
          },
        });
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const users = await clerk.users.getUserList({ limit: 10 });
      const user = users.data.find(
        (u) => u.publicMetadata?.stripeCustomerId === customerId
      );
      if (user) {
        await clerk.users.updateUserMetadata(user.id, {
          publicMetadata: {
            ...user.publicMetadata,
            stripeSubscriptionStatus: sub.status === "active" ? "active" : "inactive",
          },
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const users = await clerk.users.getUserList({ limit: 10 });
      const user = users.data.find(
        (u) => u.publicMetadata?.stripeCustomerId === customerId
      );
      if (user) {
        await clerk.users.updateUserMetadata(user.id, {
          publicMetadata: {
            ...user.publicMetadata,
            stripeSubscriptionStatus: "inactive",
          },
        });
      }
      break;
    }
  }

  return Response.json({ received: true });
}
