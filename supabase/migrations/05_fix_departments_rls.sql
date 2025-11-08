-- Fix departments RLS policies to allow admin insert/update/delete

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can view all departments" ON departments;
DROP POLICY IF EXISTS "Admins can insert departments" ON departments;
DROP POLICY IF EXISTS "Admins can update departments" ON departments;
DROP POLICY IF EXISTS "Admins can delete departments" ON departments;
DROP POLICY IF EXISTS "All authenticated users can view departments" ON departments;

-- Allow all authenticated users to view departments
CREATE POLICY "All authenticated users can view departments"
    ON departments FOR SELECT
    TO authenticated
    USING (true);

-- Allow admins to insert departments
CREATE POLICY "Admins can insert departments"
    ON departments FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow admins to update departments
CREATE POLICY "Admins can update departments"
    ON departments FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow admins to delete departments
CREATE POLICY "Admins can delete departments"
    ON departments FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
