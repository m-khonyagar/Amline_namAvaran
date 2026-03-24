import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { useThemeStore } from '../stores/themeStore';

interface Process {
  id: string;
  name: string;
  pid: number;
  cpu: number;
  memory: number;
  status: 'running' | 'suspended' | 'stopped';
  type: 'system' | 'user' | 'agent';
  startTime: Date;
  path?: string;
}

interface WindowsTaskManagerProps {
  className?: string;
}

export function WindowsTaskManager({ className = '' }: WindowsTaskManagerProps) {
  const { t } = useTranslation();
  const { isDark } = useThemeStore();
  const [activeTab, setActiveTab] = useState('processes');
  const [processes, setProcesses] = useState<Process[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'cpu' | 'memory' | 'pid'>('cpu');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);
  const [systemStats, setSystemStats] = useState({
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0,
    uptime: 0,
  });

  useEffect(() => {
    // Simulate process data
    const mockProcesses: Process[] = [
      { id: '1', name: 'TaskFlow Desktop', pid: 1234, cpu: 15, memory: 245, status: 'running', type: 'user', startTime: new Date(Date.now() - 3600000) },
      { id: '2', name: 'AI Agent - Data Analyst', pid: 5678, cpu: 25, memory: 512, status: 'running', type: 'agent', startTime: new Date(Date.now() - 1800000) },
      { id: '3', name: 'AI Agent - Code Reviewer', pid: 9012, cpu: 8, memory: 256, status: 'running', type: 'agent', startTime: new Date(Date.now() - 900000) },
      { id: '4', name: 'System Monitor', pid: 3456, cpu: 2, memory: 64, status: 'running', type: 'system', startTime: new Date(Date.now() - 7200000) },
      { id: '5', name: 'WebSocket Server', pid: 7890, cpu: 5, memory: 128, status: 'running', type: 'system', startTime: new Date(Date.now() - 3600000) },
      { id: '6', name: 'File Scanner', pid: 2345, cpu: 12, memory: 192, status: 'suspended', type: 'user', startTime: new Date(Date.now() - 5400000) },
      { id: '7', name: 'Background Updater', pid: 6789, cpu: 1, memory: 32, status: 'running', type: 'system', startTime: new Date(Date.now() - 10800000) },
      { id: '8', name: 'AI Agent - Research', pid: 1357, cpu: 18, memory: 384, status: 'running', type: 'agent', startTime: new Date(Date.now() - 2700000) },
    ];

    setProcesses(mockProcesses);

    // Simulate system stats updates
    const interval = setInterval(() => {
      setSystemStats(prev => ({
        cpu: Math.max(5, Math.min(95, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(20, Math.min(85, prev.memory + (Math.random() - 0.5) * 5)),
        disk: prev.disk,
        network: Math.max(30, Math.min(100, prev.network + (Math.random() - 0.5) * 15)),
        uptime: prev.uptime + 1,
      }));

      // Update process CPU/memory randomly
      setProcesses(prev => prev.map(process => ({
        ...process,
        cpu: Math.max(0, Math.min(100, process.cpu + (Math.random() - 0.5) * 5)),
        memory: Math.max(32, Math.min(1024, process.memory + (Math.random() - 0.5) * 20)),
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const sortedProcesses = [...processes].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'cpu':
        comparison = a.cpu - b.cpu;
        break;
      case 'memory':
        comparison = a.memory - b.memory;
        break;
      case 'pid':
        comparison = a.pid - b.pid;
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSort = (column: 'name' | 'cpu' | 'memory' | 'pid') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const handleEndProcess = (pid: number) => {
    setProcesses(prev => prev.filter(p => p.pid !== pid));
  };

  const handleSuspendProcess = (pid: number) => {
    setProcesses(prev => prev.map(p => 
      p.pid === pid ? { ...p, status: 'suspended' as const, cpu: 0 } : p
    ));
  };

  const handleResumeProcess = (pid: number) => {
    setProcesses(prev => prev.map(p => 
      p.pid === pid ? { ...p, status: 'running' as const } : p
    ));
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatMemory = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-500';
      case 'suspended': return 'text-yellow-500';
      case 'stopped': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'system': return '⚙️';
      case 'agent': return '🤖';
      case 'user': return '👤';
      default: return '📄';
    }
  };

  const tabs = [
    { id: 'processes', label: 'Processes', icon: '📋' },
    { id: 'performance', label: 'Performance', icon: '📊' },
    { id: 'agents', label: 'AI Agents', icon: '🤖' },
    { id: 'services', label: 'Services', icon: '⚙️' },
  ];

  return (
    <div className={`flex flex-col h-full bg-background ${className}`}>
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-xl">📊</span>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Windows Task Manager</h2>
              <p className="text-sm text-muted-foreground">Monitor and manage system processes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
              🔄 Refresh
            </button>
            <button className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">
              ⚡ End Task
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'processes' && (
          <div className="flex flex-col h-full">
            {/* System Stats Bar */}
            <div className="border-b border-border p-4 bg-accent">
              <div className="grid grid-cols-5 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">CPU:</span>
                  <span className="ml-2 font-medium">{systemStats.cpu.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Memory:</span>
                  <span className="ml-2 font-medium">{systemStats.memory.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Disk:</span>
                  <span className="ml-2 font-medium">{systemStats.disk.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Network:</span>
                  <span className="ml-2 font-medium">{systemStats.network.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Uptime:</span>
                  <span className="ml-2 font-medium">{formatUptime(systemStats.uptime)}</span>
                </div>
              </div>
            </div>

            {/* Processes Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-accent sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort('name')}>
                      Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort('pid')}>
                      PID {sortBy === 'pid' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort('cpu')}>
                      CPU {sortBy === 'cpu' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort('memory')}>
                      Memory {sortBy === 'memory' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProcesses.map((process) => (
                    <tr
                      key={process.id}
                      className={`border-b border-border hover:bg-accent cursor-pointer ${
                        selectedProcess === process.id ? 'bg-accent/50' : ''
                      }`}
                      onClick={() => setSelectedProcess(process.id)}
                    >
                      <td className="px-4 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span>{getTypeIcon(process.type)}</span>
                          <span>{process.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-muted-foreground">{process.pid}</td>
                      <td className="px-4 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                process.cpu >= 80 ? 'bg-red-500' : 
                                process.cpu >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${process.cpu}%` }}
                            />
                          </div>
                          <span>{process.cpu.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm">{formatMemory(process.memory)}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={getStatusColor(process.status)}>
                          {process.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className="px-2 py-1 bg-accent rounded text-xs">
                          {process.type}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="flex items-center gap-1">
                          {process.status === 'running' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSuspendProcess(process.pid);
                              }}
                              className="px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                            >
                              Suspend
                            </button>
                          )}
                          {process.status === 'suspended' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResumeProcess(process.pid);
                              }}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                            >
                              Resume
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEndProcess(process.pid);
                            }}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                          >
                            End
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-semibold text-foreground">Performance Metrics</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-lg p-4 border border-border">
                <h4 className="font-medium text-foreground mb-4">CPU Usage</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current Usage</span>
                    <span>{systemStats.cpu.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className={`h-4 rounded-full ${
                        systemStats.cpu >= 80 ? 'bg-red-500' : 
                        systemStats.cpu >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${systemStats.cpu}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-lg p-4 border border-border">
                <h4 className="font-medium text-foreground mb-4">Memory Usage</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current Usage</span>
                    <span>{systemStats.memory.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className={`h-4 rounded-full ${
                        systemStats.memory >= 80 ? 'bg-red-500' : 
                        systemStats.memory >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${systemStats.memory}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-semibold text-foreground">AI Agents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {processes.filter(p => p.type === 'agent').map((agent) => (
                <div key={agent.id} className="bg-card rounded-lg p-4 border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-foreground">{agent.name}</h4>
                    <span className={getStatusColor(agent.status)}>
                      {agent.status}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">PID</span>
                      <span>{agent.pid}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CPU</span>
                      <span>{agent.cpu.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Memory</span>
                      <span>{formatMemory(agent.memory)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">System Services</h3>
            <div className="text-center text-muted-foreground">
              <span className="text-4xl">⚙️</span>
              <p className="mt-4">System services management interface coming soon...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
