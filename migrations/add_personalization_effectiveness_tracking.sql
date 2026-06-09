-- Migration: Add personalization effectiveness tracking to outfit feedback
-- Stores enough scoring context to measure whether feedback personalization is
-- actively changing recommendation scores over time.

ALTER TABLE outfit_feedback
ADD COLUMN IF NOT EXISTS base_score_before_preferences NUMERIC;

ALTER TABLE outfit_feedback
ADD COLUMN IF NOT EXISTS preference_adjustment NUMERIC;

ALTER TABLE outfit_feedback
ADD COLUMN IF NOT EXISTS final_score_after_preferences NUMERIC;

COMMENT ON COLUMN outfit_feedback.base_score_before_preferences IS 'Final score before applying learned preference adjustment, stored as 0-1.';
COMMENT ON COLUMN outfit_feedback.preference_adjustment IS 'Preference personalization adjustment in score points, e.g. +3 or -5.';
COMMENT ON COLUMN outfit_feedback.final_score_after_preferences IS 'Final score after applying learned preference adjustment, stored as 0-1.';
