const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('\n🔍 Testing Activity Logging System...\n');
console.log('Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testActivityLogging() {
  try {
    // Test 1: Check if activity_logs table exists
    console.log('📋 Test 1: Checking activity_logs table...');
    const { data: logs, error: logsError } = await supabase
      .from('activity_logs')
      .select('*')
      .limit(5);
    
    if (logsError) {
      console.error('❌ activity_logs table error:', logsError.message);
      return;
    }
    
    console.log('✅ activity_logs table exists');
    console.log(`   Found ${logs.length} existing logs`);
    if (logs.length > 0) {
      console.log('   Latest log:', logs[0]);
    }

    // Test 2: Check if log_activity RPC function exists
    console.log('\n📋 Test 2: Testing log_activity RPC function...');
    
    // First, get a user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('⚠️  No authenticated user. Testing with mock user ID...');
      
      // Try to get any user from profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (!profiles || profiles.length === 0) {
        console.error('❌ No users found in database');
        return;
      }
      
      const testUserId = profiles[0].id;
      console.log('   Using user ID:', testUserId);
      
      // Test the RPC function
      const { data: rpcData, error: rpcError } = await supabase.rpc('log_activity', {
        p_user_id: testUserId,
        p_action: 'login',
        p_resource: 'test',
        p_details: { test: true, timestamp: new Date().toISOString() }
      });
      
      if (rpcError) {
        console.error('❌ log_activity RPC error:', rpcError.message);
        console.error('   Details:', rpcError);
        
        // Check if function exists
        console.log('\n🔍 Checking if function exists in database...');
        const { data: functions, error: funcError } = await supabase
          .from('pg_proc')
          .select('proname')
          .eq('proname', 'log_activity');
        
        if (funcError) {
          console.log('   Cannot query pg_proc:', funcError.message);
        }
        
        return;
      }
      
      console.log('✅ log_activity RPC function works!');
      console.log('   Result:', rpcData);
      
      // Verify the log was created
      console.log('\n📋 Test 3: Verifying log was created...');
      const { data: newLogs, error: verifyError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', testUserId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (verifyError) {
        console.error('❌ Error verifying:', verifyError.message);
        return;
      }
      
      if (newLogs && newLogs.length > 0) {
        console.log('✅ Log was created successfully!');
        console.log('   Latest log:', newLogs[0]);
      } else {
        console.log('⚠️  No log found - RPC might not have inserted');
      }
    } else {
      console.log('✅ Authenticated as:', user.email);
      console.log('   User ID:', user.id);
      
      // Test with real user
      const { data: rpcData, error: rpcError } = await supabase.rpc('log_activity', {
        p_user_id: user.id,
        p_action: 'login',
        p_resource: 'test',
        p_details: { test: true, timestamp: new Date().toISOString() }
      });
      
      if (rpcError) {
        console.error('❌ log_activity RPC error:', rpcError.message);
        return;
      }
      
      console.log('✅ log_activity RPC function works!');
    }

    // Test 4: Check recent activity logs
    console.log('\n📋 Test 4: Recent Activity Logs:');
    const { data: recentLogs, error: recentError } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (recentError) {
      console.error('❌ Error fetching recent logs:', recentError.message);
      return;
    }
    
    console.log(`   Found ${recentLogs.length} recent logs:`);
    recentLogs.forEach((log, i) => {
      console.log(`   ${i + 1}. ${log.action} on ${log.resource} at ${log.created_at}`);
    });

    console.log('\n✅ All tests passed!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

testActivityLogging();
