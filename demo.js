#!/usr/bin/env node

/**
 * Agent.QA 데모 스크립트
 * 실제로 작동하는 웹 테스트 자동화 시연
 */

const { WebTesterAgent } = require('./src/agents/web-tester');

async function runDemo() {
    console.log('🚀 Agent.QA 데모 시작!');
    console.log('=====================================\n');

    // 웹 테스터 에이전트 초기화
    const webTester = new WebTesterAgent({
        headless: false, // 브라우저를 볼 수 있도록 설정
        logLevel: 'info'
    });

    try {
        // 1. 에이전트 상태 확인
        console.log('📊 에이전트 상태:', webTester.getStatus());
        console.log('\n');

        // 2. 여러 웹사이트 테스트
        const testUrls = [
            'https://example.com',
            'https://google.com',
            'https://github.com'
        ];

        for (const url of testUrls) {
            console.log(`🔍 테스트 시작: ${url}`);
            console.log('-'.repeat(50));

            try {
                // 기본 테스트 실행
                const basicResults = await webTester.testWebsite(url, 'basic');
                console.log(`✅ 기본 테스트 완료: ${basicResults.qualityScore}% (${basicResults.summary.passed}/${basicResults.summary.total})`);
                
                // 테스트 결과 상세 표시
                basicResults.tests.forEach(test => {
                    const status = test.status === 'passed' ? '✅' : '❌';
                    console.log(`   ${status} ${test.name}: ${test.message}`);
                });

                // 성능 메트릭 수집
                const performanceResults = await webTester.collectPerformanceMetrics(url);
                console.log(`⚡ 성능 메트릭:`);
                console.log(`   로딩 시간: ${performanceResults.metrics.loadTime}ms`);
                console.log(`   DOM 준비: ${performanceResults.metrics.domContentLoaded}ms`);

                console.log('\n');

            } catch (error) {
                console.error(`❌ 테스트 실패: ${url}`, error.message);
            }
        }

        // 3. 접근성 테스트 데모
        console.log('♿ 접근성 테스트 시작');
        console.log('-'.repeat(50));
        
        const accessibilityResults = await webTester.testWebsite('https://example.com', 'accessibility');
        console.log(`접근성 점수: ${accessibilityResults.qualityScore}%`);
        accessibilityResults.tests.forEach(test => {
            const status = test.status === 'passed' ? '✅' : '❌';
            console.log(`   ${status} ${test.name}: ${test.message}`);
        });

        // 4. 에이전트 성능 분석
        console.log('\n📈 에이전트 성능 분석');
        console.log('-'.repeat(50));
        const performance = webTester.analyzePerformance();
        console.log(`가동 시간: ${performance.uptime}`);
        console.log(`성공률: ${performance.successRate}`);
        console.log(`평균 실행 시간: ${performance.averageExecutionTime}`);
        console.log(`총 완료된 태스크: ${performance.totalTasks}`);

    } catch (error) {
        console.error('❌ 데모 실행 중 오류:', error);
    } finally {
        // 5. 정리
        await webTester.cleanup();
        console.log('\n🧹 정리 완료');
        console.log('=====================================');
        console.log('Agent.QA 데모 종료! 🎉');
    }
}

// 인터랙티브 데모 실행
async function runInteractiveDemo() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('🎮 Agent.QA 인터랙티브 데모');
    console.log('=============================\n');

    const webTester = new WebTesterAgent({
        headless: false,
        logLevel: 'info'
    });

    const question = (prompt) => {
        return new Promise((resolve) => {
            rl.question(prompt, resolve);
        });
    };

    try {
        while (true) {
            console.log('\n사용 가능한 명령어:');
            console.log('1. test <URL> - 웹사이트 테스트');
            console.log('2. screenshot <URL> - 스크린샷 캡처');
            console.log('3. performance <URL> - 성능 분석');
            console.log('4. status - 에이전트 상태');
            console.log('5. exit - 종료');

            const input = await question('\n명령어를 입력하세요: ');
            const [command, url] = input.trim().split(' ');

            switch (command.toLowerCase()) {
                case 'test':
                    if (!url) {
                        console.log('❌ URL을 입력해주세요. 예: test https://example.com');
                        break;
                    }
                    console.log(`🔍 ${url} 테스트 중...`);
                    try {
                        const results = await webTester.testWebsite(url);
                        console.log(`✅ 테스트 완료! 품질 점수: ${results.qualityScore}%`);
                        console.log(`통과: ${results.summary.passed}, 실패: ${results.summary.failed}`);
                    } catch (error) {
                        console.log(`❌ 테스트 실패: ${error.message}`);
                    }
                    break;

                case 'screenshot':
                    if (!url) {
                        console.log('❌ URL을 입력해주세요. 예: screenshot https://example.com');
                        break;
                    }
                    console.log(`📸 ${url} 스크린샷 캡처 중...`);
                    try {
                        const result = await webTester.captureScreenshot(url);
                        console.log(`✅ 스크린샷 캡처 완료! 크기: ${Math.round(result.size / 1024)}KB`);
                    } catch (error) {
                        console.log(`❌ 스크린샷 실패: ${error.message}`);
                    }
                    break;

                case 'performance':
                    if (!url) {
                        console.log('❌ URL을 입력해주세요. 예: performance https://example.com');
                        break;
                    }
                    console.log(`⚡ ${url} 성능 분석 중...`);
                    try {
                        const result = await webTester.collectPerformanceMetrics(url);
                        console.log(`✅ 성능 분석 완료!`);
                        console.log(`로딩 시간: ${result.metrics.loadTime}ms`);
                        console.log(`DOM 준비: ${result.metrics.domContentLoaded}ms`);
                    } catch (error) {
                        console.log(`❌ 성능 분석 실패: ${error.message}`);
                    }
                    break;

                case 'status':
                    const status = webTester.getStatus();
                    console.log('📊 에이전트 상태:');
                    console.log(`   ID: ${status.id}`);
                    console.log(`   이름: ${status.name}`);
                    console.log(`   상태: ${status.status}`);
                    console.log(`   가동 시간: ${Math.round(status.uptime / 1000)}초`);
                    console.log(`   완료된 태스크: ${status.metrics.tasksCompleted}`);
                    break;

                case 'exit':
                    console.log('👋 Agent.QA 데모를 종료합니다...');
                    await webTester.cleanup();
                    rl.close();
                    return;

                default:
                    console.log('❌ 알 수 없는 명령어입니다.');
            }
        }
    } catch (error) {
        console.error('❌ 인터랙티브 데모 오류:', error);
        await webTester.cleanup();
        rl.close();
    }
}

// 명령줄 인수 처리
const args = process.argv.slice(2);

if (args.includes('--interactive') || args.includes('-i')) {
    runInteractiveDemo();
} else if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🤖 Agent.QA 데모 스크립트

사용법:
  node demo.js              # 기본 데모 실행
  node demo.js -i           # 인터랙티브 모드
  node demo.js --help       # 도움말 표시

예시:
  # 자동 데모 실행
  node demo.js

  # 인터랙티브 모드로 실행
  node demo.js --interactive
  
기능:
  ✅ 웹사이트 자동 테스트
  📸 스크린샷 캡처
  ⚡ 성능 분석
  ♿ 접근성 검사
  🤖 AI 에이전트 모니터링

요구사항:
  - Node.js 18+
  - Playwright 설치 필요
  - 인터넷 연결
    `);
} else {
    runDemo();
}

module.exports = { runDemo, runInteractiveDemo };