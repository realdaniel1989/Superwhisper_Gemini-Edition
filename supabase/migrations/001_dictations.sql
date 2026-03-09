-- Create dictations table for storing transcription history
CREATE TABLE IF NOT EXISTS dictations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  duration INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE dictations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own dictations
CREATE POLICY "Users can view own dictations"
  ON dictations
  FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policy: Users can insert their own dictations
CREATE POLICY "Users can insert own dictations"
  ON dictations
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policy: Users can delete their own dictations
CREATE POLICY "Users can delete own dictations"
  ON dictations
  FOR DELETE
  USING (user_id = auth.uid());

-- Create index on user_id for query performance
CREATE INDEX idx_dictations_user_id ON dictations(user_id);
