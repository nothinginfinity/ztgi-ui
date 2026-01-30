const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 7892;

// Enable CORS for all origins (needed for cross-app usage)
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve bundled library
app.use('/dist', express.static(path.join(__dirname, 'dist')));

// Serve cursor images
app.use('/cursors', express.static(path.join(__dirname, 'cursors')));

// Serve configuration files
app.use('/configs', express.static(path.join(__dirname, 'configs')));

// Serve CSS styles
app.use('/styles', express.static(path.join(__dirname, 'styles')));

// Serve source files (for module imports)
app.use('/src', express.static(path.join(__dirname, 'src')));

// Main entry point - serve bundled JS
app.get('/ztgi-ui.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'ztgi-ui.js'));
});

// Serve combined CSS
app.get('/ztgi-ui.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'styles', 'context-menu.css'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '1.0.0', port: PORT });
});

// List available configs
app.get('/api/configs', (req, res) => {
    const configDir = path.join(__dirname, 'configs');
    try {
        const files = fs.readdirSync(configDir)
            .filter(f => f.endsWith('.json'))
            .map(f => f.replace('.json', ''));
        res.json({ configs: files });
    } catch (err) {
        res.status(500).json({ error: 'Could not read configs' });
    }
});

// List available cursors
app.get('/api/cursors', (req, res) => {
    const cursorDir = path.join(__dirname, 'cursors');
    try {
        const files = fs.readdirSync(cursorDir)
            .filter(f => f.endsWith('.svg') || f.endsWith('.png'));
        res.json({ cursors: files });
    } catch (err) {
        res.status(500).json({ error: 'Could not read cursors' });
    }
});

// Root - serve info page
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>ZTGI-UI Library</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #1e1e1e;
            color: #e0e0e0;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
        }
        h1 { color: #fff; }
        code {
            background: #2a2a2a;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', monospace;
        }
        pre {
            background: #2a2a2a;
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
        }
        a { color: #66b3ff; }
        .section { margin: 24px 0; }
    </style>
</head>
<body>
    <h1>🎯 ZTGI-UI Library</h1>
    <p>Shared Agentic UI components for ZTGI applications.</p>

    <div class="section">
        <h2>Quick Start</h2>
        <pre>&lt;script src="http://localhost:7892/ztgi-ui.js"&gt;&lt;/script&gt;
&lt;link href="http://localhost:7892/ztgi-ui.css" rel="stylesheet"&gt;
&lt;script&gt;
    ZtgiUI.init('cnp'); // or 'email-for-ai', 'lawyers-and-dragons'
&lt;/script&gt;</pre>
    </div>

    <div class="section">
        <h2>Available Endpoints</h2>
        <ul>
            <li><code>/ztgi-ui.js</code> - Bundled library</li>
            <li><code>/ztgi-ui.css</code> - Styles</li>
            <li><code>/configs/{app}.json</code> - App configs</li>
            <li><code>/cursors/{name}.svg</code> - Cursor images</li>
            <li><code>/api/configs</code> - List configs</li>
            <li><code>/api/cursors</code> - List cursors</li>
            <li><code>/health</code> - Health check</li>
        </ul>
    </div>

    <div class="section">
        <h2>Available Configs</h2>
        <ul>
            <li><a href="/configs/cnp.json">cnp.json</a> - Copy Not Paste</li>
            <li><a href="/configs/email-for-ai.json">email-for-ai.json</a> - Email for AI</li>
            <li><a href="/configs/lawyers-and-dragons.json">lawyers-and-dragons.json</a> - L&D</li>
            <li><a href="/configs/ai-assistant.json">ai-assistant.json</a> - AI Assistant system prompts</li>
        </ul>
    </div>

    <div class="section">
        <h2>New: AI Assistant System</h2>
        <p>ZTGI-UI now includes an integrated AI assistant:</p>
        <ul>
            <li><strong>Floating Chat Widget</strong> - Toggle with <code>Ctrl+/</code></li>
            <li><strong>Analytics Tracking</strong> - Tracks menu clicks, shortcuts, page visits</li>
            <li><strong>Usage Insights</strong> - View your most-used actions</li>
            <li><strong>Menu Customization</strong> - AI-driven suggestions based on usage</li>
            <li><strong>Email-for-AI Integration</strong> - Persistent memory via inbox system</li>
        </ul>
    </div>

    <div class="section">
        <h2>Demo</h2>
        <p>Right-click on the boxes below to test context menus:</p>
        <div style="display: flex; gap: 16px; margin-top: 16px;">
            <div data-context="cnp-entry" data-hash8="abc12345"
                 style="background: #2a2a2a; padding: 20px; border-radius: 8px; cursor: pointer;">
                CNP Entry (right-click me)
            </div>
            <div data-context="email-item" data-id="email-001"
                 style="background: #2a2a2a; padding: 20px; border-radius: 8px; cursor: pointer;">
                Email Item (right-click me)
            </div>
        </div>
    </div>

    <script src="/ztgi-ui.js"></script>
    <link href="/ztgi-ui.css" rel="stylesheet">
    <script>
        // Initialize with merged configs for demo
        ZtgiUI.init('cnp');
        // Add email menus too
        fetch('/configs/email-for-ai.json')
            .then(r => r.json())
            .then(config => ZtgiUI.extend(config));

        // Demo action handlers
        ZtgiUI.actions.register('cnp.copyHash', (data) => {
            alert('Copied: ' + data.hash8);
        });
        ZtgiUI.actions.register('cnp.viewChain', (data) => {
            alert('View chain for: ' + data.hash8);
        });
    </script>
</body>
</html>
    `);
});

app.listen(PORT, () => {
    console.log(`[ZTGI-UI] Serving on http://localhost:${PORT}`);
    console.log(`[ZTGI-UI] Endpoints:`);
    console.log(`  - /ztgi-ui.js   (bundled library)`);
    console.log(`  - /ztgi-ui.css  (styles)`);
    console.log(`  - /configs/     (app configs)`);
    console.log(`  - /cursors/     (cursor images)`);
});
