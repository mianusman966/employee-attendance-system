-- Fix RLS policies for employees table to allow all authenticated users to read
-- This is needed so regular employees can view employee data for attendance

-- Drop existing policies if any
DROP POLICY IF EXISTS "Authenticated users can view employees" ON employees;
DROP POLICY IF EXISTS "All authenticated users can view employees" ON employees;

-- Allow all authenticated users to view employees
CREATE POLICY "All authenticated users can view employees"
    ON employees FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can insert employees
DROP POLICY IF EXISTS "Only admins can insert employees" ON employees;
CREATE POLICY "Only admins can insert employees"
    ON employees FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can update employees
DROP POLICY IF EXISTS "Only admins can update employees" ON employees;
CREATE POLICY "Only admins can update employees"
    ON employees FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can delete employees
DROP POLICY IF EXISTS "Only admins can delete employees" ON employees;
CREATE POLICY "Only admins can delete employees"
    ON employees FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
