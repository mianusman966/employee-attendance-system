'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  AlertCircle, CheckCircle, Info, AlertTriangle, 
  Search, Filter, Download, Eye, Check
} from 'lucide-react';
import { format } from 'date-fns';

interface SystemLog {
  id: number;
  created_at: string;
  level: 'error' | 'warning' | 'info' | 'debug';
  component: string;
  message: string;
  user_email: string | null;
  resolved: boolean;
  stack_trace: string | null;
}

interface ActivityLog {
  id: number;
  created_at: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_name: string | null;
  description: string;
}

type TabType = 'errors' | 'activity';

export default function SystemLogs() {
  const [activeTab, setActiveTab] = useState<TabType>('errors');
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [activeTab]);

  async function fetchLogs() {
    setLoading(true);
    try {
      if (activeTab === 'errors') {
        const { data, error } = await supabase
          .from('system_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        setSystemLogs(data || []);
      } else {
        const { data, error } = await supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        setActivityLogs(data || []);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsResolved(logId: number) {
    try {
      const { error } = await supabase
        .from('system_logs')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', logId);

      if (error) throw error;
      
      // Refresh logs
      fetchLogs();
      setSelectedLog(null);
    } catch (error) {
      console.error('Error marking as resolved:', error);
    }
  }

  function exportLogs() {
    const logs = activeTab === 'errors' ? systemLogs : activityLogs;
    const csv = [
      Object.keys(logs[0] || {}).join(','),
      ...logs.map(log => Object.values(log).map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}_logs_${new Date().toISOString()}.csv`;
    a.click();
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const filteredSystemLogs = systemLogs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.component.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  const filteredActivityLogs = activityLogs.filter(log =>
    log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">System Logs</h2>
        <button
          onClick={exportLogs}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('errors')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'errors'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Error Logs
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'activity'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Activity Logs
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {activeTab === 'errors' && (
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Levels</option>
                <option value="error">Errors Only</option>
                <option value="warning">Warnings Only</option>
                <option value="info">Info Only</option>
              </select>
            )}
          </div>
        </div>

        {/* Logs List */}
        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading logs...</p>
            </div>
          ) : activeTab === 'errors' ? (
            filteredSystemLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p>No error logs found</p>
              </div>
            ) : (
              filteredSystemLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    log.resolved ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getLevelIcon(log.level)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${
                            log.level === 'error' ? 'bg-red-100 text-red-800' :
                            log.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {log.level.toUpperCase()}
                          </span>
                          <span className="text-sm font-medium text-gray-700">{log.component}</span>
                          {log.resolved && (
                            <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
                              RESOLVED
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-900 mb-1">{log.message}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}</span>
                          {log.user_email && <span>User: {log.user_email}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {!log.resolved && (
                        <button
                          onClick={() => markAsResolved(log.id)}
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Mark as resolved"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            filteredActivityLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Info className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No activity logs found</p>
              </div>
            ) : (
              filteredActivityLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-blue-100 rounded">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 mb-1">{log.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}</span>
                        <span>By: {log.user_email}</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                          {log.resource_type}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Error Details</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">Level</label>
                <p className="mt-1">{selectedLog.level.toUpperCase()}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Component</label>
                <p className="mt-1">{selectedLog.component}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Message</label>
                <p className="mt-1">{selectedLog.message}</p>
              </div>
              {selectedLog.stack_trace && (
                <div>
                  <label className="text-sm font-semibold text-gray-700">Stack Trace</label>
                  <pre className="mt-1 p-4 bg-gray-900 text-green-400 rounded-lg text-xs overflow-x-auto">
                    {selectedLog.stack_trace}
                  </pre>
                </div>
              )}
              <div>
                <label className="text-sm font-semibold text-gray-700">Timestamp</label>
                <p className="mt-1">{format(new Date(selectedLog.created_at), 'PPpp')}</p>
              </div>
              {!selectedLog.resolved && (
                <button
                  onClick={() => markAsResolved(selectedLog.id)}
                  className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Mark as Resolved
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
