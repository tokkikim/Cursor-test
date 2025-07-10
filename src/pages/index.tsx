import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import QualityDashboard from '../components/QualityDashboard';
import AgentStatus from '../components/AgentStatus';
import RealtimeMonitor from '../components/RealtimeMonitor';

const HomePage: React.FC = () => {
  const [qualityData, setQualityData] = useState({
    overallScore: 96,
    breakdown: {
      functionality: 98,
      performance: 94,
      security: 97,
      accessibility: 95
    },
    trend: 'increasing'
  });

  const [agents, setAgents] = useState([
    { id: 1, name: 'Quality Inspector', status: 'active' as const, lastActivity: new Date() },
    { id: 2, name: 'Bug Hunter', status: 'active' as const, lastActivity: new Date() },
    { id: 3, name: 'Performance Analyst', status: 'idle' as const, lastActivity: new Date() },
    { id: 4, name: 'Compliance Guardian', status: 'active' as const, lastActivity: new Date() }
  ]);

  useEffect(() => {
    // 실시간 데이터 업데이트 시뮬레이션
    const interval = setInterval(() => {
      setQualityData(prev => ({
        ...prev,
        overallScore: Math.max(90, Math.min(100, prev.overallScore + (Math.random() - 0.5) * 2))
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Head>
        <title>Agent.QA - AI 기반 품질 보증 플랫폼</title>
        <meta name="description" content="AI 기반 멀티플랫폼 품질 보증 자동화 도구" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">AQ</span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">Agent.QA</h1>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                  Live Monitoring
                </span>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500">Overall Quality</div>
                  <div className={`text-2xl font-bold ${
                    qualityData.overallScore >= 95 ? 'text-green-600' : 
                    qualityData.overallScore >= 90 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {qualityData.overallScore.toFixed(1)}%
                  </div>
                </div>
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center">
                  <span className="text-white font-bold">{Math.round(qualityData.overallScore)}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Quality Dashboard */}
            <div className="lg:col-span-2">
              <QualityDashboard data={qualityData} />
            </div>
            
            {/* Agent Status */}
            <div className="space-y-6">
              <AgentStatus agents={agents} />
              <RealtimeMonitor />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">🔍 최근 발견된 이슈</h2>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-red-900">Performance bottleneck in checkout</div>
                    <div className="text-xs text-red-700">응답 시간이 3초를 초과합니다</div>
                  </div>
                  <span className="text-xs text-red-600">2분 전</span>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-yellow-900">Accessibility issue in navigation</div>
                    <div className="text-xs text-yellow-700">키보드 내비게이션이 불가능한 요소 발견</div>
                  </div>
                  <span className="text-xs text-yellow-600">5분 전</span>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-orange-900">Security vulnerability in API</div>
                    <div className="text-xs text-orange-700">인증되지 않은 엔드포인트 접근 가능</div>
                  </div>
                  <span className="text-xs text-orange-600">12분 전</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default HomePage;