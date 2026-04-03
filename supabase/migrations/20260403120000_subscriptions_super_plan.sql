/*
  # Allow manual "super" plan (Super User)

  Same product access as premium; intended for manual grants via SQL / dashboard.
*/

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('free', 'premium', 'super'));
