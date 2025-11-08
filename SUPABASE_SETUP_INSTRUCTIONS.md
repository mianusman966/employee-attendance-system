# Supabase Setup Instructions

## Required SQL Migrations

You need to run these SQL migrations in your Supabase SQL Editor to fix the issues:

### 1. Fix Departments RLS Policies (CRITICAL - Run First)

Run the file: `supabase/migrations/05_fix_departments_rls.sql`

Or copy and paste this SQL:

```sql
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
```

### 2. Create Employees Table (Run Second)

Run the file: `supabase/migrations/04_create_employees_table.sql`

This will create the `employees` table for shop workers (separate from system users in `profiles` table).

### 3. Create Storage Bucket for Employee Images

Go to **Storage** in Supabase Dashboard and create a new bucket:

- **Bucket name**: `employees`
- **Public bucket**: Yes (or configure RLS for admin-only access)
- **File size limit**: 5MB (recommended)
- **Allowed MIME types**: image/jpeg, image/png, image/gif, image/webp

## What's Fixed

### ✅ Issue 1: Departments RLS Error
- **Problem**: "new row violates row-level security policy for table departments"
- **Fix**: Added INSERT, UPDATE, DELETE policies for admins on departments table
- **How to verify**: Try adding a department - it should work now

### ✅ Issue 2: Employee Tab Shows System Users
- **Problem**: Employee list was fetching from `profiles` table (system users)
- **Fix**: Updated to fetch from `employees` table (shop workers)
- **Dashboard Fix**: Also updated dashboard widget to count from `employees` table
- **How to verify**: After running migration, employees tab will show shop worker data

### ✅ Issue 3: Add Image Button Text Invisible
- **Problem**: Button text was light gray and hard to see
- **Fix**: Added `text-gray-900 font-medium` classes
- **How to verify**: Refresh page - button text should be clearly visible

### ✅ Issue 4: Salary Calculation with Empty Values
- **Problem**: Empty salary fields weren't treated as 0
- **Fix**: 
  - Removed required attribute from salary fields
  - Added placeholder="0"
  - Store as 0 in database when empty
  - Calculation: `(monthly × 1) + (daily × 30) + (weekly × 4)`
- **How to verify**: Leave any salary field empty - it will be counted as 0

## Quick Test Checklist

After running the migrations:

1. ✅ Add a department - should work without 403 error
2. ✅ View employees tab - should show empty list or shop worker employees (not system users)
3. ✅ Dashboard stats - should count shop workers from employees table
4. ✅ Add employee form - "Add Image" button text should be visible
5. ✅ Add employee with partial salary - empty fields should be treated as 0

## Tables Overview

Your system now has TWO separate user systems:

1. **`profiles` table**: System users (admin/employee who manage the system)
   - Used for authentication and authorization
   - Access via "Add User" button (system admin creation)

2. **`employees` table**: Shop workers (mark attendance daily)
   - Used for attendance tracking
   - Access via "Add Employee" button (shop worker data entry)
   - Fields: personal info, work info, salary, image, etc.

## Next Steps

1. Run migration 05_fix_departments_rls.sql ✅
2. Run migration 04_create_employees_table.sql ✅
3. Create 'employees' storage bucket ✅
4. Test department creation ✅
5. Test employee creation ✅
6. Verify dashboard shows correct counts ✅
