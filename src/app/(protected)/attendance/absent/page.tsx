'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { format } from 'date-fns';
import { CalendarIcon, TrashIcon } from '@heroicons/react/24/outline';

interface AbsentRecord {
  aid: number;
  employee_id: string;
  emp_id: string;
  emp_name: string;
  department: string;
  job_title: string;
  attendance_date: string;
  attendance_status: string;
  daily_bonus: number;
}

export default function AbsentManagementPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [empId, setEmpId] = useState<string>('');
  const [absentReason, setAbsentReason] = useState<string>('');
  const [absentRecords, setAbsentRecords] = useState<AbsentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    checkUserRole();
    fetchAbsentRecords();
  }, [selectedDate]);

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

  async function fetchAbsentRecords() {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('attendance_date', selectedDate)
        .in('attendance_status', ['Absent', 'Leave', 'Holiday', 'Friday'])
        .order('emp_id', { ascending: true });

      if (error) throw error;
      setAbsentRecords(data || []);
    } catch (error) {
      console.error('Error fetching absent records:', error);
    }
  }

  async function handleMarkAbsent(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (!empId || !absentReason) {
        setError('Please enter Employee ID and select a reason');
        setLoading(false);
        return;
      }

      // Fetch employee data - use daily_salary as daily bonus
      const { data: employee, error: fetchError } = await supabase
        .from('employees')
        .select('id, emp_id, full_name, department_id, job_title, emp_status, daily_salary')
        .eq('emp_id', empId)
        .single();

      if (fetchError || !employee) {
        setError(`Employee with ID ${empId} not found`);
        setLoading(false);
        return;
      }

      // Check if employee is active
      if (employee.emp_status !== 'Active') {
        setError(`Employee ${employee.full_name} is ${employee.emp_status}`);
        setLoading(false);
        return;
      }

      // Fetch department name
      let departmentName = 'N/A';
      if (employee.department_id) {
        const { data: dept } = await supabase
          .from('departments')
          .select('name')
          .eq('id', employee.department_id)
          .single();
        if (dept) departmentName = dept.name;
      }

      // Check if already has a record for this date
      const { data: existing } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('attendance_date', selectedDate)
        .single();

      if (existing) {
        setError(`Employee ${employee.full_name} already has a record for this date`);
        setLoading(false);
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create absent record
      // Note: work_status must be 'In' or 'Out', NOT the absent reason
      // When marked as absent/leave/holiday, there's no check-in, so we don't set work_status
      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert({
          employee_id: employee.id,
          emp_id: employee.emp_id,
          emp_name: employee.full_name,
          department: departmentName,
          job_title: employee.job_title || 'N/A',
          daily_bonus: Number(employee.daily_salary) || 0, // Use daily_salary as daily bonus
          attendance_date: selectedDate,
          attendance_status: absentReason,
          // Don't set work_status for absent records - let it default to 'In' from column default
          check_in_time: null,
          check_out_time: null,
          working_hours: null,
          created_by: user?.id,
        });

      if (insertError) throw insertError;

      setSuccess(`✓ ${absentReason} marked for ${employee.full_name} (ID: ${empId})`);
      setEmpId('');
      setAbsentReason('');
      
      // Refresh records
      await fetchAbsentRecords();
    } catch (err: any) {
      setError(err.message || 'Failed to mark absent');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAbsent(aid: number, empName: string) {
    if (!confirm(`Are you sure you want to delete this absent record for ${empName}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('aid', aid);

      if (error) throw error;

      setSuccess(`✓ Absent record deleted for ${empName}`);
      await fetchAbsentRecords();
    } catch (err: any) {
      setError(err.message || 'Failed to delete record');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Absent Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Mark employees as absent, on leave, holiday, or Friday off
          </p>
        </div>

        {/* Mark Absent Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-orange-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Mark Employee Absent</h2>
          </div>

          <form onSubmit={handleMarkAbsent} className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                {success}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Date Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Employee ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                  placeholder="Enter 4-digit Employee ID"
                  maxLength={4}
                  className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              {/* Absent Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={absentReason}
                  onChange={(e) => setAbsentReason(e.target.value)}
                  className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Select Status</option>
                  <option value="Absent">Absent</option>
                  <option value="Leave">Leave</option>
                  <option value="Holiday">Holiday</option>
                  <option value="Friday">Friday</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto px-8 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Processing...' : 'Mark Absent'}
              </button>
            </div>
          </form>
        </div>

        {/* Absent Records Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Absent Records
              </h2>
              <span className="text-sm text-gray-600 bg-gray-200 px-3 py-1 rounded-full font-medium">
                {format(new Date(selectedDate), 'MMMM dd, yyyy')}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Employee ID
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Employee Name
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Department
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Job Title
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  {isAdmin && (
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {absentRecords.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        <p className="text-gray-500 text-base font-medium">No absent records found</p>
                        <p className="text-gray-400 text-sm mt-1">Mark employees as absent using the form above</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  absentRecords.map((record, index) => (
                    <tr 
                      key={record.aid} 
                      className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">{record.emp_id}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{record.emp_name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{record.department}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{record.job_title}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          record.attendance_status === 'Absent'
                            ? 'bg-red-100 text-red-800 ring-1 ring-red-600/20'
                            : record.attendance_status === 'Leave'
                            ? 'bg-orange-100 text-orange-800 ring-1 ring-orange-600/20'
                            : record.attendance_status === 'Holiday'
                            ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-600/20'
                            : 'bg-purple-100 text-purple-800 ring-1 ring-purple-600/20'
                        }`}>
                          {record.attendance_status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteAbsent(record.aid, record.emp_name)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <TrashIcon className="h-4 w-4" />
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
    </div>
  );
}
