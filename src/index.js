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

import { ContextMenu } from './context-menu.js';
import { CursorModeManager } from './cursor-mode.js';
import { KeyboardManager } from './keyboard.js';
import { ActionRouter } from './action-router.js';
import { SettingsPanel } from './settings-panel.js';
import { VisIntegration } from './vis-integration.js';
import { EmailForAiClient } from './email-for-ai-client.js';
import { AnalyticsTracker } from './analytics-tracker.js';
import { AiAssistant } from './ai-assistant.js';
import { MenuCustomizer } from './menu-customizer.js';
import { QAStoneParser } from './qastone-parser.js';
import * as utils from './utils.js';

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
        this.qaStoneParser = null;
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

        // Initialize QA.Stone Parser
        this.qaStoneParser = new QAStoneParser();

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
export { ZtgiUI, ContextMenu, CursorModeManager, KeyboardManager, ActionRouter, SettingsPanel, VisIntegration, EmailForAiClient, AnalyticsTracker, AiAssistant, MenuCustomizer, QAStoneParser, utils };

// Attach to window for script tag usage
if (typeof window !== 'undefined') {
    window.ZtgiUI = ZtgiUI;
}
