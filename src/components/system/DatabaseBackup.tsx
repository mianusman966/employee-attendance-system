'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Database, Download, Upload, AlertCircle, CheckCircle,
  Clock, HardDrive, Trash2, Play
} from 'lucide-react';
import { format } from 'date-fns';
import { saveAs } from 'file-saver';

interface BackupRecord {
  id: number;
  created_at: string;
  backup_type: 'manual' | 'automatic' | 'scheduled';
  file_name: string;
  file_size_mb: number;
  status: 'pending' | 'completed' | 'failed';
  records_count: number;
}

export default function DatabaseBackup() {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    fetchBackups();
  }, []);

  async function fetchBackups() {
    try {
      const { data, error } = await supabase
        .from('backup_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setBackups(data || []);
    } catch (error) {
      console.error('Error fetching backups:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createBackup() {
    setCreating(true);
    try {
      // Fetch all data from key tables
      const [employees, attendance, departments, profiles] = await Promise.all([
        supabase.from('employees').select('*'),
        supabase.from('attendance_records').select('*'),
        supabase.from('departments').select('*'),
        supabase.from('profiles').select('*')
      ]);

      // Create backup object
      const backup = {
        timestamp: new Date().toISOString(),
        tables: {
          employees: employees.data || [],
          attendance_records: attendance.data || [],
          departments: departments.data || [],
          profiles: profiles.data || []
        },
        metadata: {
          version: '2.0.0',
          recordCount: (employees.data?.length || 0) + 
                      (attendance.data?.length || 0) + 
                      (departments.data?.length || 0) + 
                      (profiles.data?.length || 0)
        }
      };

      // Convert to JSON and create file
      const jsonString = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const fileName = `backup_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.json`;

      // Calculate file size
      const fileSizeMB = blob.size / (1024 * 1024);

      // Save to backup_history
      const { error: insertError } = await supabase
        .from('backup_history')
        .insert({
          backup_type: 'manual',
          file_name: fileName,
          file_size_mb: parseFloat(fileSizeMB.toFixed(2)),
          status: 'completed',
          records_count: backup.metadata.recordCount,
          tables_included: ['employees', 'attendance_records', 'departments', 'profiles']
        });

      if (insertError) throw insertError;

      // ✅ LOG ACTIVITY: Track backup creation
      try {
        await supabase.rpc('log_activity', {
          p_user_id: (await supabase.auth.getUser()).data.user?.id,
          p_action: 'create_backup',
          p_resource: 'database_backup',
          p_details: {
            fileName: fileName,
            fileSizeMB: parseFloat(fileSizeMB.toFixed(2)),
            recordCount: backup.metadata.recordCount,
            tables: ['employees', 'attendance_records', 'departments', 'profiles']
          }
        });
      } catch (logError) {
        console.error('Error logging backup activity:', logError);
        // Don't fail the main operation if logging fails
      }

      // Download the backup file
      saveAs(blob, fileName);

      // Refresh backup list
      await fetchBackups();

      alert('✅ Backup created successfully!');
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('❌ Failed to create backup. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  async function deleteBackup(id: number) {
    if (!confirm('Are you sure you want to delete this backup?')) return;

    try {
      const { error } = await supabase
        .from('backup_history')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchBackups();
      alert('✅ Backup deleted successfully!');
    } catch (error) {
      console.error('Error deleting backup:', error);
      alert('❌ Failed to delete backup.');
    }
  }

  function handleRestoreFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      alert('❌ Please select a valid JSON backup file.');
      return;
    }

    if (confirm('⚠️ WARNING: This will replace all current data! Are you absolutely sure?')) {
      setRestoring(true);
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const backup = JSON.parse(e.target?.result as string);
          
          // Validate backup structure
          if (!backup.tables || !backup.timestamp) {
            throw new Error('Invalid backup file format');
          }

          alert('Restore functionality is in development. This will be implemented with proper data validation and rollback capability for safety.');
          
          // TODO: Implement restore with proper validation and rollback
          // 1. Validate all data
          // 2. Create a backup before restore
          // 3. Delete existing data
          // 4. Insert backup data
          // 5. Verify integrity
          
        } catch (error) {
          console.error('Error restoring backup:', error);
          alert('❌ Failed to restore backup. Invalid file format.');
        } finally {
          setRestoring(false);
        }
      };
      
      reader.readAsText(file);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Database Backup & Restore</h2>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Backup */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-blue-600 rounded-lg">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Create Backup</h3>
              <p className="text-sm text-gray-600">Download complete database backup</p>
            </div>
          </div>
          <p className="text-sm text-gray-700 mb-4">
            Creates a JSON backup file containing all employees, attendance records, departments, and profiles.
          </p>
          <button
            onClick={createBackup}
            disabled={creating}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {creating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Creating backup...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Create Backup Now</span>
              </>
            )}
          </button>
        </div>

        {/* Restore Backup */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-amber-600 rounded-lg">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Restore Backup</h3>
              <p className="text-sm text-gray-600">Restore from backup file</p>
            </div>
          </div>
          <div className="bg-amber-200 border border-amber-300 rounded-lg p-3 mb-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900">
                <strong>Warning:</strong> Restore will replace all current data. Create a backup before proceeding.
              </p>
            </div>
          </div>
          <label className="w-full py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center space-x-2 cursor-pointer">
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreFile}
              className="hidden"
              disabled={restoring}
            />
            {restoring ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Restoring...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Select Backup File</span>
              </>
            )}
          </label>
        </div>
      </div>

      {/* Backup History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Backup History</h3>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading backup history...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No backups found</p>
            <p className="text-sm mt-2">Create your first backup to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {backups.map((backup) => (
              <div key={backup.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={`p-3 rounded-lg ${
                      backup.status === 'completed' ? 'bg-green-100' :
                      backup.status === 'failed' ? 'bg-red-100' : 'bg-yellow-100'
                    }`}>
                      {backup.status === 'completed' ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : backup.status === 'failed' ? (
                        <AlertCircle className="w-6 h-6 text-red-600" />
                      ) : (
                        <Clock className="w-6 h-6 text-yellow-600" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">
                        {backup.file_name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{format(new Date(backup.created_at), 'MMM dd, yyyy HH:mm')}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <HardDrive className="w-3 h-3" />
                          <span>{backup.file_size_mb.toFixed(2)} MB</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Database className="w-3 h-3" />
                          <span>{backup.records_count.toLocaleString()} records</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded font-medium ${
                          backup.backup_type === 'manual' ? 'bg-blue-100 text-blue-800' :
                          backup.backup_type === 'automatic' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {backup.backup_type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => alert('Download from backup_history (implement file storage)')}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Download backup"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteBackup(backup.id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete backup"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scheduled Backups Info */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6">
        <div className="flex items-start space-x-3">
          <Play className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Automatic Backups</h4>
            <p className="text-sm text-gray-700 mb-3">
              Set up automatic daily backups to protect your data. Configure in Supabase Dashboard → Database → Cron Jobs.
            </p>
            <code className="text-xs bg-gray-900 text-green-400 px-3 py-2 rounded block">
              {`-- Schedule daily backup at 2 AM\nSELECT cron.schedule('daily-backup', '0 2 * * *', $$...$$ )`}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
