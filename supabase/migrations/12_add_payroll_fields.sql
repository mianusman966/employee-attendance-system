-- Add base_salary and payment_type columns for payroll system
-- This allows flexible salary configurations for Monthly/Daily/Weekly/Hourly payments

-- Add payment_type column (Monthly, Daily, Weekly, Hourly)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'Monthly';

-- Add base_salary column (main salary amount based on payment type)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS base_salary DECIMAL(10, 2) DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN employees.payment_type IS 'Payment frequency: Monthly, Daily, Weekly, or Hourly';
COMMENT ON COLUMN employees.base_salary IS 'Base salary amount according to payment_type (e.g., Rs. 45000 for Monthly)';

-- Update existing employees to set base_salary based on existing salary columns
-- Priority: monthly_salary > daily_salary > weekly_salary > total_salary
UPDATE employees 
SET base_salary = COALESCE(monthly_salary, daily_salary, weekly_salary, total_salary, 0),
    payment_type = CASE 
        WHEN monthly_salary IS NOT NULL AND monthly_salary > 0 THEN 'Monthly'
        WHEN daily_salary IS NOT NULL AND daily_salary > 0 THEN 'Daily'
        WHEN weekly_salary IS NOT NULL AND weekly_salary > 0 THEN 'Weekly'
        ELSE 'Monthly'
    END
WHERE base_salary IS NULL OR base_salary = 0;
