'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { format } from 'date-fns';
import Image from 'next/image';
import { logActivity } from '../../../lib/activity-logger';
import { getPakistanDateString, getPakistanDateTime, formatPakistanDateTime, getPakistanDayOfWeek, getYesterdayPakistanDateString, getYesterdayPakistanDayOfWeek } from '../../../lib/pakistan-time';

interface AttendanceRecord {
  aid: string;
  emp_id: string;
  emp_name: string;
  department: string;
  job_title: string;
  daily_bonus: number;
  attendance_date: string;
  check_in_time: string;
  check_out_time: string | null;
  attendance_status: string;
  working_hours: string | null;
  start_time?: string;
  end_time?: string;
}

interface AttendanceStats {
  totalIn: number;
  totalOut: number;
  totalActive: number;
  todaysAttendance: number;
  todaysShort: number;
  totalDailyBonus: number;
  totalWeeklySalary?: number; // For Thursdays
  isThursday: boolean;
}

interface EmployeeInfo {
  id: string;
  emp_id: string;
  full_name: string;
  image_url: string | null;
  department_name: string;
  job_title: string;
}

interface TimeDisplay {
  checkInTime: string | null;
  checkOutTime: string | null;
  workingHours: string;
}

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<'attendance' | 'view'>('attendance');
  const [checkInId, setCheckInId] = useState('');
  const [checkOutId, setCheckOutId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Employee info for display
  const [checkInEmployee, setCheckInEmployee] = useState<EmployeeInfo | null>(null);
  const [checkOutEmployee, setCheckOutEmployee] = useState<EmployeeInfo | null>(null);
  
  // Time display for check-in/out
  const [checkInTimeDisplay, setCheckInTimeDisplay] = useState<TimeDisplay | null>(null);
  const [checkOutTimeDisplay, setCheckOutTimeDisplay] = useState<TimeDisplay | null>(null);
  
  // Admin features
  const [selectedDate, setSelectedDate] = useState<string>(getPakistanDateString());
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  
  // Stats
  const [stats, setStats] = useState<AttendanceStats>({
    totalIn: 0,
    totalOut: 0,
    totalActive: 0,
    todaysAttendance: 0,
    todaysShort: 0,
    totalDailyBonus: 0,
    totalWeeklySalary: 0,
    isThursday: false,
  });

  // Today's attendance records
  const [todaysRecords, setTodaysRecords] = useState<AttendanceRecord[]>([]);
  const [fridayNotification, setFridayNotification] = useState<string | null>(null);
  const [currentDateTime, setCurrentDateTime] = useState<string>(formatPakistanDateTime());

  // Update Pakistan time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(formatPakistanDateTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    checkUserRole();
    fetchStats();
    fetchTodaysAttendance();
    checkAndInsertFridayRecords(); // Check for auto-Friday marking on load

    // Refresh every 30 seconds - but only stats, not the view tab
    const interval = setInterval(() => {
      fetchStats();
      // Only refresh today's attendance if we're on the attendance tab
      if (activeTab === 'attendance') {
        fetchTodaysAttendance();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'view') {
      fetchAttendanceByDate(selectedDate);
    }
  }, [selectedDate, activeTab]);

  // Auto-Friday marking: Check if today is Saturday and insert Friday records
  async function checkAndInsertFridayRecords() {
    try {
      // Get today's day of week in Pakistan timezone
      const todayDayOfWeek = getPakistanDayOfWeek(); // 0 = Sunday, 6 = Saturday
      const todayDateStr = getPakistanDateString();
      
      console.log(`[Friday Auto-Submit] Current day (PKT): ${todayDateStr} (Day ${todayDayOfWeek})`);
      
      // Only run on Saturday (6)
      if (todayDayOfWeek !== 6) {
        console.log(`[Friday Auto-Submit] Not Saturday (day=${todayDayOfWeek}), skipping`);
        return;
      }

      // Get YESTERDAY's date and day of week in Pakistan timezone
      const yesterdayDateStr = getYesterdayPakistanDateString();
      const yesterdayDayOfWeek = getYesterdayPakistanDayOfWeek();
      
      console.log(`[Friday Auto-Submit] Yesterday (PKT): ${yesterdayDateStr} (Day ${yesterdayDayOfWeek})`);
      
      // Verify yesterday was actually Friday (5)
      if (yesterdayDayOfWeek !== 5) {
        console.log('[Friday Auto-Submit] Yesterday was not Friday, skipping auto-Friday logic');
        return;
      }
      
      console.log(`[Friday Auto-Submit] ✓ Today is Saturday (PKT). Processing Friday records for: ${yesterdayDateStr}`);

      // Check if we've already processed this Friday (use localStorage to track)
      const processedKey = `friday_processed_${yesterdayDateStr}`;
      const alreadyProcessed = localStorage.getItem(processedKey);
      console.log(`[Friday Auto-Submit] Checking localStorage key: ${processedKey}, value: ${alreadyProcessed}`);
      
      if (alreadyProcessed) {
        console.log(`[Friday Auto-Submit] Friday ${yesterdayDateStr} already processed, skipping`);
        return; // Already processed
      }

      // Fetch all active employees
      console.log(`[Friday Auto-Submit] Fetching active employees...`);
      const { data: activeEmployees, error: empError } = await supabase
        .from('employees')
        .select('id, emp_id, full_name, department_id, job_title')
        .eq('emp_status', 'Active');

      if (empError || !activeEmployees || activeEmployees.length === 0) {
        console.error('[Friday Auto-Submit] Error fetching active employees:', empError);
        await logActivity(
          'friday_auto_submit_failed',
          'Friday Auto-Submit Failed',
          `Failed to fetch active employees for ${yesterdayDateStr}. Error: ${empError?.message || 'No active employees found'}`,
          { 
            resourceId: yesterdayDateStr,
            resourceName: 'Friday Attendance',
            afterData: { error: empError?.message || 'No active employees found' }
          }
        );
        return;
      }
      
      console.log(`[Friday Auto-Submit] Found ${activeEmployees.length} active employees`);

      // Get departments for mapping
      const { data: departments } = await supabase
        .from('departments')
        .select('id, name');

      // Check which employees already have Friday records
      console.log(`[Friday Auto-Submit] Checking existing Friday records for ${yesterdayDateStr}...`);
      const { data: existingRecords } = await supabase
        .from('attendance_records')
        .select('emp_id')
        .eq('attendance_date', yesterdayDateStr);

      const existingEmpIds = new Set(existingRecords?.map(r => r.emp_id) || []);
      console.log(`[Friday Auto-Submit] Found ${existingEmpIds.size} existing Friday records`);

      // Prepare records for employees who don't have Friday attendance
      const recordsToInsert = activeEmployees
        .filter(emp => !existingEmpIds.has(emp.emp_id))
        .map(emp => {
          const dept = departments?.find(d => d.id === emp.department_id);
          return {
            emp_id: emp.emp_id,
            emp_name: emp.full_name,
            department: dept?.name || 'N/A',
            job_title: emp.job_title || 'N/A',
            attendance_date: yesterdayDateStr,
            attendance_status: 'Friday',
            work_status: 'Out',
            check_in_time: null,
            check_out_time: null,
            working_hours: '00:00',
            daily_bonus: 0,
          };
        });

      if (recordsToInsert.length > 0) {
        console.log(`[Friday Auto-Submit] Inserting ${recordsToInsert.length} Friday records for ${yesterdayDateStr}`);
        
        // Insert Friday records
        const { error: insertError } = await supabase
          .from('attendance_records')
          .insert(recordsToInsert);

        if (insertError) {
          console.error('[Friday Auto-Submit] Error inserting Friday records:', insertError);
          
          // Log failure to activity log
          await logActivity(
            'friday_auto_submit_failed',
            'Friday Auto-Submit Failed',
            `Failed to create Friday records for ${yesterdayDateStr}. Error: ${insertError.message}`,
            { 
              resourceId: yesterdayDateStr,
              resourceName: 'Friday Attendance',
              afterData: { error: insertError.message, records_count: recordsToInsert.length }
            }
          );
          return;
        }

        console.log(`[Friday Auto-Submit] ✓ Successfully inserted ${recordsToInsert.length} Friday records`);
        
        // Log success to activity log
        await logActivity(
          'friday_auto_submit',
          'Friday Auto-Submit Completed',
          `Automatically created Friday attendance records for ${recordsToInsert.length} employees on ${yesterdayDateStr}`,
          { 
            resourceId: yesterdayDateStr,
            resourceName: 'Friday Attendance',
            afterData: { 
              records_created: recordsToInsert.length,
              employee_ids: recordsToInsert.map(r => r.emp_id).join(', ')
            }
          }
        );

        // Mark as processed in localStorage
        localStorage.setItem(processedKey, 'true');
        console.log(`[Friday Auto-Submit] Marked ${processedKey} as processed in localStorage`);

        // Show notification
        setFridayNotification(`✓ Friday attendance updated for ${recordsToInsert.length} employees`);
        setTimeout(() => setFridayNotification(null), 5000);

        // Refresh data
        fetchStats();
        if (activeTab === 'attendance') {
          fetchTodaysAttendance();
        } else if (activeTab === 'view') {
          fetchAttendanceByDate(selectedDate);
        }
      } else {
        console.log(`[Friday Auto-Submit] No new records to insert (all employees already have Friday records)`);
      }
    } catch (error) {
      console.error('Error in auto-Friday marking:', error);
    }
  }

  async function checkUserRole() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        setIsAdmin(profile?.role === 'admin');
      }
    } catch (error) {
      console.error('Error checking role:', error);
    }
  }

  async function fetchAttendanceByDate(date: string) {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          employees!inner(start_time, end_time)
        `)
        .eq('attendance_date', date)
        .order('check_in_time', { ascending: false });

      if (error) throw error;
      
      // Flatten the employee data into the record
      const flattenedData = data?.map(record => ({
        ...record,
        start_time: record.employees?.start_time,
        end_time: record.employees?.end_time,
      })) || [];
      
      setTodaysRecords(flattenedData);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  }

  async function fetchStats() {
    try {
      const today = getPakistanDateString();
      const dayOfWeek = getPakistanDateTime().getDay(); // 0 = Sunday, 4 = Thursday
      const isThursday = dayOfWeek === 4;

      // Get total active employees
      const { count: totalActive } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('emp_status', 'Active');

      // Get today's attendance records
      const { data: todaysAttendance } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('attendance_date', today);

      // Count based on work_status (In/Out) not attendance_status
      const totalIn = todaysAttendance?.filter(r => r.work_status === 'In').length || 0;
      const totalOut = todaysAttendance?.filter(r => r.work_status === 'Out').length || 0;
      const todaysCount = todaysAttendance?.length || 0;
      
      // Calculate total daily bonus for those who checked in today
      const totalBonus = todaysAttendance?.reduce((sum, record) => sum + (record.daily_bonus || 0), 0) || 0;

      // Calculate total weekly salary if Thursday
      let totalWeeklySalary = 0;
      if (isThursday && todaysAttendance && todaysAttendance.length > 0) {
        const employeeIds = todaysAttendance.map(r => r.employee_id);
        const { data: employees } = await supabase
          .from('employees')
          .select('weekly_salary')
          .in('id', employeeIds);
        
        totalWeeklySalary = employees?.reduce((sum, emp) => sum + (emp.weekly_salary || 0), 0) || 0;
      }

      setStats({
        totalIn,
        totalOut,
        totalActive: totalActive || 0,
        todaysAttendance: todaysCount,
        todaysShort: (totalActive || 0) - todaysCount,
        totalDailyBonus: totalBonus,
        totalWeeklySalary,
        isThursday,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }

  async function fetchTodaysAttendance() {
    try {
      const today = getPakistanDateString();

      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          employees!inner(start_time, end_time)
        `)
        .eq('attendance_date', today)
        .order('check_in_time', { ascending: false });

      if (error) throw error;
      
      // Flatten the employee data into the record
      const flattenedData = data?.map(record => ({
        ...record,
        start_time: record.employees?.start_time,
        end_time: record.employees?.end_time,
      })) || [];
      
      setTodaysRecords(flattenedData);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  }

  // Auto-process when 4 digits entered
  async function handleCheckInIdChange(value: string) {
    setCheckInId(value);
    setCheckInEmployee(null);
    
    if (value.length === 4) {
      await processCheckIn(value);
    }
  }

  async function handleCheckOutIdChange(value: string) {
    setCheckOutId(value);
    setCheckOutEmployee(null);
    
    if (value.length === 4) {
      await processCheckOut(value);
    }
  }

  async function processCheckIn(empId: string) {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const today = getPakistanDateString();

      // Parallel fetch: employee and check if already checked in
      const [employeeResult, existingAttendanceResult, departmentsResult] = await Promise.all([
        supabase
          .from('employees')
          .select('id, emp_id, full_name, image_url, department_id, job_title, emp_status, daily_salary, monthly_salary, weekly_salary, start_time, end_time')
          .eq('emp_id', empId)
          .single(),
        supabase
          .from('attendance_records')
          .select('aid, check_in_time')
          .eq('emp_id', empId)
          .eq('attendance_date', today)
          .maybeSingle(),
        supabase
          .from('departments')
          .select('id, name')
      ]);

      const employee = employeeResult.data;
      const existingAttendance = existingAttendanceResult.data;
      const departments = departmentsResult.data;

      if (employeeResult.error || !employee) {
        setError(`Employee with ID ${empId} not found`);
        setLoading(false);
        return;
      }

      // Get department name from prefetched departments
      let departmentName = 'N/A';
      if (employee.department_id && departments) {
        const dept = departments.find(d => d.id === employee.department_id);
        if (dept) departmentName = dept.name;
      }

      // Set employee info for display
      setCheckInEmployee({
        id: employee.id,
        emp_id: employee.emp_id,
        full_name: employee.full_name,
        image_url: employee.image_url,
        department_name: departmentName,
        job_title: employee.job_title || 'N/A',
      });

      // Check if employee is active
      if (employee.emp_status !== 'Active') {
        setError(`Employee ${employee.full_name} (ID: ${empId}) is ${employee.emp_status}. Only active employees can mark attendance.`);
        
        // Reset form after 1.5 seconds
        setTimeout(() => {
          setCheckInId('');
          setCheckInEmployee(null);
          setCheckInTimeDisplay(null);
          setError(null);
        }, 1500);
        
        setLoading(false);
        return;
      }

      // Check if already checked in today
      if (existingAttendance) {
        setError(`Employee ${employee.full_name} (ID: ${empId}) has already checked in today at ${formatTime(existingAttendance.check_in_time)}`);
        
        // Reset form after 1.5 seconds
        setTimeout(() => {
          setCheckInId('');
          setCheckInEmployee(null);
          setCheckInTimeDisplay(null);
          setError(null);
        }, 1500);
        
        setLoading(false);
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      const checkInTime = getPakistanDateTime().toISOString();

      // Create attendance record with new status structure
      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert({
          employee_id: employee.id,
          emp_id: employee.emp_id,
          emp_name: employee.full_name,
          department: departmentName,
          job_title: employee.job_title || 'N/A',
          daily_bonus: Number(employee.daily_salary) || 0, // Use daily_salary as daily bonus
          attendance_date: today,
          check_in_time: checkInTime,
          attendance_status: 'Present',
          work_status: 'In',
          created_by: user?.id,
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      // Set time display
      setCheckInTimeDisplay({
        checkInTime: checkInTime,
        checkOutTime: null,
        workingHours: '00:00',
      });

      setSuccess(`✓ Check-In successful for ${employee.full_name} (ID: ${empId}) at ${formatTime(checkInTime)}`);
      
      // Clear after 3 seconds
      setTimeout(() => {
        setCheckInId('');
        setCheckInEmployee(null);
        setCheckInTimeDisplay(null);
        setSuccess(null);
      }, 3000);
      
      // Refresh data
      await fetchStats();
      await fetchTodaysAttendance();
    } catch (err: any) {
      setError(err.message || 'Failed to check in');
    } finally {
      setLoading(false);
    }
  }

  async function processCheckOut(empId: string) {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const today = getPakistanDateString();

      // Parallel fetch: employee, attendance record, and departments
      const [employeeResult, departmentsResult] = await Promise.all([
        supabase
          .from('employees')
          .select('id, emp_id, full_name, image_url, department_id, job_title, emp_status, daily_salary, start_time, end_time')
          .eq('emp_id', empId)
          .single(),
        supabase
          .from('departments')
          .select('id, name')
      ]);

      const { data: employee, error: fetchError } = employeeResult;
      const { data: departments } = departmentsResult;

      if (fetchError || !employee) {
        setError(`Employee with ID ${empId} not found`);
        setLoading(false);
        return;
      }

      // Find department name from prefetched list
      let departmentName = 'N/A';
      if (employee.department_id && departments) {
        const dept = departments.find(d => d.id === employee.department_id);
        if (dept) departmentName = dept.name;
      }

      // Set employee info for display
      setCheckOutEmployee({
        id: employee.id,
        emp_id: employee.emp_id,
        full_name: employee.full_name,
        image_url: employee.image_url,
        department_name: departmentName,
        job_title: employee.job_title || 'N/A',
      });

      // Check if employee is active
      if (employee.emp_status !== 'Active') {
        setError(`Employee ${employee.full_name} (ID: ${empId}) is ${employee.emp_status}. Cannot check out.`);
        
        // Reset form after 1.5 seconds
        setTimeout(() => {
          setCheckOutId('');
          setCheckOutEmployee(null);
          setCheckOutTimeDisplay(null);
          setError(null);
        }, 1500);
        
        setLoading(false);
        return;
      }

      // Fetch attendance record
      const { data: attendance } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('attendance_date', today)
        .maybeSingle();

      if (!attendance) {
        setError(`Employee ${employee.full_name} (ID: ${empId}) has not checked in today`);
        
        // Reset form after 1.5 seconds
        setTimeout(() => {
          setCheckOutId('');
          setCheckOutEmployee(null);
          setCheckOutTimeDisplay(null);
          setError(null);
        }, 1500);
        
        setLoading(false);
        return;
      }

      // Check if already checked out (check work_status instead of attendance_status)
      if (attendance.work_status === 'Out') {
        setError(`Employee ${employee.full_name} (ID: ${empId}) has already checked out today at ${formatTime(attendance.check_out_time)}`);
        
        // Reset form after 1.5 seconds
        setTimeout(() => {
          setCheckOutId('');
          setCheckOutEmployee(null);
          setCheckOutTimeDisplay(null);
          setError(null);
        }, 1500);
        
        setLoading(false);
        return;
      }

      const checkOutTime = getPakistanDateTime().toISOString();
      const workingHours = calculateWorkingHours(attendance.check_in_time, checkOutTime);

      // Update attendance record - keep attendance_status as Present, update work_status to Out
      const { error: updateError } = await supabase
        .from('attendance_records')
        .update({
          check_out_time: checkOutTime,
          work_status: 'Out',
          working_hours: workingHours,
        })
        .eq('aid', attendance.aid);

      if (updateError) throw updateError;

      // Set time display
      setCheckOutTimeDisplay({
        checkInTime: attendance.check_in_time,
        checkOutTime: checkOutTime,
        workingHours: workingHours,
      });

      setSuccess(`✓ Check-Out successful for ${employee.full_name} (ID: ${empId}) at ${formatTime(checkOutTime)}`);
      
      // Clear after 3 seconds
      setTimeout(() => {
        setCheckOutId('');
        setCheckOutEmployee(null);
        setCheckOutTimeDisplay(null);
        setSuccess(null);
      }, 3000);
      
      // Refresh data
      await fetchStats();
      await fetchTodaysAttendance();
    } catch (err: any) {
      setError(err.message || 'Failed to check out');
    } finally {
      setLoading(false);
    }
  }

  function formatTime(timestamp: string | null): string {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return format(date, 'hh:mm:ss a'); // 12-hour format
  }

  function calculateWorkingHours(checkIn: string, checkOut: string): string {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffMs = end.getTime() - start.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  function formatTimeForDisplay(timestamp: string | null): string {
    if (!timestamp) return '00:00';
    const date = new Date(timestamp);
    return format(date, 'hh:mm a'); // Shorter 12-hour format for display
  }

  function formatDatetimeLocalValue(timestamp: string | null): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // Helper function to determine check-in status color for attendance table
  function getAttendanceRowColor(record: AttendanceRecord): string {
    // If absent, leave, holiday, or Friday - no color
    if (record.attendance_status === 'Absent' || record.attendance_status === 'Leave' || 
        record.attendance_status === 'Holiday' || record.attendance_status === 'Friday') {
      return 'hover:bg-gray-50';
    }

    if (!record.check_in_time) {
      return 'hover:bg-gray-50'; // No check-in, no color
    }

    const checkInTime = new Date(record.check_in_time);
    const checkInHour = checkInTime.getHours();
    const checkInMinute = checkInTime.getMinutes();
    const checkInTotalMinutes = checkInHour * 60 + checkInMinute;

    // Get employee's start time from the record (fetched from employees table)
    const startTime = record.start_time || '08:00:00';
    const [startHour, startMin] = startTime.split(':').map(Number);
    const startTotalMinutes = startHour * 60 + startMin;

    const gracePeriodMinutes = 30;

    if (checkInTotalMinutes < startTotalMinutes) {
      return 'bg-blue-50 hover:bg-blue-100'; // Early - light blue
    } else if (checkInTotalMinutes > startTotalMinutes + gracePeriodMinutes) {
      return 'bg-red-50 hover:bg-red-100'; // Late - light red
    } else {
      return 'bg-green-50 hover:bg-green-100'; // On-time - light green
    }
  }

  // Helper function to get check-in status text
  function getAttendanceStatusText(record: AttendanceRecord): string {
    // If absent, leave, holiday, or Friday - return status
    if (record.attendance_status === 'Absent') return 'Absent';
    if (record.attendance_status === 'Leave') return 'Leave';
    if (record.attendance_status === 'Holiday') return 'Holiday';
    if (record.attendance_status === 'Friday') return 'Friday';

    if (!record.check_in_time) {
      return '-';
    }

    const checkInTime = new Date(record.check_in_time);
    const checkInHour = checkInTime.getHours();
    const checkInMinute = checkInTime.getMinutes();
    const checkInTotalMinutes = checkInHour * 60 + checkInMinute;

    const startTime = record.start_time || '08:00:00';
    const [startHour, startMin] = startTime.split(':').map(Number);
    const startTotalMinutes = startHour * 60 + startMin;

    const gracePeriodMinutes = 30;

    if (checkInTotalMinutes < startTotalMinutes) {
      return 'Early';
    } else if (checkInTotalMinutes > startTotalMinutes + gracePeriodMinutes) {
      return 'Late';
    } else {
      return 'On-time';
    }
  }

  // Admin functions
  async function handleEditRecord(record: AttendanceRecord) {
    setEditingRecord(record);
  }

  async function handleUpdateRecord() {
    if (!editingRecord) return;

    try {
      const workingHours = editingRecord.check_out_time 
        ? calculateWorkingHours(editingRecord.check_in_time, editingRecord.check_out_time)
        : null;

      // Update record with new status structure
      const { error } = await supabase
        .from('attendance_records')
        .update({
          check_in_time: editingRecord.check_in_time,
          check_out_time: editingRecord.check_out_time,
          working_hours: workingHours,
          work_status: editingRecord.check_out_time ? 'Out' : 'In',
          attendance_status: editingRecord.attendance_status,
        })
        .eq('aid', editingRecord.aid);

      if (error) throw error;

      setSuccess('✓ Attendance record updated successfully');
      setEditingRecord(null);
      fetchAttendanceByDate(selectedDate);
      fetchStats();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Failed to update record: ' + err.message);
      setTimeout(() => setError(null), 3000);
    }
  }

  async function handleDeleteRecord(recordId: string) {
    if (!confirm('Are you sure you want to delete this attendance record?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('aid', recordId);

      if (error) throw error;

      setSuccess('✓ Attendance record deleted successfully');
      fetchAttendanceByDate(selectedDate);
      fetchStats();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Failed to delete record: ' + err.message);
      setTimeout(() => setError(null), 3000);
    }
  }

  function formatDate(dateStr: string): string {
    return format(new Date(dateStr), 'MMM dd, yyyy');
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Attendance Management</h1>
        <div className="text-sm text-gray-600">
          <div className="font-medium">{currentDateTime}</div>
          <div className="text-xs text-gray-500 text-right">Pakistan Time (PKT)</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`${
              activeTab === 'attendance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Attendance
          </button>
          <button
            onClick={() => setActiveTab('view')}
            className={`${
              activeTab === 'view'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            View Attendance
          </button>
          <button
            onClick={() => window.location.href = '/attendance/absent'}
            className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          >
            Absent Management
          </button>
          {isAdmin && (
            <button
              onClick={() => window.location.href = '/attendance/payroll'}
              className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
            >
              Payroll Manual
            </button>
          )}
        </nav>
      </div>

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Side - Stats */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Today's Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total In:</span>
                  <span className="text-lg font-bold text-green-600">{stats.totalIn}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Out:</span>
                  <span className="text-lg font-bold text-red-600">{stats.totalOut}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm text-gray-600">Total Active:</span>
                  <span className="text-lg font-bold text-blue-600">{stats.totalActive}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Today's Attend:</span>
                  <span className="text-lg font-bold text-purple-600">{stats.todaysAttendance}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Today's Short:</span>
                  <span className="text-lg font-bold text-orange-600">{stats.todaysShort}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm text-gray-600">Total Daily Bonus:</span>
                  <span className="text-lg font-bold text-indigo-600">Rs. {stats.totalDailyBonus.toFixed(2)}</span>
                </div>
                {stats.isThursday && (
                  <div className="flex justify-between items-center bg-yellow-50 border border-yellow-300 rounded p-2">
                    <span className="text-sm font-semibold text-yellow-900">💰 Weekly Salary:</span>
                    <span className="text-lg font-bold text-yellow-700">Rs. {(stats.totalWeeklySalary || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Check In/Out Forms */}
          <div className="lg:col-span-3 space-y-6">
            {/* Messages */}
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-4 text-red-700">
                {error}
              </div>
            )}
            
            {success && (
              <div className="rounded-md bg-green-50 border border-green-200 p-4 text-green-700">
                {success}
              </div>
            )}

            {fridayNotification && (
              <div className="rounded-md bg-blue-50 border border-blue-200 p-4 text-blue-700 flex items-center animate-pulse">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                {fridayNotification}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Check In Box */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-green-500">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="bg-green-100 text-green-800 p-2 rounded-full mr-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  </span>
                  Check In
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Employee ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={checkInId}
                      onChange={(e) => handleCheckInIdChange(e.target.value)}
                      placeholder="Enter 4-digit Employee ID"
                      maxLength={4}
                      className="w-full px-4 py-3 text-lg font-semibold text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-400"
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                  
                  {/* Employee Info Display */}
                  {checkInEmployee && (
                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center gap-4">
                        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-200">
                          {checkInEmployee.image_url ? (
                            <Image
                              src={checkInEmployee.image_url}
                              alt={checkInEmployee.full_name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                              No Image
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{checkInEmployee.full_name}</p>
                          <p className="text-sm text-gray-600">{checkInEmployee.department_name}</p>
                          <p className="text-sm text-gray-600">{checkInEmployee.job_title}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Time Display for Check-In */}
                  {checkInTimeDisplay && (
                    <div className="border-t pt-4 mt-4">
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">In Time</p>
                            <p className="text-lg font-bold text-green-600">
                              {formatTimeForDisplay(checkInTimeDisplay.checkInTime)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Total Hours</p>
                            <p className="text-lg font-bold text-blue-600">
                              {checkInTimeDisplay.workingHours}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Out Time</p>
                            <p className="text-lg font-bold text-gray-400">
                              00:00
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Check Out Box */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-red-500">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="bg-red-100 text-red-800 p-2 rounded-full mr-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </span>
                  Check Out
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Employee ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={checkOutId}
                      onChange={(e) => handleCheckOutIdChange(e.target.value)}
                      placeholder="Enter 4-digit Employee ID"
                      maxLength={4}
                      className="w-full px-4 py-3 text-lg font-semibold text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-gray-400"
                      disabled={loading}
                    />
                  </div>
                  
                  {/* Employee Info Display */}
                  {checkOutEmployee && (
                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center gap-4">
                        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-200">
                          {checkOutEmployee.image_url ? (
                            <Image
                              src={checkOutEmployee.image_url}
                              alt={checkOutEmployee.full_name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                              No Image
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{checkOutEmployee.full_name}</p>
                          <p className="text-sm text-gray-600">{checkOutEmployee.department_name}</p>
                          <p className="text-sm text-gray-600">{checkOutEmployee.job_title}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Time Display for Check-Out */}
                  {checkOutTimeDisplay && (
                    <div className="border-t pt-4 mt-4">
                      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">In Time</p>
                            <p className="text-lg font-bold text-green-600">
                              {formatTimeForDisplay(checkOutTimeDisplay.checkInTime)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Total Hours</p>
                            <p className="text-lg font-bold text-blue-600">
                              {checkOutTimeDisplay.workingHours}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Out Time</p>
                            <p className="text-lg font-bold text-red-600">
                              {formatTimeForDisplay(checkOutTimeDisplay.checkOutTime)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Instructions and Recent Check-Ins in same row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quick Info / Instructions */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Instructions:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Enter employee ID and press Enter or click button to check in/out</li>
                  <li>• Employees can only check in once per day</li>
                  <li>• Check out is only allowed after check in</li>
                  <li>• Only active employees can mark attendance</li>
                  <li>• Daily bonus is automatically calculated for check-ins</li>
                </ul>
              </div>

              {/* Recent Check-Ins List */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                  <h3 className="text-base font-semibold text-gray-900">Recent Check-Ins Today</h3>
                  <p className="text-xs text-gray-600">Last 5 employees who checked in</p>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: '250px' }}>
                  {todaysRecords && todaysRecords.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Daily</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {todaysRecords
                          .filter((record: AttendanceRecord) => record.check_in_time) // Only show records with check-in
                          .slice(0, 5) // Take only first 5
                          .map((record: AttendanceRecord) => (
                            <tr key={record.aid} className="hover:bg-blue-50 transition-colors">
                              <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                                {record.emp_id}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                                {record.emp_name}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-xs text-green-600 font-semibold">
                                {formatTimeForDisplay(record.check_in_time)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-xs font-semibold text-blue-600">
                                Rs. {record.daily_bonus.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                      No check-ins yet today
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Tab */}
      {activeTab === 'view' && (
        <div className="space-y-6">
          {/* Present Summary Widget */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-md p-6 border border-green-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <h3 className="text-xl font-bold text-gray-800">Present Summary</h3>
            </div>
            
            <div className="space-y-4">
              {/* On time */}
              <div className="flex items-center justify-between bg-white/70 rounded-lg p-4 hover:bg-white/90 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-base font-medium text-gray-700">On time</span>
                </div>
                <span className="text-3xl font-bold text-green-600">
                  {todaysRecords.filter(r => getAttendanceStatusText(r) === 'On-time').length}
                </span>
              </div>

              {/* Late clock-in */}
              <div className="flex items-center justify-between bg-white/70 rounded-lg p-4 hover:bg-white/90 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-base font-medium text-gray-700">Late clock-in</span>
                </div>
                <span className="text-3xl font-bold text-orange-600">
                  {todaysRecords.filter(r => getAttendanceStatusText(r) === 'Late').length}
                </span>
              </div>

              {/* Early clock-in */}
              <div className="flex items-center justify-between bg-white/70 rounded-lg p-4 hover:bg-white/90 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-base font-medium text-gray-700">Early clock-in</span>
                </div>
                <span className="text-3xl font-bold text-blue-600">
                  {todaysRecords.filter(r => getAttendanceStatusText(r) === 'Early').length}
                </span>
              </div>
            </div>
          </div>

          {/* Attendance Records Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Attendance Records</h2>
                <p className="text-sm text-gray-600 mt-1">{format(new Date(selectedDate), 'EEEE, MMMM dd, yyyy')}</p>
              </div>
              
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Date:</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={getPakistanDateString()}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
              )}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-In Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Working Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daily Bonus</th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {todaysRecords.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 11 : 10} className="px-6 py-8 text-center text-gray-500">
                      No attendance records for {format(new Date(selectedDate), 'MMMM dd, yyyy')}
                    </td>
                  </tr>
                ) : (
                  [...todaysRecords].sort((a, b) => {
                    // Sort by check-in time in ascending order (early first, late last)
                    if (!a.check_in_time && !b.check_in_time) return 0;
                    if (!a.check_in_time) return 1;
                    if (!b.check_in_time) return -1;
                    
                    const timeA = new Date(a.check_in_time).getTime();
                    const timeB = new Date(b.check_in_time).getTime();
                    return timeA - timeB;
                  }).map((record) => (
                    <tr key={record.aid} className={getAttendanceRowColor(record)}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.emp_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.emp_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{record.department}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{record.job_title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 font-semibold">{formatTime(record.check_in_time)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const status = getAttendanceStatusText(record);
                          const badgeColor = 
                            status === 'Early' ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-600/20' :
                            status === 'On-time' ? 'bg-green-100 text-green-800 ring-1 ring-green-600/20' :
                            status === 'Late' ? 'bg-red-100 text-red-800 ring-1 ring-red-600/20' :
                            status === 'Absent' ? 'bg-red-100 text-red-800 ring-1 ring-red-600/20' :
                            status === 'Leave' ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-600/20' :
                            status === 'Holiday' ? 'bg-purple-100 text-purple-800 ring-1 ring-purple-600/20' :
                            status === 'Friday' ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-600/20' :
                            'bg-gray-100 text-gray-800 ring-1 ring-gray-600/20';
                          return (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeColor}`}>
                              {status}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-700 font-semibold">{formatTime(record.check_out_time)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700 font-semibold">{record.working_hours || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          record.attendance_status === 'In' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {record.attendance_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Rs. {record.daily_bonus.toFixed(2)}</td>
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEditRecord(record)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(record.aid)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* Edit Modal for Admin */}
      {editingRecord && isAdmin && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Attendance Record</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee: {editingRecord.emp_name} ({editingRecord.emp_id})
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attendance Status</label>
                <select
                  value={editingRecord.attendance_status}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    attendance_status: e.target.value as 'Present' | 'Absent' | 'Leave' | 'Holiday' | 'Friday',
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Leave">Leave</option>
                  <option value="Holiday">Holiday</option>
                  <option value="Friday">Friday</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check-In Time</label>
                <input
                  type="datetime-local"
                  value={formatDatetimeLocalValue(editingRecord.check_in_time)}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    check_in_time: new Date(e.target.value).toISOString(),
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check-Out Time</label>
                <input
                  type="datetime-local"
                  value={formatDatetimeLocalValue(editingRecord.check_out_time)}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    check_out_time: e.target.value ? new Date(e.target.value).toISOString() : null,
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRecord}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}