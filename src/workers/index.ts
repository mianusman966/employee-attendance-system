import { Queue, Worker, QueueScheduler } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import nodemailer from 'nodemailer';

const REDIS_URL = process.env.REDIS_URL || '';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Use service key for background tasks
);

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Queue configurations
const defaultQueueConfig = {
  connection: {
    url: REDIS_URL,
  },
};

// Define queues
export const attendanceReminderQueue = new Queue('attendance-reminder', defaultQueueConfig);
export const lateCheckInQueue = new Queue('late-check-in', defaultQueueConfig);
export const leaveRequestQueue = new Queue('leave-request', defaultQueueConfig);
export const reportGenerationQueue = new Queue('report-generation', defaultQueueConfig);

// Schedulers to handle delayed jobs
new QueueScheduler('attendance-reminder', defaultQueueConfig);
new QueueScheduler('late-check-in', defaultQueueConfig);
new QueueScheduler('leave-request', defaultQueueConfig);
new QueueScheduler('report-generation', defaultQueueConfig);

// Attendance reminder worker
new Worker('attendance-reminder', async (job) => {
  const { data: employees } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('role', 'employee');

  if (!employees) return;

  const today = new Date();
  const currentTime = format(today, 'HH:mm');

  for (const employee of employees) {
    // Check if already checked in
    const { data: attendance } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', employee.id)
      .gte('timestamp', format(today, 'yyyy-MM-dd'))
      .limit(1);

    if (!attendance || attendance.length === 0) {
      // Send reminder email
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: employee.email,
        subject: 'Attendance Reminder',
        text: `Hello ${employee.full_name},\n\nThis is a reminder to check in for today.\n\nBest regards,\nEmpAttend System`,
      });
    }
  }
}, defaultQueueConfig);

// Late check-in notification worker
new Worker('late-check-in', async (job) => {
  const { employeeId, shiftId } = job.data;

  const { data: employee } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', employeeId)
    .single();

  const { data: shift } = await supabase
    .from('shifts')
    .select('name, start_time')
    .eq('id', shiftId)
    .single();

  if (employee && shift) {
    // Send late check-in notification
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: employee.email,
      subject: 'Late Check-in Notification',
      text: `Hello ${employee.full_name},\n\nThis is to notify you that you checked in late for your ${shift.name} shift.\n\nBest regards,\nEmpAttend System`,
    });
  }
}, defaultQueueConfig);

// Leave request notification worker
new Worker('leave-request', async (job) => {
  const { leaveRequestId } = job.data;

  const { data: leaveRequest } = await supabase
    .from('leave_requests')
    .select('*, profiles(email, full_name)')
    .eq('id', leaveRequestId)
    .single();

  if (leaveRequest) {
    // Send leave request status notification
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: leaveRequest.profiles.email,
      subject: 'Leave Request Update',
      text: `Hello ${leaveRequest.profiles.full_name},\n\nYour leave request for ${format(new Date(leaveRequest.start_date), 'MMM dd, yyyy')} to ${format(new Date(leaveRequest.end_date), 'MMM dd, yyyy')} has been ${leaveRequest.status}.\n\nBest regards,\nEmpAttend System`,
    });
  }
}, defaultQueueConfig);

// Report generation worker
new Worker('report-generation', async (job) => {
  const { startDate, endDate, adminEmail } = job.data;

  // Fetch attendance data
  const { data: attendanceData } = await supabase
    .from('attendance_records')
    .select(`
      *,
      profiles(full_name, email, departments(name))
    `)
    .gte('timestamp', startDate)
    .lte('timestamp', endDate);

  if (attendanceData) {
    // Generate CSV report
    const csv = generateCSVReport(attendanceData);

    // Send report via email
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: adminEmail,
      subject: `Attendance Report ${startDate} to ${endDate}`,
      text: 'Please find attached the attendance report.',
      attachments: [
        {
          filename: `attendance_report_${startDate}_${endDate}.csv`,
          content: csv,
        },
      ],
    });
  }
}, defaultQueueConfig);

function generateCSVReport(data: any[]) {
  const headers = ['Date', 'Employee', 'Department', 'Status', 'Time'];
  const rows = data.map((record) => [
    format(new Date(record.timestamp), 'yyyy-MM-dd'),
    record.profiles.full_name,
    record.profiles.departments.name,
    record.status,
    format(new Date(record.timestamp), 'HH:mm:ss'),
  ]);

  return [headers, ...rows].map((row) => row.join(',')).join('\n');
}

// Error handling for all workers
['attendance-reminder', 'late-check-in', 'leave-request', 'report-generation'].forEach(
  (queueName) => {
    const worker = new Worker(queueName, async () => {}, defaultQueueConfig);
    worker.on('error', (error) => {
      console.error(`Error in ${queueName} worker:`, error);
    });
  }
);