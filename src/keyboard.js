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

export { KeyboardManager };
