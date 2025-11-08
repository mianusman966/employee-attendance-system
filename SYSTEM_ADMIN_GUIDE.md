# 🛡️ System Administration Features - Complete Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Setup Instructions](#setup-instructions)
4. [Usage Guide](#usage-guide)
5. [Database Schema](#database-schema)
6. [API Reference](#api-reference)
7. [Security](#security)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The System Administration module provides enterprise-grade monitoring, logging, analytics, backup, and changelog management for your application. This comprehensive suite helps you:

- **Monitor** system health and resource usage in real-time
- **Track** errors and debug issues efficiently
- **Audit** user activities for compliance and security
- **Backup** and restore your database with confidence
- **Communicate** updates and changes to your users

**Access Level:** Admin only  
**Location:** Dashboard → System  
**Technologies:** Next.js 16, Supabase, Recharts, React 19

---

## ✨ Features

### 1. **System Overview Dashboard**

Real-time monitoring of key metrics:

```
📊 Metrics Displayed:
• Database storage usage (MB/GB with progress bar)
• Active employees count
• Errors today (with unresolved count)
• User activity count
• AI API usage (calls/month with limit tracking)
• Total database records
• System health status
```

**Key Components:**
- Auto-refreshing every 30 seconds
- Color-coded status indicators (green/yellow/red)
- Manual refresh button
- Last updated timestamp

**File:** `src/components/system/SystemOverview.tsx`

---

### 2. **Analytics Dashboard**

Beautiful charts and visualizations:

```
📈 Charts Included:
• Error Trends (Last 7 Days) - Line chart
• Activity Trends (Last 7 Days) - Bar chart
• Errors by Component - Pie chart with breakdown
• Performance Metrics - Cards (Uptime, Response Time, Data Transfer)
```

**Features:**
- Interactive tooltips
- Responsive design
- Color-coded by severity
- Exportable data

**File:** `src/components/system/SystemAnalytics.tsx`

---

### 3. **System Logs**

Dual-tab logging system:

#### **Error Logs Tab:**
```
Features:
• View all system errors, warnings, info messages
• Filter by level (error/warning/info/debug)
• Search across message and component
• Mark errors as resolved
• View full stack traces
• Export to CSV
• Auto-logging from error boundaries
```

#### **Activity Logs Tab:**
```
Features:
• Audit trail of all user actions
• Track employee CRUD operations
• Monitor attendance changes
• System event logging
• Search and filter
• Export to CSV
```

**File:** `src/components/system/SystemLogs.tsx`

---

### 4. **Database Backup & Restore**

Complete backup solution:

```
🔐 Backup Features:
• Manual on-demand backup creation
• Download as JSON file
• Includes: employees, attendance, departments, profiles
• File size and record count tracking
• Backup history with timestamps
• Delete old backups

⚠️  Restore Features:
• Upload backup file
• Preview before restore (in development)
• Validation checks
• Rollback support (planned)
```

**Backup File Format:**
```json
{
  "timestamp": "2025-11-07T10:30:00Z",
  "tables": {
    "employees": [...],
    "attendance_records": [...],
    "departments": [...],
    "profiles": [...]
  },
  "metadata": {
    "version": "2.0.0",
    "recordCount": 1234
  }
}
```

**File:** `src/components/system/DatabaseBackup.tsx`

---

### 5. **App Updates / Changelog**

Version management and user communication:

```
📝 Features:
• Version history timeline
• Categorized updates:
  - ✨ New Features
  - ⚡ Improvements
  - 🐛 Bug Fixes
  - ⚠️  Breaking Changes
• Publish/unpublish updates
• Major/Minor/Patch classification
• Beautiful visual design
• Public-facing "What's New"
```

**File:** `src/components/system/AppUpdates.tsx`

---

## 🚀 Setup Instructions

### Step 1: Apply Database Migration

**Required:** You must run the migration before using any system features.

```bash
# Option 1: Via Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor"
4. Open: supabase/migrations/14_create_system_tables.sql
5. Copy entire file content
6. Paste into SQL Editor
7. Click "Run"
8. Verify success message

# Option 2: Via CLI
supabase migration up

# Option 3: Use helper script
node scripts/apply-system-migration.js
# Follow instructions displayed
```

**What Gets Created:**
- 5 new tables (system_logs, activity_logs, app_updates, system_metrics, backup_history)
- Row Level Security (RLS) policies
- Helper functions (log_activity, log_system_error, get_today_metrics)
- Indexes for performance
- Initial app version record

**Time Required:** ~10 seconds

---

### Step 2: Verify Installation

After migration, check that everything works:

```bash
# 1. Start development server
npm run dev

# 2. Login as admin user

# 3. Navigate to Dashboard → System

# 4. You should see 5 tabs:
   - Overview
   - Analytics
   - Logs
   - Backups
   - Updates

# 5. Check each tab loads without errors
```

---

### Step 3: Configure (Optional)

**Auto-refresh intervals:**
```typescript
// In SystemOverview.tsx, line ~20
const interval = setInterval(fetchSystemStats, 30000); // 30 seconds
```

**Chart colors:**
```typescript
// In SystemAnalytics.tsx, line ~150
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
```

**Backup file format:**
```typescript
// In DatabaseBackup.tsx, line ~50
const fileName = `backup_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.json`;
```

---

## 📖 Usage Guide

### For Administrators

#### **Daily Monitoring:**

1. **Check System Overview**
   - Review error count (should be 0 or low)
   - Monitor storage usage (stay under 80%)
   - Verify AI API usage (stay under limit)
   - Check system health status

2. **Review Logs Weekly**
   - Filter unresolved errors
   - Investigate patterns in activity logs
   - Export logs for record-keeping

3. **Create Backups**
   - Manual backup before major changes
   - Download and store securely offsite
   - Test restore procedure quarterly

4. **Update Changelog**
   - Document all releases
   - Publish user-facing updates
   - Keep version history current

---

#### **Handling Errors:**

```
When you see unresolved errors:

1. Click on error in System Logs
2. Review full stack trace
3. Check user_email to identify affected user
4. Reproduce the issue
5. Fix the bug
6. Mark error as "Resolved"
7. Add notes about the fix
```

---

#### **Creating Backups:**

```
Best Practices:

• Before major updates/deployments
• Before database schema changes
• Weekly scheduled backups
• Before bulk data imports/changes
• Keep last 7 days minimum
• Store backups in multiple locations
```

**Manual Backup Process:**
1. Go to System → Backups
2. Click "Create Backup Now"
3. Wait for download to complete
4. Verify file size and record count
5. Store securely (cloud storage, local drive)

---

#### **Tracking User Activities:**

Activity logs automatically track:
- Employee creation/modification/deletion
- Attendance marking (manual and automatic)
- Department changes
- Settings modifications
- Backup operations
- Login events

**View Activity:**
```
System → Logs → Activity Logs Tab

Search by:
- User email
- Action type
- Resource type
- Date range
```

---

### For Developers

#### **Logging Errors from Code:**

```typescript
// Manual error logging
import { supabase } from '@/lib/supabase';

async function logError(component: string, error: Error) {
  await supabase.from('system_logs').insert({
    level: 'error',
    component: component,
    message: error.message,
    stack_trace: error.stack,
    context: { /* additional data */ }
  });
}

// Usage
try {
  // Your code
} catch (error) {
  await logError('chatbot', error);
  throw error;
}
```

#### **Logging User Activities:**

```typescript
// Log user action
import { supabase } from '@/lib/supabase';

async function logActivity(
  userEmail: string,
  action: string,
  resourceType: string,
  description: string
) {
  await supabase.from('activity_logs').insert({
    user_email: userEmail,
    action: action,
    resource_type: resourceType,
    description: description
  });
}

// Usage
await logActivity(
  user.email,
  'create',
  'employee',
  `Created employee: ${employee.full_name}`
);
```

#### **Recording Metrics:**

```typescript
// Insert daily metrics
await supabase.from('system_metrics').insert({
  metric_date: new Date().toISOString().split('T')[0],
  ai_api_calls_count: 42,
  ai_tokens_used: 1500,
  app_active_users: 10,
  app_error_count: 2
});
```

---

## 🗄️ Database Schema

### **system_logs**
```sql
CREATE TABLE system_logs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  level TEXT NOT NULL,  -- 'error', 'warning', 'info', 'debug'
  component TEXT NOT NULL,
  user_id UUID,
  user_email TEXT,
  message TEXT NOT NULL,
  stack_trace TEXT,
  context JSONB,
  browser_info JSONB,
  ip_address INET,
  url TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  notes TEXT
);
```

### **activity_logs**
```sql
CREATE TABLE activity_logs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,  -- 'create', 'update', 'delete', 'login'
  resource_type TEXT NOT NULL,  -- 'employee', 'attendance', etc
  resource_id TEXT,
  resource_name TEXT,
  description TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB
);
```

### **app_updates**
```sql
CREATE TABLE app_updates (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  version TEXT NOT NULL UNIQUE,
  release_date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  update_type TEXT,  -- 'major', 'minor', 'patch'
  is_published BOOLEAN DEFAULT FALSE,
  features JSONB DEFAULT '[]',
  improvements JSONB DEFAULT '[]',
  bugfixes JSONB DEFAULT '[]',
  breaking_changes JSONB DEFAULT '[]',
  image_url TEXT,
  documentation_url TEXT
);
```

### **system_metrics**
```sql
CREATE TABLE system_metrics (
  id BIGSERIAL PRIMARY KEY,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  metric_date DATE DEFAULT CURRENT_DATE,
  db_storage_used_mb DECIMAL(10, 2),
  db_queries_count INTEGER,
  db_bandwidth_used_mb DECIMAL(10, 2),
  ai_api_calls_count INTEGER,
  ai_tokens_used INTEGER,
  ai_cost_estimate DECIMAL(10, 2),
  app_active_users INTEGER,
  app_error_count INTEGER,
  metadata JSONB
);
```

### **backup_history**
```sql
CREATE TABLE backup_history (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  backup_type TEXT,  -- 'manual', 'automatic', 'scheduled'
  triggered_by UUID,
  file_name TEXT NOT NULL,
  file_size_mb DECIMAL(10, 2),
  file_path TEXT,
  status TEXT,  -- 'pending', 'completed', 'failed'
  tables_included TEXT[],
  records_count INTEGER,
  error_message TEXT
);
```

---

## 🔐 Security

### Row Level Security (RLS)

All system tables have RLS enabled with these policies:

**Admin Full Access:**
```sql
-- Admins can do everything
CREATE POLICY "Admin full access" ON system_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

**System Insert Access:**
```sql
-- Allow automatic error logging
CREATE POLICY "System can insert logs" ON system_logs
  FOR INSERT
  WITH CHECK (true);
```

**Public Read for Published Updates:**
```sql
-- Users can see published updates
CREATE POLICY "Users can view published updates" ON app_updates
  FOR SELECT
  USING (is_published = TRUE AND auth.uid() IS NOT NULL);
```

### Access Control

- ✅ Only admin users can access `/dashboard/system`
- ✅ RLS prevents non-admins from viewing sensitive data
- ✅ Activity logs track who did what
- ✅ Backup/restore requires admin authentication

---

## ⚡ Best Practices

### 1. **Error Management**
- Review unresolved errors daily
- Mark errors as resolved with notes
- Set up alerts for critical errors (future feature)
- Export logs monthly for archival

### 2. **Backup Strategy**
```
Recommended Schedule:
• Daily automatic backups at 2 AM
• Weekly full backup downloaded locally
• Monthly offsite storage
• Quarterly restore test
• Keep 7 daily + 4 weekly + 12 monthly backups
```

### 3. **Activity Logging**
- Log all CRUD operations on sensitive data
- Include before/after data for updates
- Log failed login attempts
- Track bulk operations

### 4. **Performance**
- Archive old logs (>90 days) periodically
- Monitor database storage growth
- Clean up resolved errors after 30 days
- Optimize slow queries identified in logs

### 5. **Changelog Management**
- Follow semantic versioning (MAJOR.MINOR.PATCH)
- Document breaking changes clearly
- Include migration instructions if needed
- Publish updates before deployment

---

## 🐛 Troubleshooting

### Issue: "System tab not visible"

**Solution:**
```
1. Verify you're logged in as admin
2. Check profile.role === 'admin'
3. Clear browser cache
4. Check navigation array in BaseLayout.tsx includes System link
```

### Issue: "Tables don't exist" errors

**Solution:**
```
Migration not applied. Run:
1. Open Supabase SQL Editor
2. Run supabase/migrations/14_create_system_tables.sql
3. Verify success message
4. Refresh application
```

### Issue: "No data showing in charts"

**Solution:**
```
No data yet. System needs:
1. At least one error logged (try creating one)
2. Activity logs (perform some actions)
3. Wait for data to populate
4. Check browser console for errors
```

### Issue: "Backup download fails"

**Solution:**
```
1. Check browser's download settings
2. Verify database connection
3. Check console for errors
4. Ensure tables have data
5. Try smaller backup (select fewer tables)
```

### Issue: "Charts not rendering"

**Solution:**
```
1. Install recharts: npm install recharts
2. Clear .next folder: rm -rf .next
3. Restart dev server: npm run dev
4. Check container has proper dimensions
5. Verify data structure matches chart expectations
```

---

## 📊 Performance Optimization

### Database Indexes

The migration creates these indexes for fast queries:

```sql
-- System logs indexes
idx_system_logs_created_at (created_at DESC)
idx_system_logs_level (level)
idx_system_logs_resolved (resolved) WHERE resolved = FALSE
idx_system_logs_component (component)

-- Activity logs indexes
idx_activity_logs_created_at (created_at DESC)
idx_activity_logs_user_id (user_id)
idx_activity_logs_action (action)
idx_activity_logs_resource_type (resource_type)

-- System metrics indexes
idx_system_metrics_date (metric_date DESC)
idx_system_metrics_unique_date (metric_date) UNIQUE
```

### Query Optimization

```typescript
// Good: Limit queries
.select('*')
.order('created_at', { ascending: false })
.limit(100)  // Only fetch recent logs

// Bad: Fetch everything
.select('*')  // Could return thousands of records
```

---

## 🚀 Future Enhancements

Planned features for v2.1:

- [ ] Email alerts for critical errors
- [ ] Slack/Discord integration for notifications
- [ ] Advanced search with regex support
- [ ] Automated backup scheduling (daily/weekly)
- [ ] Backup to cloud storage (S3/GCS)
- [ ] One-click database restore with rollback
- [ ] Real-time metrics dashboard (WebSocket)
- [ ] Custom dashboards and widgets
- [ ] Export reports as PDF
- [ ] Multi-language changelog support
- [ ] Role-based access control (RBAC) for sub-admins
- [ ] Audit log compliance reports (SOC2, GDPR)

---

## 📞 Support

**Need Help?**
- Check this documentation first
- Review component source code (well-commented)
- Check Supabase logs for database errors
- Verify migration was applied successfully
- Test in incognito mode (cache issues)

**Common Resources:**
- Migration file: `supabase/migrations/14_create_system_tables.sql`
- Components: `src/components/system/`
- Main page: `src/app/(protected)/dashboard/system/page.tsx`
- Helper script: `scripts/apply-system-migration.js`

---

## ✅ Checklist: Post-Installation

After setup, verify:

- [x] Migration applied successfully
- [x] System tab visible in navigation
- [x] Overview dashboard shows metrics
- [x] Analytics charts render correctly
- [x] Error logs tab loads
- [x] Activity logs tab loads
- [x] Can create manual backup
- [x] Backup history displays
- [x] Updates/changelog loads
- [x] Navigation works between tabs
- [x] Admin-only access enforced
- [x] RLS policies working

---

**Version:** 2.0.0  
**Last Updated:** November 7, 2025  
**Author:** AI-Powered Development System  
**License:** MIT

---

🎉 **Congratulations!** Your system administration module is ready for production use!
