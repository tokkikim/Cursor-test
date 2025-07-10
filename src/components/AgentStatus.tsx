import React from 'react';

interface Agent {
  id: number;
  name: string;
  status: 'active' | 'idle' | 'error' | 'offline';
  lastActivity: Date;
}

interface AgentStatusProps {
  agents: Agent[];
}

const AgentStatus: React.FC<AgentStatusProps> = ({ agents }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🟢';
      case 'idle': return '🟡';
      case 'error': return '🔴';
      case 'offline': return '⚫';
      default: return '🟡';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-700 bg-green-100';
      case 'idle': return 'text-yellow-700 bg-yellow-100';
      case 'error': return 'text-red-700 bg-red-100';
      case 'offline': return 'text-gray-700 bg-gray-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}시간 전`;
    return `${Math.floor(diffMins / 1440)}일 전`;
  };

  const getAgentDescription = (name: string) => {
    const descriptions = {
      'Quality Inspector': '전반적인 품질 관리 총괄',
      'Bug Hunter': '버그 및 이슈 자동 탐지',
      'Performance Analyst': '성능 최적화 및 모니터링',
      'Compliance Guardian': '규정 준수 검증'
    };
    return descriptions[name as keyof typeof descriptions] || '품질 관리';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">🤖 AI 에이전트 상태</h2>
        <span className="text-sm text-gray-500">
          {agents.filter(agent => agent.status === 'active').length}/{agents.length} 활성
        </span>
      </div>

      <div className="space-y-4">
        {agents.map((agent) => (
          <div key={agent.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{getStatusIcon(agent.status)}</div>
                <div>
                  <div className="font-medium text-gray-900">{agent.name}</div>
                  <div className="text-sm text-gray-500">
                    {getAgentDescription(agent.name)}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(agent.status)}`}>
                  {agent.status.toUpperCase()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {getRelativeTime(agent.lastActivity)}
                </div>
              </div>
            </div>

            {/* Agent Quick Actions */}
            <div className="mt-3 flex space-x-2">
              <button className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                로그 보기
              </button>
              {agent.status === 'active' && (
                <button className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">
                  일시정지
                </button>
              )}
              {agent.status !== 'active' && (
                <button className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors">
                  시작
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Overall Statistics */}
      <div className="mt-6 pt-4 border-t">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">
              {agents.filter(a => a.status === 'active').length}
            </div>
            <div className="text-sm text-gray-500">활성 에이전트</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {agents.length * 8} {/* 가상의 시간당 태스크 수 */}
            </div>
            <div className="text-sm text-gray-500">시간당 태스크</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentStatus;