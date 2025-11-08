'use client';

import { useState } from 'react';
import { Activity, BarChart3, Database, FileText, Bell, Shield } from 'lucide-react';

// Tab Components (we'll create these next)
import SystemOverview from '@/components/system/SystemOverview';
import SystemAnalytics from '@/components/system/SystemAnalytics';
import SystemLogs from '@/components/system/SystemLogs';
import DatabaseBackup from '@/components/system/DatabaseBackup';
import AppUpdates from '@/components/system/AppUpdates';

type TabType = 'overview' | 'analytics' | 'logs' | 'backups' | 'updates';

interface Tab {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export default function SystemPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs: Tab[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <BarChart3 className="w-5 h-5" />,
      description: 'System health and quick stats'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <Activity className="w-5 h-5" />,
      description: 'Detailed metrics and charts'
    },
    {
      id: 'logs',
      label: 'Logs',
      icon: <FileText className="w-5 h-5" />,
      description: 'Error tracking and activity logs'
    },
    {
      id: 'backups',
      label: 'Backups',
      icon: <Database className="w-5 h-5" />,
      description: 'Database backup and restore'
    },
    {
      id: 'updates',
      label: 'Updates',
      icon: <Bell className="w-5 h-5" />,
      description: 'Version history and changelog'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <SystemOverview />;
      case 'analytics':
        return <SystemAnalytics />;
      case 'logs':
        return <SystemLogs />;
      case 'backups':
        return <DatabaseBackup />;
      case 'updates':
        return <AppUpdates />;
      default:
        return <SystemOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                System Administration
              </h1>
              <p className="text-gray-600 mt-1">
                Monitor, manage, and maintain your application
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    group relative min-w-0 flex-1 overflow-hidden py-4 px-4 text-sm font-medium text-center
                    hover:bg-gray-50 focus:z-10 transition-all duration-200
                    ${isActive 
                      ? 'text-blue-600 border-b-2 border-blue-600' 
                      : 'text-gray-600 hover:text-gray-900 border-b-2 border-transparent'
                    }
                  `}
                  aria-current={isActive ? 'page' : undefined}
                  title={tab.description}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span className={isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'}>
                      {tab.icon}
                    </span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </div>
                  
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-fadeIn">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
