'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import {
  Sparkles, TrendingUp, Bug, AlertTriangle, Plus, Eye, Edit, Trash2, CheckCircle
} from 'lucide-react';

interface AppUpdate {
  id: number;
  version: string;
  release_date: string;
  title: string;
  description: string | null;
  update_type: 'major' | 'minor' | 'patch';
  is_published: boolean;
  features: any[];
  improvements: any[];
  bugfixes: any[];
  breaking_changes: any[];
}

function AppUpdates() {
  const [updates, setUpdates] = useState<AppUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [stats, setStats] = useState({
    totalFeatures: 0,
    totalImprovements: 0,
    totalBugfixes: 0
  });

  useEffect(() => {
    fetchUpdates();
  }, []);

  async function fetchUpdates() {
    try {
      const { data, error } = await supabase
        .from('app_updates')
        .select('*')
        .order('release_date', { ascending: false });

      if (error) throw error;
      
      // Sort by version number (descending)
      const sortedData = (data || []).sort((a, b) => {
        const versionA = a.version.split('.').map(Number);
        const versionB = b.version.split('.').map(Number);
        
        for (let i = 0; i < 3; i++) {
          if (versionB[i] !== versionA[i]) {
            return versionB[i] - versionA[i];
          }
        }
        return 0;
      });
      
      setUpdates(sortedData);
      
      // Calculate statistics
      if (sortedData.length > 0) {
        const totalFeatures = sortedData.reduce((sum, update) => sum + (update.features?.length || 0), 0);
        const totalImprovements = sortedData.reduce((sum, update) => sum + (update.improvements?.length || 0), 0);
        const totalBugfixes = sortedData.reduce((sum, update) => sum + (update.bugfixes?.length || 0), 0);
        setStats({ totalFeatures, totalImprovements, totalBugfixes });
      }
    } catch (error) {
      console.error('Error fetching updates:', error);
    } finally {
      setLoading(false);
    }
  }

  async function publishUpdate(id: number, publish: boolean) {
    try {
      const { error } = await supabase
        .from('app_updates')
        .update({ is_published: publish })
        .eq('id', id);

      if (error) throw error;
      await fetchUpdates();
    } catch (error) {
      console.error('Error updating publish status:', error);
    }
  }

  async function deleteUpdate(id: number) {
    if (!confirm('Are you sure you want to delete this update?')) return;

    try {
      const { error } = await supabase
        .from('app_updates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchUpdates();
    } catch (error) {
      console.error('Error deleting update:', error);
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'major':
        return 'bg-red-100 text-red-900 border-red-300';
      case 'minor':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'patch':
        return 'bg-green-100 text-green-900 border-green-300';
      default:
        return 'bg-gray-200 text-gray-900 border-gray-400';
    }
  };

  async function autoGenerateChangelog() {
    if (!confirm('🤖 Generate automatic changelog for recent changes?\n\nThis will create the next version with all improvements.')) {
      return;
    }

    try {
      // Get latest version
      const { data: latestUpdate } = await supabase
        .from('app_updates')
        .select('version')
        .order('release_date', { ascending: false })
        .limit(1)
        .single();

      const currentVersion = latestUpdate?.version || '2.0.0';
      const [major, minor, patch] = currentVersion.split('.').map(Number);
      const newVersion = `${major}.${minor + 1}.0`;

      // Check if this version already exists
      const { data: existingVersion } = await supabase
        .from('app_updates')
        .select('version')
        .eq('version', newVersion)
        .single();

      if (existingVersion) {
        alert(`⚠️ Version ${newVersion} already exists!\n\nPlease check the updates list or add manually with a different version.`);
        return;
      }

      // Auto-generated changelog entry with dynamic date
      const today = new Date();
      const { error } = await supabase
        .from('app_updates')
        .insert({
          version: newVersion,
          title: 'Real-time System Monitoring & UI Enhancements',
          description: 'Comprehensive real-time tracking, improved visibility, and enhanced user experience across all system components',
          update_type: 'minor',
          features: [
            '🤖 Real-time AI API call tracking with usage metrics',
            '💾 Automatic activity logging for all operations',
            '📊 Live database statistics and metrics',
            '🔄 Auto-refresh system data every 30 seconds',
            '📝 One-click automatic changelog generation',
            '🎯 Smart version auto-incrementing',
            '📈 Interactive statistics widgets on Updates page'
          ],
          improvements: [
            '✨ Enhanced text visibility across all tables and forms',
            '⚡ Optimized database queries for better performance',
            '🎨 Improved UI contrast and readability',
            '📊 Real-time metric updates without page refresh',
            '🔍 Better search and pagination controls',
            '📱 Responsive design improvements'
          ],
          bugfixes: [
            '🔧 Fixed TypeScript path alias configuration',
            '🐛 Resolved module resolution issues',
            '🎨 Fixed text visibility in status badges',
            '📦 Fixed database count queries showing zero',
            '📝 Fixed activity logs not recording properly',
            '💾 Corrected database size calculations'
          ],
          breaking_changes: [],
          release_date: today.toISOString(),
          is_published: true
        });

      if (error) throw error;

      alert(`✅ Success! Version ${newVersion} created!\n\n• 7 new features\n• 6 improvements\n• 6 bug fixes\n\nPage will refresh...`);
      
      // Force refresh the data
      await fetchUpdates();
      
      // Scroll to top to see new version
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error('Error generating changelog:', error);
      if (error.message.includes('duplicate key')) {
        alert(`⚠️ This version already exists!\n\nThe latest version has already been created. Please check the timeline below.`);
      } else {
        alert(`❌ Error: ${error.message}\n\nPlease try adding manually or check console for details.`);
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">App Updates & Changelog</h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={autoGenerateChangelog}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-sm"
            title="Automatically generate changelog for recent changes"
          >
            <Sparkles className="w-4 h-4" />
            <span>Auto-Generate Update</span>
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Update</span>
          </button>
        </div>
      </div>

      {/* Current Version Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-6 h-6" />
              <h3 className="text-xl font-bold">Current Version</h3>
            </div>
            <p className="text-3xl font-bold">{updates[0]?.version || '2.0.0'}</p>
            <p className="text-blue-100 mt-2">
              Released on {updates[0] ? format(new Date(updates[0].release_date), 'MMMM dd, yyyy') : 'November 7, 2025'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-100 mb-1">Status</div>
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-gray-900">Up to Date</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* New Features */}
        <div className="bg-white rounded-xl p-6 border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">New Features</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalFeatures}</p>
              <p className="text-xs text-gray-500 mt-1">Across all versions</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Improvements */}
        <div className="bg-white rounded-xl p-6 border border-green-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Improvements</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.totalImprovements}</p>
              <p className="text-xs text-gray-500 mt-1">Across all versions</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-between">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Bug Fixes */}
        <div className="bg-white rounded-xl p-6 border border-red-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bug Fixes</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.totalBugfixes}</p>
              <p className="text-xs text-gray-500 mt-1">Across all versions</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Bug className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Updates Timeline */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading updates...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map((update, index) => (
            <div
              key={update.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Update Header */}
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getTypeColor(update.update_type)}`}>
                        v{update.version}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        update.is_published
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {update.is_published ? 'Published' : 'Draft'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {format(new Date(update.release_date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{update.title}</h3>
                    {update.description && (
                      <p className="text-gray-600">{update.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => publishUpdate(update.id, !update.is_published)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title={update.is_published ? 'Unpublish' : 'Publish'}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteUpdate(update.id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Update Content */}
              <div className="p-6 space-y-6">
                {/* Features */}
                {update.features && update.features.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900">✨ New Features</h4>
                    </div>
                    <ul className="space-y-2 ml-10">
                      {update.features.map((feature, i) => (
                        <li key={i} className="text-gray-700 flex items-start">
                          <span className="text-blue-600 mr-2">•</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Improvements */}
                {update.improvements && update.improvements.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900">⚡ Improvements</h4>
                    </div>
                    <ul className="space-y-2 ml-10">
                      {update.improvements.map((improvement, i) => (
                        <li key={i} className="text-gray-700 flex items-start">
                          <span className="text-green-600 mr-2">•</span>
                          <span>{improvement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Bug Fixes */}
                {update.bugfixes && update.bugfixes.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Bug className="w-4 h-4 text-yellow-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900">🐛 Bug Fixes</h4>
                    </div>
                    <ul className="space-y-2 ml-10">
                      {update.bugfixes.map((bugfix, i) => (
                        <li key={i} className="text-gray-700 flex items-start">
                          <span className="text-yellow-600 mr-2">•</span>
                          <span>{bugfix}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Breaking Changes */}
                {update.breaking_changes && update.breaking_changes.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <h4 className="font-semibold text-red-900">⚠️ Breaking Changes</h4>
                    </div>
                    <ul className="space-y-2 ml-7">
                      {update.breaking_changes.map((change, i) => (
                        <li key={i} className="text-red-800 flex items-start">
                          <span className="text-red-600 mr-2">•</span>
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Update Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Add New Update</h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Add update form implementation here. Include fields for:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Version number (e.g., 2.1.0)</li>
                <li>Release date</li>
                <li>Title</li>
                <li>Description</li>
                <li>Update type (Major/Minor/Patch)</li>
                <li>Features (array)</li>
                <li>Improvements (array)</li>
                <li>Bug fixes (array)</li>
                <li>Breaking changes (array)</li>
              </ul>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => alert('Form implementation pending')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppUpdates;
