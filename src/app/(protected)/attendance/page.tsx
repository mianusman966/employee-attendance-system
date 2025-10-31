'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { getCurrentLocation } from '../../../lib/geolocation';
import { format } from 'date-fns';
import { DataTable } from '../../../components/common/DataTable';
import type { AttendanceRecord, Shift } from '../../../types/database';

export default function AttendancePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<'checked_in' | 'checked_out'>('checked_out');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShift, setSelectedShift] = useState<string>('');
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    fetchShifts();
    fetchAttendanceHistory();
    checkCurrentStatus();
  }, [user]);

  async function fetchShifts() {
    try {
      const { data, error } = await supabase.from('shifts').select('*');
      if (error) throw error;
      setShifts(data || []);
      if (data && data.length > 0) {
        setSelectedShift(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching shifts:', error);
    }
  }

  async function checkCurrentStatus() {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('attendance_records')
        .select('status')
        .eq('user_id', user.id)
        .gte('timestamp', today)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setCurrentStatus(data[0].status);
      }
    } catch (error) {
      console.error('Error checking current status:', error);
    }
  }

  async function fetchAttendanceHistory() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*, shifts(name)')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAttendanceHistory(data || []);
    } catch (error) {
      console.error('Error fetching attendance history:', error);
    }
  }

  async function handleAttendance() {
    if (!user) return;
    setError(null);
    setLoading(true);

    try {
      const location = await getCurrentLocation();
      const newStatus = currentStatus === 'checked_in' ? 'checked_out' : 'checked_in';

      const { error } = await supabase.from('attendance_records').insert({
        user_id: user.id,
        status: newStatus,
        location_lat: location.lat,
        location_long: location.long,
        shift_id: selectedShift,
      });

      if (error) throw error;

      setCurrentStatus(newStatus);
      fetchAttendanceHistory();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    {
      accessorKey: 'timestamp',
      header: 'Date & Time',
      cell: ({ row }: any) =>
        format(new Date(row.original.timestamp), 'MMM dd, yyyy HH:mm'),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => (
        <span
          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
            row.original.status === 'checked_in'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      accessorFn: (row: any) => row.shifts?.name,
      header: 'Shift',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Attendance</h1>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Select Shift
            </label>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name} ({format(new Date(`2000-01-01T${shift.start_time}`), 'HH:mm')} - 
                   {format(new Date(`2000-01-01T${shift.end_time}`), 'HH:mm')})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleAttendance}
            disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              currentStatus === 'checked_in'
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
            } disabled:opacity-50`}
          >
            {loading
              ? 'Processing...'
              : currentStatus === 'checked_in'
              ? 'Check Out'
              : 'Check In'}
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
        </div>
        <DataTable columns={columns} data={attendanceHistory} />
      </div>
    </div>
  );
}