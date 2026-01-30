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

export { VisIntegration };
