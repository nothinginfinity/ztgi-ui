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

export { SettingsPanel };
