const express = require("express");
const Stripe = require("stripe");
const supabase = require("../services/supabaseClient");
const { authenticateUser } = require("../middleware/auth");

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

      success_url: (() => {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        // Remove trailing slash if present
        const cleanUrl = baseUrl.replace(/\/$/, '');
        // Stripe will automatically append session_id={CHECKOUT_SESSION_ID}
        return `${cleanUrl}/events/${event_id}?payment=success&session_id={CHECKOUT_SESSION_ID}`;
      })(),
      cancel_url: (() => {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        // Remove trailing slash if present
        const cleanUrl = baseUrl.replace(/\/$/, '');
        return `${cleanUrl}/events/${event_id}?payment=cancel`;
      })()
    });

    res.json({ success: true, url: session.url });
  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).json({ success: false, message: "Stripe initialization failed" });
  }
});

// Confirm payment from client side (fallback if webhook hasn't fired yet)
router.post("/confirm-payment", authenticateUser, async (req, res) => {
  try {
    const { session_id, event_id } = req.body;
    const user_id = req.user?.id;

    if (!session_id || !event_id || !user_id) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Verify the session with Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ success: false, message: "Payment not completed" });
    }

    // Check if RSVP with payment already exists
    const { data: existingRsvp, error: rsvpCheckError } = await supabase
      .from('event_rsvps')
      .select('*')
      .eq('event_id', parseInt(event_id))
      .eq('user_id', user_id)
      .single();

    // If RSVP exists and already paid, skip
    if (!rsvpCheckError && existingRsvp && existingRsvp.paid) {
      console.log("✅ Payment already recorded in RSVP, skipping duplicate");
      return res.json({ 
        success: true, 
        message: "Payment already confirmed",
        rsvpCreated: true
      });
    }

    // Automatically create/update RSVP with payment info
    let rsvpCreated = false;
    try {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('created_by_org_id')
        .eq('event_id', parseInt(event_id))
        .single();

      if (eventError) {
        console.error("Error fetching event:", eventError);
      } else if (event && event.created_by_org_id) {
        const { data: membership, error: membershipError } = await supabase
          .from('organization_memberships')
          .select('*')
          .eq('user_id', user_id)
          .eq('org_id', event.created_by_org_id)
          .single();

        if (membershipError && membershipError.code !== 'PGRST116') {
          console.error("Error checking membership:", membershipError);
        } else if (membership) {
          const { data: existingRsvp, error: rsvpCheckError } = await supabase
            .from('event_rsvps')
            .select('*')
            .eq('event_id', parseInt(event_id))
            .eq('user_id', user_id)
            .single();

          if (rsvpCheckError && rsvpCheckError.code !== 'PGRST116') {
            console.error("Error checking existing RSVP:", rsvpCheckError);
          } else if (!existingRsvp) {
            const paidTimestamp = new Date().toISOString();
            const { data: newRsvp, error: insertError } = await supabase
              .from('event_rsvps')
              .insert({
                event_id: parseInt(event_id),
                user_id: user_id,
                status: 'confirmed',
                rsvp_time: paidTimestamp,
                paid: session.amount_total > 0 ? true : false,
                paid_at: session.amount_total > 0 ? paidTimestamp : null
              })
              .select()
              .single();

            if (insertError) {
              console.error("Error creating RSVP:", insertError);
            } else {
              console.log("✅ RSVP created successfully:", newRsvp);
              rsvpCreated = true;
            }
          } else {
            const paidTimestamp = new Date().toISOString();
            const { data: updatedRsvp, error: updateError } = await supabase
              .from('event_rsvps')
              .update({
                status: 'confirmed',
                rsvp_time: paidTimestamp,
                paid: session.amount_total > 0 ? true : false,
                paid_at: session.amount_total > 0 ? paidTimestamp : null
              })
              .eq('rsvp_id', existingRsvp.rsvp_id)
              .select()
              .single();

            if (updateError) {
              console.error("Error updating RSVP:", updateError);
            } else {
              console.log("✅ RSVP updated successfully:", updatedRsvp);
              rsvpCreated = true;
            }
          }
        } else {
          console.log("User is not a member of the organization, skipping RSVP creation");
        }
      } else {
        console.log("Event has no organization, skipping RSVP creation");
      }
    } catch (rsvpErr) {
      console.error("Error in RSVP creation process:", rsvpErr);
    }

    res.json({ 
      success: true, 
      message: "Payment confirmed",
      rsvpCreated: rsvpCreated
    });
  } catch (error) {
    console.error("Error confirming payment:", error);
    res.status(500).json({ success: false, message: "Failed to confirm payment" });
  }
});

module.exports = router;
