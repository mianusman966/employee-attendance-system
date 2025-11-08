# Database Migration Instructions - CRITICAL FIXES

## Issues Fixed
1. ❌ **Check Constraint Violations**: 
   - "new row violates check constraint attendance_records_work_status_check" (on absent marking)
   - "new row violates check constraint attendance_records_attendance_status_check" (on check-in)
   
2. ❌ **Update Not Working**: PATCH 400 error when updating attendance records

3. ✅ **Daily Bonus**: Using existing `daily_salary` column (removed redundant daily_bonus column)

## Root Causes
1. **Absent page** was setting `work_status` to absent reason (e.g., "Leave") instead of "In" or "Out"
2. **Update function** was trying to set `attendance_status` to "In"/"Out" instead of using `work_status`
3. **Code was looking for daily_bonus** but the column is actually `daily_salary`
4. **Redundant column**: Had separate `daily_bonus` column when we only need `daily_salary`

## Solutions Applied

### Code Changes (Already Fixed)
✅ Fixed absent page to not set invalid work_status
✅ Fixed update function to use work_status instead of attendance_status
✅ Changed all code to use `daily_salary` instead of `daily_bonus`
✅ Removed daily_bonus field from employee add/edit forms

### Database Migrations (You Need to Run)

## How to Run the Migrations

### Step 1: Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard/project/nnzixvupzngxswkzbhnd/sql
2. Click "New query" button

### Step 2: Run Migration #9 (Status Structure)
1. Copy ALL content from `supabase/migrations/09_add_work_status_column.sql`
2. Paste into SQL editor
3. Click "Run"
4. Wait for "Success" message

### Step 3: Run Migration #11 (Remove Daily Bonus Column)
1. Click "New query" again
2. Copy ALL content from `supabase/migrations/11_remove_daily_bonus_column.sql`
3. Paste into SQL editor
4. Click "Run"
5. Wait for "Success" message

### Step 4: Verify Migrations Worked
Run this verification query:
```sql
-- Check constraints
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%attendance_records%';

-- Check columns in attendance_records
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'attendance_records'
AND column_name IN ('attendance_status', 'work_status');

-- Verify daily_bonus is removed from employees table
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'employees'
AND column_name IN ('daily_salary', 'daily_bonus');
```

**Expected Results:**
- ✅ `attendance_status` constraint allows: Present, Absent, Leave, Holiday, Friday
- ✅ `work_status` constraint allows: In, Out
- ✅ Both columns exist in attendance_records
- ✅ `daily_salary` exists in employees table
- ✅ `daily_bonus` does NOT exist in employees table (removed)

### Step 5: Test Everything
1. ✅ Go to attendance page, check in an employee
2. ✅ Verify daily salary shows correctly as daily bonus in attendance records
3. ✅ Check out the employee
4. ✅ Edit the attendance record (should work now)
5. ✅ Go to Absent Management, mark an employee absent (should work now)
6. ✅ Verify dashboard shows all data correctly
7. ✅ Try adding a new employee (no daily_bonus field!)
8. ✅ Try editing an employee (no daily_bonus field!)

## What This Migration Does

1. **Drops old constraint**: Removes the constraint that only allowed 'In'/'Out'
2. **Adds work_status column**: New column to track In/Out status separately
3. **Creates new constraints**:
   - `attendance_status`: Must be one of Present, Absent, Leave, Holiday, Friday
   - `work_status`: Must be one of In, Out
4. **Migrates existing data**: Converts old 'In'/'Out' values in attendance_status to 'Present' and moves the In/Out status to work_status column

## Important Notes

- **Daily Bonus = Daily Salary**: The app now uses the existing `daily_salary` column from employees table
- Employee 1044 should already have their daily salary set (500)
- No additional column needed - simpler and clearer!

## After Migration

Once the migration is complete:
- ✅ Check-in will work (creates attendance_status='Present', work_status='In')
- ✅ Check-out will work (updates work_status='Out')
- ✅ Absent marking will work (creates attendance_status='Absent', etc.)
- ✅ Daily salary will display correctly as daily bonus
- ✅ Overtime/Short time calculations will work
- ✅ 7-day graph will show data
