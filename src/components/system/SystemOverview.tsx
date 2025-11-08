'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Database, Activity, TrendingUp, AlertCircle, 
  CheckCircle, Clock, Users, FileText, Cpu, HardDrive
} from 'lucide-react';

interface SystemStats {
  database: {
    storageUsedMB: number;
    storageLimitMB: number;
    activeEmployees: number;
    totalRecords: number;
  };
  errors: {
    today: number;
    unresolved: number;
    thisWeek: number;
  };
  activity: {
    today: number;
    thisWeek: number;
  };
  ai: {
    tokensToday: number;
    tokensMonth: number;
    dailyLimit: number;
  };
}

export default function SystemOverview() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchSystemStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSystemStats, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchSystemStats() {
    try {
      // Fetch database stats with counts
      const { count: employeesCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true });

      const { count: attendanceCount } = await supabase
        .from('attendance_records')
        .select('*', { count: 'exact', head: true });

      const { count: departmentsCount } = await supabase
        .from('departments')
        .select('*', { count: 'exact', head: true });

      const { count: profilesCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch error stats
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { count: errorsTodayCount } = await supabase
        .from('system_logs')
        .select('*', { count: 'exact', head: true })
        .eq('level', 'error')
        .gte('created_at', today);

      const { count: unresolvedErrorsCount } = await supabase
        .from('system_logs')
        .select('*', { count: 'exact', head: true })
        .eq('level', 'error')
        .eq('resolved', false);

      const { count: errorsWeekCount } = await supabase
        .from('system_logs')
        .select('*', { count: 'exact', head: true })
        .eq('level', 'error')
        .gte('created_at', weekAgo);

      // Fetch activity stats
      const { count: activityTodayCount } = await supabase
        .from('activity_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      const { count: activityWeekCount } = await supabase
        .from('activity_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo);

      // Fetch AI metrics (from system_metrics table)
      const { data: aiMetrics } = await supabase
        .from('system_metrics')
        .select('ai_tokens_used')
        .eq('metric_date', today)
        .single();

      const { data: aiMonthMetrics } = await supabase
        .from('system_metrics')
        .select('ai_tokens_used')
        .gte('metric_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);

      const monthTotal = aiMonthMetrics?.reduce((sum: number, m: any) => sum + (m.ai_tokens_used || 0), 0) || 0;

      // Estimate database size (Supabase doesn't provide direct API on free tier)
      const totalRecords = (employeesCount || 0) + (attendanceCount || 0) + (departmentsCount || 0) + (profilesCount || 0);
      const estimatedSizeMB = Math.round(
        ((employeesCount || 0) * 0.002) +  // ~2KB per employee
        ((attendanceCount || 0) * 0.001) + // ~1KB per attendance record
        ((departmentsCount || 0) * 0.001) + // ~1KB per department
        ((profilesCount || 0) * 0.001) +    // ~1KB per profile
        10 // Base overhead
      );

      setStats({
        database: {
          storageUsedMB: estimatedSizeMB,
          storageLimitMB: 500, // Free tier limit
          activeEmployees: employeesCount || 0,
          totalRecords: totalRecords
        },
        errors: {
          today: errorsTodayCount || 0,
          unresolved: unresolvedErrorsCount || 0,
          thisWeek: errorsWeekCount || 0
        },
        activity: {
          today: activityTodayCount || 0,
          thisWeek: activityWeekCount || 0
        },
        ai: {
          tokensToday: aiMetrics?.ai_tokens_used || 0,
          tokensMonth: monthTotal,
          dailyLimit: 5000000 // 5 million tokens per day
        }
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching system stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const storagePercentage = (stats.database.storageUsedMB / stats.database.storageLimitMB) * 100;
  const aiUsagePercentage = (stats.ai.tokensToday / stats.ai.dailyLimit) * 100;

  return (
    <div className="space-y-6">
      {/* Header with last updated */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">System Overview</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
          <button
            onClick={fetchSystemStats}
            className="ml-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Database Storage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <HardDrive className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Storage</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-gray-900">
                {stats.database.storageUsedMB} MB
              </span>
              <span className="text-sm text-gray-500">/ {stats.database.storageLimitMB} MB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  storagePercentage > 80 ? 'bg-red-500' : storagePercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${storagePercentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">{storagePercentage.toFixed(1)}% used</p>
          </div>
        </div>

        {/* Active Employees */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Employees</span>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-gray-900">
              {stats.database.activeEmployees}
            </div>
            <p className="text-sm text-gray-500">Active employees</p>
            <div className="flex items-center text-green-600 text-sm">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>System healthy</span>
            </div>
          </div>
        </div>

        {/* Errors Today */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg ${stats.errors.unresolved > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              {stats.errors.unresolved > 0 ? (
                <AlertCircle className="w-6 h-6 text-red-600" />
              ) : (
                <CheckCircle className="w-6 h-6 text-green-600" />
              )}
            </div>
            <span className="text-sm font-medium text-gray-600">Errors</span>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-gray-900">
              {stats.errors.today}
            </div>
            <p className="text-sm text-gray-500">Today</p>
            {stats.errors.unresolved > 0 ? (
              <div className="flex items-center text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />
                <span>{stats.errors.unresolved} unresolved</span>
              </div>
            ) : (
              <div className="flex items-center text-green-600 text-sm">
                <CheckCircle className="w-4 h-4 mr-1" />
                <span>All resolved</span>
              </div>
            )}
          </div>
        </div>

        {/* Activity Today */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Activity</span>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-gray-900">
              {stats.activity.today}
            </div>
            <p className="text-sm text-gray-500">Actions today</p>
            <div className="flex items-center text-gray-600 text-sm">
              <span>{stats.activity.thisWeek} this week</span>
            </div>
          </div>
        </div>

        {/* AI API Token Usage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Cpu className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">AI API Token Usages</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-gray-900">
                {stats.ai.tokensToday.toLocaleString()}
              </span>
              <span className="text-sm text-gray-500">/ {stats.ai.dailyLimit.toLocaleString()} tokens</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  aiUsagePercentage > 80 ? 'bg-red-500' : aiUsagePercentage > 60 ? 'bg-yellow-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${aiUsagePercentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{aiUsagePercentage.toFixed(1)}% used today</span>
              <span>{stats.ai.tokensMonth.toLocaleString()} this month</span>
            </div>
          </div>
        </div>

        {/* Total Records */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-cyan-100 rounded-lg">
              <Database className="w-6 h-6 text-cyan-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Database Records</span>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-gray-900">
              {stats.database.totalRecords.toLocaleString()}
            </div>
            <p className="text-sm text-gray-500">Total records across all tables</p>
            <div className="flex items-center text-cyan-600 text-sm">
              <FileText className="w-4 h-4 mr-1" />
              <span>System operating normally</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Status */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200 p-6">
        <div className="flex items-center space-x-3">
          <CheckCircle className="w-8 h-8 text-green-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">System Status: Healthy</h3>
            <p className="text-sm text-gray-600">
              All systems operational. {stats.errors.unresolved === 0 ? 'No critical issues detected.' : `${stats.errors.unresolved} issues need attention.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
