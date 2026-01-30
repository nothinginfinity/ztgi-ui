/**
 * ZTGI-UI Build Script
 * Bundles all source files into a single dist/ztgi-ui.js
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

// Read source files in order
const files = [
    'utils.js',
    'action-router.js',
    'keyboard.js',
    'cursor-mode.js',
    'context-menu.js',
    'settings-panel.js',
    'vis-integration.js',
    'email-for-ai-client.js',
    'analytics-tracker.js',
    'qastone-parser.js',
    'ai-assistant.js',
    'menu-customizer.js',
    'index.js'
];

// Build bundle
let bundle = `/**
 * ZTGI-UI - Shared Agentic UI Library
 * Version: 1.0.0
 * Built: ${new Date().toISOString()}
 *
 * Usage:
 *   <script src="http://localhost:7892/ztgi-ui.js"></script>
 *   <script>ZtgiUI.init('cnp');</script>
 */

(function(global) {
    'use strict';

`;

// Process each file
files.forEach(file => {
    const filePath = path.join(srcDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove ES module imports/exports
    content = content.replace(/^import .+$/gm, '');
    content = content.replace(/^export \{ .+ \};$/gm, '');
    content = content.replace(/^export \{$/gm, '');
    content = content.replace(/^    .+,?$/gm, (match) => {
        if (match.includes('export')) return '';
        return match;
    });
    content = content.replace(/^\};$/gm, '');
    content = content.replace(/export { (\w+) };/g, '');
    content = content.replace(/export \* from .+;/g, '');

    // Replace export class/function with regular declarations
    content = content.replace(/export class /g, 'class ');
    content = content.replace(/export function /g, 'function ');
    content = content.replace(/export const /g, 'const ');
    content = content.replace(/export let /g, 'let ');

    bundle += `    // === ${file} ===\n`;
    bundle += content.split('\n').map(line => '    ' + line).join('\n');
    bundle += '\n\n';
});

// Add global exposure
bundle += `
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
    global.ZtgiQAStoneParser = QAStoneParser;

})(typeof window !== 'undefined' ? window : this);
`;

// Write bundle
const outputPath = path.join(distDir, 'ztgi-ui.js');
fs.writeFileSync(outputPath, bundle);

console.log(`[ZTGI-UI] Built: ${outputPath}`);
console.log(`[ZTGI-UI] Size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
