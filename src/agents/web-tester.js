/**
 * Web Tester Agent - 실제 작동하는 웹 테스트 에이전트
 * Playwright를 사용한 기본 웹사이트 테스트 자동화
 */

const { BaseAgent } = require('./base-agent');
const { chromium } = require('playwright');

class WebTesterAgent extends BaseAgent {
    constructor(config) {
        super('WebTester', config);
        
        this.browser = null;
        this.context = null;
        this.page = null;
        
        // 기본 테스트 설정
        this.testConfig = {
            timeout: 30000,
            navigationTimeout: 15000,
            viewport: { width: 1280, height: 720 },
            headless: config.headless !== false, // 기본값은 headless
            ...config.testConfig
        };

        this.log('Web Tester Agent initialized');
    }

    /**
     * 브라우저 초기화
     */
    async initializeBrowser() {
        return await this.executeTask('initializeBrowser', async () => {
            if (this.browser) {
                await this.closeBrowser();
            }

            this.browser = await chromium.launch({
                headless: this.testConfig.headless,
                viewport: this.testConfig.viewport
            });

            this.context = await this.browser.newContext({
                viewport: this.testConfig.viewport,
                userAgent: 'Agent.QA WebTester/1.0'
            });

            this.page = await this.context.newPage();

            // 기본 타임아웃 설정
            this.page.setDefaultTimeout(this.testConfig.timeout);
            this.page.setDefaultNavigationTimeout(this.testConfig.navigationTimeout);

            this.log('Browser initialized successfully');
            return { success: true, browserType: 'chromium' };
        });
    }

    /**
     * 웹사이트 기본 테스트 실행
     */
    async testWebsite(url, testSuite = 'basic') {
        return await this.executeTask('testWebsite', async () => {
            if (!this.browser) {
                await this.initializeBrowser();
            }

            const results = {
                url,
                timestamp: new Date().toISOString(),
                tests: [],
                summary: {
                    total: 0,
                    passed: 0,
                    failed: 0,
                    skipped: 0
                }
            };

            // 기본 테스트 스위트 실행
            const tests = this.getTestSuite(testSuite);
            
            for (const test of tests) {
                try {
                    const testResult = await this.runSingleTest(url, test);
                    results.tests.push(testResult);
                    results.summary.total++;
                    
                    if (testResult.status === 'passed') {
                        results.summary.passed++;
                    } else if (testResult.status === 'failed') {
                        results.summary.failed++;
                    } else {
                        results.summary.skipped++;
                    }
                } catch (error) {
                    this.logError(`Test failed: ${test.name}`, error);
                    results.tests.push({
                        name: test.name,
                        status: 'failed',
                        error: error.message,
                        duration: 0
                    });
                    results.summary.total++;
                    results.summary.failed++;
                }
            }

            // 품질 점수 계산
            const successRate = results.summary.total > 0 
                ? (results.summary.passed / results.summary.total) * 100 
                : 0;

            results.qualityScore = Math.round(successRate);
            
            this.log(`Website test completed: ${results.summary.passed}/${results.summary.total} tests passed`);
            return results;
        });
    }

    /**
     * 개별 테스트 실행
     */
    async runSingleTest(url, test) {
        const startTime = Date.now();
        
        try {
            this.log(`Running test: ${test.name}`);
            
            const result = await test.execute(this.page, url);
            const duration = Date.now() - startTime;
            
            return {
                name: test.name,
                description: test.description,
                status: result.success ? 'passed' : 'failed',
                message: result.message,
                details: result.details,
                duration
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            throw error;
        }
    }

    /**
     * 테스트 스위트 정의
     */
    getTestSuite(suiteName) {
        const suites = {
            basic: [
                {
                    name: 'Page Load',
                    description: '페이지 로딩 테스트',
                    execute: async (page, url) => {
                        const response = await page.goto(url);
                        const loadTime = await page.evaluate(() => 
                            performance.timing.loadEventEnd - performance.timing.navigationStart
                        );
                        
                        return {
                            success: response.status() < 400,
                            message: `Page loaded with status ${response.status()}`,
                            details: { 
                                status: response.status(),
                                loadTime: `${loadTime}ms`,
                                url: response.url()
                            }
                        };
                    }
                },
                {
                    name: 'Title Check',
                    description: '페이지 타이틀 존재 확인',
                    execute: async (page, url) => {
                        const title = await page.title();
                        return {
                            success: title && title.length > 0,
                            message: title ? `Title found: "${title}"` : 'No title found',
                            details: { title }
                        };
                    }
                },
                {
                    name: 'Basic Elements',
                    description: '기본 HTML 요소 존재 확인',
                    execute: async (page, url) => {
                        const elements = await page.evaluate(() => {
                            return {
                                hasHeadings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0,
                                hasImages: document.querySelectorAll('img').length > 0,
                                hasLinks: document.querySelectorAll('a').length > 0,
                                hasForm: document.querySelectorAll('form').length > 0
                            };
                        });
                        
                        const elementCount = Object.values(elements).filter(Boolean).length;
                        return {
                            success: elementCount >= 2,
                            message: `Found ${elementCount}/4 basic element types`,
                            details: elements
                        };
                    }
                },
                {
                    name: 'Console Errors',
                    description: '콘솔 에러 확인',
                    execute: async (page, url) => {
                        const errors = [];
                        page.on('console', msg => {
                            if (msg.type() === 'error') {
                                errors.push(msg.text());
                            }
                        });
                        
                        // 잠시 대기하여 에러 수집
                        await page.waitForTimeout(2000);
                        
                        return {
                            success: errors.length === 0,
                            message: errors.length === 0 
                                ? 'No console errors found' 
                                : `Found ${errors.length} console errors`,
                            details: { errors: errors.slice(0, 5) } // 최대 5개만 표시
                        };
                    }
                }
            ],
            
            accessibility: [
                {
                    name: 'Alt Text Check',
                    description: '이미지 alt 속성 확인',
                    execute: async (page, url) => {
                        const imageStats = await page.evaluate(() => {
                            const images = Array.from(document.querySelectorAll('img'));
                            const total = images.length;
                            const withAlt = images.filter(img => img.alt && img.alt.trim()).length;
                            return { total, withAlt, percentage: total > 0 ? (withAlt / total) * 100 : 0 };
                        });
                        
                        return {
                            success: imageStats.percentage >= 80,
                            message: `${imageStats.withAlt}/${imageStats.total} images have alt text`,
                            details: imageStats
                        };
                    }
                },
                {
                    name: 'Heading Structure',
                    description: '헤딩 구조 확인',
                    execute: async (page, url) => {
                        const headingInfo = await page.evaluate(() => {
                            const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
                            return {
                                hasH1: document.querySelectorAll('h1').length > 0,
                                total: headings.length,
                                structure: headings.map(h => h.tagName.toLowerCase())
                            };
                        });
                        
                        return {
                            success: headingInfo.hasH1 && headingInfo.total > 0,
                            message: headingInfo.hasH1 
                                ? `Good heading structure with ${headingInfo.total} headings`
                                : 'Missing H1 or no headings found',
                            details: headingInfo
                        };
                    }
                }
            ]
        };

        return suites[suiteName] || suites.basic;
    }

    /**
     * 스크린샷 캡처
     */
    async captureScreenshot(url, options = {}) {
        return await this.executeTask('captureScreenshot', async () => {
            if (!this.page) {
                await this.initializeBrowser();
            }

            await this.page.goto(url);
            
            const screenshot = await this.page.screenshot({
                fullPage: options.fullPage || false,
                type: options.type || 'png',
                quality: options.quality || 90
            });

            this.log(`Screenshot captured for ${url}`);
            return {
                url,
                timestamp: new Date().toISOString(),
                screenshot: screenshot.toString('base64'),
                size: screenshot.length
            };
        });
    }

    /**
     * 성능 메트릭 수집
     */
    async collectPerformanceMetrics(url) {
        return await this.executeTask('collectPerformanceMetrics', async () => {
            if (!this.page) {
                await this.initializeBrowser();
            }

            await this.page.goto(url);
            
            const metrics = await this.page.evaluate(() => {
                const navigation = performance.getEntriesByType('navigation')[0];
                return {
                    loadTime: navigation.loadEventEnd - navigation.fetchStart,
                    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
                    firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
                    firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
                };
            });

            this.log(`Performance metrics collected for ${url}`);
            return {
                url,
                timestamp: new Date().toISOString(),
                metrics
            };
        });
    }

    /**
     * 브라우저 종료
     */
    async closeBrowser() {
        return await this.executeTask('closeBrowser', async () => {
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
                this.context = null;
                this.page = null;
                this.log('Browser closed');
            }
            return { success: true };
        });
    }

    /**
     * 에이전트 정리
     */
    async cleanup() {
        await this.closeBrowser();
        await super.cleanup();
    }
}

module.exports = { WebTesterAgent };