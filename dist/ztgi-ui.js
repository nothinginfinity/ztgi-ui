/**
 * ZTGI-UI - Shared Agentic UI Library
 * Version: 1.0.0
 * Built: 2026-01-30T22:22:57.604Z
 *
 * Usage:
 *   <script src="http://localhost:7892/ztgi-ui.js"></script>
 *   <script>ZtgiUI.init('cnp');</script>
 */

(function(global) {
    'use strict';

    // === utils.js ===
    /**
     * ZTGI-UI Utilities
     */
    
    // Debounce function
    function debounce(fn, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), delay);
        };
    }
    
    // Throttle function
    function throttle(fn, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                fn.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // Deep merge objects
    function deepMerge(target, source) {
        const output = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                output[key] = deepMerge(target[key] || {}, source[key]);
            } else {
                output[key] = source[key];
            }
        }
        return output;
    }
    
    // Copy to clipboard
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                document.body.removeChild(textarea);
                return true;
            } catch (e) {
                document.body.removeChild(textarea);
                return false;
            }
        }
    }
    
    // Show toast notification
    function showToast(message, duration = 3000) {
        const existing = document.querySelector('.ztgi-toast');
        if (existing) existing.remove();
    
        const toast = document.createElement('div');
        toast.className = 'ztgi-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
    
        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('ztgi-toast-visible');
        });
    
        setTimeout(() => {
            toast.classList.remove('ztgi-toast-visible');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    
    // Get element data attributes as object
    function getElementData(el) {
        if (!el || !el.dataset) return {};
        return { ...el.dataset };
    }
    
    // Find closest parent with data-context
    function findContextParent(el) {
        while (el && el !== document.body) {
            if (el.dataset && el.dataset.context) {
                return el;
            }
            el = el.parentElement;
        }
        return null;
    }
    
    
        debounce,
        throttle,
        deepMerge,
        copyToClipboard,
        showToast,
        getElementData,
        findContextParent
    
    

    // === action-router.js ===
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
    
    
    

    // === keyboard.js ===
    /**
     * ZTGI Keyboard Shortcuts
     *
     * Usage:
     *   ZtgiUI.keyboard.register('ctrl+shift+c', () => {
     *     ZtgiUI.cursor.setMode('copy');
     *   });
     *
     *   ZtgiUI.keyboard.register('escape', () => {
     *     ZtgiUI.cursor.setMode('default');
     *   });
     */
    
    class KeyboardManager {
        constructor() {
            this.shortcuts = {};
            this.enabled = true;
        }
    
        init() {
            document.addEventListener('keydown', (e) => {
                if (!this.enabled) return;
    
                // Don't trigger if typing in input/textarea/contenteditable
                const target = e.target;
                if (
                    target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable
                ) {
                    // Allow escape in inputs
                    if (e.key !== 'Escape') {
                        return;
                    }
                }
    
                const key = this.normalizeKey(e);
                if (this.shortcuts[key]) {
                    e.preventDefault();
                    this.shortcuts[key](e);
                }
            });
        }
    
        normalizeKey(e) {
            const parts = [];
            if (e.ctrlKey || e.metaKey) parts.push('ctrl');
            if (e.altKey) parts.push('alt');
            if (e.shiftKey) parts.push('shift');
    
            // Normalize key name
            let keyName = e.key.toLowerCase();
            if (keyName === ' ') keyName = 'space';
            if (keyName === 'arrowup') keyName = 'up';
            if (keyName === 'arrowdown') keyName = 'down';
            if (keyName === 'arrowleft') keyName = 'left';
            if (keyName === 'arrowright') keyName = 'right';
    
            parts.push(keyName);
            return parts.join('+');
        }
    
        register(combo, handler) {
            const normalized = combo.toLowerCase()
                .replace('cmd', 'ctrl')
                .replace('meta', 'ctrl')
                .replace('command', 'ctrl');
            this.shortcuts[normalized] = handler;
        }
    
        unregister(combo) {
            const normalized = combo.toLowerCase()
                .replace('cmd', 'ctrl')
                .replace('meta', 'ctrl')
                .replace('command', 'ctrl');
            delete this.shortcuts[normalized];
        }
    
        enable() {
            this.enabled = true;
        }
    
        disable() {
            this.enabled = false;
        }
    
        // Get all registered shortcuts (useful for help display)
        getShortcuts() {
            return Object.keys(this.shortcuts);
        }
    }
    
    
    

    // === cursor-mode.js ===
    /**
     * ZTGI Cursor Mode Manager
     *
     * Usage:
     *   ZtgiUI.cursor.registerMode('agent', {
     *     cursor: '/cursors/agent.png',
     *     hint: 'Click to spawn agent',
     *     onActivate: () => console.log('Agent mode active'),
     *     onClick: (target) => spawnAgent(target)
     *   });
     *
     *   ZtgiUI.cursor.setMode('agent');
     *   ZtgiUI.cursor.setMode('default');
     */
    
    class CursorModeManager {
        constructor() {
            this.modes = {
                default: { cursor: 'default', hint: null }
            };
            this.currentMode = 'default';
            this.hintElement = null;
            this.baseUrl = '';
        }
    
        init(baseUrl = '') {
            this.baseUrl = baseUrl;
    
            // Create hint element
            this.hintElement = document.createElement('div');
            this.hintElement.className = 'ztgi-cursor-hint';
            this.hintElement.style.display = 'none';
            document.body.appendChild(this.hintElement);
    
            // Track mouse for hint
            document.addEventListener('mousemove', (e) => {
                if (this.hintElement.style.display !== 'none') {
                    this.hintElement.style.left = `${e.clientX + 20}px`;
                    this.hintElement.style.top = `${e.clientY + 20}px`;
                }
            });
    
            // Handle clicks in cursor mode
            document.addEventListener('click', (e) => {
                const mode = this.modes[this.currentMode];
                if (mode && mode.onClick && this.currentMode !== 'default') {
                    mode.onClick(e.target, e);
                }
            });
    
            // Right-click cancels mode
            document.addEventListener('contextmenu', () => {
                if (this.currentMode !== 'default') {
                    // Let the context menu handler run first
                    setTimeout(() => {
                        if (!document.querySelector('.ztgi-context-menu')) {
                            this.setMode('default');
                        }
                    }, 10);
                }
            });
        }
    
        registerMode(name, config) {
            this.modes[name] = config;
        }
    
        setMode(name) {
            const mode = this.modes[name];
            if (!mode) {
                console.warn(`[ZTGI-UI] Unknown cursor mode: ${name}`);
                return;
            }
    
            // Deactivate previous
            const prevMode = this.modes[this.currentMode];
            if (prevMode && prevMode.onDeactivate) {
                prevMode.onDeactivate();
            }
    
            this.currentMode = name;
    
            // Set cursor
            if (mode.cursor) {
                if (mode.cursor.startsWith('/') || mode.cursor.startsWith('http')) {
                    const cursorUrl = mode.cursor.startsWith('http')
                        ? mode.cursor
                        : this.baseUrl + mode.cursor;
                    document.body.style.cursor = `url(${cursorUrl}) 16 16, auto`;
                } else {
                    document.body.style.cursor = mode.cursor;
                }
            }
    
            // Show/hide hint
            if (mode.hint) {
                this.hintElement.textContent = mode.hint;
                this.hintElement.style.display = 'block';
            } else {
                this.hintElement.style.display = 'none';
            }
    
            // Activate new mode
            if (mode.onActivate) {
                mode.onActivate();
            }
    
            // Update body class
            document.body.className = document.body.className
                .replace(/ztgi-mode-\w+/g, '')
                .trim();
            if (name !== 'default') {
                document.body.classList.add(`ztgi-mode-${name}`);
            }
    
            // Emit event
            document.dispatchEvent(new CustomEvent('ztgi:cursormode', {
                detail: { mode: name, prevMode: prevMode ? this.currentMode : null }
            }));
        }
    
        getMode() {
            return this.currentMode;
        }
    
        reset() {
            this.setMode('default');
        }
    }
    
    
    

    // === context-menu.js ===
    /**
     * ZTGI Context Menu System
     *
     * Usage:
     *   ZtgiUI.contextMenu.register('cnp-entry', [
     *     { label: '🔗 View Chain', action: 'viewChain', shortcut: 'C' },
     *     { label: '🤖 Ask AI', action: 'askAI', shortcut: 'A' },
     *     { divider: true },
     *     { label: '📅 Add to Calendar', action: 'addCalendar' },
     *   ]);
     *
     *   ZtgiUI.contextMenu.onAction('viewChain', (target, data) => {
     *     window.location.href = '/chain/' + data.hash8;
     *   });
     */
    
    class ContextMenu {
        constructor() {
            this.menus = {};
            this.handlers = {};
            this.activeMenu = null;
            this.actionRouter = null;
        }
    
        init(actionRouter) {
            this.actionRouter = actionRouter;
    
            // Intercept right-click
            document.addEventListener('contextmenu', (e) => {
                const menuType = this.detectMenuType(e.target);
                if (menuType && this.menus[menuType]) {
                    e.preventDefault();
                    this.show(e.clientX, e.clientY, menuType, e.target);
                }
            });
    
            // Close on click outside
            document.addEventListener('click', (e) => {
                if (this.activeMenu && !this.activeMenu.contains(e.target)) {
                    this.hide();
                }
            });
    
            // Close on escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.hide();
            });
    
            // Close on scroll
            document.addEventListener('scroll', () => this.hide(), true);
        }
    
        register(type, items) {
            this.menus[type] = items;
        }
    
        onAction(action, handler) {
            this.handlers[action] = handler;
        }
    
        detectMenuType(target) {
            // Walk up DOM to find [data-context] attribute
            let el = target;
            while (el && el !== document.body) {
                if (el.dataset && el.dataset.context) {
                    return el.dataset.context;
                }
                el = el.parentElement;
            }
            return null;
        }
    
        findContextElement(target) {
            let el = target;
            while (el && el !== document.body) {
                if (el.dataset && el.dataset.context) {
                    return el;
                }
                el = el.parentElement;
            }
            return target;
        }
    
        show(x, y, type, target) {
            this.hide();
    
            const menu = document.createElement('div');
            menu.className = 'ztgi-context-menu';
            menu.style.left = `${x}px`;
            menu.style.top = `${y}px`;
    
            const contextElement = this.findContextElement(target);
            const items = this.menus[type];
    
            items.forEach(item => {
                if (item.divider) {
                    const divider = document.createElement('div');
                    divider.className = 'ztgi-menu-divider';
                    menu.appendChild(divider);
                } else {
                    const menuItem = document.createElement('div');
                    menuItem.className = 'ztgi-menu-item';
                    menuItem.innerHTML = `
                        <span class="label">${item.label}</span>
                        ${item.shortcut ? `<span class="shortcut">${item.shortcut}</span>` : ''}
                    `;
                    menuItem.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.executeAction(item.action, contextElement);
                        this.hide();
                    });
                    menu.appendChild(menuItem);
                }
            });
    
            document.body.appendChild(menu);
            this.activeMenu = menu;
    
            // Adjust position if off-screen
            requestAnimationFrame(() => {
                const rect = menu.getBoundingClientRect();
                if (rect.right > window.innerWidth) {
                    menu.style.left = `${Math.max(0, x - rect.width)}px`;
                }
                if (rect.bottom > window.innerHeight) {
                    menu.style.top = `${Math.max(0, y - rect.height)}px`;
                }
            });
        }
    
        hide() {
            if (this.activeMenu) {
                this.activeMenu.remove();
                this.activeMenu = null;
            }
        }
    
        executeAction(action, target) {
            // Extract data from target
            const data = target.dataset ? { ...target.dataset } : {};
    
            // Check local handlers first
            if (this.handlers[action]) {
                this.handlers[action](target, data);
                return;
            }
    
            // Fall back to action router
            if (this.actionRouter) {
                this.actionRouter.execute(action, data);
                return;
            }
    
            console.warn(`[ZTGI-UI] No handler for action: ${action}`);
        }
    }
    
    
    

    // === settings-panel.js ===
    /**
     * ZTGI-UI Settings Panel
     * Visual configuration UI for context menus, shortcuts, and cursor modes
     *
     * Usage:
     *   ZtgiUI.settings.open()   // Open settings panel
     *   ZtgiUI.settings.close()  // Close settings panel
     *
     * Keyboard: Press '?' or Ctrl+, to open settings
     */
    
    class SettingsPanel {
        constructor(ztgiInstance) {
            this.ztgi = ztgiInstance;
            this.panel = null;
            this.isOpen = false;
            this.userConfig = this.loadUserConfig();
        }
    
        init() {
            this.createPanel();
            this.bindKeyboard();
        }
    
        loadUserConfig() {
            try {
                const saved = localStorage.getItem('ztgi-ui-config');
                return saved ? JSON.parse(saved) : { disabledMenuItems: {}, customShortcuts: {} };
            } catch (e) {
                return { disabledMenuItems: {}, customShortcuts: {} };
            }
        }
    
        saveUserConfig() {
            localStorage.setItem('ztgi-ui-config', JSON.stringify(this.userConfig));
        }
    
        createPanel() {
            this.panel = document.createElement('div');
            this.panel.className = 'ztgi-settings-panel';
            this.panel.innerHTML = `
                <div class="ztgi-settings-overlay"></div>
                <div class="ztgi-settings-content">
                    <div class="ztgi-settings-header">
                        <h2>⚙️ ZTGI-UI Settings</h2>
                        <button class="ztgi-settings-close">&times;</button>
                    </div>
                    <div class="ztgi-settings-tabs">
                        <button class="ztgi-tab active" data-tab="menus">Context Menus</button>
                        <button class="ztgi-tab" data-tab="shortcuts">Shortcuts</button>
                        <button class="ztgi-tab" data-tab="cursors">Cursor Modes</button>
                        <button class="ztgi-tab" data-tab="preview">Preview</button>
                    </div>
                    <div class="ztgi-settings-body">
                        <div class="ztgi-tab-content active" data-tab="menus"></div>
                        <div class="ztgi-tab-content" data-tab="shortcuts"></div>
                        <div class="ztgi-tab-content" data-tab="cursors"></div>
                        <div class="ztgi-tab-content" data-tab="preview"></div>
                    </div>
                    <div class="ztgi-settings-footer">
                        <button class="ztgi-btn" id="ztgiResetConfig">Reset to Defaults</button>
                        <button class="ztgi-btn primary" id="ztgiSaveConfig">Save Changes</button>
                    </div>
                </div>
            `;
    
            // Add styles
            this.addStyles();
    
            // Event listeners
            this.panel.querySelector('.ztgi-settings-overlay').addEventListener('click', () => this.close());
            this.panel.querySelector('.ztgi-settings-close').addEventListener('click', () => this.close());
    
            // Tab switching
            this.panel.querySelectorAll('.ztgi-tab').forEach(tab => {
                tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
            });
    
            // Save/Reset buttons
            this.panel.querySelector('#ztgiResetConfig').addEventListener('click', () => this.resetConfig());
            this.panel.querySelector('#ztgiSaveConfig').addEventListener('click', () => this.saveConfig());
    
            document.body.appendChild(this.panel);
        }
    
        addStyles() {
            if (document.getElementById('ztgi-settings-styles')) return;
    
            const style = document.createElement('style');
            style.id = 'ztgi-settings-styles';
            style.textContent = `
                .ztgi-settings-panel {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 10100;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
    
                .ztgi-settings-panel.open {
                    display: block;
                }
    
                .ztgi-settings-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                }
    
                .ztgi-settings-content {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 90%;
                    max-width: 800px;
                    max-height: 85vh;
                    background: #1e1e1e;
                    border: 1px solid #3a3a3a;
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                }
    
                .ztgi-settings-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 20px;
                    border-bottom: 1px solid #3a3a3a;
                }
    
                .ztgi-settings-header h2 {
                    margin: 0;
                    color: #fff;
                    font-size: 18px;
                }
    
                .ztgi-settings-close {
                    background: none;
                    border: none;
                    color: #888;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0 8px;
                }
    
                .ztgi-settings-close:hover {
                    color: #fff;
                }
    
                .ztgi-settings-tabs {
                    display: flex;
                    gap: 4px;
                    padding: 12px 20px;
                    border-bottom: 1px solid #3a3a3a;
                    background: #252525;
                }
    
                .ztgi-tab {
                    padding: 8px 16px;
                    background: transparent;
                    border: 1px solid transparent;
                    border-radius: 6px;
                    color: #888;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
    
                .ztgi-tab:hover {
                    color: #fff;
                    background: #333;
                }
    
                .ztgi-tab.active {
                    color: #fff;
                    background: #4a9eff;
                    border-color: #4a9eff;
                }
    
                .ztgi-settings-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                }
    
                .ztgi-tab-content {
                    display: none;
                }
    
                .ztgi-tab-content.active {
                    display: block;
                }
    
                .ztgi-settings-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    padding: 16px 20px;
                    border-top: 1px solid #3a3a3a;
                    background: #252525;
                }
    
                .ztgi-btn {
                    padding: 10px 20px;
                    background: #333;
                    border: 1px solid #444;
                    border-radius: 6px;
                    color: #fff;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
    
                .ztgi-btn:hover {
                    background: #444;
                }
    
                .ztgi-btn.primary {
                    background: #4a9eff;
                    border-color: #4a9eff;
                }
    
                .ztgi-btn.primary:hover {
                    background: #3a8eef;
                }
    
                /* Menu Items List */
                .ztgi-menu-group {
                    margin-bottom: 24px;
                }
    
                .ztgi-menu-group-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    background: #2a2a2a;
                    border-radius: 6px;
                    margin-bottom: 8px;
                    cursor: pointer;
                }
    
                .ztgi-menu-group-header:hover {
                    background: #333;
                }
    
                .ztgi-menu-group-title {
                    color: #4a9eff;
                    font-size: 13px;
                    font-weight: 600;
                }
    
                .ztgi-menu-group-toggle {
                    color: #888;
                    font-size: 12px;
                }
    
                .ztgi-menu-items {
                    padding-left: 12px;
                }
    
                .ztgi-menu-item-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px 12px;
                    border-radius: 4px;
                    transition: background 0.1s;
                }
    
                .ztgi-menu-item-row:hover {
                    background: #2a2a2a;
                }
    
                .ztgi-menu-item-toggle {
                    width: 36px;
                    height: 20px;
                    background: #444;
                    border-radius: 10px;
                    position: relative;
                    cursor: pointer;
                    transition: background 0.2s;
                }
    
                .ztgi-menu-item-toggle.enabled {
                    background: #4CAF50;
                }
    
                .ztgi-menu-item-toggle::after {
                    content: '';
                    position: absolute;
                    width: 16px;
                    height: 16px;
                    background: #fff;
                    border-radius: 50%;
                    top: 2px;
                    left: 2px;
                    transition: left 0.2s;
                }
    
                .ztgi-menu-item-toggle.enabled::after {
                    left: 18px;
                }
    
                .ztgi-menu-item-label {
                    flex: 1;
                    color: #e0e0e0;
                    font-size: 13px;
                }
    
                .ztgi-menu-item-action {
                    color: #888;
                    font-size: 11px;
                    font-family: monospace;
                }
    
                .ztgi-menu-item-shortcut {
                    padding: 2px 6px;
                    background: #333;
                    border-radius: 4px;
                    color: #888;
                    font-size: 11px;
                    min-width: 24px;
                    text-align: center;
                }
    
                /* Shortcuts Tab */
                .ztgi-shortcut-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 12px;
                    border-radius: 4px;
                }
    
                .ztgi-shortcut-row:hover {
                    background: #2a2a2a;
                }
    
                .ztgi-shortcut-key {
                    padding: 6px 12px;
                    background: #333;
                    border: 1px solid #444;
                    border-radius: 4px;
                    color: #fff;
                    font-family: monospace;
                    font-size: 13px;
                    min-width: 60px;
                    text-align: center;
                }
    
                .ztgi-shortcut-desc {
                    flex: 1;
                    color: #e0e0e0;
                    font-size: 13px;
                }
    
                .ztgi-shortcut-edit {
                    padding: 4px 10px;
                    background: #333;
                    border: 1px solid #444;
                    border-radius: 4px;
                    color: #888;
                    font-size: 11px;
                    cursor: pointer;
                }
    
                .ztgi-shortcut-edit:hover {
                    background: #444;
                    color: #fff;
                }
    
                /* Cursors Tab */
                .ztgi-cursor-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                    gap: 12px;
                }
    
                .ztgi-cursor-card {
                    padding: 16px;
                    background: #2a2a2a;
                    border: 1px solid #3a3a3a;
                    border-radius: 8px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
    
                .ztgi-cursor-card:hover {
                    border-color: #4a9eff;
                    transform: translateY(-2px);
                }
    
                .ztgi-cursor-card.active {
                    border-color: #4CAF50;
                    background: #2a3a2a;
                }
    
                .ztgi-cursor-preview {
                    width: 32px;
                    height: 32px;
                    margin: 0 auto 8px;
                }
    
                .ztgi-cursor-name {
                    color: #fff;
                    font-size: 12px;
                    font-weight: 500;
                }
    
                .ztgi-cursor-hint {
                    color: #888;
                    font-size: 10px;
                    margin-top: 4px;
                }
    
                /* Preview Tab */
                .ztgi-preview-area {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }
    
                .ztgi-preview-box {
                    padding: 40px;
                    background: #2a2a2a;
                    border: 2px dashed #444;
                    border-radius: 8px;
                    text-align: center;
                    color: #888;
                    font-size: 13px;
                }
    
                .ztgi-preview-box:hover {
                    border-color: #4a9eff;
                    color: #fff;
                }
    
                /* Help text */
                .ztgi-help-text {
                    color: #888;
                    font-size: 12px;
                    margin-bottom: 16px;
                    padding: 12px;
                    background: #252525;
                    border-radius: 6px;
                    border-left: 3px solid #4a9eff;
                }
            `;
            document.head.appendChild(style);
        }
    
        bindKeyboard() {
            document.addEventListener('keydown', (e) => {
                // Open settings with ? or Ctrl+,
                if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
                    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        this.open();
                    }
                }
                if ((e.ctrlKey || e.metaKey) && e.key === ',') {
                    e.preventDefault();
                    this.open();
                }
                // Close with Escape
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            });
        }
    
        open() {
            this.renderMenusTab();
            this.renderShortcutsTab();
            this.renderCursorsTab();
            this.renderPreviewTab();
            this.panel.classList.add('open');
            this.isOpen = true;
        }
    
        close() {
            this.panel.classList.remove('open');
            this.isOpen = false;
        }
    
        switchTab(tabName) {
            this.panel.querySelectorAll('.ztgi-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.tab === tabName);
            });
            this.panel.querySelectorAll('.ztgi-tab-content').forEach(c => {
                c.classList.toggle('active', c.dataset.tab === tabName);
            });
        }
    
        renderMenusTab() {
            const container = this.panel.querySelector('.ztgi-tab-content[data-tab="menus"]');
            const menus = this.ztgi.contextMenu.menus;
    
            let html = `
                <div class="ztgi-help-text">
                    Toggle menu items on/off. Disabled items won't appear in right-click menus.
                    Changes are saved per-browser.
                </div>
            `;
    
            for (const [menuType, items] of Object.entries(menus)) {
                const enabledCount = items.filter(i => !i.divider && !this.isItemDisabled(menuType, i.action)).length;
                const totalCount = items.filter(i => !i.divider).length;
    
                html += `
                    <div class="ztgi-menu-group">
                        <div class="ztgi-menu-group-header" data-menu="${menuType}">
                            <span class="ztgi-menu-group-title">${this.formatMenuType(menuType)}</span>
                            <span class="ztgi-menu-group-toggle">${enabledCount}/${totalCount} enabled ▼</span>
                        </div>
                        <div class="ztgi-menu-items" data-menu="${menuType}">
                `;
    
                items.forEach(item => {
                    if (item.divider) return;
                    const disabled = this.isItemDisabled(menuType, item.action);
                    html += `
                        <div class="ztgi-menu-item-row">
                            <div class="ztgi-menu-item-toggle ${disabled ? '' : 'enabled'}"
                                 data-menu="${menuType}" data-action="${item.action}"></div>
                            <span class="ztgi-menu-item-label">${item.label}</span>
                            <span class="ztgi-menu-item-action">${item.action}</span>
                            ${item.shortcut ? `<span class="ztgi-menu-item-shortcut">${item.shortcut}</span>` : ''}
                        </div>
                    `;
                });
    
                html += `
                        </div>
                    </div>
                `;
            }
    
            container.innerHTML = html;
    
            // Toggle click handlers
            container.querySelectorAll('.ztgi-menu-item-toggle').forEach(toggle => {
                toggle.addEventListener('click', () => {
                    const menuType = toggle.dataset.menu;
                    const action = toggle.dataset.action;
                    this.toggleMenuItem(menuType, action);
                    toggle.classList.toggle('enabled');
                });
            });
    
            // Group collapse/expand
            container.querySelectorAll('.ztgi-menu-group-header').forEach(header => {
                header.addEventListener('click', () => {
                    const items = container.querySelector(`.ztgi-menu-items[data-menu="${header.dataset.menu}"]`);
                    items.style.display = items.style.display === 'none' ? 'block' : 'none';
                });
            });
        }
    
        renderShortcutsTab() {
            const container = this.panel.querySelector('.ztgi-tab-content[data-tab="shortcuts"]');
            const shortcuts = this.ztgi.keyboard.shortcuts;
    
            let html = `
                <div class="ztgi-help-text">
                    Keyboard shortcuts for quick actions. Press the key to trigger the action.
                </div>
            `;
    
            for (const [combo, handler] of Object.entries(shortcuts)) {
                const desc = this.getShortcutDescription(combo);
                html += `
                    <div class="ztgi-shortcut-row">
                        <span class="ztgi-shortcut-key">${this.formatKeyCombo(combo)}</span>
                        <span class="ztgi-shortcut-desc">${desc}</span>
                    </div>
                `;
            }
    
            // Add common shortcuts hint
            html += `
                <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #3a3a3a;">
                    <div class="ztgi-help-text">
                        <strong>Tip:</strong> Press <kbd>?</kbd> anywhere to open this settings panel.
                    </div>
                </div>
            `;
    
            container.innerHTML = html;
        }
    
        renderCursorsTab() {
            const container = this.panel.querySelector('.ztgi-tab-content[data-tab="cursors"]');
            const modes = this.ztgi.cursor.modes;
            const currentMode = this.ztgi.cursor.getMode();
    
            let html = `
                <div class="ztgi-help-text">
                    Click a cursor mode to activate it. Press Escape to return to default.
                </div>
                <div class="ztgi-cursor-grid">
            `;
    
            for (const [name, config] of Object.entries(modes)) {
                const isActive = name === currentMode;
                const cursorImg = config.cursor && config.cursor.startsWith('/')
                    ? `http://localhost:7892${config.cursor}`
                    : '';
    
                html += `
                    <div class="ztgi-cursor-card ${isActive ? 'active' : ''}" data-mode="${name}">
                        ${cursorImg ? `<img class="ztgi-cursor-preview" src="${cursorImg}" alt="${name}">` :
                            `<div class="ztgi-cursor-preview" style="font-size: 24px;">🖱️</div>`}
                        <div class="ztgi-cursor-name">${name}</div>
                        ${config.hint ? `<div class="ztgi-cursor-hint">${config.hint}</div>` : ''}
                    </div>
                `;
            }
    
            html += '</div>';
            container.innerHTML = html;
    
            // Click to activate cursor mode
            container.querySelectorAll('.ztgi-cursor-card').forEach(card => {
                card.addEventListener('click', () => {
                    this.ztgi.cursor.setMode(card.dataset.mode);
                    this.renderCursorsTab(); // Re-render to update active state
                });
            });
        }
    
        renderPreviewTab() {
            const container = this.panel.querySelector('.ztgi-tab-content[data-tab="preview"]');
    
            container.innerHTML = `
                <div class="ztgi-help-text">
                    Right-click on these test areas to preview context menus.
                </div>
                <div class="ztgi-preview-area">
                    <div class="ztgi-preview-box" data-context="cnp-entry" data-hash8="test123">
                        <strong>CNP Entry</strong><br>
                        Right-click to test Browse view menu
                    </div>
                    <div class="ztgi-preview-box" data-context="cnp-flow-node" data-hash8="test456">
                        <strong>Flow Node</strong><br>
                        Right-click to test Flow view menu
                    </div>
                    <div class="ztgi-preview-box" data-context="cnp-flow-canvas">
                        <strong>Flow Canvas</strong><br>
                        Right-click to test canvas menu
                    </div>
                    <div class="ztgi-preview-box" data-context="cnp-timeline-item" data-hash8="test789">
                        <strong>Timeline Item</strong><br>
                        Right-click to test Timeline menu
                    </div>
                </div>
            `;
        }
    
        formatMenuType(type) {
            return type
                .replace('cnp-', '')
                .split('-')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
        }
    
        formatKeyCombo(combo) {
            return combo
                .replace('ctrl', '⌃')
                .replace('alt', '⌥')
                .replace('shift', '⇧')
                .replace('escape', 'Esc')
                .replace(/\+/g, ' ')
                .toUpperCase();
        }
    
        getShortcutDescription(combo) {
            const map = {
                'c': 'Activate chain/connect mode',
                'a': 'Activate agent mode',
                'p': 'Activate copy mode',
                's': 'Activate select mode',
                'escape': 'Return to default cursor',
                'ctrl+f': 'Search',
                'ctrl+k': 'Quick action',
                '?': 'Open settings panel'
            };
            return map[combo] || 'Custom action';
        }
    
        isItemDisabled(menuType, action) {
            const key = `${menuType}:${action}`;
            return this.userConfig.disabledMenuItems[key] === true;
        }
    
        toggleMenuItem(menuType, action) {
            const key = `${menuType}:${action}`;
            if (this.userConfig.disabledMenuItems[key]) {
                delete this.userConfig.disabledMenuItems[key];
            } else {
                this.userConfig.disabledMenuItems[key] = true;
            }
        }
    
        saveConfig() {
            this.saveUserConfig();
            this.applyConfig();
            this.ztgi.utils.showToast('Settings saved');
        }
    
        resetConfig() {
            if (confirm('Reset all settings to defaults?')) {
                this.userConfig = { disabledMenuItems: {}, customShortcuts: {} };
                this.saveUserConfig();
                this.renderMenusTab();
                this.ztgi.utils.showToast('Settings reset');
            }
        }
    
        applyConfig() {
            // Filter out disabled menu items
            // This modifies the active menus based on user config
            // Note: This is applied at runtime, not stored in config files
        }
    
        // Get filtered menu items (used by context menu)
        getFilteredMenuItems(menuType) {
            const items = this.ztgi.contextMenu.menus[menuType] || [];
            return items.filter(item => {
                if (item.divider) return true;
                return !this.isItemDisabled(menuType, item.action);
            });
        }
    }
    
    
    

    // === vis-integration.js ===
    /**
     * ZTGI-UI Vis.js Integration
     * Hooks for vis-network and vis-timeline libraries
     *
     * Usage:
     *   // After creating vis-network or vis-timeline instance:
     *   ZtgiUI.vis.hookNetwork(network, {
     *     nodeContext: 'cnp-graph-node',
     *     edgeContext: 'cnp-graph-edge',
     *     canvasContext: 'cnp-graph-canvas',
     *     getNodeData: (nodeId) => nodeDataMap[nodeId]
     *   });
     *
     *   ZtgiUI.vis.hookTimeline(timeline, {
     *     itemContext: 'cnp-timeline-item',
     *     getItemData: (itemId) => itemDataMap[itemId]
     *   });
     */
    
    class VisIntegration {
        constructor(ztgiInstance) {
            this.ztgi = ztgiInstance;
            this.networks = [];
            this.timelines = [];
        }
    
        /**
         * Hook into a vis-network instance for custom context menus
         * @param {Object} network - vis.Network instance
         * @param {Object} options - Configuration options
         */
        hookNetwork(network, options = {}) {
            const config = {
                nodeContext: options.nodeContext || 'cnp-graph-node',
                edgeContext: options.edgeContext || 'cnp-graph-edge',
                canvasContext: options.canvasContext || 'cnp-graph-canvas',
                getNodeData: options.getNodeData || ((id) => ({ id })),
                getEdgeData: options.getEdgeData || ((id) => ({ id })),
                container: options.container || network.body.container
            };
    
            // Store reference
            this.networks.push({ network, config });
    
            // Get the canvas element
            const canvas = config.container.querySelector('canvas');
            if (!canvas) {
                console.warn('[ZTGI-UI] Could not find canvas in vis-network container');
                return;
            }
    
            // Intercept right-click on canvas
            canvas.addEventListener('contextmenu', (e) => {
                e.preventDefault();
    
                // Get click position in network coordinates
                const rect = canvas.getBoundingClientRect();
                const pointer = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
    
                // Check what was clicked
                const nodeId = network.getNodeAt(pointer);
                const edgeId = network.getEdgeAt(pointer);
    
                if (nodeId !== undefined) {
                    // Clicked on a node
                    const nodeData = config.getNodeData(nodeId);
                    this.showContextMenu(e.clientX, e.clientY, config.nodeContext, nodeData);
                } else if (edgeId !== undefined) {
                    // Clicked on an edge
                    const edgeData = config.getEdgeData(edgeId);
                    this.showContextMenu(e.clientX, e.clientY, config.edgeContext, edgeData);
                } else {
                    // Clicked on canvas background
                    this.showContextMenu(e.clientX, e.clientY, config.canvasContext, {});
                }
            });
    
            // Add keyboard shortcuts when network is focused
            canvas.addEventListener('keydown', (e) => {
                if (e.key === '?') {
                    e.preventDefault();
                    this.ztgi.settings.open();
                }
            });
    
            // Make canvas focusable
            canvas.tabIndex = 0;
    
            console.log(`[ZTGI-UI] Hooked vis-network with context menus`);
        }
    
        /**
         * Hook into a vis-timeline instance for custom context menus
         * @param {Object} timeline - vis.Timeline instance
         * @param {Object} options - Configuration options
         */
        hookTimeline(timeline, options = {}) {
            const config = {
                itemContext: options.itemContext || 'cnp-timeline-item',
                backgroundContext: options.backgroundContext || 'cnp-timeline-bg',
                getItemData: options.getItemData || ((id) => ({ id })),
                container: options.container || timeline.dom.container
            };
    
            // Store reference
            this.timelines.push({ timeline, config });
    
            // vis-timeline uses DOM elements for items
            // We need to intercept right-click on the container
            config.container.addEventListener('contextmenu', (e) => {
                e.preventDefault();
    
                // Check if click was on a timeline item
                const itemElement = e.target.closest('.vis-item');
    
                if (itemElement) {
                    // Get item ID from element
                    // vis-timeline stores item data in the dataset
                    const itemId = this.getTimelineItemId(timeline, itemElement);
                    if (itemId !== null) {
                        const itemData = config.getItemData(itemId);
                        this.showContextMenu(e.clientX, e.clientY, config.itemContext, itemData);
                        return;
                    }
                }
    
                // Clicked on background - show background menu if defined
                if (this.ztgi.contextMenu.menus[config.backgroundContext]) {
                    this.showContextMenu(e.clientX, e.clientY, config.backgroundContext, {
                        time: timeline.getEventProperties({ clientX: e.clientX, clientY: e.clientY }).time
                    });
                }
            });
    
            // Also mark timeline items with data-context for discoverability
            this.markTimelineItems(timeline, config);
    
            // Re-mark items when timeline updates
            timeline.on('changed', () => {
                this.markTimelineItems(timeline, config);
            });
    
            console.log(`[ZTGI-UI] Hooked vis-timeline with context menus`);
        }
    
        /**
         * Get item ID from a timeline item element
         */
        getTimelineItemId(timeline, element) {
            // vis-timeline item elements have a class like 'vis-item-content'
            // The item data is stored on the timeline instance
            const items = timeline.itemSet?.items || {};
    
            for (const [id, item] of Object.entries(items)) {
                if (item.dom && (item.dom.box === element || item.dom.box?.contains(element))) {
                    return id;
                }
            }
    
            // Try to extract from element attributes
            if (element.dataset && element.dataset.id) {
                return element.dataset.id;
            }
    
            return null;
        }
    
        /**
         * Add data-context attributes to timeline items
         */
        markTimelineItems(timeline, config) {
            const items = timeline.itemSet?.items || {};
    
            for (const [id, item] of Object.entries(items)) {
                if (item.dom && item.dom.box) {
                    item.dom.box.setAttribute('data-context', config.itemContext);
                    item.dom.box.setAttribute('data-id', id);
    
                    // Copy item data attributes
                    const itemData = config.getItemData(id);
                    if (itemData) {
                        for (const [key, value] of Object.entries(itemData)) {
                            if (typeof value === 'string' || typeof value === 'number') {
                                item.dom.box.setAttribute(`data-${key}`, value);
                            }
                        }
                    }
                }
            }
        }
    
        /**
         * Show context menu at position with data
         */
        showContextMenu(x, y, contextType, data) {
            // Create a temporary element with the context data
            const tempElement = document.createElement('div');
            tempElement.style.position = 'fixed';
            tempElement.style.left = `${x}px`;
            tempElement.style.top = `${y}px`;
            tempElement.style.pointerEvents = 'none';
            tempElement.setAttribute('data-context', contextType);
    
            // Add all data as attributes
            for (const [key, value] of Object.entries(data)) {
                if (typeof value === 'string' || typeof value === 'number') {
                    tempElement.setAttribute(`data-${key}`, value);
                }
            }
    
            document.body.appendChild(tempElement);
    
            // Show the ZTGI context menu
            if (this.ztgi.contextMenu.menus[contextType]) {
                this.ztgi.contextMenu.show(x, y, contextType, tempElement);
            } else {
                console.warn(`[ZTGI-UI] No menu registered for context: ${contextType}`);
            }
    
            // Remove temp element after menu is shown
            setTimeout(() => tempElement.remove(), 100);
        }
    
        /**
         * Quick setup for common vis patterns
         */
        autoHook() {
            // Auto-detect and hook vis-network instances
            if (typeof vis !== 'undefined') {
                // Look for vis-network containers
                document.querySelectorAll('.vis-network').forEach(container => {
                    console.log('[ZTGI-UI] Auto-detected vis-network container');
                });
            }
    
            // Look for common patterns
            if (window.network && typeof window.network.getNodeAt === 'function') {
                this.hookNetwork(window.network, {});
            }
    
            if (window.timeline && typeof window.timeline.getEventProperties === 'function') {
                this.hookTimeline(window.timeline, {});
            }
        }
    }
    
    
    

    // === email-for-ai-client.js ===
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
    
    
    

    // === analytics-tracker.js ===
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
    
    
    

    // === ai-assistant.js ===
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
    
    
    

    // === menu-customizer.js ===
    /**
     * Menu Customizer
     *
     * AI-driven menu customization based on usage patterns.
     * Features:
     * - Propose new menu items
     * - Reorder menus based on usage
     * - Suggest removing unused items
     * - User approval workflow
     *
     * Usage:
     *   const customizer = new MenuCustomizer(ztgiInstance);
     *   customizer.init();
     *   customizer.analyzeAndPropose();
     */
    
    class MenuCustomizer {
        constructor(ztgiInstance) {
            this.ztgi = ztgiInstance;
            this.analytics = null;
            this.emailClient = null;
            this.proposals = [];
            this.appliedChanges = [];
            this.localStorageKey = 'ztgi_menu_customizations';
            this.initialized = false;
        }
    
        /**
         * Initialize the customizer
         */
        init() {
            if (this.initialized) return this;
    
            this.analytics = this.ztgi.analytics;
            this.emailClient = this.ztgi.emailClient;
    
            // Load applied changes from localStorage
            this.loadAppliedChanges();
    
            // Apply any pending customizations
            this.applyStoredCustomizations();
    
            this.initialized = true;
            console.log('[MenuCustomizer] Initialized');
    
            return this;
        }
    
        /**
         * Analyze usage and generate proposals
         */
        async analyzeAndPropose() {
            if (!this.analytics) {
                console.warn('[MenuCustomizer] Analytics not available');
                return [];
            }
    
            const proposals = [];
            const menuUsage = this.analytics.getMenuUsageForAI();
    
            // Get all registered menu types
            const menuTypes = this.ztgi.getMenuTypes();
    
            for (const menuType of menuTypes) {
                const menuItems = this.ztgi.contextMenu.menus[menuType] || [];
    
                // Proposal 1: Reorder based on usage
                const reorderProposal = this.generateReorderProposal(menuType, menuItems, menuUsage);
                if (reorderProposal) {
                    proposals.push(reorderProposal);
                }
    
                // Proposal 2: Highlight unused items
                const unusedProposal = this.generateUnusedProposal(menuType, menuItems, menuUsage);
                if (unusedProposal) {
                    proposals.push(unusedProposal);
                }
            }
    
            // Proposal 3: Suggest frequently paired actions
            const pairedProposal = this.generatePairedActionProposal(menuUsage);
            if (pairedProposal) {
                proposals.push(pairedProposal);
            }
    
            this.proposals = proposals;
            return proposals;
        }
    
        /**
         * Generate reorder proposal based on usage frequency
         */
        generateReorderProposal(menuType, menuItems, menuUsage) {
            // Filter usage data for this menu type
            const typeUsage = menuUsage.filter(u => u.menuType === menuType);
    
            if (typeUsage.length < 2) return null;
    
            // Get current order (excluding dividers)
            const currentOrder = menuItems
                .filter(item => !item.divider)
                .map(item => item.action);
    
            // Calculate optimal order based on usage
            const usageMap = new Map(typeUsage.map(u => [u.action, u.count]));
    
            const optimalOrder = [...currentOrder].sort((a, b) => {
                const aCount = usageMap.get(a) || 0;
                const bCount = usageMap.get(b) || 0;
                return bCount - aCount;
            });
    
            // Check if reorder would be meaningful (top 3 items are different)
            const currentTop3 = currentOrder.slice(0, 3);
            const optimalTop3 = optimalOrder.slice(0, 3);
    
            const needsReorder = !currentTop3.every((action, i) => action === optimalTop3[i]);
    
            if (!needsReorder) return null;
    
            // Generate rationale
            const topUsed = typeUsage[0];
            const rationale = topUsed
                ? `You use "${topUsed.action}" ${topUsed.count} times this week. Moving frequently used items to the top would save you time.`
                : 'Reordering based on your usage patterns would improve efficiency.';
    
            return {
                id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                type: 'reorder',
                menuType: menuType,
                rationale: rationale,
                data: {
                    currentOrder: currentOrder,
                    proposedOrder: optimalOrder,
                    usageCounts: Object.fromEntries(usageMap)
                },
                status: 'pending',
                createdAt: new Date().toISOString()
            };
        }
    
        /**
         * Generate proposal for unused menu items
         */
        generateUnusedProposal(menuType, menuItems, menuUsage) {
            const usedActions = new Set(menuUsage.map(u => u.action));
    
            const unusedItems = menuItems
                .filter(item => !item.divider && !usedActions.has(item.action))
                .map(item => item.action);
    
            // Only propose if there are several unused items
            if (unusedItems.length < 3) return null;
    
            return {
                id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                type: 'remove',
                menuType: menuType,
                rationale: `You have ${unusedItems.length} menu items you haven't used in the past week. Consider removing or hiding them to declutter your menu.`,
                data: {
                    unusedItems: unusedItems,
                    totalItems: menuItems.filter(i => !i.divider).length
                },
                status: 'pending',
                createdAt: new Date().toISOString()
            };
        }
    
        /**
         * Generate proposal for frequently paired actions
         */
        generatePairedActionProposal(menuUsage) {
            // This would require sequence analysis of events
            // For now, return null - can be enhanced later
            return null;
        }
    
        /**
         * Propose a new menu item
         */
        proposeNewMenuItem(menuType, item) {
            const proposal = {
                id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                type: 'add',
                menuType: menuType,
                rationale: `Adding "${item.label}" to ${menuType} menu.`,
                data: {
                    item: item,
                    position: item.position || 'end'
                },
                status: 'pending',
                createdAt: new Date().toISOString()
            };
    
            this.proposals.push(proposal);
            return proposal;
        }
    
        /**
         * Propose menu reorder
         */
        proposeReorderMenu(menuType, newOrder) {
            const proposal = {
                id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                type: 'reorder',
                menuType: menuType,
                rationale: 'Custom menu reorder.',
                data: {
                    proposedOrder: newOrder
                },
                status: 'pending',
                createdAt: new Date().toISOString()
            };
    
            this.proposals.push(proposal);
            return proposal;
        }
    
        /**
         * Propose removing unused items
         */
        proposeRemoveUnused(menuType) {
            if (!this.analytics) return null;
    
            const menuItems = this.ztgi.contextMenu.menus[menuType] || [];
            const allActions = menuItems
                .filter(i => !i.divider)
                .map(i => ({ action: i.action, label: i.label }));
    
            const unusedItems = this.analytics.getUnusedMenuItems(allActions);
    
            if (unusedItems.length === 0) {
                return null;
            }
    
            const proposal = {
                id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                type: 'remove',
                menuType: menuType,
                rationale: `${unusedItems.length} items haven't been used. Consider hiding them.`,
                data: {
                    unusedItems: unusedItems.map(i => i.action)
                },
                status: 'pending',
                createdAt: new Date().toISOString()
            };
    
            this.proposals.push(proposal);
            return proposal;
        }
    
        /**
         * Show proposal dialog
         */
        showProposalDialog(proposal) {
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.className = 'ztgi-proposal-overlay';
            overlay.innerHTML = `
                <div class="ztgi-proposal-modal">
                    <div class="ztgi-proposal-header">
                        <span class="ztgi-proposal-icon">${this.getProposalIcon(proposal.type)}</span>
                        <span class="ztgi-proposal-title">${this.getProposalTitle(proposal.type)}</span>
                    </div>
                    <div class="ztgi-proposal-body">
                        <p class="ztgi-proposal-rationale">${proposal.rationale}</p>
                        <div class="ztgi-proposal-details">
                            ${this.renderProposalDetails(proposal)}
                        </div>
                    </div>
                    <div class="ztgi-proposal-actions">
                        <button class="ztgi-proposal-btn ztgi-proposal-btn-reject">Reject</button>
                        <button class="ztgi-proposal-btn ztgi-proposal-btn-approve">Approve</button>
                    </div>
                </div>
            `;
    
            // Add styles
            this.addDialogStyles();
    
            document.body.appendChild(overlay);
    
            // Bind events
            return new Promise((resolve) => {
                overlay.querySelector('.ztgi-proposal-btn-approve').onclick = () => {
                    overlay.remove();
                    proposal.status = 'approved';
                    this.applyApprovedChange(proposal);
                    resolve(true);
                };
    
                overlay.querySelector('.ztgi-proposal-btn-reject').onclick = () => {
                    overlay.remove();
                    proposal.status = 'rejected';
                    resolve(false);
                };
    
                overlay.onclick = (e) => {
                    if (e.target === overlay) {
                        overlay.remove();
                        resolve(null);
                    }
                };
            });
        }
    
        /**
         * Get icon for proposal type
         */
        getProposalIcon(type) {
            const icons = {
                reorder: '↕️',
                add: '➕',
                remove: '🗑️'
            };
            return icons[type] || '💡';
        }
    
        /**
         * Get title for proposal type
         */
        getProposalTitle(type) {
            const titles = {
                reorder: 'Reorder Menu Items',
                add: 'Add Menu Item',
                remove: 'Remove Unused Items'
            };
            return titles[type] || 'Menu Suggestion';
        }
    
        /**
         * Render proposal details
         */
        renderProposalDetails(proposal) {
            switch (proposal.type) {
                case 'reorder':
                    return `
                        <div class="ztgi-proposal-list">
                            <strong>Proposed order:</strong>
                            <ol>
                                ${proposal.data.proposedOrder.slice(0, 5).map(action => {
                                    const count = proposal.data.usageCounts?.[action] || 0;
                                    return `<li>${action} <span class="ztgi-proposal-count">(${count} uses)</span></li>`;
                                }).join('')}
                                ${proposal.data.proposedOrder.length > 5 ? '<li>...</li>' : ''}
                            </ol>
                        </div>
                    `;
    
                case 'add':
                    return `
                        <div class="ztgi-proposal-item">
                            <strong>New item:</strong> ${proposal.data.item.label}
                        </div>
                    `;
    
                case 'remove':
                    return `
                        <div class="ztgi-proposal-list">
                            <strong>Unused items (${proposal.data.unusedItems.length}):</strong>
                            <ul>
                                ${proposal.data.unusedItems.slice(0, 5).map(action =>
                                    `<li>${action}</li>`
                                ).join('')}
                                ${proposal.data.unusedItems.length > 5 ? '<li>...</li>' : ''}
                            </ul>
                        </div>
                    `;
    
                default:
                    return '';
            }
        }
    
        /**
         * Apply approved change
         */
        applyApprovedChange(proposal) {
            switch (proposal.type) {
                case 'reorder':
                    this.applyReorder(proposal);
                    break;
                case 'add':
                    this.applyAdd(proposal);
                    break;
                case 'remove':
                    this.applyRemove(proposal);
                    break;
            }
    
            // Store the change
            this.appliedChanges.push(proposal);
            this.saveAppliedChanges();
    
            // Notify
            console.log(`[MenuCustomizer] Applied: ${proposal.type} on ${proposal.menuType}`);
        }
    
        /**
         * Apply reorder change
         */
        applyReorder(proposal) {
            const menuType = proposal.menuType;
            const proposedOrder = proposal.data.proposedOrder;
    
            const currentMenu = this.ztgi.contextMenu.menus[menuType] || [];
    
            // Create map of items by action
            const itemMap = new Map();
            for (const item of currentMenu) {
                if (!item.divider) {
                    itemMap.set(item.action, item);
                }
            }
    
            // Build new menu in proposed order
            const newMenu = [];
            for (const action of proposedOrder) {
                if (itemMap.has(action)) {
                    newMenu.push(itemMap.get(action));
                    itemMap.delete(action);
                }
            }
    
            // Add any remaining items
            for (const item of itemMap.values()) {
                newMenu.push(item);
            }
    
            // Update the menu
            this.ztgi.contextMenu.menus[menuType] = newMenu;
        }
    
        /**
         * Apply add change
         */
        applyAdd(proposal) {
            const menuType = proposal.menuType;
            const item = proposal.data.item;
            const position = proposal.data.position;
    
            const menu = this.ztgi.contextMenu.menus[menuType] || [];
    
            if (position === 'start') {
                menu.unshift(item);
            } else if (typeof position === 'number') {
                menu.splice(position, 0, item);
            } else {
                menu.push(item);
            }
    
            this.ztgi.contextMenu.menus[menuType] = menu;
        }
    
        /**
         * Apply remove change
         */
        applyRemove(proposal) {
            const menuType = proposal.menuType;
            const unusedItems = new Set(proposal.data.unusedItems);
    
            const menu = this.ztgi.contextMenu.menus[menuType] || [];
    
            // Mark items as hidden rather than removing
            // This preserves them for potential re-enabling
            const newMenu = menu.map(item => {
                if (!item.divider && unusedItems.has(item.action)) {
                    return { ...item, hidden: true };
                }
                return item;
            });
    
            this.ztgi.contextMenu.menus[menuType] = newMenu;
        }
    
        /**
         * Save applied changes to localStorage
         */
        saveAppliedChanges() {
            try {
                localStorage.setItem(this.localStorageKey, JSON.stringify({
                    changes: this.appliedChanges,
                    lastUpdated: new Date().toISOString()
                }));
            } catch (error) {
                console.error('[MenuCustomizer] Save error:', error);
            }
        }
    
        /**
         * Load applied changes from localStorage
         */
        loadAppliedChanges() {
            try {
                const stored = localStorage.getItem(this.localStorageKey);
                if (stored) {
                    const data = JSON.parse(stored);
                    this.appliedChanges = data.changes || [];
                }
            } catch (error) {
                console.error('[MenuCustomizer] Load error:', error);
                this.appliedChanges = [];
            }
        }
    
        /**
         * Apply stored customizations on init
         */
        applyStoredCustomizations() {
            for (const change of this.appliedChanges) {
                if (change.status === 'approved') {
                    this.applyApprovedChange(change);
                }
            }
        }
    
        /**
         * Reset all customizations
         */
        resetCustomizations() {
            this.appliedChanges = [];
            localStorage.removeItem(this.localStorageKey);
    
            // Reload original config
            if (this.ztgi.config && this.ztgi.config.contextMenus) {
                for (const [type, items] of Object.entries(this.ztgi.config.contextMenus)) {
                    this.ztgi.contextMenu.menus[type] = [...items];
                }
            }
    
            console.log('[MenuCustomizer] Customizations reset');
        }
    
        /**
         * Get all pending proposals
         */
        getPendingProposals() {
            return this.proposals.filter(p => p.status === 'pending');
        }
    
        /**
         * Add dialog styles
         */
        addDialogStyles() {
            if (document.getElementById('ztgi-proposal-styles')) return;
    
            const style = document.createElement('style');
            style.id = 'ztgi-proposal-styles';
            style.textContent = `
                .ztgi-proposal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 20000;
                }
                .ztgi-proposal-modal {
                    background: #1e1e1e;
                    border-radius: 12px;
                    width: 400px;
                    max-width: 90vw;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                    color: #e0e0e0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .ztgi-proposal-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px 20px;
                    border-bottom: 1px solid #333;
                }
                .ztgi-proposal-icon {
                    font-size: 24px;
                }
                .ztgi-proposal-title {
                    font-weight: 600;
                    font-size: 16px;
                }
                .ztgi-proposal-body {
                    padding: 20px;
                }
                .ztgi-proposal-rationale {
                    margin: 0 0 16px 0;
                    font-size: 14px;
                    line-height: 1.5;
                    color: #ccc;
                }
                .ztgi-proposal-details {
                    background: #252525;
                    border-radius: 8px;
                    padding: 12px;
                    font-size: 13px;
                }
                .ztgi-proposal-list ol,
                .ztgi-proposal-list ul {
                    margin: 8px 0 0 0;
                    padding-left: 20px;
                }
                .ztgi-proposal-list li {
                    margin: 4px 0;
                }
                .ztgi-proposal-count {
                    color: #888;
                    font-size: 12px;
                }
                .ztgi-proposal-actions {
                    display: flex;
                    gap: 12px;
                    padding: 16px 20px;
                    border-top: 1px solid #333;
                    justify-content: flex-end;
                }
                .ztgi-proposal-btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .ztgi-proposal-btn-reject {
                    background: #333;
                    color: #ccc;
                }
                .ztgi-proposal-btn-reject:hover {
                    background: #444;
                }
                .ztgi-proposal-btn-approve {
                    background: #4dabf7;
                    color: white;
                }
                .ztgi-proposal-btn-approve:hover {
                    background: #339af0;
                }
            `;
            document.head.appendChild(style);
        }
    
        /**
         * Cleanup
         */
        destroy() {
            const styles = document.getElementById('ztgi-proposal-styles');
            if (styles) styles.remove();
        }
    }
    
    
    

    // === index.js ===
    /**
     * ZTGI-UI - Shared Agentic UI Library
     *
     * Usage:
     *   <script src="http://localhost:7892/ztgi-ui.js"></script>
     *   <script>
     *     ZtgiUI.init('cnp'); // Load CNP config
     *
     *     // Or custom setup:
     *     ZtgiUI.contextMenu.register(...);
     *     ZtgiUI.cursor.registerMode(...);
     *
     *     // Open settings with ? key or:
     *     ZtgiUI.settings.open();
     *   </script>
     */
    
    
    
    
    
    
    
    
    
    
    
    
    
    class ZtgiUIClass {
        constructor() {
            this.contextMenu = new ContextMenu();
            this.cursor = new CursorModeManager();
            this.keyboard = new KeyboardManager();
            this.actions = new ActionRouter();
            this.utils = utils;
            this.settings = null;
            this.vis = null;
            this.emailClient = null;
            this.analytics = null;
            this.assistant = null;
            this.menuCustomizer = null;
            this.initialized = false;
            this.baseUrl = 'http://localhost:7892';
            this.emailForAiUrl = 'http://localhost:8000';
            this.appName = null;
            this.config = {};
        }
    
        async init(appName, options = {}) {
            if (this.initialized) {
                console.warn('[ZTGI-UI] Already initialized');
                return;
            }
    
            this.appName = appName;
            this.baseUrl = options.baseUrl || this.baseUrl;
            this.emailForAiUrl = options.emailForAiUrl || this.emailForAiUrl;
    
            // Initialize components
            this.keyboard.init();
            this.cursor.init(this.baseUrl);
            this.contextMenu.init(this.actions);
    
            // Initialize settings panel
            this.settings = new SettingsPanel(this);
            this.settings.init();
    
            // Initialize vis.js integration
            this.vis = new VisIntegration(this);
    
            // Initialize Email-for-AI client
            this.emailClient = new EmailForAiClient({
                baseUrl: this.emailForAiUrl,
                inboxPrefix: appName
            });
            this.emailClient.init({ healthCheckInterval: 60000 });
    
            // Initialize analytics tracker
            this.analytics = new AnalyticsTracker(this.emailClient);
            this.analytics.init({ syncInterval: 60000 });
    
            // Hook analytics into action router middleware
            this.actions.use(async (action, data) => {
                this.analytics.trackMenuClick(data.context || 'unknown', action, data);
                return true;
            });
    
            // Listen for cursor mode changes from action router
            document.addEventListener('ztgi:setcursor', (e) => {
                this.cursor.setMode(e.detail.mode);
            });
    
            // Load app-specific config
            this.config = await this.loadConfig(appName);
            this.applyConfig(this.config);
    
            // Register settings shortcut
            this.keyboard.register('?', () => this.settings.open());
    
            // Initialize AI Assistant
            this.assistant = new AiAssistant(this);
            this.assistant.init();
    
            // Initialize Menu Customizer
            this.menuCustomizer = new MenuCustomizer(this);
            this.menuCustomizer.init();
    
            // Track initial page visit
            const page = window.location.pathname.split('/')[1] || 'home';
            this.analytics.trackPageVisit(page, {
                title: document.title
            });
    
            // Set assistant page context
            this.assistant.setPageContext(page, {
                title: document.title
            });
    
            this.initialized = true;
            console.log(`[ZTGI-UI] Initialized for ${appName}`);
            console.log(`[ZTGI-UI] Press ? to open settings panel`);
            console.log(`[ZTGI-UI] Email-for-AI: ${this.emailClient.offlineMode ? 'offline' : 'online'}`);
    
            // Dispatch ready event
            document.dispatchEvent(new CustomEvent('ztgi:ready', {
                detail: { app: appName, emailClient: this.emailClient }
            }));
        }
    
        applyConfig(config) {
            // Register context menus
            if (config.contextMenus) {
                for (const [type, items] of Object.entries(config.contextMenus)) {
                    this.contextMenu.register(type, items);
                }
            }
    
            // Register cursor modes
            if (config.cursorModes) {
                for (const [mode, modeConfig] of Object.entries(config.cursorModes)) {
                    this.cursor.registerMode(mode, modeConfig);
                }
            }
    
            // Register keyboard shortcuts
            if (config.shortcuts) {
                for (const [combo, action] of Object.entries(config.shortcuts)) {
                    this.keyboard.register(combo, () => this.actions.execute(action));
                }
            }
    
            // Register action handlers (URL patterns)
            if (config.actions) {
                for (const [action, handler] of Object.entries(config.actions)) {
                    if (typeof handler === 'string') {
                        // URL-based action
                        this.actions.register(action, async (data) => {
                            const url = handler.replace(/\{(\w+)\}/g, (match, key) => {
                                return data[key] !== undefined ? encodeURIComponent(data[key]) : match;
                            });
                            window.location.href = url;
                        });
                    }
                }
            }
    
            // Set API endpoints if provided
            if (config.apiEndpoints) {
                for (const [app, url] of Object.entries(config.apiEndpoints)) {
                    this.actions.setApiEndpoint(app, url);
                }
            }
        }
    
        async loadConfig(appName) {
            try {
                const response = await fetch(`${this.baseUrl}/configs/${appName}.json`);
                if (!response.ok) {
                    throw new Error(`Config not found: ${response.status}`);
                }
                return await response.json();
            } catch (e) {
                console.warn(`[ZTGI-UI] Could not load config for ${appName}:`, e.message);
                return {};
            }
        }
    
        // Extend with additional config (useful for app-specific customizations)
        extend(config) {
            this.applyConfig(config);
        }
    
        // Get all available context menu types
        getMenuTypes() {
            return Object.keys(this.contextMenu.menus);
        }
    
        // Get menu items for a type (filtered by user settings)
        getMenuItems(type) {
            if (this.settings) {
                return this.settings.getFilteredMenuItems(type);
            }
            return this.contextMenu.menus[type] || [];
        }
    
        // Show help/available actions overlay
        showHelp() {
            this.settings.open();
            this.settings.switchTab('shortcuts');
        }
    
        // Get version info
        get version() {
            return '1.0.0';
        }
    }
    
    // Create global instance
    const ZtgiUI = new ZtgiUIClass();
    
    // Export for ES modules
    
    
    // Attach to window for script tag usage
    if (typeof window !== 'undefined') {
        window.ZtgiUI = ZtgiUI;
    }
    


    // Create global instance
    const ZtgiUI = new ZtgiUIClass();

    // Expose to global scope
    global.ZtgiUI = ZtgiUI;
    global.ZtgiContextMenu = ContextMenu;
    global.ZtgiCursorModeManager = CursorModeManager;
    global.ZtgiKeyboardManager = KeyboardManager;
    global.ZtgiActionRouter = ActionRouter;
    global.ZtgiEmailForAiClient = EmailForAiClient;
    global.ZtgiAnalyticsTracker = AnalyticsTracker;
    global.ZtgiAiAssistant = AiAssistant;
    global.ZtgiMenuCustomizer = MenuCustomizer;

})(typeof window !== 'undefined' ? window : this);
