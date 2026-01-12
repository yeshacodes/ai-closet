-- Migration: Add support for dress outfits and enhanced feedback tracking
-- This migration adds new columns to outfit_feedback table to support:
-- 1. Dress outfit type (dress_id, outfit_type)
-- 2. Enhanced scoring metrics (rule_score, ml_score, final_score)
-- 3. Outerwear tracking (outerwear_id)

-- Add dress_id column for dress outfits
ALTER TABLE outfit_feedback 
ADD COLUMN IF NOT EXISTS dress_id UUID REFERENCES items(id) ON DELETE CASCADE;

-- Add outfit_type column to distinguish between separates and dress
ALTER TABLE outfit_feedback 
ADD COLUMN IF NOT EXISTS outfit_type TEXT CHECK (outfit_type IN ('separates', 'dress'));

-- Add outerwear_id column (optional for both outfit types)
ALTER TABLE outfit_feedback 
ADD COLUMN IF NOT EXISTS outerwear_id UUID REFERENCES items(id) ON DELETE SET NULL;

-- Add scoring columns for better analytics
ALTER TABLE outfit_feedback 
ADD COLUMN IF NOT EXISTS rule_score NUMERIC;

ALTER TABLE outfit_feedback 
ADD COLUMN IF NOT EXISTS ml_score NUMERIC;

ALTER TABLE outfit_feedback 
ADD COLUMN IF NOT EXISTS final_score NUMERIC;

-- Add comments for documentation
COMMENT ON COLUMN outfit_feedback.dress_id IS 'Reference to dress item (for dress outfits)';
COMMENT ON COLUMN outfit_feedback.outfit_type IS 'Type of outfit: separates or dress';
COMMENT ON COLUMN outfit_feedback.outerwear_id IS 'Optional outerwear item';
COMMENT ON COLUMN outfit_feedback.rule_score IS 'Rule-based score (0-17)';
COMMENT ON COLUMN outfit_feedback.ml_score IS 'ML probability score (0-1)';
COMMENT ON COLUMN outfit_feedback.final_score IS 'Hybrid final score (0-1)';

-- Make top_id and bottom_id nullable since dress outfits don't use them
ALTER TABLE outfit_feedback 
ALTER COLUMN top_id DROP NOT NULL;

ALTER TABLE outfit_feedback 
ALTER COLUMN bottom_id DROP NOT NULL;
