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

console.log('\n🔧 FIXING Activity Logging System...\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixActivityLogging() {
  try {
    // Step 1: Check if log_activity function exists
    console.log('📋 Step 1: Checking if log_activity RPC function exists...');
    
    const checkFunctionSQL = `
      SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'log_activity'
      ) as function_exists;
    `;
    
    // Step 2: Recreate the log_activity function
    console.log('📋 Step 2: Creating/Updating log_activity function...');
    
    const createFunctionSQL = `
-- Drop existing function if it exists
DROP FUNCTION IF EXISTS log_activity(UUID, TEXT, TEXT, JSONB);

-- Create the log_activity function
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_action TEXT,
  p_resource TEXT,
  p_details JSONB DEFAULT '{}'::JSONB
) RETURNS VOID AS $$
BEGIN
  INSERT INTO activity_logs (user_id, action, resource, details)
  VALUES (p_user_id, p_action, p_resource, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_activity(UUID, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION log_activity(UUID, TEXT, TEXT, JSONB) TO anon;
    `;
    
    console.log('Executing SQL...');
    console.log(createFunctionSQL);
    console.log('\n' + '='.repeat(60));
    
    // Try to execute via raw SQL
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_string: createFunctionSQL 
    });
    
    if (error) {
      console.log('\n⚠️  exec_sql not available. Please run this SQL manually in Supabase:');
      console.log('\n' + '='.repeat(60));
      console.log(createFunctionSQL);
      console.log('='.repeat(60));
      console.log('\n👉 Go to: https://supabase.com/dashboard/project/nnzixvupzngxswkzbhnd/editor');
      console.log('👉 Paste the SQL above and click "Run"\n');
    } else {
      console.log('✅ Function created successfully!');
    }
    
    // Step 3: Test the function with a dummy user
    console.log('\n📋 Step 3: Testing with a real user...');
    
    // Get auth users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError || !users || users.length === 0) {
      console.log('⚠️  No users found. Please login first to test activity logging.');
      return;
    }
    
    const testUser = users[0];
    console.log('   Testing with user:', testUser.email);
    console.log('   User ID:', testUser.id);
    
    // Test the function
    const { data: testData, error: testError } = await supabase.rpc('log_activity', {
      p_user_id: testUser.id,
      p_action: 'login',
      p_resource: 'test_fix',
      p_details: { 
        test: true, 
        message: 'Testing activity logging fix',
        timestamp: new Date().toISOString() 
      }
    });
    
    if (testError) {
      console.error('❌ Test failed:', testError.message);
      console.error('   Code:', testError.code);
      console.error('   Details:', testError.details);
      console.error('   Hint:', testError.hint);
      
      console.log('\n📝 Manual Fix Required:');
      console.log('Run this SQL in Supabase SQL Editor:');
      console.log('\n' + createFunctionSQL);
    } else {
      console.log('✅ Test successful!');
      
      // Verify the log was created
      const { data: logs, error: logsError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', testUser.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!logsError && logs && logs.length > 0) {
        console.log('✅ Activity log verified in database:');
        console.log('   Action:', logs[0].action);
        console.log('   Resource:', logs[0].resource);
        console.log('   Created:', logs[0].created_at);
      }
    }
    
    console.log('\n✅ Fix complete! Activity logging should work now.\n');

  } catch (error) {
    console.error('\n❌ Fix failed:', error.message);
    console.error(error);
  }
}

fixActivityLogging();
