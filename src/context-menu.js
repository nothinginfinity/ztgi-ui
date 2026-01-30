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
            console.log('[ContextMenu] Right-click detected:', {
                menuType,
                hasMenu: !!this.menus[menuType],
                registeredMenus: Object.keys(this.menus),
                target: e.target.tagName
            });
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

export { ContextMenu };
