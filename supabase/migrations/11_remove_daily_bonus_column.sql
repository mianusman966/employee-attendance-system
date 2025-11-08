-- Remove daily_bonus column from employees table
-- We now use daily_salary as the daily bonus, so this column is redundant

-- Drop the column if it exists (safe operation)
ALTER TABLE employees 
DROP COLUMN IF EXISTS daily_bonus;

-- Add comment to daily_salary to clarify its dual purpose
COMMENT ON COLUMN employees.daily_salary IS 'Daily salary amount - also used as daily bonus for attendance';
