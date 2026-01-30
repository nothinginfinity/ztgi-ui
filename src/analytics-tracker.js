/**
 * Analytics Tracker
 *
 * Tracks user behavior in ZTGI-UI for AI assistant insights:
 * - Menu clicks
 * - Copy operations
 * - Keyboard shortcuts
 * - Page visits
 *
 * Usage:
 *   const tracker = new AnalyticsTracker(emailClient);
 *   tracker.init({ syncInterval: 60000 });
 *   tracker.trackMenuClick('cnp-entry', 'copy', { hash8: 'abc12345' });
 *   const insights = tracker.getUsageInsights();
 */

class AnalyticsTracker {
    constructor(emailClient) {
        this.emailClient = emailClient;
        this.localStorageKey = 'ztgi_analytics';
        this.events = [];
        this.sessionId = this.generateSessionId();
        this.sessionStart = Date.now();
        this.currentPage = null;
        this.pageStartTime = null;
        this.syncInterval = null;
        this.syncPending = false;
    }

    /**
     * Initialize tracker with options
     */
    init(options = {}) {
        // Load any unsent events from localStorage
        this.loadLocalEvents();

        // Set up periodic sync
        const interval = options.syncInterval || 60000;
        if (interval > 0) {
            this.syncInterval = setInterval(() => {
                this.syncToEmailForAi();
            }, interval);
        }

        // Track page visibility for accurate durations
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.currentPage) {
                this.trackPageExit();
            } else if (!document.hidden && this.currentPage) {
                this.pageStartTime = Date.now();
            }
        });

        // Sync before page unload
        window.addEventListener('beforeunload', () => {
            this.trackPageExit();
            this.saveLocalEvents();
        });

        return this;
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate event ID
     */
    generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    // ==================== Tracking Methods ====================

    /**
     * Track menu click event
     */
    trackMenuClick(menuType, action, data = {}) {
        this.addEvent({
            type: 'menu_click',
            menuType: menuType,
            action: action,
            data: {
                hash8: data.hash8 || null,
                context: data.context || null,
                label: data.label || null
            }
        });
    }

    /**
     * Track copy operation
     */
    trackCopyOperation(contentType, sourceContext = {}) {
        this.addEvent({
            type: 'copy',
            contentType: contentType,
            data: {
                hash8: sourceContext.hash8 || null,
                source: sourceContext.source || null,
                length: sourceContext.length || null
            }
        });
    }

    /**
     * Track keyboard shortcut usage
     */
    trackKeyboardShortcut(shortcut, action) {
        this.addEvent({
            type: 'shortcut',
            shortcut: shortcut,
            action: action
        });
    }

    /**
     * Track page visit
     */
    trackPageVisit(pageName, pageData = {}) {
        // Record exit from previous page
        if (this.currentPage) {
            this.trackPageExit();
        }

        this.currentPage = pageName;
        this.pageStartTime = Date.now();

        this.addEvent({
            type: 'page_visit',
            pageName: pageName,
            data: {
                title: pageData.title || document.title,
                referrer: pageData.referrer || document.referrer,
                entryCount: pageData.entryCount || null
            }
        });
    }

    /**
     * Track page exit with duration
     */
    trackPageExit() {
        if (!this.currentPage || !this.pageStartTime) {
            return;
        }

        const duration = Date.now() - this.pageStartTime;

        this.addEvent({
            type: 'page_exit',
            pageName: this.currentPage,
            data: {
                duration: duration,
                durationSeconds: Math.round(duration / 1000)
            }
        });

        this.currentPage = null;
        this.pageStartTime = null;
    }

    /**
     * Track custom event
     */
    trackCustom(eventName, data = {}) {
        this.addEvent({
            type: 'custom',
            eventName: eventName,
            data: data
        });
    }

    // ==================== Event Storage ====================

    /**
     * Add event to queue
     */
    addEvent(event) {
        const fullEvent = {
            id: this.generateEventId(),
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            synced: false,
            ...event
        };

        this.events.push(fullEvent);

        // Keep in-memory events limited
        if (this.events.length > 500) {
            this.events = this.events.slice(-500);
        }

        // Save to localStorage periodically
        if (this.events.length % 10 === 0) {
            this.saveLocalEvents();
        }
    }

    /**
     * Save events to localStorage
     */
    saveLocalEvents() {
        try {
            const unsyncedEvents = this.events.filter(e => !e.synced);
            localStorage.setItem(this.localStorageKey, JSON.stringify({
                events: unsyncedEvents.slice(-200), // Keep last 200 unsynced
                lastSaved: new Date().toISOString()
            }));
        } catch (error) {
            console.error('[AnalyticsTracker] Save error:', error);
        }
    }

    /**
     * Load events from localStorage
     */
    loadLocalEvents() {
        try {
            const stored = localStorage.getItem(this.localStorageKey);
            if (stored) {
                const data = JSON.parse(stored);
                if (data.events && Array.isArray(data.events)) {
                    this.events = [...data.events, ...this.events];
                }
            }
        } catch (error) {
            console.error('[AnalyticsTracker] Load error:', error);
        }
    }

    // ==================== Sync ====================

    /**
     * Sync events to Email-for-AI backend
     */
    async syncToEmailForAi() {
        if (this.syncPending || !this.emailClient) {
            return;
        }

        const unsyncedEvents = this.events.filter(e => !e.synced);
        if (unsyncedEvents.length === 0) {
            return;
        }

        this.syncPending = true;

        try {
            const result = await this.emailClient.storeAnalytics(unsyncedEvents);

            if (result.success || result.offline) {
                // Mark as synced (even if offline - they're in pending queue)
                unsyncedEvents.forEach(e => e.synced = true);
                this.saveLocalEvents();
            }
        } catch (error) {
            console.error('[AnalyticsTracker] Sync error:', error);
        } finally {
            this.syncPending = false;
        }
    }

    // ==================== Insights ====================

    /**
     * Get aggregated usage insights
     */
    getUsageInsights() {
        const insights = {
            sessionDuration: Date.now() - this.sessionStart,
            totalEvents: this.events.length,
            eventsByType: {},
            topMenuItems: this.getTopMenuItems(10),
            topShortcuts: this.getTopShortcuts(10),
            pageVisits: this.getPageStats(),
            unusedMenuItems: [],
            recentActivity: this.getRecentActivity(20)
        };

        // Count events by type
        for (const event of this.events) {
            if (!insights.eventsByType[event.type]) {
                insights.eventsByType[event.type] = 0;
            }
            insights.eventsByType[event.type]++;
        }

        return insights;
    }

    /**
     * Get most used menu items
     */
    getTopMenuItems(limit = 10) {
        const counts = {};

        for (const event of this.events) {
            if (event.type === 'menu_click') {
                const key = `${event.menuType}:${event.action}`;
                counts[key] = (counts[key] || 0) + 1;
            }
        }

        return Object.entries(counts)
            .map(([key, count]) => {
                const [menuType, action] = key.split(':');
                return { menuType, action, count };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    /**
     * Get most used keyboard shortcuts
     */
    getTopShortcuts(limit = 10) {
        const counts = {};

        for (const event of this.events) {
            if (event.type === 'shortcut') {
                const key = event.shortcut;
                counts[key] = (counts[key] || 0) + 1;
            }
        }

        return Object.entries(counts)
            .map(([shortcut, count]) => ({ shortcut, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    /**
     * Get items that exist in menu but have never been used
     */
    getUnusedMenuItems(allMenuItems = []) {
        const usedActions = new Set();

        for (const event of this.events) {
            if (event.type === 'menu_click') {
                usedActions.add(event.action);
            }
        }

        return allMenuItems.filter(item => !usedActions.has(item.action));
    }

    /**
     * Get page visit statistics
     */
    getPageStats() {
        const stats = {};

        for (const event of this.events) {
            if (event.type === 'page_visit') {
                if (!stats[event.pageName]) {
                    stats[event.pageName] = { visits: 0, totalDuration: 0 };
                }
                stats[event.pageName].visits++;
            } else if (event.type === 'page_exit') {
                if (stats[event.pageName] && event.data.duration) {
                    stats[event.pageName].totalDuration += event.data.duration;
                }
            }
        }

        // Calculate average duration
        for (const page in stats) {
            if (stats[page].visits > 0) {
                stats[page].avgDuration = Math.round(stats[page].totalDuration / stats[page].visits);
            }
        }

        return stats;
    }

    /**
     * Get recent activity for display
     */
    getRecentActivity(limit = 20) {
        return this.events
            .slice(-limit)
            .reverse()
            .map(event => ({
                id: event.id,
                type: event.type,
                description: this.describeEvent(event),
                timestamp: event.timestamp
            }));
    }

    /**
     * Generate human-readable description of event
     */
    describeEvent(event) {
        switch (event.type) {
            case 'menu_click':
                return `Clicked "${event.action}" in ${event.menuType} menu`;
            case 'copy':
                return `Copied ${event.contentType}`;
            case 'shortcut':
                return `Used shortcut ${event.shortcut} → ${event.action}`;
            case 'page_visit':
                return `Visited ${event.pageName}`;
            case 'page_exit':
                return `Left ${event.pageName} after ${event.data.durationSeconds}s`;
            case 'custom':
                return event.eventName;
            default:
                return event.type;
        }
    }

    /**
     * Get menu usage for AI suggestions
     */
    getMenuUsageForAI() {
        const usage = {};
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

        for (const event of this.events) {
            if (event.type === 'menu_click') {
                const eventTime = new Date(event.timestamp).getTime();
                if (eventTime > oneWeekAgo) {
                    const key = `${event.menuType}:${event.action}`;
                    if (!usage[key]) {
                        usage[key] = {
                            menuType: event.menuType,
                            action: event.action,
                            count: 0,
                            lastUsed: event.timestamp
                        };
                    }
                    usage[key].count++;
                    if (event.timestamp > usage[key].lastUsed) {
                        usage[key].lastUsed = event.timestamp;
                    }
                }
            }
        }

        return Object.values(usage).sort((a, b) => b.count - a.count);
    }

    /**
     * Clear all analytics data
     */
    clear() {
        this.events = [];
        localStorage.removeItem(this.localStorageKey);
    }

    /**
     * Cleanup - stop sync interval
     */
    destroy() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        this.saveLocalEvents();
    }
}

export { AnalyticsTracker };
