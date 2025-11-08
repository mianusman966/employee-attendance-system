import { attendanceReminderQueue, lateCheckInQueue, reportGenerationQueue } from '.';
import { CronJob } from 'cron';
import { createClient } from '@supabase/supabase-js';

// Service role Supabase client for background tasks
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Schedule attendance reminders every weekday at 9 AM
new CronJob('0 9 * * 1-5', async () => {
  await attendanceReminderQueue.add('daily-reminder', {}, {
    removeOnComplete: true,
  });
}, null, true);

// Schedule late check-in checks every 15 minutes during work hours
new CronJob('*/15 9-17 * * 1-5', async () => {
  const now = new Date();
  const { data: shifts } = await supabase
    .from('shifts')
    .select('*')
    .lte('start_time', now.toTimeString().slice(0, 8));

  if (shifts) {
    for (const shift of shifts) {
      const { data: employees } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'employee');

      if (employees) {
        for (const employee of employees) {
          // Check if employee has checked in
          const { data: attendance } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('user_id', employee.id)
            .eq('shift_id', shift.id)
            .gte('timestamp', now.toISOString().split('T')[0])
            .limit(1);

          if (!attendance || attendance.length === 0) {
            await lateCheckInQueue.add('late-notification', {
              employeeId: employee.id,
              shiftId: shift.id,
            }, {
              removeOnComplete: true,
            });
          }
        }
      }
    }
  }
}, null, true);

// Schedule daily report generation at 11 PM
new CronJob('0 23 * * *', async () => {
  const today = new Date();
  const startDate = today.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  // Get all admin emails
  const { data: admins } = await supabase
    .from('profiles')
    .select('email')
    .eq('role', 'admin');

  if (admins) {
    for (const admin of admins) {
      await reportGenerationQueue.add('daily-report', {
        startDate,
        endDate,
        adminEmail: admin.email,
      }, {
        removeOnComplete: true,
      });
    }
  }
}, null, true);