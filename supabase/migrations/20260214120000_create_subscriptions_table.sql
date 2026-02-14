/*
  # Create Subscriptions Table (Premium Membership)

  1. New Tables
    - `subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key) - References auth.users
      - `stripe_customer_id` (text) - Stripe customer ID
      - `stripe_payment_id` (text) - Stripe payment intent ID
      - `plan` (text) - 'free' or 'premium'
      - `status` (text) - 'active', 'inactive'
      - `currency` (text) - 'eur', 'chf', 'usd'
      - `amount_paid` (integer) - Amount paid in cents
      - `paid_at` (timestamptz) - When the payment was made
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Users can view their own subscription
    - Only webhook (service role) can insert/update
*/

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  stripe_payment_id TEXT,
  plan TEXT CHECK (plan IN ('free', 'premium')) DEFAULT 'free',
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'inactive',
  currency TEXT CHECK (currency IN ('eur', 'chf', 'usd')),
  amount_paid INTEGER DEFAULT 0,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own subscription
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Auto-update trigger
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
