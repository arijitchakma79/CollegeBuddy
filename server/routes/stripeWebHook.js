const express = require("express");
const Stripe = require("stripe");

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Webhook endpoint (raw body required)
router.post(
  "/",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const event_id = session.metadata.event_id;
      const user_id = session.metadata.user_id;

      console.log("💰 Payment success for:", { event_id, user_id });

      // Here you will add the paid attendee to your database
    }

    res.json({ received: true });
  }
);

module.exports = router;
