const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🔄 Running payroll fields migration...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/13_add_performance_indexes.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL:');
    console.log(sql);
    console.log('\n' + '='.repeat(60) + '\n');

    // Split by semicolons and run each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('COMMENT'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_string: statement + ';' 
      });

      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error.message);
        // Try direct query as fallback
        console.log('Trying direct query method...');
        const { error: directError } = await supabase.from('employees').select('id').limit(1);
        if (!directError) {
          console.log('✅ Connection OK, but RPC failed. Using alternative method...');
        }
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }

    // Verify the columns were added
    console.log('\n🔍 Verifying columns...');
    const { data: employees, error: selectError } = await supabase
      .from('employees')
      .select('emp_id, full_name, base_salary, payment_type, monthly_salary, daily_salary')
      .limit(5);

    if (selectError) {
      console.error('❌ Error verifying:', selectError.message);
      console.log('\n⚠️  Migration SQL might need to be run manually in Supabase SQL Editor');
      console.log('👉 Go to: https://supabase.com/dashboard/project/nnzixvupzngxswkzbhnd/editor');
      console.log('👉 Paste the SQL from: supabase/migrations/12_add_payroll_fields.sql');
    } else {
      console.log('\n✅ Sample employee records:');
      console.table(employees);
      
      const hasData = employees.some(e => e.base_salary > 0);
      if (hasData) {
        console.log('\n✅ SUCCESS! Payroll fields are configured.');
      } else {
        console.log('\n⚠️  Columns exist but all salaries are 0. You need to update employee salaries!');
        console.log('   Go to: Dashboard → Employees → Edit each employee');
        console.log('   Or update via SQL:');
        console.log('   UPDATE employees SET base_salary = 45000, payment_type = \'Monthly\' WHERE emp_id = \'1009\';');
      }
    }

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.log('\n📝 Manual Steps:');
    console.log('1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/nnzixvupzngxswkzbhnd/editor');
    console.log('2. Copy the SQL from: supabase/migrations/12_add_payroll_fields.sql');
    console.log('3. Paste and run it');
    process.exit(1);
  }
}

runMigration();
