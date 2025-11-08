'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '../../../../lib/supabase';
import { CalendarIcon, UserIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../../../hooks/useAuth';

type AttendanceStatus = 'Present' | 'Absent' | 'Leave' | 'Holiday' | 'Friday';
type WorkStatus = 'In' | 'Out';

interface Employee {
  id: string;
  emp_id: string;
  full_name: string;
  department_id: string;
  job_title: string;
  daily_salary: number;
}

interface Department {
  id: string;
  name: string;
}

interface AttendanceRecord {
  aid: string;
  employee_id: string;
  emp_id: string;
  emp_name: string;
  department: string;
  job_title: string;
  attendance_date: string;
  attendance_status: AttendanceStatus;
  work_status: WorkStatus;
  check_in_time: string;
  check_out_time: string | null;
  working_hours: string | null;
  daily_bonus: number;
}

export default function ManualAttendancePage() {
  const { profile } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [employeeId, setEmployeeId] = useState<string>('');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>('Present');
  const [workStatus, setWorkStatus] = useState<WorkStatus>('In');
  const [checkInTime, setCheckInTime] = useState<string>('');
  const [checkOutTime, setCheckOutTime] = useState<string>('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check if admin
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    // Only redirect if profile is loaded AND user is not admin
    if (profile && !isAdmin) {
      window.location.href = '/attendance';
    }
  }, [profile, isAdmin]);

  // Load data only when date is explicitly changed by user
  useEffect(() => {
    if (selectedDate) {
      fetchRecordsByDate();
      // Reset form when date changes
      resetForm();
    }
  }, [selectedDate]);

  // Auto-load employee data when 4 digits entered
  useEffect(() => {
    if (employeeId.length === 4) {
      loadEmployeeData();
    } else {
      setEmployee(null);
      setDepartment(null);
    }
  }, [employeeId]);

  async function loadEmployeeData() {
    try {
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('id, emp_id, full_name, department_id, job_title, daily_salary')
        .eq('emp_id', employeeId)
        .single();

      if (empError) throw empError;
      setEmployee(empData);

      // Load department
      if (empData.department_id) {
        const { data: deptData, error: deptError } = await supabase
          .from('departments')
          .select('id, name')
          .eq('id', empData.department_id)
          .single();

        if (deptError) throw deptError;
        setDepartment(deptData);
      }
    } catch (err: any) {
      console.error('Error loading employee:', err);
      setEmployee(null);
      setDepartment(null);
    }
  }

  async function fetchRecordsByDate() {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          aid,
          employee_id,
          emp_id,
          emp_name,
          department,
          job_title,
          attendance_date,
          attendance_status,
          work_status,
          check_in_time,
          check_out_time,
          working_hours,
          daily_bonus
        `)
        .eq('attendance_date', selectedDate)
        .order('check_in_time', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err: any) {
      console.error('Error fetching records:', err);
      setError('Failed to fetch records: ' + err.message);
      setTimeout(() => setError(null), 3000);
    }
  }

  function calculateWorkingHours(checkIn: string, checkOut: string | null): string {
    if (!checkOut) return '0h 0m';
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  async function handleInsertOrUpdate() {
    if (!employee) {
      setError('Please enter a valid employee ID');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Validation: Check-in/out required only for "Present" status
    if (attendanceStatus === 'Present') {
      if (!checkInTime) {
        setError('Check-in time is required for Present status');
        setTimeout(() => setError(null), 3000);
        return;
      }
      if (!checkOutTime) {
        setError('Check-out time is required for Present status');
        setTimeout(() => setError(null), 3000);
        return;
      }
    }

    try {
      // Only create datetime objects if times are provided
      const checkInDateTime = checkInTime ? new Date(`${selectedDate}T${checkInTime}`).toISOString() : null;
      const checkOutDateTime = checkOutTime ? new Date(`${selectedDate}T${checkOutTime}`).toISOString() : null;
      const workingHours = (checkInDateTime && checkOutDateTime) ? calculateWorkingHours(checkInDateTime, checkOutDateTime) : null;

      // Check if record exists
      const { data: existingRecord } = await supabase
        .from('attendance_records')
        .select('aid')
        .eq('employee_id', employee.id)
        .eq('attendance_date', selectedDate)
        .single();

      if (existingRecord) {
        // UPDATE existing record
        const { error: updateError } = await supabase
          .from('attendance_records')
          .update({
            attendance_status: attendanceStatus,
            work_status: workStatus,
            check_in_time: checkInDateTime,
            check_out_time: checkOutDateTime,
            working_hours: workingHours,
          })
          .eq('aid', existingRecord.aid);

        if (updateError) throw updateError;
        setSuccess('✓ Attendance record updated successfully');
      } else {
        // INSERT new record
        const { error: insertError } = await supabase
          .from('attendance_records')
          .insert({
            employee_id: employee.id,
            emp_id: employee.emp_id,
            emp_name: employee.full_name,
            department: department?.name || 'N/A',
            job_title: employee.job_title,
            attendance_date: selectedDate,
            attendance_status: attendanceStatus,
            work_status: workStatus,
            check_in_time: checkInDateTime,
            check_out_time: checkOutDateTime,
            working_hours: workingHours,
            daily_bonus: Number(employee.daily_salary) || 0,
          });

        if (insertError) throw insertError;
        setSuccess('✓ Attendance record inserted successfully');
      }

      // Reset form
      resetForm();
      fetchRecordsByDate();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Failed to save record: ' + err.message);
      setTimeout(() => setError(null), 3000);
    }
  }

  function resetForm() {
    setEmployeeId('');
    setEmployee(null);
    setDepartment(null);
    setAttendanceStatus('Present');
    setWorkStatus('In');
    setCheckInTime('');
    setCheckOutTime('');
    setEditingRecord(null);
  }

  function handleEdit(record: AttendanceRecord) {
    setEmployeeId(record.emp_id);
    setAttendanceStatus(record.attendance_status);
    setWorkStatus(record.work_status);
    
    // Extract time from ISO string
    const checkIn = new Date(record.check_in_time);
    setCheckInTime(format(checkIn, 'HH:mm'));
    
    if (record.check_out_time) {
      const checkOut = new Date(record.check_out_time);
      setCheckOutTime(format(checkOut, 'HH:mm'));
    } else {
      setCheckOutTime('');
    }

    setEditingRecord(record);
  }

  async function handleDelete(recordId: string) {
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
      fetchRecordsByDate();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Failed to delete record: ' + err.message);
      setTimeout(() => setError(null), 3000);
    }
  }

  function getStatusColor(status: AttendanceStatus): string {
    switch (status) {
      case 'Present': return 'text-green-600 bg-green-50';
      case 'Absent': return 'text-red-600 bg-red-50';
      case 'Leave': return 'text-orange-600 bg-orange-50';
      case 'Holiday': return 'text-blue-600 bg-blue-50';
      case 'Friday': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  }

  // Show loading while profile loads
  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect non-admin users
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900">Manual Attendance</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manually add or edit attendance records for employees
          </p>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Section - Form */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CalendarIcon className="h-6 w-6" />
                Attendance Details
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Date Picker */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-lg font-semibold"
                />
              </div>

              {/* Employee ID */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Employee ID
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="Enter 4-digit ID"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-mono text-lg"
                  disabled={editingRecord !== null}
                />
              </div>

              {/* Employee Info Display */}
              {employee && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-2">
                  <div>
                    <label className="text-xs font-semibold text-blue-700 uppercase">Name</label>
                    <p className="text-gray-900 font-medium">{employee.full_name}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-blue-700 uppercase">Department</label>
                    <p className="text-gray-900">{department?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-blue-700 uppercase">Work Detail</label>
                    <p className="text-gray-900">{employee.job_title}</p>
                  </div>
                </div>
              )}

              {/* Attendance Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Attendance Status
                </label>
                <select
                  value={attendanceStatus}
                  onChange={(e) => setAttendanceStatus(e.target.value as AttendanceStatus)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Friday">Friday</option>
                  <option value="Holiday">Holiday</option>
                  <option value="Leave">Leave</option>
                </select>
              </div>

              {/* Work Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Work Status
                </label>
                <select
                  value={workStatus}
                  onChange={(e) => setWorkStatus(e.target.value as WorkStatus)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="In">In</option>
                  <option value="Out">Out</option>
                </select>
              </div>

              {/* Time Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Check In
                  </label>
                  <input
                    type="time"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    className="w-full px-3 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Check Out
                  </label>
                  <input
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    className="w-full px-3 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleInsertOrUpdate}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <CheckCircleIcon className="h-5 w-5" />
                  Insert
                </button>
                <button
                  onClick={resetForm}
                  className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 border-2 border-gray-300 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <XCircleIcon className="h-5 w-5" />
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Table */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
            {/* Table Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white">
                Attendance Records - {format(new Date(selectedDate), 'MMM dd, yyyy')}
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                {records.length} record(s) found
              </p>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Check In
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Check Out
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Hours
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No attendance records found for this date
                      </td>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <tr key={record.aid} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.emp_id}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{record.emp_name}</div>
                          <div className="text-xs text-gray-500">{record.job_title}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.attendance_status)}`}>
                            {record.attendance_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(record.check_in_time), 'hh:mm a')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {record.check_out_time ? format(new Date(record.check_out_time), 'hh:mm a') : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {record.working_hours || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleEdit(record)}
                            className="text-blue-600 hover:text-blue-900 font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(record.aid)}
                            className="text-red-600 hover:text-red-900 font-semibold"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
