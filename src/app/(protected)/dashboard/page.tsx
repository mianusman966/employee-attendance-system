'use client';

import { StatsCard } from '../../../components/dashboard/StatsCard';
import { supabase } from '../../../lib/supabase';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    leaveRequests: 0,
    attendanceRate: 0,
  });
  const [attendanceData, setAttendanceData] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      // Get total employees
      const { count: totalEmployees } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'employee');

      // Get present employees today
      const today = new Date().toISOString().split('T')[0];
      const { count: presentToday } = await supabase
        .from('attendance_records')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'checked_in')
        .gte('timestamp', today);

      // Get pending leave requests
      const { count: leaveRequests } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Calculate attendance rate
      const attendanceRate = totalEmployees
        ? Math.round((presentToday / totalEmployees) * 100)
        : 0;

      setStats({
        totalEmployees: totalEmployees || 0,
        presentToday: presentToday || 0,
        leaveRequests: leaveRequests || 0,
        attendanceRate,
      });

      // Fetch attendance data for the chart (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: attendanceHistory } = await supabase
        .from('attendance_records')
        .select('timestamp')
        .gte('timestamp', sevenDaysAgo.toISOString())
        .order('timestamp');

      // Process data for chart
      const dailyAttendance = (attendanceHistory || []).reduce((acc: any, record) => {
        const date = format(new Date(record.timestamp), 'MMM dd');
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const chartData = Object.entries(dailyAttendance).map(([date, count]) => ({
        date,
        attendance: count,
      }));

      setAttendanceData(chartData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      </div>

      <StatsCard
        stats={[
          { name: 'Total Employees', value: stats.totalEmployees },
          { name: 'Present Today', value: stats.presentToday },
          { name: 'Pending Leave Requests', value: stats.leaveRequests },
          { name: 'Attendance Rate', value: `${stats.attendanceRate}%` },
        ]}
      />

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Attendance Trend (Last 7 Days)
        </h2>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={attendanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="attendance"
                stroke="#4F46E5"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}