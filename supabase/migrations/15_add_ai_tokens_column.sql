-- Add ai_tokens_used column to system_metrics table
ALTER TABLE system_metrics 
ADD COLUMN IF NOT EXISTS ai_tokens_used INTEGER DEFAULT 0;

-- Update existing records to have default value
UPDATE system_metrics 
SET ai_tokens_used = 0 
WHERE ai_tokens_used IS NULL;
