#!/usr/bin/env node

/**
 * Generate Changelog Entry
 * 
 * This script helps you quickly create changelog entries
 * Run: node scripts/generate-changelog.js
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Read .env.local file
function loadEnvVariables() {
  const envPath = path.join(__dirname, '..', '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ Error: .env.local file not found');
    console.log('Expected location:', envPath);
    process.exit(1);
  }

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

  return { supabaseUrl, supabaseKey };
}

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
  console.log('\n🎉 Automatic Changelog Generator\n');
  console.log('This will create a new entry in the app_updates table.\n');

  // Load environment variables from .env.local
  const { supabaseUrl, supabaseKey } = loadEnvVariables();

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Supabase credentials not found in .env.local');
    console.log('Make sure .env.local has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get latest version
    const { data: latestUpdate } = await supabase
      .from('app_updates')
      .select('version')
      .order('release_date', { ascending: false })
      .limit(1)
      .single();

    const currentVersion = latestUpdate?.version || '2.0.0';
    console.log(`Current version: ${currentVersion}\n`);

    // Get update details
    const title = await question('Update title: ');
    const description = await question('Description (optional): ');
    
    console.log('\nUpdate type:');
    console.log('  1. Patch (bug fixes) - increments X.X.1');
    console.log('  2. Minor (new features) - increments X.1.0');
    console.log('  3. Major (breaking changes) - increments 1.0.0');
    const typeChoice = await question('Choose (1/2/3): ');
    
    const typeMap = { '1': 'patch', '2': 'minor', '3': 'major' };
    const updateType = typeMap[typeChoice] || 'patch';
    const newVersion = incrementVersion(currentVersion, updateType);
    
    console.log(`\nNew version will be: ${newVersion}\n`);

    // Get features
    const features = [];
    console.log('Enter features (one per line, empty line to finish):');
    while (true) {
      const feature = await question('  - ');
      if (!feature.trim()) break;
      features.push(feature.trim());
    }

    // Get improvements
    const improvements = [];
    console.log('\nEnter improvements (one per line, empty line to finish):');
    while (true) {
      const improvement = await question('  - ');
      if (!improvement.trim()) break;
      improvements.push(improvement.trim());
    }

    // Get bug fixes
    const bugfixes = [];
    console.log('\nEnter bug fixes (one per line, empty line to finish):');
    while (true) {
      const bugfix = await question('  - ');
      if (!bugfix.trim()) break;
      bugfixes.push(bugfix.trim());
    }

    // Get breaking changes (for major updates)
    const breakingChanges = [];
    if (updateType === 'major') {
      console.log('\nEnter breaking changes (one per line, empty line to finish):');
      while (true) {
        const change = await question('  - ');
        if (!change.trim()) break;
        breakingChanges.push(change.trim());
      }
    }

    // Confirm
    console.log('\n📋 Summary:');
    console.log(`Version: ${newVersion} (${updateType})`);
    console.log(`Title: ${title}`);
    if (description) console.log(`Description: ${description}`);
    if (features.length) console.log(`Features: ${features.length}`);
    if (improvements.length) console.log(`Improvements: ${improvements.length}`);
    if (bugfixes.length) console.log(`Bug fixes: ${bugfixes.length}`);
    if (breakingChanges.length) console.log(`Breaking changes: ${breakingChanges.length}`);
    
    const confirm = await question('\nCreate this changelog entry? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('❌ Cancelled');
      rl.close();
      return;
    }

    // Create the entry
    const { data, error } = await supabase
      .from('app_updates')
      .insert({
        version: newVersion,
        title: title,
        description: description || '',
        update_type: updateType,
        features: features,
        improvements: improvements,
        bugfixes: bugfixes,
        breaking_changes: breakingChanges,
        release_date: new Date().toISOString(),
        is_published: true
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('\n✅ Changelog entry created successfully!');
    console.log(`Version ${newVersion} is now live in the Updates section.`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

main();
