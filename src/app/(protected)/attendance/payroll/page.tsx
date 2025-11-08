'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { format } from 'date-fns';

interface EmployeeDetails {
  emp_id: string;
  full_name: string;
  monthly_salary: number;
  daily_salary: number;
  weekly_salary: number;
  start_time: string;
  end_time: string;
  image_url: string | null;
}

interface AttendanceRecord {
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  working_hours: string | null;
  attendance_status: string;
}

interface PayrollCalculations {
  totalSalary: number;
  absentShift: number; // Count
  absentDaily: number; // Count
  totalHours: number;
  perHour: number;
  totalWorkingHours: number; // Actual hours worked
}

export default function PayrollManualPage() {
  const [fromDate, setFromDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [empId, setEmpId] = useState<string>('');
  const [employee, setEmployee] = useState<EmployeeDetails | null>(null);
  const [calculations, setCalculations] = useState<PayrollCalculations>({
    totalSalary: 0,
    absentShift: 0,
    absentDaily: 0,
    totalHours: 0,
    perHour: 0,
    totalWorkingHours: 0,
  });
  
  // Detail sections
  const [absentDetails, setAbsentDetails] = useState<AttendanceRecord[]>([]);
  const [holidayDetails, setHolidayDetails] = useState<AttendanceRecord[]>([]);
  const [fridayDetails, setFridayDetails] = useState<AttendanceRecord[]>([]);
  const [leaveDetails, setLeaveDetails] = useState<AttendanceRecord[]>([]);
  const [presentDetails, setPresentDetails] = useState<AttendanceRecord[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch employee details when ID is entered (4 digits)
  async function handleEmpIdChange(value: string) {
    setEmpId(value);
    
    if (value.length === 4) {
      await fetchEmployeeDetails(value);
    }
  }

  async function fetchEmployeeDetails(empIdValue: string) {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('emp_id, full_name, monthly_salary, daily_salary, weekly_salary, start_time, end_time, image_url')
        .eq('emp_id', empIdValue)
        .eq('emp_status', 'Active')
        .single();

      if (error) throw error;
      
      if (!data) {
        setError('Employee not found or not active');
        setEmployee(null);
        return;
      }

      setEmployee(data);
      
      // Fetch attendance data if dates are set
      if (fromDate && toDate) {
        await fetchAttendanceData(data.emp_id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch employee details');
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAttendanceData(employeeId: string) {
    setLoading(true);
    setError(null);

    try {
      // Get employee's internal ID
      const { data: empData } = await supabase
        .from('employees')
        .select('id')
        .eq('emp_id', employeeId)
        .single();

      if (!empData) throw new Error('Employee not found');

      // Fetch attendance records for date range
      const { data: records, error } = await supabase
        .from('attendance_records')
        .select('attendance_date, check_in_time, check_out_time, working_hours, attendance_status')
        .eq('employee_id', empData.id)
        .gte('attendance_date', fromDate)
        .lte('attendance_date', toDate)
        .order('attendance_date', { ascending: true });

      if (error) throw error;

      if (!records || records.length === 0) {
        setError('No attendance records found for the selected date range');
        return;
      }

      // Separate records by type
      const absent = records.filter((r: AttendanceRecord) => r.attendance_status === 'Absent');
      const holiday = records.filter((r: AttendanceRecord) => r.attendance_status === 'Holiday');
      const friday = records.filter((r: AttendanceRecord) => r.attendance_status === 'Friday');
      const leave = records.filter((r: AttendanceRecord) => r.attendance_status === 'Leave');
      const present = records.filter((r: AttendanceRecord) => r.attendance_status === 'Present' || r.attendance_status === 'In' || r.attendance_status === 'Out');

      setAbsentDetails(absent);
      setHolidayDetails(holiday);
      setFridayDetails(friday);
      setLeaveDetails(leave);
      setPresentDetails(present);

      // Calculate payroll
      calculatePayroll(records);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  }

  function calculatePayroll(records: AttendanceRecord[]) {
    if (!employee) return;

    // Calculate shift duration in hours
    const [startHour, startMin] = employee.start_time.split(':').map(Number);
    const [endHour, endMin] = employee.end_time.split(':').map(Number);
    const shiftDurationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    const shiftDurationHours = shiftDurationMinutes / 60;

    // Total salary (monthly + daily*30 + weekly*4)
    const totalSalary = employee.monthly_salary + (employee.daily_salary * 30) + (employee.weekly_salary * 4);

    // Count absents (shift and daily)
    const absentShift = records.filter(r => r.attendance_status === 'Absent').length;
    const absentDaily = absentShift; // Same as shift count

    // Calculate total hours (1 day = 12 hours as per requirement)
    const totalDays = records.length;
    const totalHours = totalDays * 12;

    // Per hour rate
    const perHour = totalHours > 0 ? totalSalary / totalHours : 0;

    // Calculate actual working hours from present records
    let totalWorkingMinutes = 0;
    records.forEach(record => {
      if (record.working_hours) {
        // Parse format "10h 40m" or "HH:MM"
        if (record.working_hours.includes('h')) {
          const hourMatch = record.working_hours.match(/(\d+)h/);
          const minMatch = record.working_hours.match(/(\d+)m/);
          const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
          const mins = minMatch ? parseInt(minMatch[1]) : 0;
          totalWorkingMinutes += (hours * 60 + mins);
        } else {
          const [hours, mins] = record.working_hours.split(':').map(Number);
          totalWorkingMinutes += (hours * 60 + mins);
        }
      }
    });

    const totalWorkingHours = totalWorkingMinutes / 60;

    setCalculations({
      totalSalary,
      absentShift,
      absentDaily,
      totalHours,
      perHour,
      totalWorkingHours,
    });
  }

  async function handleFetchData() {
    if (!empId) {
      setError('Please enter Employee ID');
      return;
    }
    if (!fromDate || !toDate) {
      setError('Please select both From and To dates');
      return;
    }
    
    await fetchEmployeeDetails(empId);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">💰 Payroll Manual</h1>
          <p className="text-gray-600">Calculate employee payroll based on attendance records</p>
          <p className="text-sm text-blue-600 font-medium mt-1">📌 1 Day Count = 12 Hours</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border-2 border-red-200 p-4 text-red-700">
            ⚠️ {error}
          </div>
        )}

        {/* Main Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side - Details Lists */}
          <div className="lg:col-span-2 space-y-4">
            {/* Absent Details */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-red-200 overflow-hidden">
              <div className="bg-red-50 px-4 py-3 border-b-2 border-red-200">
                <h3 className="text-lg font-bold text-red-900">
                  🚫 Employee Absent Details
                  <span className="ml-3 text-2xl font-bold">{absentDetails.length}</span>
                  <span className="ml-2 text-sm font-normal">({absentDetails.length * 12}h)</span>
                </h3>
              </div>
              <div className="p-4">
                {absentDetails.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No absent records</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Date</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {absentDetails.map((record, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm text-gray-900">{format(new Date(record.attendance_date), 'MMM dd, yyyy')}</td>
                            <td className="px-3 py-2 text-sm"><span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">{record.attendance_status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Holiday Details */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-purple-200 overflow-hidden">
              <div className="bg-purple-50 px-4 py-3 border-b-2 border-purple-200">
                <h3 className="text-lg font-bold text-purple-900">
                  🎉 Employee Holiday Details
                  <span className="ml-3 text-2xl font-bold">{holidayDetails.length}</span>
                  <span className="ml-2 text-sm font-normal">({holidayDetails.length * 12}h)</span>
                </h3>
              </div>
              <div className="p-4">
                {holidayDetails.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No holiday records</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Date</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {holidayDetails.map((record, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm text-gray-900">{format(new Date(record.attendance_date), 'MMM dd, yyyy')}</td>
                            <td className="px-3 py-2 text-sm"><span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">{record.attendance_status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Leave Details */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-yellow-200 overflow-hidden">
              <div className="bg-yellow-50 px-4 py-3 border-b-2 border-yellow-200">
                <h3 className="text-lg font-bold text-yellow-900">
                  📋 Employee Leave Details
                  <span className="ml-3 text-2xl font-bold">{leaveDetails.length}</span>
                  <span className="ml-2 text-sm font-normal">({leaveDetails.length * 12}h)</span>
                </h3>
              </div>
              <div className="p-4">
                {leaveDetails.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No leave records</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Date</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {leaveDetails.map((record, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm text-gray-900">{format(new Date(record.attendance_date), 'MMM dd, yyyy')}</td>
                            <td className="px-3 py-2 text-sm"><span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">{record.attendance_status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Friday Details */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-blue-200 overflow-hidden">
              <div className="bg-blue-50 px-4 py-3 border-b-2 border-blue-200">
                <h3 className="text-lg font-bold text-blue-900">
                  📅 Employee Friday Details
                  <span className="ml-3 text-2xl font-bold">{fridayDetails.length}</span>
                  <span className="ml-2 text-sm font-normal">({fridayDetails.length * 12}h)</span>
                </h3>
              </div>
              <div className="p-4">
                {fridayDetails.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No Friday records</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Date</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {fridayDetails.map((record, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm text-gray-900">{format(new Date(record.attendance_date), 'MMM dd, yyyy')}</td>
                            <td className="px-3 py-2 text-sm"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">{record.attendance_status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Present Details */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-green-200 overflow-hidden">
              <div className="bg-green-50 px-4 py-3 border-b-2 border-green-200">
                <h3 className="text-lg font-bold text-green-900">
                  ✅ Employee Present Details
                  <span className="ml-3 text-2xl font-bold">{presentDetails.length}</span>
                </h3>
              </div>
              <div className="p-4">
                {presentDetails.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No present records</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Date</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Check In</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Check Out</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Hours</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {presentDetails.map((record, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm text-gray-900">{format(new Date(record.attendance_date), 'MMM dd, yyyy')}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{record.check_in_time ? format(new Date(record.check_in_time), 'hh:mm a') : '-'}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{record.check_out_time ? format(new Date(record.check_out_time), 'hh:mm a') : '-'}</td>
                            <td className="px-3 py-2 text-sm font-semibold text-green-600">{record.working_hours || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Salary & Calculations */}
          <div className="lg:col-span-1 space-y-4">
            {/* Employee Info Card */}
            {employee && (
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-2xl p-6 text-white">
                <div className="flex items-center mb-4">
                  {employee.image_url ? (
                    <img
                      src={employee.image_url}
                      alt={employee.full_name}
                      className="w-20 h-20 rounded-full border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center border-4 border-white">
                      <span className="text-3xl font-bold">{employee.full_name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="ml-4">
                    <h2 className="text-2xl font-bold">{employee.full_name}</h2>
                    <p className="text-blue-100">ID: {employee.emp_id}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm bg-white/10 rounded-lg p-3 backdrop-blur">
                  <div className="flex justify-between">
                    <span>Monthly:</span>
                    <span className="font-bold">Rs. {employee.monthly_salary.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Daily:</span>
                    <span className="font-bold">Rs. {employee.daily_salary.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Weekly:</span>
                    <span className="font-bold">Rs. {employee.weekly_salary.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/30 pt-2 mt-2">
                    <span>Work Time:</span>
                    <span className="font-bold">{employee.start_time} - {employee.end_time}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Date Range & Employee ID */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-blue-300 p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-4">📅 Select Date Range</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">From Date:</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">To Date:</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Employee ID:</label>
                  <input
                    type="text"
                    value={empId}
                    onChange={(e) => handleEmpIdChange(e.target.value)}
                    placeholder="Enter 4-digit ID"
                    maxLength={4}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-bold text-center"
                  />
                </div>
                <button
                  onClick={handleFetchData}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  {loading ? '⏳ Loading...' : '🔍 Fetch Data'}
                </button>
              </div>
            </div>

            {/* Calculations */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-green-300 p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-4">💵 Salary Calculations</h3>
              <div className="space-y-3">
                <div className="bg-green-50 rounded-lg p-3 border-2 border-green-200">
                  <div className="text-xs text-gray-600 mb-1">Total Salary</div>
                  <div className="text-2xl font-bold text-green-700">Rs. {calculations.totalSalary.toFixed(2)}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <div className="text-xs text-gray-600">Absent S()</div>
                    <div className="text-xl font-bold text-red-600">{calculations.absentShift}</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <div className="text-xs text-gray-600">Absent D()</div>
                    <div className="text-xl font-bold text-red-600">{calculations.absentDaily}</div>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="text-xs text-gray-600">Total Hours</div>
                  <div className="text-xl font-bold text-blue-700">{calculations.totalHours} hrs</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <div className="text-xs text-gray-600">Per Hour</div>
                  <div className="text-xl font-bold text-purple-700">Rs. {calculations.perHour.toFixed(2)}</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                  <div className="text-xs text-gray-600">T.WRK.HOUR</div>
                  <div className="text-xl font-bold text-yellow-700">{calculations.totalWorkingHours.toFixed(2)} hrs</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button className="bg-white border-2 border-gray-300 text-gray-700 font-bold py-3 px-4 rounded-lg hover:bg-gray-50 transition-all">
                🖨️ Print
              </button>
              <button className="bg-white border-2 border-gray-300 text-gray-700 font-bold py-3 px-4 rounded-lg hover:bg-gray-50 transition-all">
                🗑️ Clear
              </button>
              <button className="bg-white border-2 border-gray-300 text-gray-700 font-bold py-3 px-4 rounded-lg hover:bg-gray-50 transition-all">
                ❌ Close
              </button>
              <button className="bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:from-green-700 hover:to-teal-700 transition-all shadow-lg">
                👁️ View
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
