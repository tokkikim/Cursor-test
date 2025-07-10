# 🚀 Agent.QA 빠른 시작 가이드

## 🎯 10분 안에 Agent.QA 체험하기

### 1단계: 환경 설정 (2분)

```bash
# 1. 의존성 설치
npm install

# 2. Playwright 브라우저 설치
npx playwright install chromium

# 3. 설치 확인
node --version  # 18 이상 필요
```

### 2단계: 첫 번째 테스트 (3분)

```bash
# 기본 데모 실행
node demo.js

# 인터랙티브 모드로 실행
node demo.js --interactive
```

### 3단계: 웹 대시보드 실행 (5분)

```bash
# 개발 서버 시작
npm run dev

# 브라우저에서 열기
open http://localhost:3000
```

## 🎮 즉시 사용 가능한 기능들

### ✅ 웹사이트 자동 테스트
```javascript
const webTester = new WebTesterAgent();
const results = await webTester.testWebsite('https://your-website.com');
console.log(`품질 점수: ${results.qualityScore}%`);
```

### 📸 스크린샷 캡처
```javascript
const screenshot = await webTester.captureScreenshot('https://example.com');
console.log('스크린샷 캡처 완료!');
```

### ⚡ 성능 분석
```javascript
const performance = await webTester.collectPerformanceMetrics('https://example.com');
console.log(`로딩 시간: ${performance.metrics.loadTime}ms`);
```

### ♿ 접근성 검사
```javascript
const a11yResults = await webTester.testWebsite('https://example.com', 'accessibility');
console.log(`접근성 점수: ${a11yResults.qualityScore}%`);
```

## 🛠️ 커스터마이징

### 테스트 설정 변경
```javascript
const webTester = new WebTesterAgent({
    headless: false,        // 브라우저 보기
    timeout: 30000,         // 타임아웃 설정
    viewport: { width: 1920, height: 1080 }  // 해상도 설정
});
```

### 새로운 테스트 추가
```javascript
// src/agents/web-tester.js에서 getTestSuite 메서드 확장
const customTests = [
    {
        name: 'Custom Test',
        description: '나만의 테스트',
        execute: async (page, url) => {
            // 테스트 로직 작성
            return { success: true, message: '테스트 통과!' };
        }
    }
];
```

## 📊 실제 사용 예시

### 1. 여러 사이트 일괄 테스트
```javascript
const sites = ['https://site1.com', 'https://site2.com', 'https://site3.com'];

for (const site of sites) {
    const results = await webTester.testWebsite(site);
    console.log(`${site}: ${results.qualityScore}%`);
}
```

### 2. 정기적인 모니터링
```javascript
setInterval(async () => {
    const results = await webTester.testWebsite('https://production-site.com');
    if (results.qualityScore < 90) {
        // 알림 발송
        console.log('⚠️  품질 점수 저하 감지!');
    }
}, 300000); // 5분마다
```

### 3. CI/CD 통합
```yaml
# .github/workflows/qa.yml
name: Quality Assurance
on: [push, pull_request]
jobs:
  qa-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npx playwright install
      - run: node demo.js
```

## 🎯 다음 단계 아이디어

### 즉시 시도해볼 것들:

1. **자신의 웹사이트 테스트**
   ```bash
   node demo.js --interactive
   # 입력: test https://your-website.com
   ```

2. **성능 비교 분석**
   ```javascript
   // 여러 사이트 성능 비교
   const sites = ['https://fast-site.com', 'https://slow-site.com'];
   for (const site of sites) {
       const perf = await webTester.collectPerformanceMetrics(site);
       console.log(`${site}: ${perf.metrics.loadTime}ms`);
   }
   ```

3. **접근성 감사**
   ```javascript
   const a11yResults = await webTester.testWebsite('https://your-site.com', 'accessibility');
   // 접근성 이슈 자동 탐지
   ```

## 🔧 트러블슈팅

### 일반적인 문제들:

**브라우저가 실행되지 않는 경우:**
```bash
npx playwright install chromium --force
```

**의존성 문제:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**타임아웃 에러:**
```javascript
const webTester = new WebTesterAgent({
    timeout: 60000  // 타임아웃 증가
});
```

## 📈 성능 최적화 팁

1. **병렬 테스트**
   ```javascript
   const promises = urls.map(url => webTester.testWebsite(url));
   const results = await Promise.all(promises);
   ```

2. **결과 캐싱**
   ```javascript
   const cache = new Map();
   if (!cache.has(url)) {
       cache.set(url, await webTester.testWebsite(url));
   }
   ```

3. **선택적 테스트**
   ```javascript
   // 중요한 테스트만 실행
   const criticalTests = ['Page Load', 'Title Check'];
   ```

## 🌟 고급 기능 미리보기

### 곧 추가될 기능들:

- 🤖 **AI 기반 테스트 생성**: "로그인 테스트해줘" → 자동 코드 생성
- 📱 **모바일 테스트**: React Native/Flutter 앱 자동 테스트
- 🔄 **실시간 모니터링**: 24/7 품질 감시
- 📊 **AI 분석**: 품질 트렌드 예측
- 🎮 **게임화**: 팀 내 버그 헌팅 경쟁

### 실험적 기능 사용:
```javascript
// Visual AI Testing (개발 중)
const visualDiff = await webTester.compareScreenshots(url1, url2);

// Natural Language Testing (개발 중)  
const testCode = await webTester.generateTest("사용자가 로그인한다");
```

## 📞 도움이 필요하신가요?

- 📧 **이메일**: contact@agent-qa.com
- 💬 **Discord**: discord.gg/agent-qa
- 📚 **문서**: github.com/agent-qa/docs
- 🐛 **버그 리포트**: github.com/agent-qa/issues

---

**🎉 축하합니다! Agent.QA로 QA 자동화의 새로운 세계를 경험해보세요!**

> 💡 **팁**: `demo.js --interactive` 모드에서 여러 명령어를 시도해보며 Agent.QA의 다양한 기능을 체험해보세요!