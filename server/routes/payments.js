const express = require("express");
const Stripe = require("stripe");

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create checkout session
router.post("/create-checkout-session", async (req, res) => {
  try {
    console.log("Incoming checkout session request:", req.body);
    const { event_id, title, price_cents, user_id } = req.body;

    if (!event_id || !price_cents || !user_id) {
      console.log("Missing fields:", { event_id, price_cents, user_id });
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: title },
            unit_amount: price_cents,
          },
          quantity: 1,
        },
      ],

      metadata: {
        event_id,
        user_id,
      },

      success_url: `${process.env.FRONTEND_URL}/events?payment=success`,
      cancel_url: `${process.env.FRONTEND_URL}/events?payment=cancel`
    });

    res.json({ success: true, url: session.url });
  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).json({ success: false, message: "Stripe initialization failed" });
  }
});

module.exports = router;
