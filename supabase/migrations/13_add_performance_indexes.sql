-- Add performance indexes for scalability
-- These indexes dramatically improve query performance for large datasets

-- ============================================
-- ATTENDANCE RECORDS INDEXES
-- ============================================

-- Index for date range queries (chatbot uses this heavily)
CREATE INDEX IF NOT EXISTS idx_attendance_date 
ON attendance_records(attendance_date);

-- Composite index for emp_id + date queries (most common pattern)
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date 
ON attendance_records(emp_id, attendance_date DESC);

-- Index for status filtering (Present/Absent/Late queries)
CREATE INDEX IF NOT EXISTS idx_attendance_status 
ON attendance_records(attendance_status);

-- Composite index for status + date queries
CREATE INDEX IF NOT EXISTS idx_attendance_status_date 
ON attendance_records(attendance_status, attendance_date DESC);

-- ============================================
-- EMPLOYEES TABLE INDEXES
-- ============================================

-- Index for filtering active/inactive employees
CREATE INDEX IF NOT EXISTS idx_employees_status 
ON employees(emp_status);

-- Composite index for department + status queries
CREATE INDEX IF NOT EXISTS idx_employees_dept_status 
ON employees(department_id, emp_status);

-- Index for full_name searches (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_employees_name 
ON employees(LOWER(full_name));

-- Index for job_title filtering
CREATE INDEX IF NOT EXISTS idx_employees_job_title 
ON employees(job_title);

-- ============================================
-- PERFORMANCE STATISTICS
-- ============================================

-- Gather statistics for query planner optimization
ANALYZE attendance_records;
ANALYZE employees;
ANALYZE departments;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON INDEX idx_attendance_date IS 'Improves date range queries for reports and chatbot';
COMMENT ON INDEX idx_attendance_emp_date IS 'Optimizes employee attendance history lookups';
COMMENT ON INDEX idx_attendance_status IS 'Speeds up status filtering (Present/Absent/Late)';
COMMENT ON INDEX idx_employees_status IS 'Enables fast active/inactive employee filtering';
COMMENT ON INDEX idx_employees_dept_status IS 'Optimizes department-based employee queries';
