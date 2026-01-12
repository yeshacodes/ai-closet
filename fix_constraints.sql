-- Fix Foreign Key Constraints to allow Deletion of Items

-- 1. ai_prediction_logs
-- Try to drop the existing constraint (assuming standard naming)
ALTER TABLE ai_prediction_logs DROP CONSTRAINT IF EXISTS ai_prediction_logs_item_id_fkey;

-- Re-add with ON DELETE CASCADE
ALTER TABLE ai_prediction_logs
ADD CONSTRAINT ai_prediction_logs_item_id_fkey
FOREIGN KEY (item_id)
REFERENCES items(id)
ON DELETE CASCADE;


-- 2. outfit_feedback
-- Drop existing constraints
ALTER TABLE outfit_feedback DROP CONSTRAINT IF EXISTS outfit_feedback_top_id_fkey;
ALTER TABLE outfit_feedback DROP CONSTRAINT IF EXISTS outfit_feedback_bottom_id_fkey;
ALTER TABLE outfit_feedback DROP CONSTRAINT IF EXISTS outfit_feedback_footwear_id_fkey;

-- Re-add with ON DELETE CASCADE
ALTER TABLE outfit_feedback
ADD CONSTRAINT outfit_feedback_top_id_fkey
FOREIGN KEY (top_id)
REFERENCES items(id)
ON DELETE CASCADE;

ALTER TABLE outfit_feedback
ADD CONSTRAINT outfit_feedback_bottom_id_fkey
FOREIGN KEY (bottom_id)
REFERENCES items(id)
ON DELETE CASCADE;

ALTER TABLE outfit_feedback
ADD CONSTRAINT outfit_feedback_footwear_id_fkey
FOREIGN KEY (footwear_id)
REFERENCES items(id)
ON DELETE CASCADE;
