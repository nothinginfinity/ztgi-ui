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

export { MenuCustomizer };
