#!/usr/bin/env node

/**
 * System Tables Migration Script
 * 
 * This script helps you apply the system administration tables migration
 * to your Supabase database.
 * 
 * Usage:
 *   node scripts/apply-system-migration.js
 * 
 * Or manually:
 *   1. Go to Supabase Dashboard: https://supabase.com/dashboard
 *   2. Select your project
 *   3. Go to SQL Editor
 *   4. Copy and paste the contents of: supabase/migrations/14_create_system_tables.sql
 *   5. Click "Run"
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(70));
console.log('📋 SYSTEM TABLES MIGRATION GUIDE');
console.log('='.repeat(70));
console.log('');

const migrationFile = path.join(__dirname, '..', 'supabase', 'migrations', '14_create_system_tables.sql');

if (!fs.existsSync(migrationFile)) {
  console.error('❌ Error: Migration file not found!');
  console.error(`   Expected location: ${migrationFile}`);
  process.exit(1);
}

const migrationContent = fs.readFileSync(migrationFile, 'utf8');
const lineCount = migrationContent.split('\n').length;

console.log('✅ Migration file found!');
console.log(`   Location: ${migrationFile}`);
console.log(`   Size: ${(migrationContent.length / 1024).toFixed(2)} KB`);
console.log(`   Lines: ${lineCount}`);
console.log('');

console.log('📊 What this migration creates:');
console.log('');
console.log('   Tables:');
console.log('   • system_logs        - Error tracking and system events');
console.log('   • activity_logs      - User action audit trail');
console.log('   • app_updates        - Version changelog');
console.log('   • system_metrics     - Performance analytics');
console.log('   • backup_history     - Database backup records');
console.log('');
console.log('   Security:');
console.log('   • Row Level Security (RLS) enabled on all tables');
console.log('   • Admin-only access policies');
console.log('   • System can log errors automatically');
console.log('');
console.log('   Helper Functions:');
console.log('   • log_activity()        - Log user actions');
console.log('   • log_system_error()    - Log errors');
console.log('   • get_today_metrics()   - Get daily stats');
console.log('');

console.log('🚀 HOW TO APPLY THIS MIGRATION:');
console.log('');
console.log('   Option 1: Via Supabase Dashboard (Recommended)');
console.log('   ------------------------------------------------');
console.log('   1. Go to: https://supabase.com/dashboard');
console.log('   2. Select your project');
console.log('   3. Click "SQL Editor" in the left sidebar');
console.log('   4. Click "New query"');
console.log('   5. Copy the migration file content (see below)');
console.log('   6. Paste it into the SQL Editor');
console.log('   7. Click "Run" button');
console.log('   8. Wait for success message');
console.log('');

console.log('   Option 2: Via Supabase CLI');
console.log('   ---------------------------');
console.log('   $ supabase migration up');
console.log('');

console.log('📄 MIGRATION FILE PATH:');
console.log(`   ${migrationFile}`);
console.log('');

console.log('⚠️  IMPORTANT NOTES:');
console.log('   • This migration is safe to run multiple times (uses IF NOT EXISTS)');
console.log('   • No existing data will be affected');
console.log('   • Takes ~5-10 seconds to complete');
console.log('   • You must be connected to the internet');
console.log('');

console.log('✨ AFTER APPLYING:');
console.log('   1. Refresh your application');
console.log('   2. Go to Dashboard → System');
console.log('   3. Explore the new admin features:');
console.log('      • System Overview (resource monitoring)');
console.log('      • Analytics (charts and trends)');
console.log('      • Logs (error tracking)');
console.log('      • Backups (database backup/restore)');
console.log('      • Updates (changelog)');
console.log('');

console.log('='.repeat(70));
console.log('');

console.log('🔗 Quick Links:');
console.log('');
console.log('   Supabase Dashboard:');
console.log('   https://supabase.com/dashboard');
console.log('');
console.log('   Documentation:');
console.log('   • Error Logging: See src/components/system/SystemLogs.tsx');
console.log('   • Analytics: See src/components/system/SystemAnalytics.tsx');
console.log('   • Backups: See src/components/system/DatabaseBackup.tsx');
console.log('');

console.log('💡 Need help? Check the README or contact support.');
console.log('');
console.log('='.repeat(70));

// Optionally, copy the migration content to clipboard (requires 'clipboardy' package)
// For now, just show instructions
console.log('');
console.log('Ready to apply? Go to Supabase SQL Editor and run the migration! 🚀');
console.log('');
