import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { useThemeStore } from '../stores/themeStore';

interface ModernDashboardProps {
  className?: string;
}

export function ModernDashboard({ className = '' }: ModernDashboardProps) {
  const { t } = useTranslation();
  const { isDark } = useThemeStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMetric, setSelectedMetric] = useState('performance');

  // Modern dashboard data
  const [metrics, setMetrics] = useState({
    performance: 92,
    efficiency: 87,
    productivity: 95,
    accuracy: 91,
  });

  const [activities, setActivities] = useState([
    { id: 1, type: 'task', title: 'Completed data analysis', time: '2 min ago', status: 'success' },
    { id: 2, type: 'agent', title: 'AI agent started optimization', time: '5 min ago', status: 'running' },
    { id: 3, type: 'system', title: 'System backup completed', time: '15 min ago', status: 'success' },
    { id: 4, type: 'error', title: 'Failed to connect to external API', time: '30 min ago', status: 'error' },
  ]);

  const [quickActions] = useState([
    { id: 1, icon: '🤖', title: 'Start AI Assistant', description: 'Launch intelligent task automation', color: 'blue' },
    { id: 2, icon: '📊', title: 'Generate Report', description: 'Create comprehensive analytics report', color: 'green' },
    { id: 3, icon: '🔧', title: 'System Diagnostics', description: 'Run complete system health check', color: 'purple' },
    { id: 4, icon: '📁', title: 'File Manager', description: 'Organize and manage project files', color: 'orange' },
  ]);

  const [systemStats, setSystemStats] = useState({
    cpu: 15,
    memory: 45,
    disk: 67,
    network: 89,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStats(prev => ({
        cpu: Math.max(5, Math.min(95, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(20, Math.min(85, prev.memory + (Math.random() - 0.5) * 5)),
        disk: prev.disk,
        network: Math.max(50, Math.min(100, prev.network + (Math.random() - 0.5) * 15)),
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-500';
      case 'running': return 'text-blue-500';
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getProgressColor = (value: number) => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'performance', label: 'Performance', icon: '⚡' },
    { id: 'agents', label: 'AI Agents', icon: '🤖' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
  ];

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to TaskFlow</h1>
          <p className="text-muted-foreground">Your intelligent workflow automation platform</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            🚀 Quick Start
          </button>
          <button className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors">
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(metrics).map(([key, value]) => (
              <div key={key} className="bg-card rounded-xl p-6 border border-border">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-muted-foreground capitalize">{key}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    value >= 90 ? 'bg-green-100 text-green-700' : 
                    value >= 70 ? 'bg-yellow-100 text-yellow-700' : 
                    'bg-red-100 text-red-700'
                  }`}>
                    {value >= 90 ? 'Excellent' : value >= 70 ? 'Good' : 'Needs Attention'}
                  </span>
                </div>
                <div className="text-3xl font-bold text-foreground mb-2">{value}%</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(value)}`}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  className="p-4 bg-card rounded-xl border border-border hover:border-primary transition-all hover:shadow-lg text-left"
                >
                  <div className={`w-12 h-12 rounded-lg bg-${action.color}-100 flex items-center justify-center mb-3`}>
                    <span className="text-2xl">{action.icon}</span>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(activity.status)}`} />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Stats */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">System Resources</h2>
              <div className="space-y-4">
                {Object.entries(systemStats).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground capitalize">{key}</span>
                      <span className="text-sm text-foreground">{value}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(value)}`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="bg-card rounded-xl p-6 border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Performance Metrics</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-medium text-foreground">Task Completion Rate</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Daily Average</span>
                    <span>87%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Weekly Average</span>
                    <span>91%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Monthly Average</span>
                    <span>89%</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-medium text-foreground">Agent Performance</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Response Time</span>
                    <span>1.2s</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Success Rate</span>
                    <span>94%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Error Rate</span>
                    <span>2%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'agents' && (
        <div className="space-y-6">
          <div className="bg-card rounded-xl p-6 border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">AI Agents Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: 'Data Analyst', status: 'active', tasks: 12, efficiency: 92 },
                { name: 'Code Reviewer', status: 'idle', tasks: 8, efficiency: 88 },
                { name: 'Content Generator', status: 'active', tasks: 15, efficiency: 95 },
                { name: 'System Monitor', status: 'active', tasks: 6, efficiency: 90 },
                { name: 'Research Assistant', status: 'idle', tasks: 10, efficiency: 85 },
                { name: 'Quality Checker', status: 'active', tasks: 9, efficiency: 93 },
              ].map((agent, index) => (
                <div key={index} className="p-4 bg-accent rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-foreground">{agent.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      agent.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {agent.status}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tasks</span>
                      <span className="text-foreground">{agent.tasks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Efficiency</span>
                      <span className="text-foreground">{agent.efficiency}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-card rounded-xl p-6 border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Analytics Overview</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-medium text-foreground">Task Distribution</h3>
                <div className="space-y-2">
                  {[
                    { category: 'Data Processing', percentage: 35 },
                    { category: 'Code Review', percentage: 25 },
                    { category: 'Content Creation', percentage: 20 },
                    { category: 'System Maintenance', percentage: 15 },
                    { category: 'Research', percentage: 5 },
                  ].map((item, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.category}</span>
                        <span className="text-foreground">{item.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-medium text-foreground">Productivity Trends</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">This Week</span>
                    <span className="text-green-500">↑ 12%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Week</span>
                    <span className="text-red-500">↓ 3%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">This Month</span>
                    <span className="text-green-500">↑ 8%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Month</span>
                    <span className="text-green-500">↑ 5%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
