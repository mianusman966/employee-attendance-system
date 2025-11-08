#!/usr/bin/env node

/**
 * Log today's session changes to changelog
 * Run: node scripts/log-todays-changes.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');

let supabaseUrl = '';
let supabaseKey = '';

envLines.forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim();
  }
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
    supabaseKey = line.split('=')[1].trim();
  }
});

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parseVersion(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return { major: major || 0, minor: minor || 0, patch: patch || 0 };
}

function incrementVersion(currentVersion, type) {
  const { major, minor, patch } = parseVersion(currentVersion);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      return currentVersion;
  }
}

async function main() {
  console.log('\n📝 Logging today\'s changes to changelog...\n');

  try {
    // Get latest version
    const { data: latestUpdate } = await supabase
      .from('app_updates')
      .select('version')
      .order('release_date', { ascending: false })
      .limit(1)
      .single();

    const currentVersion = latestUpdate?.version || '2.0.0';
    const newVersion = incrementVersion(currentVersion, 'minor');

    console.log(`Current version: ${currentVersion}`);
    console.log(`New version: ${newVersion}\n`);

    // Create changelog entry for today's changes
    const { data, error } = await supabase
      .from('app_updates')
      .insert({
        version: newVersion,
        title: 'Real-time System Monitoring & Activity Tracking',
        description: 'Implemented comprehensive real-time tracking for AI usage, backup operations, and system metrics with automatic changelog generation',
        update_type: 'minor',
        features: [
          'Real-time AI API call tracking with usage metrics',
          'Activity logging for database backup operations',
          'Automatic changelog generation system',
          'Enhanced database size estimation',
          'System metrics auto-tracking'
        ],
        improvements: [
          'Improved SystemOverview with accurate database metrics',
          'Better text contrast in update badges',
          'Real-time metric updates every 30 seconds',
          'Enhanced activity audit trail'
        ],
        bugfixes: [
          'Fixed white text on white background in update status badges',
          'Fixed TypeScript path alias configuration',
          'Resolved module resolution issues'
        ],
        breaking_changes: [],
        release_date: new Date().toISOString(),
        is_published: true
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('✅ Success! Changelog entry created:');
    console.log(`   Version: ${newVersion}`);
    console.log(`   Features: 5`);
    console.log(`   Improvements: 4`);
    console.log(`   Bug fixes: 3`);
    console.log('\n✨ Check the Updates tab in System dashboard to see it!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
