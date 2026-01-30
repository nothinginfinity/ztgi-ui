/**
 * AI Assistant Widget
 *
 * Floating chat widget for AI assistance on every page.
 * Features:
 * - Three tabs: Chat, Inbox, Insights
 * - Page-specific system prompts
 * - Keyboard toggle: Ctrl+/
 * - Collapsible to bubble
 *
 * Usage:
 *   const assistant = new AiAssistant(ztgiInstance);
 *   assistant.init();
 *   assistant.setPageContext('browse', { entryCount: 100 });
 */

class AiAssistant {
    constructor(ztgiInstance) {
        this.ztgi = ztgiInstance;
        this.emailClient = null;
        this.analytics = null;
        this.container = null;
        this.bubble = null;
        this.isOpen = false;
        this.isMinimized = false;
        this.activeTab = 'chat';
        this.chatHistory = [];
        this.unreadCount = 0;
        this.pageContext = { page: 'unknown' };
        this.systemPrompts = {};
        this.quickActions = [];
        this.isTyping = false;
        this.initialized = false;
    }

    /**
     * Initialize the assistant
     */
    init(options = {}) {
        if (this.initialized) return this;

        this.emailClient = this.ztgi.emailClient;
        this.analytics = this.ztgi.analytics;

        // Load system prompts
        this.systemPrompts = options.systemPrompts || this.getDefaultSystemPrompts();
        this.quickActions = options.quickActions || this.getDefaultQuickActions();

        // Create DOM elements
        this.createWidget();
        this.addStyles();

        // Register keyboard shortcut
        if (this.ztgi.keyboard) {
            this.ztgi.keyboard.register('ctrl+/', () => this.toggle());
        }

        // Check for unread messages periodically
        this.startUnreadCheck();

        this.initialized = true;
        console.log('[AiAssistant] Initialized');

        return this;
    }

    /**
     * Create widget DOM structure
     */
    createWidget() {
        // Bubble (collapsed state)
        this.bubble = document.createElement('div');
        this.bubble.className = 'ztgi-assistant-bubble';
        this.bubble.innerHTML = `
            <span class="ztgi-assistant-bubble-icon">🤖</span>
            <span class="ztgi-assistant-bubble-badge" style="display: none;">0</span>
        `;
        this.bubble.onclick = () => this.toggle();
        document.body.appendChild(this.bubble);

        // Main container (expanded state)
        this.container = document.createElement('div');
        this.container.className = 'ztgi-assistant-container';
        this.container.style.display = 'none';
        this.container.innerHTML = `
            <div class="ztgi-assistant-header">
                <span class="ztgi-assistant-title">🤖 Assistant</span>
                <div class="ztgi-assistant-header-actions">
                    <button class="ztgi-assistant-btn-minimize" title="Minimize">−</button>
                    <button class="ztgi-assistant-btn-close" title="Close">×</button>
                </div>
            </div>
            <div class="ztgi-assistant-tabs">
                <button class="ztgi-assistant-tab active" data-tab="chat">Chat</button>
                <button class="ztgi-assistant-tab" data-tab="inbox">
                    Inbox <span class="ztgi-assistant-inbox-badge" style="display: none;">0</span>
                </button>
                <button class="ztgi-assistant-tab" data-tab="insights">Insights</button>
            </div>
            <div class="ztgi-assistant-content">
                <div class="ztgi-assistant-panel active" data-panel="chat">
                    <div class="ztgi-assistant-messages"></div>
                    <div class="ztgi-assistant-quick-actions"></div>
                </div>
                <div class="ztgi-assistant-panel" data-panel="inbox">
                    <div class="ztgi-assistant-inbox-list"></div>
                </div>
                <div class="ztgi-assistant-panel" data-panel="insights">
                    <div class="ztgi-assistant-insights"></div>
                </div>
            </div>
            <div class="ztgi-assistant-input-container">
                <input type="text" class="ztgi-assistant-input" placeholder="Ask me anything..." />
                <button class="ztgi-assistant-send">Send</button>
            </div>
        `;
        document.body.appendChild(this.container);

        // Bind events
        this.bindEvents();

        // Render quick actions
        this.renderQuickActions();
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Close button
        this.container.querySelector('.ztgi-assistant-btn-close').onclick = () => this.close();

        // Minimize button
        this.container.querySelector('.ztgi-assistant-btn-minimize').onclick = () => this.minimize();

        // Tab switching
        this.container.querySelectorAll('.ztgi-assistant-tab').forEach(tab => {
            tab.onclick = () => this.switchTab(tab.dataset.tab);
        });

        // Input handling
        const input = this.container.querySelector('.ztgi-assistant-input');
        const sendBtn = this.container.querySelector('.ztgi-assistant-send');

        input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        };

        sendBtn.onclick = () => this.sendMessage();
    }

    /**
     * Add CSS styles
     */
    addStyles() {
        if (document.getElementById('ztgi-assistant-styles')) return;

        const style = document.createElement('style');
        style.id = 'ztgi-assistant-styles';
        style.textContent = this.getStyles();
        document.head.appendChild(style);
    }

    /**
     * Get CSS styles
     */
    getStyles() {
        return `
            .ztgi-assistant-bubble {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 56px;
                height: 56px;
                background: #2d2d2d;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10000;
                transition: transform 0.2s, background 0.2s;
            }
            .ztgi-assistant-bubble:hover {
                transform: scale(1.1);
                background: #3d3d3d;
            }
            .ztgi-assistant-bubble-icon {
                font-size: 24px;
            }
            .ztgi-assistant-bubble-badge {
                position: absolute;
                top: -4px;
                right: -4px;
                background: #e74c3c;
                color: white;
                font-size: 11px;
                font-weight: bold;
                padding: 2px 6px;
                border-radius: 10px;
                min-width: 18px;
                text-align: center;
            }

            .ztgi-assistant-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 380px;
                height: 520px;
                background: #1e1e1e;
                border-radius: 12px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.4);
                z-index: 10001;
                display: flex;
                flex-direction: column;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: #e0e0e0;
                overflow: hidden;
            }

            .ztgi-assistant-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: #2d2d2d;
                border-bottom: 1px solid #3d3d3d;
            }
            .ztgi-assistant-title {
                font-weight: 600;
                font-size: 14px;
            }
            .ztgi-assistant-header-actions button {
                background: none;
                border: none;
                color: #888;
                font-size: 18px;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
            }
            .ztgi-assistant-header-actions button:hover {
                background: #3d3d3d;
                color: #fff;
            }

            .ztgi-assistant-tabs {
                display: flex;
                background: #252525;
                border-bottom: 1px solid #3d3d3d;
            }
            .ztgi-assistant-tab {
                flex: 1;
                padding: 10px;
                background: none;
                border: none;
                color: #888;
                font-size: 13px;
                cursor: pointer;
                border-bottom: 2px solid transparent;
                transition: all 0.2s;
            }
            .ztgi-assistant-tab:hover {
                color: #ccc;
                background: #2a2a2a;
            }
            .ztgi-assistant-tab.active {
                color: #4dabf7;
                border-bottom-color: #4dabf7;
            }
            .ztgi-assistant-inbox-badge {
                background: #e74c3c;
                color: white;
                font-size: 10px;
                padding: 1px 5px;
                border-radius: 8px;
                margin-left: 4px;
            }

            .ztgi-assistant-content {
                flex: 1;
                overflow: hidden;
                position: relative;
            }
            .ztgi-assistant-panel {
                position: absolute;
                inset: 0;
                overflow-y: auto;
                padding: 12px;
                display: none;
            }
            .ztgi-assistant-panel.active {
                display: block;
            }

            .ztgi-assistant-messages {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .ztgi-assistant-message {
                padding: 10px 14px;
                border-radius: 12px;
                max-width: 85%;
                font-size: 13px;
                line-height: 1.5;
            }
            .ztgi-assistant-message.user {
                background: #3b5998;
                color: white;
                align-self: flex-end;
                border-bottom-right-radius: 4px;
            }
            .ztgi-assistant-message.assistant {
                background: #2d2d2d;
                color: #e0e0e0;
                align-self: flex-start;
                border-bottom-left-radius: 4px;
            }
            .ztgi-assistant-message.system {
                background: #1a3a1a;
                color: #8bc34a;
                font-size: 12px;
                text-align: center;
                max-width: 100%;
            }
            .ztgi-assistant-typing {
                color: #888;
                font-style: italic;
                font-size: 12px;
                padding: 8px;
            }

            .ztgi-assistant-quick-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                padding: 12px 0;
                border-top: 1px solid #333;
                margin-top: 12px;
            }
            .ztgi-assistant-quick-action {
                background: #2d2d2d;
                border: 1px solid #444;
                color: #ccc;
                padding: 6px 12px;
                border-radius: 16px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .ztgi-assistant-quick-action:hover {
                background: #3d3d3d;
                border-color: #4dabf7;
                color: #4dabf7;
            }

            .ztgi-assistant-inbox-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .ztgi-assistant-inbox-item {
                padding: 12px;
                background: #2d2d2d;
                border-radius: 8px;
                cursor: pointer;
            }
            .ztgi-assistant-inbox-item:hover {
                background: #3d3d3d;
            }
            .ztgi-assistant-inbox-item-header {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
                color: #888;
                margin-bottom: 4px;
            }
            .ztgi-assistant-inbox-item-content {
                font-size: 13px;
                color: #e0e0e0;
            }
            .ztgi-assistant-inbox-item.unread {
                border-left: 3px solid #4dabf7;
            }

            .ztgi-assistant-insights {
                font-size: 13px;
            }
            .ztgi-assistant-insight-section {
                margin-bottom: 16px;
            }
            .ztgi-assistant-insight-title {
                font-weight: 600;
                color: #4dabf7;
                margin-bottom: 8px;
                font-size: 12px;
                text-transform: uppercase;
            }
            .ztgi-assistant-insight-item {
                display: flex;
                justify-content: space-between;
                padding: 6px 0;
                border-bottom: 1px solid #333;
            }
            .ztgi-assistant-insight-item:last-child {
                border-bottom: none;
            }
            .ztgi-assistant-insight-count {
                color: #888;
                font-size: 12px;
            }

            .ztgi-assistant-input-container {
                display: flex;
                padding: 12px;
                gap: 8px;
                background: #252525;
                border-top: 1px solid #3d3d3d;
            }
            .ztgi-assistant-input {
                flex: 1;
                padding: 10px 14px;
                background: #1e1e1e;
                border: 1px solid #444;
                border-radius: 8px;
                color: #e0e0e0;
                font-size: 13px;
                outline: none;
            }
            .ztgi-assistant-input:focus {
                border-color: #4dabf7;
            }
            .ztgi-assistant-input::placeholder {
                color: #666;
            }
            .ztgi-assistant-send {
                padding: 10px 16px;
                background: #4dabf7;
                border: none;
                border-radius: 8px;
                color: white;
                font-weight: 600;
                font-size: 13px;
                cursor: pointer;
                transition: background 0.2s;
            }
            .ztgi-assistant-send:hover {
                background: #339af0;
            }
            .ztgi-assistant-send:disabled {
                background: #444;
                cursor: not-allowed;
            }

            .ztgi-assistant-empty {
                text-align: center;
                color: #666;
                padding: 40px 20px;
            }
            .ztgi-assistant-empty-icon {
                font-size: 32px;
                margin-bottom: 12px;
            }
        `;
    }

    /**
     * Toggle widget open/closed
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Open the widget
     */
    open() {
        this.isOpen = true;
        this.isMinimized = false;
        this.container.style.display = 'flex';
        this.bubble.style.display = 'none';
        this.container.querySelector('.ztgi-assistant-input').focus();

        // Refresh current tab content
        this.refreshCurrentTab();
    }

    /**
     * Close the widget
     */
    close() {
        this.isOpen = false;
        this.container.style.display = 'none';
        this.bubble.style.display = 'flex';
    }

    /**
     * Minimize to bubble
     */
    minimize() {
        this.isMinimized = true;
        this.close();
    }

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        this.activeTab = tabName;

        // Update tab buttons
        this.container.querySelectorAll('.ztgi-assistant-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update panels
        this.container.querySelectorAll('.ztgi-assistant-panel').forEach(panel => {
            panel.classList.toggle('active', panel.dataset.panel === tabName);
        });

        // Refresh tab content
        this.refreshCurrentTab();
    }

    /**
     * Refresh current tab content
     */
    refreshCurrentTab() {
        switch (this.activeTab) {
            case 'chat':
                // Chat messages are already rendered
                break;
            case 'inbox':
                this.loadInbox();
                break;
            case 'insights':
                this.renderInsights();
                break;
        }
    }

    /**
     * Set page context for assistant
     */
    setPageContext(page, data = {}) {
        this.pageContext = {
            page: page,
            ...data
        };

        // Track page visit
        if (this.analytics) {
            this.analytics.trackPageVisit(page, data);
        }

        console.log(`[AiAssistant] Page context set: ${page}`);
    }

    /**
     * Send a chat message
     */
    async sendMessage() {
        const input = this.container.querySelector('.ztgi-assistant-input');
        const message = input.value.trim();

        if (!message || this.isTyping) return;

        input.value = '';

        // Add user message to UI
        this.addMessage('user', message);

        // Show typing indicator
        this.showTyping(true);

        try {
            // Get assistant ID for current page
            const assistantId = this.getAssistantId();

            // Send to Email-for-AI
            const result = await this.emailClient.chat(
                assistantId,
                message,
                this.chatHistory.slice(-10),
                this.pageContext
            );

            this.showTyping(false);

            if (result.success) {
                this.addMessage('assistant', result.response);
            } else if (result.offline) {
                this.addMessage('system', result.response);
            } else {
                this.addMessage('system', 'Failed to get response. Please try again.');
            }
        } catch (error) {
            this.showTyping(false);
            this.addMessage('system', `Error: ${error.message}`);
        }
    }

    /**
     * Add message to chat
     */
    addMessage(role, content) {
        const messagesEl = this.container.querySelector('.ztgi-assistant-messages');

        const messageEl = document.createElement('div');
        messageEl.className = `ztgi-assistant-message ${role}`;
        messageEl.textContent = content;
        messagesEl.appendChild(messageEl);

        // Store in history
        this.chatHistory.push({ role, content, timestamp: new Date().toISOString() });

        // Scroll to bottom
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    /**
     * Show/hide typing indicator
     */
    showTyping(show) {
        this.isTyping = show;
        const messagesEl = this.container.querySelector('.ztgi-assistant-messages');

        // Remove existing typing indicator
        const existing = messagesEl.querySelector('.ztgi-assistant-typing');
        if (existing) existing.remove();

        if (show) {
            const typing = document.createElement('div');
            typing.className = 'ztgi-assistant-typing';
            typing.textContent = 'Assistant is typing...';
            messagesEl.appendChild(typing);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        // Disable/enable send button
        this.container.querySelector('.ztgi-assistant-send').disabled = show;
    }

    /**
     * Load inbox messages
     */
    async loadInbox() {
        const inboxList = this.container.querySelector('.ztgi-assistant-inbox-list');
        inboxList.innerHTML = '<div class="ztgi-assistant-typing">Loading...</div>';

        try {
            const assistantId = this.getAssistantId();
            const messages = await this.emailClient.getMessages(assistantId, { limit: 20 });

            if (messages.length === 0) {
                inboxList.innerHTML = `
                    <div class="ztgi-assistant-empty">
                        <div class="ztgi-assistant-empty-icon">📭</div>
                        <div>No messages yet</div>
                    </div>
                `;
                return;
            }

            inboxList.innerHTML = '';
            for (const msg of messages.slice().reverse()) {
                const item = document.createElement('div');
                item.className = 'ztgi-assistant-inbox-item';

                const time = new Date(msg.timestamp).toLocaleString();
                const from = msg.from_agent || 'Unknown';
                const content = msg.payload?.content || msg.payload?.message || JSON.stringify(msg.payload).slice(0, 100);

                item.innerHTML = `
                    <div class="ztgi-assistant-inbox-item-header">
                        <span>${from}</span>
                        <span>${time}</span>
                    </div>
                    <div class="ztgi-assistant-inbox-item-content">${this.escapeHtml(content)}</div>
                `;

                item.onclick = () => this.viewInboxMessage(msg);
                inboxList.appendChild(item);
            }
        } catch (error) {
            inboxList.innerHTML = `
                <div class="ztgi-assistant-empty">
                    <div class="ztgi-assistant-empty-icon">⚠️</div>
                    <div>Failed to load inbox</div>
                </div>
            `;
        }
    }

    /**
     * View inbox message detail
     */
    viewInboxMessage(msg) {
        // Switch to chat and show the message
        this.switchTab('chat');
        this.addMessage('system', `From: ${msg.from_agent}`);
        this.addMessage('assistant', msg.payload?.content || JSON.stringify(msg.payload));
    }

    /**
     * Render insights tab
     */
    renderInsights() {
        const insightsEl = this.container.querySelector('.ztgi-assistant-insights');

        if (!this.analytics) {
            insightsEl.innerHTML = `
                <div class="ztgi-assistant-empty">
                    <div class="ztgi-assistant-empty-icon">📊</div>
                    <div>Analytics not available</div>
                </div>
            `;
            return;
        }

        const insights = this.analytics.getUsageInsights();
        const topMenuItems = insights.topMenuItems.slice(0, 5);
        const topShortcuts = insights.topShortcuts.slice(0, 5);
        const pageStats = Object.entries(insights.pageVisits).slice(0, 5);

        insightsEl.innerHTML = `
            <div class="ztgi-assistant-insight-section">
                <div class="ztgi-assistant-insight-title">Top Menu Actions</div>
                ${topMenuItems.length > 0 ? topMenuItems.map(item => `
                    <div class="ztgi-assistant-insight-item">
                        <span>${item.action}</span>
                        <span class="ztgi-assistant-insight-count">${item.count} uses</span>
                    </div>
                `).join('') : '<div class="ztgi-assistant-insight-item"><span>No data yet</span></div>'}
            </div>

            <div class="ztgi-assistant-insight-section">
                <div class="ztgi-assistant-insight-title">Top Shortcuts</div>
                ${topShortcuts.length > 0 ? topShortcuts.map(item => `
                    <div class="ztgi-assistant-insight-item">
                        <span>${item.shortcut}</span>
                        <span class="ztgi-assistant-insight-count">${item.count} uses</span>
                    </div>
                `).join('') : '<div class="ztgi-assistant-insight-item"><span>No data yet</span></div>'}
            </div>

            <div class="ztgi-assistant-insight-section">
                <div class="ztgi-assistant-insight-title">Page Visits</div>
                ${pageStats.length > 0 ? pageStats.map(([page, stats]) => `
                    <div class="ztgi-assistant-insight-item">
                        <span>${page}</span>
                        <span class="ztgi-assistant-insight-count">${stats.visits} visits</span>
                    </div>
                `).join('') : '<div class="ztgi-assistant-insight-item"><span>No data yet</span></div>'}
            </div>

            <div class="ztgi-assistant-insight-section">
                <div class="ztgi-assistant-insight-title">Session Stats</div>
                <div class="ztgi-assistant-insight-item">
                    <span>Total Events</span>
                    <span class="ztgi-assistant-insight-count">${insights.totalEvents}</span>
                </div>
                <div class="ztgi-assistant-insight-item">
                    <span>Session Duration</span>
                    <span class="ztgi-assistant-insight-count">${Math.round(insights.sessionDuration / 60000)}min</span>
                </div>
            </div>
        `;
    }

    /**
     * Render quick action buttons
     */
    renderQuickActions() {
        const container = this.container.querySelector('.ztgi-assistant-quick-actions');
        container.innerHTML = '';

        for (const action of this.quickActions) {
            const btn = document.createElement('button');
            btn.className = 'ztgi-assistant-quick-action';
            btn.textContent = action.label;
            btn.onclick = () => this.handleQuickAction(action);
            container.appendChild(btn);
        }
    }

    /**
     * Handle quick action click
     */
    handleQuickAction(action) {
        if (action.message) {
            const input = this.container.querySelector('.ztgi-assistant-input');
            input.value = action.message;
            this.sendMessage();
        } else if (action.action) {
            this.ztgi.actions.execute(action.action, this.pageContext);
        }
    }

    /**
     * Get assistant ID for current page
     */
    getAssistantId() {
        const page = this.pageContext.page || 'browse';
        return `${this.ztgi.appName}_${page}_assistant`;
    }

    /**
     * Start periodic unread count check
     */
    startUnreadCheck() {
        setInterval(async () => {
            if (!this.isOpen) {
                await this.checkUnread();
            }
        }, 30000);
    }

    /**
     * Check for unread messages
     */
    async checkUnread() {
        try {
            const messages = await this.emailClient.getMessages(this.getAssistantId(), { limit: 10 });
            // Simple unread count based on recent messages
            // In production, you'd track read status properly
            const newCount = messages.filter(m => {
                const msgTime = new Date(m.timestamp).getTime();
                return Date.now() - msgTime < 300000; // Last 5 minutes
            }).length;

            this.updateUnreadBadge(newCount);
        } catch (error) {
            // Silently fail
        }
    }

    /**
     * Update unread badge
     */
    updateUnreadBadge(count) {
        this.unreadCount = count;

        const bubbleBadge = this.bubble.querySelector('.ztgi-assistant-bubble-badge');
        const inboxBadge = this.container.querySelector('.ztgi-assistant-inbox-badge');

        if (count > 0) {
            bubbleBadge.textContent = count;
            bubbleBadge.style.display = 'block';
            inboxBadge.textContent = count;
            inboxBadge.style.display = 'inline';
        } else {
            bubbleBadge.style.display = 'none';
            inboxBadge.style.display = 'none';
        }
    }

    /**
     * Get default system prompts by page
     */
    getDefaultSystemPrompts() {
        return {
            browse: "You are the Browse Assistant for CNP Browser. You help users navigate their clipboard history, find entries, and optimize their workflow. You can see their usage patterns and suggest menu customizations.",
            flow: "You are the Flow Assistant. You help users build visual workflows, connect nodes, and understand relationships in their clipboard data.",
            graph: "You are the Graph Assistant. You help users explore the network graph of their clipboard entries, find clusters, and analyze connections.",
            timeline: "You are the Timeline Assistant. You help users navigate their clipboard history chronologically and find patterns over time.",
            dashboard: "You are the Dashboard Assistant. You help users understand their clipboard analytics and manage their data.",
            ask: "You are the Ask AI Assistant. You help users search and query their clipboard data using natural language."
        };
    }

    /**
     * Get default quick actions
     */
    getDefaultQuickActions() {
        return [
            { label: "What do I use most?", message: "What menu actions do I use most often?" },
            { label: "Suggest optimization", message: "Based on my usage patterns, how can I optimize my menu?" },
            { label: "Show shortcuts", message: "What keyboard shortcuts are available?" },
            { label: "Help", message: "What can you help me with?" }
        ];
    }

    /**
     * Escape HTML for safe display
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.bubble) this.bubble.remove();
        if (this.container) this.container.remove();
        const styles = document.getElementById('ztgi-assistant-styles');
        if (styles) styles.remove();
    }
}

export { AiAssistant };
