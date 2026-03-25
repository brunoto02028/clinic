import Stripe from "stripe";

// Only create Stripe instance when STRIPE_SECRET_KEY is available
const stripeKey = process.env.STRIPE_SECRET_KEY;
export const stripe = stripeKey
  ? new Stripe(stripeKey, { typescript: true })
  : (new Proxy({} as Stripe, {
      get(_t, p) {
        if (p === 'then' || p === 'catch') return undefined;
        throw new Error("STRIPE_SECRET_KEY not available - Stripe not initialized");
      }
    }));