-- Create packets table for shareable red envelope feature
CREATE TABLE IF NOT EXISTS packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_code TEXT UNIQUE NOT NULL,
  packet_code_hash TEXT UNIQUE NOT NULL,
  creator_phone_hash TEXT NOT NULL,
  creator_wallet_address TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  remaining_amount NUMERIC NOT NULL,
  max_winners INTEGER NOT NULL,
  winner_count INTEGER DEFAULT 0,
  distribution_type TEXT NOT NULL CHECK (distribution_type IN ('EQUAL', 'RANDOM')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLAIMED', 'EXPIRED', 'CANCELLED')),
  contract_tx_hash TEXT,
  contract_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_amounts CHECK (total_amount > 0 AND remaining_amount >= 0)
);

-- Create packet_claims table for tracking claims
CREATE TABLE IF NOT EXISTS packet_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id UUID REFERENCES packets(id) ON DELETE CASCADE NOT NULL,
  packet_code_hash TEXT NOT NULL,
  claimer_phone_hash TEXT NOT NULL,
  claimer_wallet_address TEXT NOT NULL,
  claimed_amount NUMERIC NOT NULL,
  contract_tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_claim UNIQUE (packet_code_hash, claimer_wallet_address)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_packets_code ON packets(packet_code);
CREATE INDEX IF NOT EXISTS idx_packets_code_hash ON packets(packet_code_hash);
CREATE INDEX IF NOT EXISTS idx_packets_creator_phone ON packets(creator_phone_hash);
CREATE INDEX IF NOT EXISTS idx_packets_creator_wallet ON packets(creator_wallet_address);
CREATE INDEX IF NOT EXISTS idx_packets_status ON packets(status);
CREATE INDEX IF NOT EXISTS idx_packets_expires_at ON packets(contract_expires_at);

CREATE INDEX IF NOT EXISTS idx_packet_claims_packet ON packet_claims(packet_id);
CREATE INDEX IF NOT EXISTS idx_packet_claims_code_hash ON packet_claims(packet_code_hash);
CREATE INDEX IF NOT EXISTS idx_packet_claims_claimer_phone ON packet_claims(claimer_phone_hash);
CREATE INDEX IF NOT EXISTS idx_packet_claims_claimer_wallet ON packet_claims(claimer_wallet_address);

-- Enable RLS
ALTER TABLE packets ENABLE ROW LEVEL SECURITY;
ALTER TABLE packet_claims ENABLE ROW LEVEL SECURITY;

-- Policies for packets
CREATE POLICY "Users can view active packets"
ON packets FOR SELECT
USING (status = 'ACTIVE' OR creator_phone_hash = (SELECT phone_hash FROM profiles WHERE id = auth.uid())::text);

CREATE POLICY "Users can insert own packets"
ON packets FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update own packets"
ON packets FOR UPDATE
USING (creator_phone_hash = (SELECT phone_hash FROM profiles WHERE id = auth.uid())::text);

-- Policies for packet_claims
CREATE POLICY "Users can view packet claims"
ON packet_claims FOR SELECT
USING (true);

CREATE POLICY "Users can insert packet claims"
ON packet_claims FOR INSERT
WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_packets_updated_at
BEFORE UPDATE ON packets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE packets IS 'Stores packet (shareable red envelope) information synced from blockchain';
COMMENT ON TABLE packet_claims IS 'Tracks all claims made on packets';

-- Optional: Create view for packet analytics
CREATE OR REPLACE VIEW packet_analytics AS
SELECT
  p.id,
  p.packet_code,
  p.distribution_type,
  p.status,
  p.total_amount,
  p.remaining_amount,
  p.max_winners,
  p.winner_count,
  COUNT(pc.id) as claim_count,
  AVG(pc.claimed_amount) as avg_claim_amount,
  MAX(pc.claimed_amount) as max_claim_amount,
  MIN(pc.claimed_amount) as min_claim_amount
FROM packets p
LEFT JOIN packet_claims pc ON p.id = pc.packet_id
GROUP BY p.id;

COMMENT ON VIEW packet_analytics IS 'Analytics view for packet performance';
