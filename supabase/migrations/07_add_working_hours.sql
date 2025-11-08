-- Add working_hours column to attendance_records table
-- This will store the calculated working hours when employee checks out

ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS working_hours TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_working_hours ON attendance_records(working_hours);

-- Add comment for documentation
COMMENT ON COLUMN attendance_records.working_hours IS 'Calculated working hours in format HH:MM when employee checks out (check_out_time - check_in_time)';
