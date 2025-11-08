# 🔍 Friday Auto-Submit Testing Guide

## Current Status
**Date:** Saturday, November 8, 2025  
**Yesterday:** Friday, November 7, 2025  
**System:** ✅ Ready to test

---

## ✅ What Was Fixed

### 1. Enhanced Logging
Added comprehensive console logging to track every step:
- Current day check
- Yesterday verification
- localStorage check
- Employee fetching
- Record insertion
- Activity log creation

### 2. Activity Log Integration
All Friday auto-submit operations are now logged:
- ✅ **Success:** `friday_auto_submit` action
- ❌ **Failure:** `friday_auto_submit_failed` action

### 3. Detailed Console Output
```
[Friday Auto-Submit] Current day: 11/8/2025 (Day 6)
[Friday Auto-Submit] Yesterday: 11/7/2025 (Day 5)
[Friday Auto-Submit] ✓ Today is Saturday. Processing Friday records for: 2025-11-07
[Friday Auto-Submit] Checking localStorage key: friday_processed_2025-11-07, value: null
[Friday Auto-Submit] Fetching active employees...
[Friday Auto-Submit] Found 34 active employees
[Friday Auto-Submit] Checking existing Friday records for 2025-11-07...
[Friday Auto-Submit] Found 0 existing Friday records
[Friday Auto-Submit] Inserting 34 Friday records for 2025-11-07
[Friday Auto-Submit] ✓ Successfully inserted 34 Friday records
[Friday Auto-Submit] Marked friday_processed_2025-11-07 as processed in localStorage
```

---

## 🧪 Testing Steps

### Step 1: Clear Previous Data (Already Done)
You mentioned you already deleted past records. Good! ✅

### Step 2: Clear localStorage (Important!)
```javascript
// Open browser console (F12) and run:
localStorage.removeItem('friday_processed_2025-11-07');
console.log('localStorage cleared for 2025-11-07');
```

### Step 3: Refresh Attendance Page
1. Navigate to: `/attendance`
2. **The function runs automatically on page load**
3. Open browser console (F12) to see logs

### Step 4: Check Console Logs
Look for messages starting with `[Friday Auto-Submit]`:

**Expected Output (Success):**
```
[Friday Auto-Submit] Current day: 11/8/2025 (Day 6)
[Friday Auto-Submit] Yesterday: 11/7/2025 (Day 5)
[Friday Auto-Submit] ✓ Today is Saturday. Processing Friday records for: 2025-11-07
[Friday Auto-Submit] Checking localStorage key: friday_processed_2025-11-07, value: null
[Friday Auto-Submit] Fetching active employees...
[Friday Auto-Submit] Found X active employees
[Friday Auto-Submit] Checking existing Friday records...
[Friday Auto-Submit] Found 0 existing Friday records
[Friday Auto-Submit] Inserting X Friday records
[Friday Auto-Submit] ✓ Successfully inserted X Friday records
```

**If Already Processed:**
```
[Friday Auto-Submit] Checking localStorage key: friday_processed_2025-11-07, value: true
[Friday Auto-Submit] Friday 2025-11-07 already processed, skipping
```

### Step 5: Check Database
```sql
-- Query to verify Friday records
SELECT 
  emp_id,
  emp_name,
  attendance_date,
  attendance_status,
  work_status,
  check_in_time,
  check_out_time,
  created_at
FROM attendance_records
WHERE attendance_date = '2025-11-07'
  AND attendance_status = 'Friday'
ORDER BY emp_id;

-- Expected Results:
-- attendance_date: 2025-11-07 (Friday Nov 7)
-- attendance_status: Friday
-- work_status: Out
-- check_in_time: null
-- check_out_time: null
```

### Step 6: Check Activity Logs
```sql
-- Query to verify activity log
SELECT 
  action,
  resource_type,
  resource_id,
  resource_name,
  description,
  details,
  created_at
FROM activity_logs
WHERE action IN ('friday_auto_submit', 'friday_auto_submit_failed')
ORDER BY created_at DESC
LIMIT 5;

-- Expected Result (Success):
-- action: friday_auto_submit
-- resource_type: Friday Auto-Submit Completed
-- resource_id: 2025-11-07
-- resource_name: Friday Attendance
-- description: Automatically created Friday attendance records for X employees on 2025-11-07
-- details: { "records_created": X, "employee_ids": "1001, 1002, ..." }
```

---

## 🐛 Troubleshooting

### Problem 1: No Console Logs Appear
**Cause:** Page might be cached  
**Solution:**
```bash
# Hard refresh browser
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)

# Or clear cache
rm -rf .next
npm run dev
```

### Problem 2: "Already Processed" Message
**Cause:** localStorage flag exists  
**Solution:**
```javascript
// In browser console:
localStorage.removeItem('friday_processed_2025-11-07');
location.reload();
```

### Problem 3: No Records Created
**Causes:**
1. Not Saturday (today must be Saturday)
2. Yesterday wasn't Friday
3. All employees already have Friday records

**Check:**
```javascript
// In browser console:
const today = new Date();
console.log('Today:', today.toLocaleDateString(), '(Day', today.getDay(), ')');
console.log('Expected: Day 6 (Saturday)');

const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);
console.log('Yesterday:', yesterday.toLocaleDateString(), '(Day', yesterday.getDay(), ')');
console.log('Expected: Day 5 (Friday)');
```

### Problem 4: Activity Log Not Created
**Cause:** User not logged in or RPC function error  
**Solution:**
```sql
-- Verify log_activity function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'log_activity';

-- Test manually
SELECT log_activity(
  'auth-user-id-here',
  'test@example.com',
  'friday_auto_submit',
  'Test Friday Auto-Submit',
  '2025-11-07',
  'Friday Attendance',
  'Test description',
  '{}',
  '{}'
);
```

---

## 📊 Verification Checklist

After testing, verify:

- [ ] Console shows `[Friday Auto-Submit]` logs
- [ ] Console shows "Successfully inserted X Friday records"
- [ ] Database has Friday records for 2025-11-07
- [ ] All active employees have Friday attendance
- [ ] `attendance_status` = 'Friday'
- [ ] `work_status` = 'Out'
- [ ] `check_in_time` and `check_out_time` are null
- [ ] Activity log has `friday_auto_submit` entry
- [ ] Activity log shows correct record count
- [ ] localStorage has `friday_processed_2025-11-07` = 'true'
- [ ] UI shows notification: "✓ Friday attendance updated for X employees"

---

## 🔄 How It Works

### Trigger
Runs **automatically** when you:
- Visit `/attendance` page
- Refresh the page
- Navigate back to attendance page

### Logic Flow
```
1. Check: Is today Saturday? (Day 6)
   ❌ No → Exit (don't run)
   ✅ Yes → Continue

2. Calculate: Yesterday's date
   
3. Verify: Was yesterday Friday? (Day 5)
   ❌ No → Exit (don't run)
   ✅ Yes → Continue

4. Check: Already processed?
   ✅ Yes → Exit (already done)
   ❌ No → Continue

5. Fetch: All active employees

6. Check: Which employees don't have Friday records?

7. Insert: Friday records for missing employees

8. Log: Activity to activity_logs table

9. Save: Mark as processed in localStorage

10. Show: Success notification
```

### Runs On
- ✅ **Saturday only** (after Friday ends)
- ✅ **Verifies yesterday was Friday** (not just any previous day)
- ✅ **One-time execution** (uses localStorage to prevent duplicates)

### Doesn't Run On
- ❌ Sunday through Friday (not Saturday)
- ❌ Saturday after a non-Friday (e.g., holiday)
- ❌ If already executed (localStorage flag set)

---

## 📅 Next Test Date

**Current:** Saturday, November 8, 2025 → Should process Friday Nov 7  
**Next Test:** Saturday, November 15, 2025 → Will process Friday Nov 14

---

## 🚀 Quick Test Command

Run these in browser console (F12):

```javascript
// 1. Check current status
console.log('Today:', new Date().toLocaleDateString(), 'Day:', new Date().getDay());
console.log('Is Saturday?', new Date().getDay() === 6);

// 2. Clear localStorage
localStorage.removeItem('friday_processed_2025-11-07');

// 3. Reload page
location.reload();

// 4. Check if processed
setTimeout(() => {
  console.log('Processed?', localStorage.getItem('friday_processed_2025-11-07'));
}, 5000);
```

---

## 📝 Success Indicators

### Console
```
✓ [Friday Auto-Submit] Successfully inserted X Friday records
✓ [Friday Auto-Submit] Marked friday_processed_2025-11-07 as processed
```

### Database
```sql
-- Should return rows
SELECT COUNT(*) as friday_records
FROM attendance_records
WHERE attendance_date = '2025-11-07'
  AND attendance_status = 'Friday';
```

### Activity Logs
```sql
-- Should return 1 row
SELECT * FROM activity_logs
WHERE action = 'friday_auto_submit'
  AND resource_id = '2025-11-07';
```

### UI Notification
```
✓ Friday attendance updated for X employees
```

---

## ⚠️ Important Notes

1. **Runs Once Per Friday:** After successful execution, won't run again for same date
2. **Requires Saturday:** Will only execute on Saturdays (Day 6)
3. **Verifies Friday:** Checks yesterday was actually Friday (Day 5)
4. **Activity Logged:** Every execution (success or failure) is recorded
5. **Console Visibility:** Open F12 console to see detailed logs

---

## 🎯 Expected Outcome

**After refreshing /attendance page on Saturday Nov 8:**

✅ Console shows detailed execution logs  
✅ Database has Friday records for Nov 7  
✅ Activity log confirms auto-submit  
✅ All active employees included  
✅ localStorage prevents re-execution  
✅ UI shows success notification

**If these don't happen, check troubleshooting section above!**

---

Generated: November 8, 2025, 1:45 AM PKT  
Status: Ready for Testing  
Test Date: Saturday, November 8, 2025
