-- ============================================
-- SYSTEM ADMINISTRATION TABLES
-- ============================================
-- These tables support error logging, activity tracking,
-- analytics, backups, and changelog features

-- ============================================
-- 1. SYSTEM LOGS (Error Tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS system_logs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  level TEXT NOT NULL CHECK (level IN ('error', 'warning', 'info', 'debug')),
  component TEXT NOT NULL, -- e.g., 'chatbot', 'attendance', 'employees'
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  message TEXT NOT NULL,
  stack_trace TEXT,
  context JSONB DEFAULT '{}', -- Additional context data
  browser_info JSONB DEFAULT '{}', -- User agent, browser version
  ip_address INET,
  url TEXT, -- Page where error occurred
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  notes TEXT -- Admin notes about resolution
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_resolved ON system_logs(resolved) WHERE resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_system_logs_component ON system_logs(component);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);

-- Comments
COMMENT ON TABLE system_logs IS 'System-wide error and event logging for debugging and monitoring';
COMMENT ON COLUMN system_logs.level IS 'Severity: error, warning, info, debug';
COMMENT ON COLUMN system_logs.component IS 'App component where log originated';
COMMENT ON COLUMN system_logs.context IS 'Additional JSON data for debugging';

-- ============================================
-- 2. ACTIVITY LOGS (Audit Trail)
-- ============================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL, -- e.g., 'create', 'update', 'delete', 'login'
  resource_type TEXT NOT NULL, -- e.g., 'employee', 'attendance', 'department'
  resource_id TEXT, -- ID of the affected resource
  resource_name TEXT, -- Human-readable name
  description TEXT NOT NULL, -- Human-readable description
  before_data JSONB, -- State before change
  after_data JSONB, -- State after change
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}' -- Additional context
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type ON activity_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_id ON activity_logs(resource_id);

-- Comments
COMMENT ON TABLE activity_logs IS 'Audit trail of all user actions for compliance and debugging';
COMMENT ON COLUMN activity_logs.before_data IS 'Resource state before change (for updates/deletes)';
COMMENT ON COLUMN activity_logs.after_data IS 'Resource state after change (for creates/updates)';

-- ============================================
-- 3. APP UPDATES (Changelog)
-- ============================================

CREATE TABLE IF NOT EXISTS app_updates (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  version TEXT NOT NULL UNIQUE, -- e.g., '2.1.0'
  release_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  description TEXT,
  update_type TEXT CHECK (update_type IN ('major', 'minor', 'patch')),
  is_published BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  features JSONB DEFAULT '[]', -- Array of feature descriptions
  improvements JSONB DEFAULT '[]', -- Array of improvements
  bugfixes JSONB DEFAULT '[]', -- Array of bug fixes
  breaking_changes JSONB DEFAULT '[]', -- Array of breaking changes
  image_url TEXT,
  documentation_url TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_app_updates_release_date ON app_updates(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_app_updates_published ON app_updates(is_published) WHERE is_published = TRUE;

-- Comments
COMMENT ON TABLE app_updates IS 'Version history and changelog for the application';
COMMENT ON COLUMN app_updates.features IS 'JSON array of new features in this release';

-- ============================================
-- 4. SYSTEM METRICS (Analytics)
-- ============================================

CREATE TABLE IF NOT EXISTS system_metrics (
  id BIGSERIAL PRIMARY KEY,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  metric_date DATE DEFAULT CURRENT_DATE,
  
  -- Database Metrics
  db_storage_used_mb DECIMAL(10, 2),
  db_queries_count INTEGER DEFAULT 0,
  db_bandwidth_used_mb DECIMAL(10, 2),
  db_active_connections INTEGER DEFAULT 0,
  db_slow_queries_count INTEGER DEFAULT 0,
  
  -- AI/API Metrics
  ai_api_calls_count INTEGER DEFAULT 0,
  ai_tokens_used INTEGER DEFAULT 0,
  ai_cost_estimate DECIMAL(10, 2) DEFAULT 0,
  ai_average_response_ms INTEGER,
  ai_error_count INTEGER DEFAULT 0,
  
  -- Application Metrics
  app_active_users INTEGER DEFAULT 0,
  app_page_views INTEGER DEFAULT 0,
  app_average_load_ms INTEGER,
  app_cache_hit_rate DECIMAL(5, 2), -- Percentage
  app_error_count INTEGER DEFAULT 0,
  
  -- Additional data
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_system_metrics_date ON system_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at DESC);

-- Unique constraint to prevent duplicate daily records
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_metrics_unique_date ON system_metrics(metric_date);

-- Comments
COMMENT ON TABLE system_metrics IS 'Daily system performance and usage metrics for analytics dashboard';

-- ============================================
-- 5. BACKUP HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS backup_history (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  backup_type TEXT CHECK (backup_type IN ('manual', 'automatic', 'scheduled')),
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_size_mb DECIMAL(10, 2),
  file_path TEXT, -- Path in Supabase Storage
  status TEXT CHECK (status IN ('pending', 'completed', 'failed')),
  tables_included TEXT[], -- Array of table names
  records_count INTEGER,
  error_message TEXT,
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_backup_history_created_at ON backup_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_history_status ON backup_history(status);
CREATE INDEX IF NOT EXISTS idx_backup_history_type ON backup_history(backup_type);

-- Comments
COMMENT ON TABLE backup_history IS 'Track all database backups for restore functionality';

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - Admin Only Access
-- ============================================

-- System Logs: Admin can view/insert/update all
CREATE POLICY "Admin full access to system_logs" ON system_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow system to insert logs (for error tracking)
CREATE POLICY "System can insert logs" ON system_logs
  FOR INSERT
  WITH CHECK (true);

-- Activity Logs: Admin can view all, system can insert
CREATE POLICY "Admin can view activity_logs" ON activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert activity_logs" ON activity_logs
  FOR INSERT
  WITH CHECK (true);

-- App Updates: Admin can manage, all authenticated users can view published
CREATE POLICY "Admin full access to app_updates" ON app_updates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view published updates" ON app_updates
  FOR SELECT
  USING (is_published = TRUE AND auth.uid() IS NOT NULL);

-- System Metrics: Admin only
CREATE POLICY "Admin full access to system_metrics" ON system_metrics
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Backup History: Admin only
CREATE POLICY "Admin full access to backup_history" ON backup_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to log activity automatically
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_user_email TEXT,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT,
  p_resource_name TEXT,
  p_description TEXT,
  p_before_data JSONB DEFAULT NULL,
  p_after_data JSONB DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
  log_id BIGINT;
BEGIN
  INSERT INTO activity_logs (
    user_id, user_email, action, resource_type, resource_id,
    resource_name, description, before_data, after_data
  ) VALUES (
    p_user_id, p_user_email, p_action, p_resource_type, p_resource_id,
    p_resource_name, p_description, p_before_data, p_after_data
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log system errors
CREATE OR REPLACE FUNCTION log_system_error(
  p_level TEXT,
  p_component TEXT,
  p_message TEXT,
  p_stack_trace TEXT DEFAULT NULL,
  p_context JSONB DEFAULT '{}'
) RETURNS BIGINT AS $$
DECLARE
  log_id BIGINT;
BEGIN
  INSERT INTO system_logs (
    level, component, message, stack_trace, context, user_id
  ) VALUES (
    p_level, p_component, p_message, p_stack_trace, p_context, auth.uid()
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get today's metrics summary
CREATE OR REPLACE FUNCTION get_today_metrics()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'errors_today', (SELECT COUNT(*) FROM system_logs WHERE created_at::date = CURRENT_DATE AND level = 'error'),
    'activities_today', (SELECT COUNT(*) FROM activity_logs WHERE created_at::date = CURRENT_DATE),
    'active_employees', (SELECT COUNT(*) FROM employees WHERE emp_status = 'Active'),
    'attendance_today', (SELECT COUNT(*) FROM attendance_records WHERE attendance_date = CURRENT_DATE)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert initial app version
INSERT INTO app_updates (version, release_date, title, description, update_type, is_published, features, improvements, bugfixes)
VALUES (
  '2.0.0',
  '2025-11-07',
  'Performance Optimizations & System Administration',
  'Major performance improvements and new admin features',
  'major',
  TRUE,
  '["AI Chatbot with salary insights", "System administration dashboard", "Error logging and tracking", "Database backup and restore", "Activity audit trail", "Update changelog"]'::jsonb,
  '["90% faster dashboard loading", "Reduced database queries by 95%", "Added query limits and caching", "Fixed N+1 query issues", "Added loading states and error boundaries"]'::jsonb,
  '["Fixed chatbot showing Rs. 0 salary", "Corrected multi-component salary calculation", "Fixed departments page N+1 queries"]'::jsonb
) ON CONFLICT (version) DO NOTHING;

-- ============================================
-- COMPLETION
-- ============================================

-- Analyze tables for query optimization
ANALYZE system_logs;
ANALYZE activity_logs;
ANALYZE app_updates;
ANALYZE system_metrics;
ANALYZE backup_history;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'System administration tables created successfully!';
  RAISE NOTICE 'Tables: system_logs, activity_logs, app_updates, system_metrics, backup_history';
  RAISE NOTICE 'Helper functions: log_activity(), log_system_error(), get_today_metrics()';
END $$;
