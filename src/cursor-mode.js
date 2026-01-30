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

export { CursorModeManager };
