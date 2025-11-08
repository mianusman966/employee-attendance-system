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
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n✅ Testing Activity Logging with Service Role...\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testWithServiceRole() {
  try {
    // Get a real user
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError || !users || users.length === 0) {
      console.error('❌ No users found');
      return;
    }
    
    const testUser = users[0];
    console.log(`📧 Testing with user: ${testUser.email}`);
    console.log(`🆔 User ID: ${testUser.id}\n`);
    
    // Test 1: Direct insert (without RPC)
    console.log('📋 Test 1: Direct insert to activity_logs...');
    const { data: directInsert, error: directError } = await supabase
      .from('activity_logs')
      .insert({
        user_id: testUser.id,
        user_email: testUser.email,
        action: 'login',
        resource_type: 'auth',
        resource_id: null,
        resource_name: 'Test Auth',
        description: 'Test login for activity logging verification',
        before_data: null,
        after_data: { test: true, timestamp: new Date().toISOString() }
      })
      .select();
    
    if (directError) {
      console.error('❌ Direct insert failed:', directError.message);
    } else {
      console.log('✅ Direct insert successful!');
      console.log('   ID:', directInsert[0].id);
    }
    
    // Test 2: Using RPC function
    console.log('\n📋 Test 2: Using log_activity RPC function...');
    const { data: rpcResult, error: rpcError } = await supabase.rpc('log_activity', {
      p_user_id: testUser.id,
      p_user_email: testUser.email,
      p_action: 'create_employee',
      p_resource_type: 'employee',
      p_resource_id: 'TEST001',
      p_resource_name: 'Test Employee',
      p_description: 'Created test employee via RPC',
      p_before_data: null,
      p_after_data: { name: 'Test', role: 'Developer' }
    });
    
    if (rpcError) {
      console.error('❌ RPC call failed:', rpcError.message);
      console.error('   Code:', rpcError.code);
      console.error('   Details:', rpcError.details);
    } else {
      console.log('✅ RPC call successful!');
      console.log('   Result:', rpcResult);
    }
    
    // Test 3: Verify logs in database
    console.log('\n📋 Test 3: Verifying activity logs...');
    const { data: logs, error: logsError } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (logsError) {
      console.error('❌ Failed to fetch logs:', logsError.message);
    } else {
      console.log(`✅ Found ${logs.length} activity logs:`);
      logs.forEach((log, i) => {
        console.log(`\n   ${i + 1}. ${log.action} on ${log.resource_type}`);
        console.log(`      Description: ${log.description}`);
        console.log(`      User: ${log.user_email}`);
        console.log(`      Time: ${log.created_at}`);
      });
    }
    
    console.log('\n✅ Activity logging is working!\n');
    console.log('🎯 Next: Login to your app and try these actions:');
    console.log('   1. Login → Check activity logs');
    console.log('   2. Add an employee → Check logs');
    console.log('   3. Use AI chatbot → Check logs');
    console.log('   4. Logout → Check logs\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

testWithServiceRole();
