const express = require("express");
const Stripe = require("stripe");
const supabase = require("../services/supabaseClient");

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Webhook endpoint (raw body required)
router.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req, res) => {
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

      // Update RSVP with payment info
      if (event_id && user_id) {
        try {
          // Get event to check if it has an organization
          const { data: event } = await supabase
            .from('events')
            .select('created_by_org_id')
            .eq('event_id', parseInt(event_id))
            .single();

          if (event && event.created_by_org_id) {
            // Check if user is a member
            const { data: membership } = await supabase
              .from('organization_memberships')
              .select('*')
              .eq('user_id', user_id)
              .eq('org_id', event.created_by_org_id)
              .single();

            if (membership) {
              // Check if RSVP already exists
              const { data: existingRsvp } = await supabase
                .from('event_rsvps')
                .select('*')
                .eq('event_id', parseInt(event_id))
                .eq('user_id', user_id)
                .single();

              if (existingRsvp && existingRsvp.paid) {
                console.log("✅ Payment already recorded in RSVP");
              } else {
                const paidTimestamp = new Date().toISOString();
                
                if (!existingRsvp) {
                  // Create RSVP with "confirmed" (going) status
                  const { error: rsvpError } = await supabase
                    .from('event_rsvps')
                    .insert({
                      event_id: parseInt(event_id),
                      user_id: user_id,
                      status: 'confirmed',
                      rsvp_time: paidTimestamp,
                      paid: session.amount_total > 0 ? true : false,
                      paid_at: session.amount_total > 0 ? paidTimestamp : null
                    });

                  if (rsvpError) {
                    console.error("Error creating RSVP after payment:", rsvpError);
                  } else {
                    console.log("✅ RSVP created automatically after payment");
                  }
                } else {
                  // Update existing RSVP to confirmed with payment info
                  const { error: updateError } = await supabase
                    .from('event_rsvps')
                    .update({
                      status: 'confirmed',
                      rsvp_time: paidTimestamp,
                      paid: session.amount_total > 0 ? true : false,
                      paid_at: session.amount_total > 0 ? paidTimestamp : null
                    })
                    .eq('rsvp_id', existingRsvp.rsvp_id);

                  if (updateError) {
                    console.error("Error updating RSVP after payment:", updateError);
                  } else {
                    console.log("✅ RSVP updated to confirmed after payment");
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error("Error processing payment:", err);
        }
      }
    }

    res.json({ received: true });
  }
);

module.exports = router;
