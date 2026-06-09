-- Add predicted_name column to ai_prediction_logs table
ALTER TABLE ai_prediction_logs ADD COLUMN IF NOT EXISTS predicted_name TEXT;
