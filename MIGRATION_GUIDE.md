# Quick Migration Guide

## Run These SQL Commands in Supabase

Go to: https://supabase.com/dashboard/project/nnzixvupzngxswkzbhnd/sql/new

---

## Step 1: Create Attendance Table (if not done)

Copy and run: `supabase/migrations/06_fix_storage_and_attendance.sql`

---

## Step 2: Add Working Hours Column

```sql
-- Add working_hours column to attendance_records table
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS working_hours TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_working_hours ON attendance_records(working_hours);

-- Add comment for documentation
COMMENT ON COLUMN attendance_records.working_hours IS 'Calculated working hours in format HH:MM when employee checks out (check_out_time - check_in_time)';
```

---

## Step 3: Fix Employee Permissions

```sql
-- Fix RLS policies for employees table to allow all authenticated users to read

-- Drop existing policies
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
```

---

## Verify Migration Success

After running all migrations, verify:

1. **Check Tables Exist:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('employees', 'attendance_records', 'departments', 'profiles');
```

2. **Check working_hours Column:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'attendance_records' 
AND column_name = 'working_hours';
```

3. **Check RLS Policies:**
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'employees';
```

---

## Test the System

### As Admin:
1. Go to http://localhost:3000/attendance
2. Enter employee ID "1044" in Check-In box
3. Verify employee info appears
4. Check-out same employee
5. View time display boxes
6. Go to "View Attendance" tab
7. Select different dates
8. Try editing/deleting records

### As Regular Employee:
1. Login with employee role account
2. Go to http://localhost:3000/attendance
3. Try check-in/out (should work)
4. Verify you can view data but not edit/delete

---

## Troubleshooting

**If employee data doesn't load:**
- Run Step 3 (Fix Employee Permissions) again
- Clear browser cache
- Check browser console for errors

**If working hours don't calculate:**
- Run Step 2 (Add Working Hours Column) again
- Verify column exists with query above

**If regular employees can't access:**
- Check RLS policies with query above
- Ensure user is authenticated
- Verify user exists in profiles table

---

**Need Help?** Check the browser console (F12) for detailed error messages.
