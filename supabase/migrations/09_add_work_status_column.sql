-- Add work_status column to attendance_records table
-- This column stores the working status (In/Out) while attendance_status stores the overall status (Present/Absent/Leave/Holiday/Friday)

-- Step 1: Drop the old check constraint
ALTER TABLE attendance_records 
DROP CONSTRAINT IF EXISTS attendance_records_attendance_status_check;

-- Step 2: Add work_status column
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS work_status TEXT DEFAULT 'In';

-- Step 3: Add new check constraints
ALTER TABLE attendance_records
ADD CONSTRAINT attendance_records_attendance_status_check 
CHECK (attendance_status IN ('Present', 'Absent', 'Leave', 'Holiday', 'Friday'));

ALTER TABLE attendance_records
ADD CONSTRAINT attendance_records_work_status_check 
CHECK (work_status IN ('In', 'Out'));

-- Step 4: Add comments
COMMENT ON COLUMN attendance_records.attendance_status IS 'Overall day status: Present, Absent, Leave, Holiday, Friday';
COMMENT ON COLUMN attendance_records.work_status IS 'Working status for the day: In, Out';

-- Step 5: Update existing records: migrate old 'In'/'Out' values from attendance_status to work_status
UPDATE attendance_records 
SET work_status = attendance_status,
    attendance_status = 'Present'
WHERE attendance_status IN ('In', 'Out');

-- Step 6: For records with check_out_time, set work_status to 'Out'
UPDATE attendance_records 
SET work_status = 'Out' 
WHERE check_out_time IS NOT NULL;

-- Step 7: Ensure all records have valid attendance_status (default to 'Present' if somehow null)
UPDATE attendance_records 
SET attendance_status = 'Present' 
WHERE attendance_status IS NULL OR attendance_status NOT IN ('Present', 'Absent', 'Leave', 'Holiday', 'Friday');
