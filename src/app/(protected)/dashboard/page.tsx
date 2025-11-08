'use client';

import { supabase } from '../../../lib/supabase';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { getPakistanDateString, formatPakistanDateTime } from '../../../lib/pakistan-time';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  Bars3Icon, 
  Squares2X2Icon,
  CalendarIcon 
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import AIChatbot from '../../../components/dashboard/AIChatbot';

interface EmployeeAttendance {
  employee_id: string;
  emp_id: string;
  emp_name: string;
  department: string;
  job_title: string;
  image_url: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  working_hours: string | null;
  attendance_status: string;
  daily_bonus: number;
  aid?: string; // Attendance record ID - optional for single date mode
  attendance_date?: string; // Date of attendance - optional for range display
  start_time?: string; // Employee's shift start time
  end_time?: string; // Employee's shift end time
}

interface SummaryStats {
  onTime: number;
  lateClockIn: number;
  earlyClockIn: number;
  absent: number;
  noClockIn: number;
  noClockOut: number;
}

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getPakistanDateString());
  const [fromDate, setFromDate] = useState<string>(getPakistanDateString());
  const [toDate, setToDate] = useState<string>(getPakistanDateString());
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [attendanceData, setAttendanceData] = useState<EmployeeAttendance[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [stats, setStats] = useState<SummaryStats>({
    onTime: 0,
    lateClockIn: 0,
    earlyClockIn: 0,
    absent: 0,
    noClockIn: 0,
    noClockOut: 0,
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [adminName, setAdminName] = useState('Admin');
  const [currentDateTime, setCurrentDateTime] = useState<string>(formatPakistanDateTime());

  // Update Pakistan time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(formatPakistanDateTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchAdminName();
  }, []);

  async function fetchAdminName() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (profile?.full_name) {
          setAdminName(profile.full_name);
        }
      }
    } catch (error) {
      console.error('Error fetching admin name:', error);
    }
  }

  useEffect(() => {
    if (dateMode === 'single') {
      fetchDashboardData();
      fetchChartData();
    } else {
      fetchRangeData();
      fetchChartDataForRange();
    }
  }, [selectedDate, fromDate, toDate, dateMode]);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      // Fetch all active employees with their shift times
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, emp_id, start_time, end_time')
        .eq('emp_status', 'Active');

      if (empError) throw empError;
      
      // Create a map for quick lookup
      const employeeMap = new Map(employees?.map(emp => [emp.id, emp]) || []);
      setAllEmployees(employees || []);

      // Fetch attendance records for selected date
      const { data: attendance, error: attError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('attendance_date', selectedDate)
        .order('check_in_time', { ascending: false});

      if (attError) throw attError;

      // Only show attendance records that exist for the selected date
      // Include employee shift times from the map
      const mergedData: EmployeeAttendance[] = (attendance || []).map(record => {
        const employee = employeeMap.get(record.employee_id);
        return {
          employee_id: record.employee_id,
          emp_id: record.emp_id,
          emp_name: record.emp_name,
          department: record.department || 'N/A',
          job_title: record.job_title || 'N/A',
          image_url: record.image_url,
          check_in_time: record.check_in_time,
          check_out_time: record.check_out_time,
          working_hours: record.working_hours,
          attendance_status: record.attendance_status,
          daily_bonus: record.daily_bonus || 0,
          aid: record.aid, // Include unique attendance ID
          attendance_date: record.attendance_date,
          start_time: employee?.start_time || '08:00:00', // Default to 8 AM if not found
          end_time: employee?.end_time || '17:00:00', // Default to 5 PM if not found
        };
      });

      setAttendanceData(mergedData);

      // Calculate statistics
      calculateStats(mergedData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateStats(data: EmployeeAttendance[]) {
    const newStats: SummaryStats = {
      onTime: 0,
      lateClockIn: 0,
      earlyClockIn: 0,
      absent: 0,
      noClockIn: 0,
      noClockOut: 0,
    };

    data.forEach(record => {
      // Count absent/leave/holiday/friday records
      if (record.attendance_status === 'Absent' || record.attendance_status === 'Leave' || 
          record.attendance_status === 'Holiday' || record.attendance_status === 'Friday') {
        newStats.absent++;
        newStats.noClockIn++;
      } else if (!record.check_in_time) {
        newStats.noClockIn++;
      } else {
        const checkInTime = new Date(record.check_in_time);
        const checkInHour = checkInTime.getHours();
        const checkInMinute = checkInTime.getMinutes();
        const checkInTotalMinutes = checkInHour * 60 + checkInMinute;

        // Get employee's start time (e.g., "10:00:00" becomes 10*60 = 600 minutes)
        const startTime = record.start_time || '08:00:00';
        const [startHour, startMin] = startTime.split(':').map(Number);
        const startTotalMinutes = startHour * 60 + startMin;

        // On-time: Check-in exactly at or slightly before start time (up to 30 min grace period)
        // Early: More than 0 minutes before start time
        // Late: After start time + grace period
        const gracePeriodMinutes = 30; // 30 minute grace period

        if (checkInTotalMinutes < startTotalMinutes) {
          newStats.earlyClockIn++;
        } else if (checkInTotalMinutes > startTotalMinutes + gracePeriodMinutes) {
          newStats.lateClockIn++;
        } else {
          newStats.onTime++;
        }

        // Check if not checked out yet (work_status is 'In')
        if (!record.check_out_time) {
          newStats.noClockOut++;
        }
      }
    });

    setStats(newStats);
  }

  function formatTime(timestamp: string | null): string {
    if (!timestamp) return '-';
    return format(new Date(timestamp), 'hh:mm a');
  }

  // Helper function to determine check-in status and return appropriate color
  function getCheckInStatusColor(record: EmployeeAttendance): string {
    // If absent, leave, holiday, or Friday - no color
    if (record.attendance_status === 'Absent' || record.attendance_status === 'Leave' || 
        record.attendance_status === 'Holiday' || record.attendance_status === 'Friday') {
      return '';
    }

    if (!record.check_in_time) {
      return ''; // No check-in, no color
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
      return 'bg-blue-50 hover:bg-blue-100'; // Early - light blue
    } else if (checkInTotalMinutes > startTotalMinutes + gracePeriodMinutes) {
      return 'bg-red-50 hover:bg-red-100'; // Late - light red
    } else {
      return 'bg-green-50 hover:bg-green-100'; // On-time - light green
    }
  }

  // Helper function to get check-in status text
  function getCheckInStatusText(record: EmployeeAttendance): string {
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

  function calculateOvertime(workingHours: string | null, startTime?: string, endTime?: string): string {
    if (!workingHours || !startTime || !endTime) return '-';
    
    // Calculate employee's standard shift duration
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const standardMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    
    // Parse actual working hours format "10h 40m" or "HH:MM"
    let totalMinutes = 0;
    
    if (workingHours.includes('h')) {
      // Format: "10h 40m"
      const hourMatch = workingHours.match(/(\d+)h/);
      const minMatch = workingHours.match(/(\d+)m/);
      const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
      const minutes = minMatch ? parseInt(minMatch[1]) : 0;
      totalMinutes = hours * 60 + minutes;
    } else if (workingHours.includes(':')) {
      // Format: "10:40"
      const [hours, minutes] = workingHours.split(':').map(Number);
      totalMinutes = hours * 60 + minutes;
    } else {
      return '-';
    }
    
    const overtimeMinutes = Math.max(0, totalMinutes - standardMinutes);
    
    if (overtimeMinutes === 0) return '-';
    
    const overtimeHours = Math.floor(overtimeMinutes / 60);
    const overtimeMins = overtimeMinutes % 60;
    return `${overtimeHours}h ${overtimeMins}m`;
  }

  function calculateShortTime(workingHours: string | null, startTime?: string, endTime?: string): string {
    if (!workingHours || !startTime || !endTime) return '-';
    
    // Calculate employee's standard shift duration
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const standardMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    
    // Parse actual working hours format "10h 40m" or "HH:MM"
    let totalMinutes = 0;
    
    if (workingHours.includes('h')) {
      // Format: "10h 40m"
      const hourMatch = workingHours.match(/(\d+)h/);
      const minMatch = workingHours.match(/(\d+)m/);
      const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
      const minutes = minMatch ? parseInt(minMatch[1]) : 0;
      totalMinutes = hours * 60 + minutes;
    } else if (workingHours.includes(':')) {
      // Format: "10:40"
      const [hours, minutes] = workingHours.split(':').map(Number);
      totalMinutes = hours * 60 + minutes;
    } else {
      return '-';
    }
    
    const shortMinutes = Math.max(0, standardMinutes - totalMinutes);
    
    if (shortMinutes === 0) return '-';
    
    const shortHours = Math.floor(shortMinutes / 60);
    const shortMins = shortMinutes % 60;
    return `${shortHours}h ${shortMins}m`;
  }

  async function fetchChartData() {
    try {
      const chartData = [];
      const { count: totalEmployees } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('emp_status', 'Active');

      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const { data: attendance } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('attendance_date', dateStr);

        const presentCount = attendance?.filter(r => r.attendance_status === 'Present').length || 0;
        const absentCount = (totalEmployees || 0) - presentCount;
        
        chartData.push({
          date: format(date, 'MMM dd'),
          present: presentCount,
          absent: absentCount,
        });
      }

      setChartData(chartData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  }

  async function fetchRangeData() {
    setLoading(true);
    try {
      // First fetch employees with shift times
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, emp_id, start_time, end_time')
        .eq('emp_status', 'Active');

      if (empError) throw empError;
      
      const employeeMap = new Map(employees?.map(emp => [emp.id, emp]) || []);

      const { data: attendance, error } = await supabase
        .from('attendance_records')
        .select('*')
        .gte('attendance_date', fromDate)
        .lte('attendance_date', toDate)
        .order('attendance_date', { ascending: false })
        .order('check_in_time', { ascending: false });

      if (error) throw error;

      // Add unique key and employee shift times for each record
      const mergedData: EmployeeAttendance[] = (attendance || []).map(record => {
        const employee = employeeMap.get(record.employee_id);
        return {
          employee_id: record.employee_id,
          emp_id: record.emp_id,
          emp_name: record.emp_name,
          department: record.department || 'N/A',
          job_title: record.job_title || 'N/A',
          image_url: record.image_url,
          check_in_time: record.check_in_time,
          check_out_time: record.check_out_time,
          working_hours: record.working_hours,
          attendance_status: record.attendance_status,
          daily_bonus: record.daily_bonus || 0,
          aid: record.aid, // Keep the attendance record ID for unique key
          attendance_date: record.attendance_date, // Keep date for display
          start_time: employee?.start_time || '08:00:00',
          end_time: employee?.end_time || '17:00:00',
        };
      });

      setAttendanceData(mergedData);
      calculateStats(mergedData);
    } catch (error) {
      console.error('Error fetching range data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchChartDataForRange() {
    try {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      const chartData = [];

      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        
        const { data: attendance } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('attendance_date', dateStr);

        const presentCount = attendance?.filter(r => r.attendance_status === 'Present').length || 0;
        const absentLeaveCount = attendance?.filter(r => ['Absent', 'Leave', 'Holiday', 'Friday'].includes(r.attendance_status)).length || 0;
        
        chartData.push({
          date: format(d, 'MMM dd'),
          present: presentCount,
          absent: absentLeaveCount,
        });
      }

      setChartData(chartData);
    } catch (error) {
      console.error('Error fetching chart data for range:', error);
    }
  }

  function handleQuickFilter(filter: 'yesterday' | 'last7days' | 'thismonth' | 'lastmonth') {
    const today = getPakistanDateString();
    const todayDate = new Date(today);
    let from = new Date(today);
    let to = new Date(today);

    switch (filter) {
      case 'yesterday':
        from.setDate(todayDate.getDate() - 1);
        to.setDate(todayDate.getDate() - 1);
        break;
      case 'last7days':
        from.setDate(todayDate.getDate() - 6);
        to = todayDate;
        break;
      case 'thismonth':
        from = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
        to = todayDate;
        break;
      case 'lastmonth':
        from = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1);
        to = new Date(todayDate.getFullYear(), todayDate.getMonth(), 0);
        break;
    }

    setFromDate(from.toISOString().split('T')[0]);
    setToDate(to.toISOString().split('T')[0]);
    setDateMode('range');
  }

  // Filter data based on search and status
  const filteredData = attendanceData.filter(record => {
    const matchesSearch = record.emp_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         record.emp_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'present') return record.check_in_time !== null;
    if (statusFilter === 'absent') return record.check_in_time === null;
    if (statusFilter === 'in') return record.attendance_status === 'In';
    if (statusFilter === 'out') return record.attendance_status === 'Out';
    
    return true;
  }).sort((a, b) => {
    // Sort by check-in time in ascending order (early first, late last)
    // Records without check-in time go to the end
    if (!a.check_in_time && !b.check_in_time) return 0;
    if (!a.check_in_time) return 1;
    if (!b.check_in_time) return -1;
    
    const timeA = new Date(a.check_in_time).getTime();
    const timeB = new Date(b.check_in_time).getTime();
    return timeA - timeB;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Attendance Dashboard</h1>
                <p className="mt-1 text-sm text-gray-600 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="font-medium">{currentDateTime}</span>
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {dateMode === 'single' 
                    ? `Viewing: ${format(new Date(selectedDate), 'EEEE, MMMM dd, yyyy')}`
                    : `Viewing: ${format(new Date(fromDate), 'MMM dd, yyyy')} - ${format(new Date(toDate), 'MMM dd, yyyy')}`
                  }
                </p>
              </div>
              
              {/* AI Assistant Button */}
              <button
                onClick={() => setIsChatbotOpen(!isChatbotOpen)}
                className="group relative flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-600 via-pink-500 to-blue-500 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 rounded-full blur-md opacity-75 group-hover:opacity-100 animate-pulse"></div>
                <svg className="relative w-7 h-7 text-white z-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-ping"></span>
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></span>
              </button>
            </div>

            {/* Date Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Single Date Picker */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Single Date</h3>
                  <button
                    onClick={() => setDateMode('single')}
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      dateMode === 'single' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Active
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setDateMode('single');
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
              </div>

              {/* Date Range Picker */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Date Range</h3>
                  <button
                    onClick={() => setDateMode('range')}
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      dateMode === 'range' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Active
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">From</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => {
                        setFromDate(e.target.value);
                        setDateMode('range');
                      }}
                      className="w-full px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">To</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => {
                        setToDate(e.target.value);
                        setDateMode('range');
                      }}
                      max={getPakistanDateString()}
                      className="w-full px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleQuickFilter('yesterday')}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
              >
                Yesterday
              </button>
              <button
                onClick={() => handleQuickFilter('last7days')}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
              >
                Last 7 Days
              </button>
              <button
                onClick={() => handleQuickFilter('thismonth')}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
              >
                This Month
              </button>
              <button
                onClick={() => handleQuickFilter('lastmonth')}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
              >
                Last Month
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Present Summary Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-800 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Present Summary
              </h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">On time</span>
                </div>
                <span className="text-2xl font-bold text-green-600">{stats.onTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Late clock-in</span>
                </div>
                <span className="text-2xl font-bold text-orange-600">{stats.lateClockIn}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Early clock-in</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">{stats.earlyClockIn}</span>
              </div>
            </div>
          </div>

          {/* Not Present Summary Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-pink-50 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-800 flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                Not Present Summary
              </h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Absent</span>
                </div>
                <span className="text-2xl font-bold text-red-600">{stats.absent}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">No clock-in</span>
                </div>
                <span className="text-2xl font-bold text-gray-600">{stats.noClockIn}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">No clock-out</span>
                </div>
                <span className="text-2xl font-bold text-yellow-600">{stats.noClockOut}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-800 flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                Quick Stats
              </h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Total Employees</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">{allEmployees.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Present Today</span>
                </div>
                <span className="text-2xl font-bold text-green-600">
                  {attendanceData.filter(r => r.check_in_time).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1zm1-4a1 1 0 100 2h.01a1 1 0 100-2H7zm2 1a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm4-4a1 1 0 100 2h.01a1 1 0 100-2H13zM9 9a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zM7 8a1 1 0 000 2h.01a1 1 0 000-2H7z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Attendance Rate</span>
                </div>
                <span className="text-2xl font-bold text-purple-600">
                  {allEmployees.length > 0 
                    ? Math.round((attendanceData.filter(r => r.check_in_time).length / allEmployees.length) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 7-Day Attendance Chart - Enhanced */}
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg border border-blue-100 overflow-hidden mb-8">
          <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 border-b border-blue-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                Attendance Trend
              </h2>
              <span className="text-blue-100 text-sm font-medium">
                {dateMode === 'range' ? 'Custom Range' : 'Last 7 Days'}
              </span>
            </div>
          </div>
          <div className="p-8 bg-white">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="#E5E7EB" 
                    strokeOpacity={0.5}
                  />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6B7280"
                    style={{ 
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                    tick={{ fill: '#374151' }}
                  />
                  <YAxis 
                    stroke="#6B7280"
                    style={{ 
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                    tick={{ fill: '#374151' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '2px solid #3B82F6',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }}
                    labelStyle={{
                      fontWeight: 'bold',
                      color: '#1F2937',
                      marginBottom: '8px'
                    }}
                    itemStyle={{
                      padding: '4px 0',
                      fontWeight: '600'
                    }}
                    cursor={{ stroke: '#3B82F6', strokeWidth: 2, strokeDasharray: '5 5' }}
                  />
                  <Legend 
                    wrapperStyle={{ 
                      paddingTop: '24px',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                    iconType="circle"
                    iconSize={12}
                  />
                  <Line
                    type="monotone"
                    dataKey="present"
                    stroke="#10B981"
                    strokeWidth={4}
                    name="Present"
                    dot={{ 
                      fill: '#10B981', 
                      strokeWidth: 3,
                      stroke: '#FFFFFF',
                      r: 6 
                    }}
                    activeDot={{ 
                      r: 9,
                      fill: '#10B981',
                      stroke: '#FFFFFF',
                      strokeWidth: 3,
                      style: { cursor: 'pointer' }
                    }}
                    fill="url(#colorPresent)"
                    animationDuration={1500}
                    animationEasing="ease-in-out"
                  />
                  <Line
                    type="monotone"
                    dataKey="absent"
                    stroke="#EF4444"
                    strokeWidth={4}
                    name="Absent / Leave"
                    dot={{ 
                      fill: '#EF4444',
                      strokeWidth: 3,
                      stroke: '#FFFFFF',
                      r: 6 
                    }}
                    activeDot={{ 
                      r: 9,
                      fill: '#EF4444',
                      stroke: '#FFFFFF',
                      strokeWidth: 3,
                      style: { cursor: 'pointer' }
                    }}
                    fill="url(#colorAbsent)"
                    animationDuration={1500}
                    animationEasing="ease-in-out"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Search, Filter and View Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search employee by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Filter and View Controls */}
            <div className="flex gap-3">
              {/* Status Filter */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FunnelIcon className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="in">Checked In</option>
                  <option value="out">Checked Out</option>
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2.5 flex items-center gap-2 transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Bars3Icon className="h-5 w-5" />
                  <span className="text-sm font-medium hidden sm:inline">List</span>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2.5 flex items-center gap-2 border-l border-gray-300 transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Squares2X2Icon className="h-5 w-5" />
                  <span className="text-sm font-medium hidden sm:inline">Grid</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Employee Attendance List/Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Employee Attendance
              </h2>
              <span className="text-sm text-gray-600 bg-gray-200 px-3 py-1 rounded-full font-medium">
                {filteredData.length} {filteredData.length === 1 ? 'Employee' : 'Employees'}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading attendance data...</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Employee
                    </th>
                    {dateMode === 'range' && (
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Date
                      </th>
                    )}
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Clock In
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Check-In Status
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Clock Out
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Working Hours
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Overtime
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Short Time
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Daily Bonus
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={dateMode === 'range' ? 10 : 9} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                          </svg>
                          <p className="text-gray-500 text-base font-medium">No employees found</p>
                          <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filter</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((record, index) => (
                      <tr 
                        key={record.aid || `${record.employee_id}-${index}`} 
                        className={`transition-colors ${getCheckInStatusColor(record) || (index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100')}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-11 w-11 flex-shrink-0">
                              {record.image_url ? (
                                <img
                                  className="h-11 w-11 rounded-full object-cover ring-2 ring-white"
                                  src={record.image_url}
                                  alt={record.emp_name}
                                />
                              ) : (
                                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center ring-2 ring-white">
                                  <span className="text-white font-semibold text-base">
                                    {record.emp_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-gray-900">{record.emp_name}</div>
                              <div className="text-xs text-gray-500">ID: {record.emp_id}</div>
                            </div>
                          </div>
                        </td>
                        {dateMode === 'range' && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-700">
                              {record.attendance_date ? format(new Date(record.attendance_date), 'MMM dd, yyyy') : '-'}
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{formatTime(record.check_in_time)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const status = getCheckInStatusText(record);
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
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${badgeColor}`}>
                                {status}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{formatTime(record.check_out_time)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-blue-600">{record.working_hours || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-purple-600">{calculateOvertime(record.working_hours, record.start_time, record.end_time)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-orange-600">{calculateShortTime(record.working_hours, record.start_time, record.end_time)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {record.daily_bonus > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Rs. {record.daily_bonus.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            record.attendance_status === 'Present' || record.attendance_status === 'Out'
                              ? 'bg-green-100 text-green-800 ring-1 ring-green-600/20'
                              : record.attendance_status === 'In'
                              ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-600/20'
                              : 'bg-red-100 text-red-800 ring-1 ring-red-600/20'
                          }`}>
                            {record.attendance_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            // Grid View
            <div className="p-6">
              {filteredData.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                  </svg>
                  <p className="text-gray-500 text-base font-medium">No employees found</p>
                  <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filter</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredData.map((record, index) => {
                    const statusColor = getCheckInStatusColor(record);
                    return (
                    <div 
                      key={record.aid || `${record.employee_id}-${index}`} 
                      className={`border-2 rounded-xl p-5 hover:shadow-lg transition-all duration-200 ${
                        statusColor 
                          ? `${statusColor} border-gray-300` 
                          : 'bg-white border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {/* Employee Info */}
                      <div className="flex items-center mb-4">
                        <div className="h-14 w-14 flex-shrink-0">
                          {record.image_url ? (
                            <img
                              className="h-14 w-14 rounded-full object-cover ring-2 ring-gray-200"
                              src={record.image_url}
                              alt={record.emp_name}
                            />
                          ) : (
                            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center ring-2 ring-gray-200">
                              <span className="text-white font-bold text-lg">
                                {record.emp_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{record.emp_name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">ID: {record.emp_id}</div>
                        </div>
                      </div>

                      {/* Attendance Details */}
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Clock In:</span>
                          <span className="font-semibold text-gray-900">{formatTime(record.check_in_time)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Clock Out:</span>
                          <span className="font-semibold text-gray-900">{formatTime(record.check_out_time)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Hours:</span>
                          <span className="font-semibold text-blue-600">{record.working_hours || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Overtime:</span>
                          <span className="font-semibold text-purple-600">{calculateOvertime(record.working_hours, record.start_time, record.end_time)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Short Time:</span>
                          <span className="font-semibold text-orange-600">{calculateShortTime(record.working_hours, record.start_time, record.end_time)}</span>
                        </div>
                      </div>

                      {/* Status and Bonus */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          record.attendance_status === 'Present' || record.attendance_status === 'Out'
                            ? 'bg-green-100 text-green-800'
                            : record.attendance_status === 'In'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {record.attendance_status}
                        </span>
                        {record.daily_bonus > 0 && (
                          <span className="inline-flex items-center text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                            +Rs. {record.daily_bonus.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* AI Chatbot */}
      <AIChatbot 
        isOpen={isChatbotOpen} 
        onClose={() => setIsChatbotOpen(false)}
        userName={adminName}
      />
    </div>
  );
}