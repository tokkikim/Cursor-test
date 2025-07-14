/**
 * Bug Hunter Agent
 */

const { BaseAgent } = require('./base-agent');

class BugHunterAgent extends BaseAgent {
    constructor(config = {}) {
        super('BugHunter', config);
        this.log('Bug Hunter Agent initialized');
    }
}

module.exports = { BugHunterAgent };
