-- Fix Storage Bucket RLS for employees bucket
-- Allow authenticated users to upload employee images

-- First, ensure the bucket exists (run this in Supabase Dashboard Storage section)
-- Bucket name: employees
-- Public: true

-- Storage policies for employees bucket
-- Allow authenticated users (admins) to upload
INSERT INTO storage.buckets (id, name, public)
VALUES ('employees', 'employees', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow anyone to view employee images (public bucket)
CREATE POLICY "Public Access for Employee Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'employees');

-- Allow authenticated admins to upload employee images
CREATE POLICY "Admins can upload employee images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employees' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow authenticated admins to update employee images
CREATE POLICY "Admins can update employee images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'employees' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow authenticated admins to delete employee images
CREATE POLICY "Admins can delete employee images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'employees' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ========================================
-- Update Attendance Records Table Structure
-- ========================================

-- Drop existing attendance_records table and recreate with new structure
DROP TABLE IF EXISTS attendance_records CASCADE;

-- Create new attendance table with proper structure
CREATE TABLE attendance_records (
    aid UUID DEFAULT gen_random_uuid() PRIMARY KEY, -- Attendance ID
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    emp_id TEXT NOT NULL, -- Employee ID like "1044"
    emp_name TEXT NOT NULL,
    department TEXT,
    job_title TEXT,
    daily_bonus DECIMAL(10, 2) DEFAULT 0,
    
    -- Date and Time
    attendance_date DATE NOT NULL, -- Date when attendance marked
    check_in_time TIMESTAMPTZ, -- Exact check-in time with timezone
    check_out_time TIMESTAMPTZ, -- Exact check-out time with timezone
    
    -- Status
    attendance_status TEXT CHECK (attendance_status IN ('In', 'Out')) DEFAULT 'In',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_attendance_employee_id ON attendance_records(employee_id);
CREATE INDEX idx_attendance_emp_id ON attendance_records(emp_id);
CREATE INDEX idx_attendance_date ON attendance_records(attendance_date);
CREATE INDEX idx_attendance_status ON attendance_records(attendance_status);
CREATE UNIQUE INDEX idx_attendance_employee_date ON attendance_records(employee_id, attendance_date);

-- Enable RLS
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies - All authenticated users can insert attendance
CREATE POLICY "All authenticated users can insert attendance"
    ON attendance_records FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- All authenticated users can view attendance
CREATE POLICY "All authenticated users can view attendance"
    ON attendance_records FOR SELECT
    TO authenticated
    USING (true);

-- All authenticated users can update their own day's attendance (for check-out)
CREATE POLICY "All authenticated users can update attendance"
    ON attendance_records FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Only admins can delete attendance records
CREATE POLICY "Only admins can delete attendance"
    ON attendance_records FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Trigger for updated_at
CREATE TRIGGER update_attendance_records_updated_at
    BEFORE UPDATE ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add daily_bonus column to employees table if not exists
ALTER TABLE employees ADD COLUMN IF NOT EXISTS daily_bonus DECIMAL(10, 2) DEFAULT 0;

-- Create index on daily_bonus
CREATE INDEX IF NOT EXISTS idx_employees_daily_bonus ON employees(daily_bonus);
