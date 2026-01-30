/**
 * Email-for-AI API Client
 *
 * Handles communication with Email-for-AI backend for AI assistant features.
 * Falls back to localStorage when backend unavailable.
 *
 * Usage:
 *   const client = new EmailForAiClient({ baseUrl: 'http://localhost:8000' });
 *   await client.checkHealth();
 *   await client.sendMessage('cnp_browse_assistant', { text: 'Hello' });
 *   const messages = await client.getMessages('cnp_browse_assistant');
 *   const response = await client.chat('cnp_browse_assistant', 'What do I use most?', history, context);
 */

class EmailForAiClient {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || 'http://localhost:8000';
        this.inboxPrefix = options.inboxPrefix || 'cnp';
        this.offlineMode = false;
        this.healthCheckInterval = null;
        this.localStorageKey = 'ztgi_email_for_ai_cache';
        this.pendingMessages = [];
        this.lastHealthCheck = 0;
        this.healthCheckCooldown = 30000; // 30 seconds
    }

    /**
     * Initialize client with periodic health checks
     */
    init(options = {}) {
        const checkInterval = options.healthCheckInterval || 60000;

        // Initial health check
        this.checkHealth();

        // Periodic health checks
        if (checkInterval > 0) {
            this.healthCheckInterval = setInterval(() => {
                this.checkHealth();
            }, checkInterval);
        }

        // Sync pending messages when online
        window.addEventListener('online', () => this.syncPendingMessages());

        return this;
    }

    /**
     * Check if Email-for-AI backend is available
     */
    async checkHealth() {
        const now = Date.now();
        if (now - this.lastHealthCheck < this.healthCheckCooldown) {
            return !this.offlineMode;
        }
        this.lastHealthCheck = now;

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (response.ok) {
                const wasOffline = this.offlineMode;
                this.offlineMode = false;

                // Sync pending messages if we just came online
                if (wasOffline) {
                    this.syncPendingMessages();
                }

                return true;
            }
        } catch (error) {
            console.warn('[EmailForAiClient] Backend unavailable:', error.message);
            this.offlineMode = true;
        }
        return false;
    }

    /**
     * Generate unique tracking ID for messages
     */
    generateTrackingId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get full inbox ID with prefix
     */
    getInboxId(shortName) {
        if (shortName.startsWith(this.inboxPrefix + '_')) {
            return shortName;
        }
        return `${this.inboxPrefix}_${shortName}_assistant`;
    }

    /**
     * Send message to assistant inbox
     */
    async sendMessage(to, payload, opts = {}) {
        const message = {
            tracking_id: opts.trackingId || this.generateTrackingId(),
            from_agent: opts.from || `${this.inboxPrefix}_user`,
            to_agent: this.getInboxId(to),
            message_type: opts.messageType || 'user_message',
            priority: opts.priority || 'normal',
            payload: payload,
            timestamp: new Date().toISOString()
        };

        // Try Email-for-AI backend first
        if (!this.offlineMode) {
            try {
                const response = await fetch(`${this.baseUrl}/mcp/inbox/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(message)
                });

                if (response.ok) {
                    return await response.json();
                }

                // Backend error, fall through to offline mode
                console.warn('[EmailForAiClient] Send failed, caching locally');
            } catch (error) {
                console.warn('[EmailForAiClient] Network error:', error.message);
                this.offlineMode = true;
            }
        }

        // Offline fallback: store in localStorage
        this.storeLocalMessage(message);
        this.pendingMessages.push(message);

        return {
            success: true,
            offline: true,
            tracking_id: message.tracking_id
        };
    }

    /**
     * Get messages from assistant inbox
     */
    async getMessages(agentId, opts = {}) {
        const inboxId = this.getInboxId(agentId);
        const limit = opts.limit || 50;
        const since = opts.since || null;

        if (!this.offlineMode) {
            try {
                let url = `${this.baseUrl}/mcp/inbox/messages?agent=${encodeURIComponent(inboxId)}&limit=${limit}`;
                if (since) {
                    url += `&since=${encodeURIComponent(since)}`;
                }

                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (response.ok) {
                    const data = await response.json();
                    // Cache locally for offline access
                    this.cacheMessages(inboxId, data.messages || data);
                    return data.messages || data;
                }
            } catch (error) {
                console.warn('[EmailForAiClient] Fetch messages failed:', error.message);
                this.offlineMode = true;
            }
        }

        // Offline fallback: return cached messages
        return this.getLocalMessages(inboxId);
    }

    /**
     * Chat with assistant - sends message and gets AI response
     */
    async chat(assistantId, message, history = [], pageContext = {}) {
        const inboxId = this.getInboxId(assistantId);

        const payload = {
            message: message,
            history: history.slice(-10), // Last 10 messages for context
            context: {
                page: pageContext.page || 'unknown',
                pageTitle: pageContext.pageTitle || document.title,
                timestamp: new Date().toISOString(),
                ...pageContext
            }
        };

        if (!this.offlineMode) {
            try {
                // First, send user message to inbox
                await this.sendMessage(assistantId, {
                    role: 'user',
                    content: message,
                    context: payload.context
                }, { messageType: 'chat_message' });

                // Then request AI response
                const response = await fetch(`${this.baseUrl}/mcp/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        agent_id: inboxId,
                        message: message,
                        history: payload.history,
                        context: payload.context
                    })
                });

                if (response.ok) {
                    const data = await response.json();

                    // Store assistant response in inbox
                    await this.sendMessage(assistantId, {
                        role: 'assistant',
                        content: data.response || data.message,
                        context: payload.context
                    }, {
                        messageType: 'chat_response',
                        from: inboxId
                    });

                    return {
                        success: true,
                        response: data.response || data.message,
                        tracking_id: data.tracking_id
                    };
                }
            } catch (error) {
                console.warn('[EmailForAiClient] Chat failed:', error.message);
                this.offlineMode = true;
            }
        }

        // Offline fallback
        return {
            success: false,
            offline: true,
            response: "I'm currently offline. Your message has been saved and I'll respond when the connection is restored.",
            pending: true
        };
    }

    /**
     * Store analytics data to inbox
     */
    async storeAnalytics(data) {
        return this.sendMessage('analytics', {
            type: 'analytics_batch',
            events: Array.isArray(data) ? data : [data],
            timestamp: new Date().toISOString()
        }, {
            messageType: 'analytics_data',
            priority: 'low'
        });
    }

    /**
     * Get analytics data from inbox
     */
    async getAnalytics(opts = {}) {
        const messages = await this.getMessages('analytics', opts);

        // Flatten analytics events from messages
        const events = [];
        for (const msg of messages) {
            if (msg.payload && msg.payload.events) {
                events.push(...msg.payload.events);
            }
        }

        return events;
    }

    // ==================== Local Storage Helpers ====================

    /**
     * Store message in localStorage for offline access
     */
    storeLocalMessage(message) {
        try {
            const cache = this.getLocalCache();
            const inboxId = message.to_agent;

            if (!cache.inboxes[inboxId]) {
                cache.inboxes[inboxId] = [];
            }

            cache.inboxes[inboxId].push(message);

            // Limit cache size per inbox
            if (cache.inboxes[inboxId].length > 100) {
                cache.inboxes[inboxId] = cache.inboxes[inboxId].slice(-100);
            }

            cache.pending.push(message.tracking_id);
            cache.lastUpdated = new Date().toISOString();

            localStorage.setItem(this.localStorageKey, JSON.stringify(cache));
        } catch (error) {
            console.error('[EmailForAiClient] localStorage error:', error);
        }
    }

    /**
     * Get messages from localStorage cache
     */
    getLocalMessages(inboxId) {
        const cache = this.getLocalCache();
        return cache.inboxes[inboxId] || [];
    }

    /**
     * Cache messages from backend to localStorage
     */
    cacheMessages(inboxId, messages) {
        try {
            const cache = this.getLocalCache();
            cache.inboxes[inboxId] = messages;
            cache.lastUpdated = new Date().toISOString();
            localStorage.setItem(this.localStorageKey, JSON.stringify(cache));
        } catch (error) {
            console.error('[EmailForAiClient] Cache error:', error);
        }
    }

    /**
     * Get local cache object
     */
    getLocalCache() {
        try {
            const stored = localStorage.getItem(this.localStorageKey);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('[EmailForAiClient] Parse cache error:', error);
        }
        return { inboxes: {}, pending: [], lastUpdated: null };
    }

    /**
     * Sync pending messages to backend when online
     */
    async syncPendingMessages() {
        if (this.offlineMode || this.pendingMessages.length === 0) {
            return;
        }

        const toSync = [...this.pendingMessages];
        this.pendingMessages = [];

        for (const message of toSync) {
            try {
                const response = await fetch(`${this.baseUrl}/mcp/inbox/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(message)
                });

                if (!response.ok) {
                    // Re-queue failed messages
                    this.pendingMessages.push(message);
                } else {
                    // Remove from pending in cache
                    this.removePendingFromCache(message.tracking_id);
                }
            } catch (error) {
                this.pendingMessages.push(message);
            }
        }

        if (this.pendingMessages.length > 0) {
            console.log(`[EmailForAiClient] ${this.pendingMessages.length} messages still pending sync`);
        }
    }

    /**
     * Remove synced message from pending cache
     */
    removePendingFromCache(trackingId) {
        try {
            const cache = this.getLocalCache();
            cache.pending = cache.pending.filter(id => id !== trackingId);
            localStorage.setItem(this.localStorageKey, JSON.stringify(cache));
        } catch (error) {
            console.error('[EmailForAiClient] Remove pending error:', error);
        }
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            online: !this.offlineMode,
            baseUrl: this.baseUrl,
            pendingCount: this.pendingMessages.length,
            lastHealthCheck: this.lastHealthCheck
        };
    }

    /**
     * Cleanup - stop health check interval
     */
    destroy() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }
}

export { EmailForAiClient };
