-- Security Events Table
-- Logs all security-related events for monitoring and audit purposes

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'otp_request',
    'otp_request_rate_limited',
    'otp_verify_success',
    'otp_verify_failed',
    'otp_verify_rate_limited',
    'login_success',
    'login_failed',
    'transaction_signed',
    'transaction_failed',
    'ip_rate_limited',
    'suspicious_activity'
  )),
  phone_number TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes for common queries
  CONSTRAINT valid_event_type CHECK (event_type IS NOT NULL)
);

-- Indexes for filtering and analytics
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_phone ON security_events(phone_number);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address);

-- Composite index for finding recent events by phone
CREATE INDEX IF NOT EXISTS idx_security_events_phone_time
  ON security_events(phone_number, timestamp DESC);

-- Comment for documentation
COMMENT ON TABLE security_events IS 'Audit log for security events including OTP requests, login attempts, and transactions';
COMMENT ON COLUMN security_events.event_type IS 'Type of security event that occurred';
COMMENT ON COLUMN security_events.phone_number IS 'Phone number associated with the event (if applicable)';
COMMENT ON COLUMN security_events.ip_address IS 'IP address from which the event originated';
COMMENT ON COLUMN security_events.user_agent IS 'Browser/client user agent string';
COMMENT ON COLUMN security_events.metadata IS 'Additional event-specific data in JSON format';

-- Enable Row Level Security
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to insert (for API logging)
CREATE POLICY "Allow service role to insert security events"
  ON security_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Allow service role to read all (for admin dashboard)
CREATE POLICY "Allow service role to read security events"
  ON security_events
  FOR SELECT
  TO service_role
  USING (true);

-- Optional: Create a view for analytics
CREATE OR REPLACE VIEW security_events_summary AS
SELECT
  event_type,
  phone_number,
  COUNT(*) as event_count,
  MAX(timestamp) as last_occurrence,
  MIN(timestamp) as first_occurrence
FROM security_events
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY event_type, phone_number;

COMMENT ON VIEW security_events_summary IS 'Summary view of security events in the last 7 days';
