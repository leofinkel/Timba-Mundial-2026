-- Allow admins to unlock a user's prediction after the deadline.
-- admin_unlocked = true bypasses the deadline check in the service layer.
-- Reset to false when the prediction is re-locked.
ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS admin_unlocked BOOLEAN NOT NULL DEFAULT FALSE;
