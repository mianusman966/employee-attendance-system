-- Create employees table (separate from system users/profiles)
-- This is for actual shop workers who will mark attendance

CREATE TABLE employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    emp_id TEXT UNIQUE NOT NULL, -- Employee ID like "1044"
    
    -- Personal Information
    full_name TEXT NOT NULL,
    father_guardian_name TEXT,
    father_guardian_occupation TEXT,
    father_guardian_relation TEXT,
    email TEXT,
    social_address TEXT,
    emp_cnic TEXT,
    emp_cell_no TEXT,
    father_guardian_cnic TEXT,
    father_guardian_cell_no TEXT,
    dob DATE,
    gender TEXT,
    marital_status TEXT,
    emp_status TEXT,
    qualification TEXT,
    id_status TEXT,
    emergency_contact TEXT,
    age INTEGER,
    guardian TEXT,
    address TEXT,
    
    -- Work Information
    join_date DATE,
    job_status TEXT,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    job_title TEXT,
    monthly_salary DECIMAL(10, 2),
    daily_salary DECIMAL(10, 2),
    weekly_salary DECIMAL(10, 2),
    total_salary DECIMAL(10, 2),
    working_hours TEXT, -- e.g., "W.H: 8"
    start_time TIME,
    end_time TIME,
    work_time TEXT, -- Combined work time display
    
    -- Image
    image_url TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- Create index on emp_id for faster lookups
CREATE INDEX idx_employees_emp_id ON employees(emp_id);
CREATE INDEX idx_employees_department ON employees(department_id);

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all employees"
    ON employees FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert employees"
    ON employees FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update employees"
    ON employees FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete employees"
    ON employees FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Trigger for updated_at
CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update attendance_records to use employee_id instead of user_id
ALTER TABLE attendance_records ADD COLUMN employee_id UUID REFERENCES employees(id) ON DELETE CASCADE;

-- Create index for attendance lookups
CREATE INDEX idx_attendance_employee ON attendance_records(employee_id);

-- Add RLS policy for employees to view their own attendance
CREATE POLICY "Employees can view own attendance via emp_id"
    ON attendance_records FOR SELECT
    TO authenticated
    USING (employee_id IS NOT NULL);
