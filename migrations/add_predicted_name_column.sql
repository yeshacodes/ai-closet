-- Add predicted_name column to ai_prediction_logs table
-- This column stores the AI-generated name prediction for comparison with user's final choice

ALTER TABLE ai_prediction_logs 
ADD COLUMN IF NOT EXISTS predicted_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN ai_prediction_logs.predicted_name IS 'AI-generated name suggestion (e.g., "Pink Dress")';
