-- Create event_payments table for tracking event payments
CREATE TABLE IF NOT EXISTS public.event_payments (
    payment_id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES public.events(event_id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL DEFAULT 0,
    stripe_session_id TEXT UNIQUE,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    paid BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_event_payments_event_id ON public.event_payments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_payments_user_id ON public.event_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_event_payments_stripe_session_id ON public.event_payments(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_event_payments_payment_status ON public.event_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_event_payments_paid ON public.event_payments(paid);
CREATE INDEX IF NOT EXISTS idx_event_payments_user_event ON public.event_payments(user_id, event_id);

-- Add constraint to ensure payment_status is valid
ALTER TABLE public.event_payments 
ADD CONSTRAINT check_payment_status 
CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded'));

-- Add constraint to ensure amount_cents is non-negative
ALTER TABLE public.event_payments 
ADD CONSTRAINT check_amount_cents 
CHECK (amount_cents >= 0);

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_event_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_event_payments_updated_at
BEFORE UPDATE ON public.event_payments
FOR EACH ROW
EXECUTE FUNCTION update_event_payments_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.event_payments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own payments
CREATE POLICY "Users can view their own payments"
ON public.event_payments
FOR SELECT
USING (auth.uid()::text = user_id);

-- Create policy to allow service role to insert payments (for webhooks and server-side operations)
CREATE POLICY "Service role can insert payments"
ON public.event_payments
FOR INSERT
WITH CHECK (true);

-- Create policy to allow service role to update payments
CREATE POLICY "Service role can update payments"
ON public.event_payments
FOR UPDATE
USING (true);

-- Add comment to table
COMMENT ON TABLE public.event_payments IS 'Stores payment records for paid events';

