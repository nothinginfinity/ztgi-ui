/**
 * ZTGI Action Router
 * Routes actions to local handlers or remote APIs
 *
 * Usage:
 *   ZtgiUI.actions.register('cnp.viewChain', async (data) => {
 *     window.location.href = `/chain/${data.hash8}`;
 *   });
 *
 *   ZtgiUI.actions.register('cnp.askAI', async (data) => {
 *     const response = await fetch(`http://localhost:7890/ask`, {
 *       method: 'POST',
 *       body: JSON.stringify({ query: 'Explain this', hash8: data.hash8 })
 *     });
 *     // Show response in modal
 *   });
 */

class ActionRouter {
    constructor() {
        this.handlers = {};
        this.apiEndpoints = {
            'cnp': 'http://localhost:7890',
            'email-for-ai': 'http://localhost:8000',
            'lawyers-and-dragons': 'http://localhost:3001'
        };
        this.middleware = [];
    }

    register(action, handler) {
        this.handlers[action] = handler;
    }

    // Add middleware that runs before every action
    use(fn) {
        this.middleware.push(fn);
    }

    async execute(action, data = {}) {
        // Run middleware
        for (const fn of this.middleware) {
            const result = await fn(action, data);
            if (result === false) {
                console.log(`[ZTGI-UI] Action ${action} blocked by middleware`);
                return null;
            }
            if (result && typeof result === 'object') {
                data = { ...data, ...result };
            }
        }

        // Check for URL pattern in action (e.g., "/chain/{hash8}")
        if (action.startsWith('/') || action.startsWith('http')) {
            const url = this.interpolateUrl(action, data);
            window.location.href = url;
            return;
        }

        // Check local handlers
        if (this.handlers[action]) {
            try {
                return await this.handlers[action](data);
            } catch (err) {
                console.error(`[ZTGI-UI] Action ${action} failed:`, err);
                throw err;
            }
        }

        // Handle cursor mode actions (cursor.modeName)
        if (action.startsWith('cursor.')) {
            const mode = action.replace('cursor.', '');
            document.dispatchEvent(new CustomEvent('ztgi:setcursor', { detail: { mode } }));
            return;
        }

        // Try API call if action looks like 'app.method'
        const [app, method] = action.split('.');
        if (app && method && this.apiEndpoints[app]) {
            return await this.apiCall(app, method, data);
        }

        console.warn(`[ZTGI-UI] No handler for action: ${action}`);
    }

    interpolateUrl(template, data) {
        return template.replace(/\{(\w+)\}/g, (match, key) => {
            return data[key] !== undefined ? encodeURIComponent(data[key]) : match;
        });
    }

    async apiCall(app, method, data) {
        const endpoint = this.apiEndpoints[app];
        try {
            const response = await fetch(`${endpoint}/action/${method}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`API call failed: ${response.status}`);
            }
            return response.json();
        } catch (err) {
            console.error(`[ZTGI-UI] API call to ${app}.${method} failed:`, err);
            throw err;
        }
    }

    setApiEndpoint(app, url) {
        this.apiEndpoints[app] = url;
    }

    getApiEndpoint(app) {
        return this.apiEndpoints[app];
    }
}

export { ActionRouter };
