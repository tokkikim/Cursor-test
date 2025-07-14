/**
 * Base Agent Class
 * 모든 AI 에이전트의 기본 클래스
 */

const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

class BaseAgent extends EventEmitter {
    constructor(name, config = {}) {
        super();
        
        // 안전한 config 초기화
        this.config = config || {};
        
        this.id = uuidv4();
        this.name = name;
        this.status = 'initialized';
        this.startTime = new Date();
        this.memory = new Map();
        this.context = {};
        
        // AI 모델 설정
        this.aiProvider = this.config.aiProvider || 'openai';
        this.model = this.config.model || 'gpt-4';
        this.temperature = this.config.temperature || 0.1;
        
        // 로깅 설정
        this.logLevel = this.config.logLevel || 'info';
        this.logger = this.createLogger();
        
        // 성능 메트릭
        this.metrics = {
            tasksCompleted: 0,
            tasksSucceeded: 0,
            tasksFailed: 0,
            averageExecutionTime: 0,
            lastActivity: new Date()
        };

        this.log(`${this.name} agent initialized with ID: ${this.id}`);
    }

    /**
     * 로거 생성
     */
    createLogger() {
        return {
            debug: (message, data) => this.logWithLevel('debug', message, data),
            info: (message, data) => this.logWithLevel('info', message, data),
            warn: (message, data) => this.logWithLevel('warn', message, data),
            error: (message, data) => this.logWithLevel('error', message, data)
        };
    }

    /**
     * 레벨별 로깅
     */
    logWithLevel(level, message, data) {
        const levels = { debug: 0, info: 1, warn: 2, error: 3 };
        const currentLevel = levels[this.logLevel] || 1;
        
        if (levels[level] >= currentLevel) {
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                agent: this.name,
                id: this.id,
                level,
                message,
                data
            };
            
            console.log(`[${timestamp}] [${level.toUpperCase()}] [${this.name}] ${message}`, data || '');
            
            // 로그를 메모리에 저장 (최근 100개)
            if (!this.memory.has('logs')) {
                this.memory.set('logs', []);
            }
            const logs = this.memory.get('logs');
            logs.push(logEntry);
            if (logs.length > 100) {
                logs.shift();
            }
        }
    }

    /**
     * 편의 로깅 메서드
     */
    log(message, data) {
        this.logger.info(message, data);
    }

    logError(message, error) {
        this.logger.error(message, { error: error.message, stack: error.stack });
    }

    /**
     * AI 모델과 상호작용
     */
    async callAI(prompt, options = {}) {
        const startTime = Date.now();
        
        try {
            this.log('Calling AI model', { prompt: prompt.substring(0, 100) + '...' });
            
            // AI 프로바이더별 호출 로직
            const response = await this.invokeAIProvider(prompt, options);
            
            const executionTime = Date.now() - startTime;
            this.updateMetrics('ai_call_success', executionTime);
            
            return response;
            
        } catch (error) {
            const executionTime = Date.now() - startTime;
            this.updateMetrics('ai_call_failed', executionTime);
            this.logError('AI call failed', error);
            throw error;
        }
    }

    /**
     * AI 프로바이더별 호출 구현
     */
    async invokeAIProvider(prompt, options) {
        const { aiProvider, model, temperature } = { ...this.config, ...options };
        
        switch (aiProvider) {
            case 'openai':
                return await this.callOpenAI(prompt, { model, temperature, ...options });
            case 'anthropic':
                return await this.callAnthropic(prompt, { model, temperature, ...options });
            case 'google':
                return await this.callGemini(prompt, { model, temperature, ...options });
            default:
                throw new Error(`Unsupported AI provider: ${aiProvider}`);
        }
    }

    /**
     * OpenAI API 호출
     */
    async callOpenAI(prompt, options) {
        // OpenAI API 호출 로직 구현
        // 실제 구현에서는 openai 라이브러리 사용
        return `OpenAI response for: ${prompt.substring(0, 50)}...`;
    }

    /**
     * 태스크 실행 기본 템플릿
     */
    async executeTask(taskName, taskFunction, ...args) {
        const taskId = uuidv4();
        const startTime = Date.now();
        
        this.log(`Starting task: ${taskName}`, { taskId });
        this.updateStatus('executing');
        this.metrics.tasksCompleted++;
        
        try {
            const result = await taskFunction.apply(this, args);
            
            const executionTime = Date.now() - startTime;
            this.metrics.tasksSucceeded++;
            this.updateMetrics('task_success', executionTime);
            
            this.log(`Task completed: ${taskName}`, { 
                taskId, 
                executionTime: `${executionTime}ms`,
                success: true 
            });
            
            this.emit('taskCompleted', { taskId, taskName, result, executionTime });
            return result;
            
        } catch (error) {
            const executionTime = Date.now() - startTime;
            this.metrics.tasksFailed++;
            this.updateMetrics('task_failed', executionTime);
            
            this.logError(`Task failed: ${taskName}`, error);
            this.emit('taskFailed', { taskId, taskName, error, executionTime });
            
            throw error;
        } finally {
            this.updateStatus('idle');
            this.metrics.lastActivity = new Date();
        }
    }

    /**
     * 상태 업데이트
     */
    updateStatus(newStatus) {
        const oldStatus = this.status;
        this.status = newStatus;
        
        this.log(`Status changed: ${oldStatus} → ${newStatus}`);
        this.emit('statusChanged', { oldStatus, newStatus, timestamp: new Date() });
    }

    /**
     * 메트릭 업데이트
     */
    updateMetrics(type, executionTime) {
        // 평균 실행 시간 계산
        const totalTasks = this.metrics.tasksCompleted;
        const currentAverage = this.metrics.averageExecutionTime;
        this.metrics.averageExecutionTime = ((currentAverage * (totalTasks - 1)) + executionTime) / totalTasks;
        
        // 타입별 메트릭 저장
        if (!this.memory.has('detailedMetrics')) {
            this.memory.set('detailedMetrics', {});
        }
        const detailed = this.memory.get('detailedMetrics');
        if (!detailed[type]) {
            detailed[type] = { count: 0, totalTime: 0, avgTime: 0 };
        }
        detailed[type].count++;
        detailed[type].totalTime += executionTime;
        detailed[type].avgTime = detailed[type].totalTime / detailed[type].count;
    }

    /**
     * 컨텍스트 설정
     */
    setContext(key, value) {
        this.context[key] = value;
        this.log(`Context updated: ${key}`);
        this.emit('contextChanged', { key, value });
    }

    /**
     * 컨텍스트 조회
     */
    getContext(key) {
        return this.context[key];
    }

    /**
     * 메모리에 데이터 저장
     */
    remember(key, value, ttl = null) {
        const item = {
            value,
            timestamp: new Date(),
            ttl: ttl ? new Date(Date.now() + ttl) : null
        };
        
        this.memory.set(key, item);
        this.log(`Memory updated: ${key}`);
    }

    /**
     * 메모리에서 데이터 조회
     */
    recall(key) {
        const item = this.memory.get(key);
        
        if (!item) return null;
        
        // TTL 체크
        if (item.ttl && new Date() > item.ttl) {
            this.memory.delete(key);
            return null;
        }
        
        return item.value;
    }

    /**
     * 다른 에이전트와 통신
     */
    async communicateWith(agentId, message, data = {}) {
        this.log(`Communicating with agent: ${agentId}`, { message });
        
        const communication = {
            from: this.id,
            to: agentId,
            message,
            data,
            timestamp: new Date()
        };
        
        this.emit('communication', communication);
        return communication;
    }

    /**
     * 에이전트 상태 정보 반환
     */
    getStatus() {
        return {
            id: this.id || 'unknown',
            name: this.name || 'unknown',
            status: this.status || 'unknown',
            uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
            metrics: this.metrics || {},
            memorySize: this.memory ? this.memory.size : 0,
            contextKeys: this.context ? Object.keys(this.context) : [],
            lastLogs: this.recall ? (this.recall('logs')?.slice(-5) || []) : []
        };
    }

    /**
     * 에이전트 성능 분석
     */
    analyzePerformance() {
        const uptime = Date.now() - this.startTime.getTime();
        const successRate = this.metrics.tasksCompleted > 0 
            ? (this.metrics.tasksSucceeded / this.metrics.tasksCompleted) * 100 
            : 0;
        
        const detailed = this.recall('detailedMetrics') || {};
        
        return {
            uptime: `${Math.round(uptime / 1000)}s`,
            successRate: `${successRate.toFixed(2)}%`,
            totalTasks: this.metrics.tasksCompleted,
            averageExecutionTime: `${this.metrics.averageExecutionTime.toFixed(2)}ms`,
            tasksPerMinute: this.metrics.tasksCompleted / (uptime / 60000),
            detailedMetrics: detailed,
            recommendation: this.getPerformanceRecommendation(successRate, this.metrics.averageExecutionTime)
        };
    }

    /**
     * 성능 개선 권장사항
     */
    getPerformanceRecommendation(successRate, avgTime) {
        const recommendations = [];
        
        if (successRate < 90) {
            recommendations.push('Consider improving error handling and retry logic');
        }
        
        if (avgTime > 5000) {
            recommendations.push('Optimize task execution time - consider caching or parallel processing');
        }
        
        if (this.memory.size > 1000) {
            recommendations.push('Consider implementing memory cleanup to prevent memory leaks');
        }
        
        return recommendations.length > 0 ? recommendations : ['Performance is optimal'];
    }

    /**
     * 에이전트 정리
     */
    async cleanup() {
        this.log('Starting cleanup process');
        
        // 이벤트 리스너 정리
        this.removeAllListeners();
        
        // 메모리 정리
        this.memory.clear();
        
        // 상태 업데이트
        this.updateStatus('terminated');
        
        this.log('Cleanup completed');
    }

    /**
     * 에이전트 재시작
     */
    async restart() {
        this.log('Restarting agent');
        
        await this.cleanup();
        
        // 기본 상태로 재설정
        this.id = uuidv4();
        this.status = 'initialized';
        this.startTime = new Date();
        this.memory = new Map();
        this.context = {};
        this.metrics = {
            tasksCompleted: 0,
            tasksSucceeded: 0,
            tasksFailed: 0,
            averageExecutionTime: 0,
            lastActivity: new Date()
        };
        
        this.log(`Agent restarted with new ID: ${this.id}`);
    }
}

module.exports = { BaseAgent };
