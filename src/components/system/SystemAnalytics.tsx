'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Database, Cpu, Activity } from 'lucide-react';

interface ChartData {
  name: string;
  value?: number;
  errors?: number;
  activities?: number;
  [key: string]: any;
}

export default function SystemAnalytics() {
  const [loading, setLoading] = useState(true);
  const [errorTrends, setErrorTrends] = useState<ChartData[]>([]);
  const [activityTrends, setActivityTrends] = useState<ChartData[]>([]);
  const [errorDistribution, setErrorDistribution] = useState<ChartData[]>([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  async function fetchAnalyticsData() {
    try {
      // Fetch last 7 days error trends
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const errorTrendsData = await Promise.all(
        last7Days.map(async (date) => {
          const { data } = await supabase
            .from('system_logs')
            .select('id', { count: 'exact', head: true })
            .eq('level', 'error')
            .gte('created_at', date)
            .lt('created_at', new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000).toISOString());

          return {
            name: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            errors: data?.length || 0
          };
        })
      );

      const activityTrendsData = await Promise.all(
        last7Days.map(async (date) => {
          const { data } = await supabase
            .from('activity_logs')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', date)
            .lt('created_at', new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000).toISOString());

          return {
            name: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            activities: data?.length || 0
          };
        })
      );

      // Fetch error distribution by component
      const { data: errorsByComponent } = await supabase
        .from('system_logs')
        .select('component')
        .eq('level', 'error')
        .gte('created_at', last7Days[0]);

      const componentCounts: { [key: string]: number } = {};
      errorsByComponent?.forEach((log: any) => {
        componentCounts[log.component] = (componentCounts[log.component] || 0) + 1;
      });

      const distributionData = Object.entries(componentCounts).map(([name, value]) => ({
        name,
        value
      }));

      setErrorTrends(errorTrendsData);
      setActivityTrends(activityTrendsData);
      setErrorDistribution(distributionData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">System Analytics</h2>

      {/* Error Trends */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-red-100 rounded-lg">
            <TrendingUp className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Error Trends (Last 7 Days)</h3>
            <p className="text-sm text-gray-600">Daily error count over time</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={errorTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="errors" 
              stroke="#EF4444" 
              strokeWidth={3}
              dot={{ fill: '#EF4444', r: 5 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Activity Trends */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Activity Trends (Last 7 Days)</h3>
            <p className="text-sm text-gray-600">User actions and system events</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={activityTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend />
            <Bar dataKey="activities" fill="#3B82F6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Error Distribution */}
      {errorDistribution.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Database className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Errors by Component</h3>
              <p className="text-sm text-gray-600">Distribution of errors across system components</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={errorDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name} (${((percent as number) * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {errorDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Component Breakdown</h4>
              {errorDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-gray-700 capitalize">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <Cpu className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-blue-900">98.5%</span>
          </div>
          <h4 className="text-sm font-semibold text-blue-900 mb-1">Uptime</h4>
          <p className="text-xs text-blue-700">Last 30 days</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold text-green-900">245ms</span>
          </div>
          <h4 className="text-sm font-semibold text-green-900 mb-1">Avg Response</h4>
          <p className="text-xs text-green-700">API response time</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <Database className="w-8 h-8 text-purple-600" />
            <span className="text-2xl font-bold text-purple-900">1.2GB</span>
          </div>
          <h4 className="text-sm font-semibold text-purple-900 mb-1">Data Transfer</h4>
          <p className="text-xs text-purple-700">This month</p>
        </div>
      </div>
    </div>
  );
}
