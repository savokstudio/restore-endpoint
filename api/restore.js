import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ premium: false, error: "Email required" });
  }

  try {
    // 1. Find Stripe customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });

    if (customers.data.length === 0) {
      return res.status(200).json({ premium: false });
    }

    const customer = customers.data[0];

    // 2. Check for active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 1
    });

    if (subscriptions.data.length > 0) {
      return res.status(200).json({ premium: true });
    }

    // 3. Check for lifetime purchase (one-time payment)
    const charges = await stripe.charges.list({
      customer: customer.id,
      limit: 10
    });

    const lifetimePaid = charges.data.some(
      (c) => c.paid === true && c.status === "succeeded"
    );

    return res.status(200).json({ premium: lifetimePaid });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ premium: false, error: "Server error" });
  }
}


