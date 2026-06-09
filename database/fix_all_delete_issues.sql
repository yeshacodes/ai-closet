-- COMPREHENSIVE FIX FOR DELETE ISSUES
-- Run this entire script in the Supabase SQL Editor

-- 1. Enable Deletion on Related Tables (RLS Policies)
-- These tables were missing DELETE policies, causing client-side cleanup to fail.

-- For ai_prediction_logs
DROP POLICY IF EXISTS "Allow public delete access" ON ai_prediction_logs;
CREATE POLICY "Allow public delete access" ON ai_prediction_logs FOR DELETE USING (true);

-- For outfit_feedback
DROP POLICY IF EXISTS "Allow public delete access" ON outfit_feedback;
CREATE POLICY "Allow public delete access" ON outfit_feedback FOR DELETE USING (true);


-- 2. Ensure Server-Side Cascade Deletion (Foreign Key Constraints)
-- This ensures that if you delete an item, the DB automatically cleans up the mess,
-- even if the client-side code fails or is bypassed.

-- Fix ai_prediction_logs constraint
ALTER TABLE ai_prediction_logs DROP CONSTRAINT IF EXISTS ai_prediction_logs_item_id_fkey;
ALTER TABLE ai_prediction_logs
ADD CONSTRAINT ai_prediction_logs_item_id_fkey
FOREIGN KEY (item_id)
REFERENCES items(id)
ON DELETE CASCADE;

-- Fix outfit_feedback constraints
ALTER TABLE outfit_feedback DROP CONSTRAINT IF EXISTS outfit_feedback_top_id_fkey;
ALTER TABLE outfit_feedback DROP CONSTRAINT IF EXISTS outfit_feedback_bottom_id_fkey;
ALTER TABLE outfit_feedback DROP CONSTRAINT IF EXISTS outfit_feedback_footwear_id_fkey;

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
