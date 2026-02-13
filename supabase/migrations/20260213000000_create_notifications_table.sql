-- Create notification type enum
CREATE TYPE notification_type AS ENUM (
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'TOPUP_SUCCESS',
  'WITHDRAW_SUCCESS',
  'STAKE_SUCCESS',
  'UNSTAKE_SUCCESS',
  'CLAIM_SUCCESS',
  'GENERAL'
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  type notification_type NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  is_read BOOLEAN DEFAULT false NOT NULL
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);

-- Add comment on the table
COMMENT ON TABLE notifications IS 'Stores user notifications for various app events.';

