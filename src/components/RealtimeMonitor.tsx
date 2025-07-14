import React, { useState, useEffect } from 'react';

interface MetricData {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

const RealtimeMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricData[]>([
    { name: 'API 응답시간', value: 245, unit: 'ms', status: 'good', trend: 'stable' },
    { name: 'CPU 사용률', value: 34, unit: '%', status: 'good', trend: 'down' },
    { name: '메모리 사용률', value: 67, unit: '%', status: 'warning', trend: 'up' },
    { name: '활성 테스트', value: 12, unit: '개', status: 'good', trend: 'stable' }
  ]);

  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => prev.map(metric => ({
        ...metric,
        value: Math.max(0, metric.value + (Math.random() - 0.5) * 20),
        status: getRandomStatus(),
        trend: getRandomTrend()
      })));
      setLastUpdate(new Date());
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getRandomStatus = (): 'good' | 'warning' | 'critical' => {
    const statuses: ('good' | 'warning' | 'critical')[] = ['good', 'good', 'good', 'warning', 'critical'];
    return statuses[Math.floor(Math.random() * statuses.length)];
  };

  const getRandomTrend = (): 'up' | 'down' | 'stable' => {
    const trends: ('up' | 'down' | 'stable')[] = ['up', 'down', 'stable'];
    return trends[Math.floor(Math.random() * trends.length)];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
      default: return '➡️';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">⚡ 실시간 모니터링</h2>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-500">Live</span>
        </div>
      </div>

      <div className="space-y-4">
        {metrics.map((metric, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="text-lg">{getTrendIcon(metric.trend)}</div>
              <div>
                <div className="text-sm font-medium text-gray-900">{metric.name}</div>
                <div className={`text-lg font-bold ${getStatusColor(metric.status)}`}>
                  {Math.round(metric.value)}{metric.unit}
                </div>
              </div>
            </div>
            
            <div className={`w-3 h-3 rounded-full ${
              metric.status === 'good' ? 'bg-green-500' :
              metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
          </div>
        ))}
      </div>

      {/* System Health Summary */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-blue-600">💡</span>
            <span className="text-sm font-medium text-blue-900">시스템 상태</span>
          </div>
          <span className="text-xs text-blue-600 font-medium">정상</span>
        </div>
        <div className="text-xs text-blue-700 mt-1">
          모든 핵심 지표가 정상 범위 내에 있습니다.
        </div>
      </div>

      {/* Last Update Time */}
      <div className="mt-4 text-center text-xs text-gray-500">
        마지막 업데이트: {formatTime(lastUpdate)}
      </div>

      {/* Quick System Actions */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button className="px-3 py-2 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors">
          🔄 새로고침
        </button>
        <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors">
          📊 상세보기
        </button>
      </div>
    </div>
  );
};

export default RealtimeMonitor;