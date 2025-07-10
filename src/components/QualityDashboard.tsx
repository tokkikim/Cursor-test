import React from 'react';

interface QualityData {
  overallScore: number;
  breakdown: {
    functionality: number;
    performance: number;
    security: number;
    accessibility: number;
  };
  trend: string;
}

interface QualityDashboardProps {
  data: QualityData;
}

const QualityDashboard: React.FC<QualityDashboardProps> = ({ data }) => {
  const getScoreColor = (score: number) => {
    if (score >= 95) return 'text-green-600 bg-green-100';
    if (score >= 90) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getProgressColor = (score: number) => {
    if (score >= 95) return 'bg-green-500';
    if (score >= 90) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">📊 품질 대시보드</h2>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${data.trend === 'increasing' ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {data.trend === 'increasing' ? '개선 중' : '주의 필요'}
          </span>
        </div>
      </div>

      {/* Quality Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {Object.entries(data.breakdown).map(([key, score]) => {
          const labels = {
            functionality: '기능성',
            performance: '성능',
            security: '보안',
            accessibility: '접근성'
          };

          return (
            <div key={key} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {labels[key as keyof typeof labels]}
                </span>
                                 <span className={`px-2 py-1 rounded text-xs font-semibold ${getScoreColor(score as number)}`}>
                   {score}%
                 </span>
               </div>
               
               <div className="w-full bg-gray-200 rounded-full h-2">
                 <div 
                   className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(score as number)}`}
                   style={{ width: `${score}%` }}
                 ></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quality Trend Chart Placeholder */}
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">📈 품질 트렌드 (최근 7일)</h3>
        <div className="h-32 bg-gradient-to-r from-blue-50 to-green-50 rounded flex items-end justify-between px-2">
          {/* Simplified chart representation */}
          {[85, 88, 92, 89, 94, 96, data.overallScore].map((value, index) => (
            <div 
              key={index}
              className="bg-blue-500 rounded-t"
              style={{ 
                height: `${(value / 100) * 100}%`, 
                width: '12%',
                minHeight: '4px'
              }}
            ></div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>7일전</span>
          <span>오늘</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 flex space-x-3">
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          🔍 전체 스캔 실행
        </button>
        <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
          📋 상세 보고서
        </button>
        <button className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors">
          ⚡ 빠른 수정
        </button>
      </div>
    </div>
  );
};

export default QualityDashboard;