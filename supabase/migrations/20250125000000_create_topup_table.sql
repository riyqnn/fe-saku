-- Create topup requests table for Midtrans integration
CREATE TABLE IF NOT EXISTS topup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone_hash TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  midtrans_transaction_id TEXT,
  midtrans_payment_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  contract_tx_hash TEXT,
  contract_timestamp TIMESTAMPTZ,
  midtrans_callback_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_topup_order_id ON topup_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_topup_user_id ON topup_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_topup_status ON topup_requests(status);
CREATE INDEX IF NOT EXISTS idx_topup_phone_hash ON topup_requests(phone_hash);

-- Enable RLS
ALTER TABLE topup_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own topups"
ON topup_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own topups"
ON topup_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_topup_requests_updated_at
BEFORE UPDATE ON topup_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE topup_requests IS 'Tracks Midtrans topup requests and their status';
