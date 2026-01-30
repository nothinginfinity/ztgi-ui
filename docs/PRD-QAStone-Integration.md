# PRD: QA.Stone Integration for CNP + ZTGI-UI + Email-for-AI

## Overview

Integrate QA.Stone progressive context loading into the Copy-Not-Paste (CNP) + ZTGI-UI + Email-for-AI ecosystem, enabling token-efficient inter-agent communication where receiving agents only consume context proportional to task complexity.

---

## Problem Statement

**Current State:**
- User copies content in one Claude Code instance
- Pastes full content into another instance
- Receiving agent reads ENTIRE paste (500+ tokens)
- Even simple handoffs consume full context window

**Desired State:**
- Copy formats content as QA.Stone with progressive LOD
- Receiving agent reads ~50 token header first
- Agent decides: execute with LOD-0? Load more? Spawn helper?
- 90% token reduction for simple handoffs

---

## Architecture (Already Built)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Existing Infrastructure                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CNP System (port 7890/7891)     ZTGI-UI (port 7892)            │
│  ┌────────────────────────┐      ┌────────────────────────┐     │
│  │ • Clipboard monitoring │      │ • AI Assistant widget  │     │
│  │ • Hash generation      │      │ • Context menu system  │     │
│  │ • Provenance tracking  │      │ • Analytics tracker    │     │
│  │ • Content storage      │      │ • Menu customizer      │     │
│  └───────────┬────────────┘      └───────────┬────────────┘     │
│              │                               │                   │
│              └───────────┬───────────────────┘                   │
│                          │                                       │
│                          ▼                                       │
│              ┌────────────────────────┐                         │
│              │   Email-for-AI         │                         │
│              │   (port 8000)          │                         │
│              │   • Agent inboxes      │                         │
│              │   • Message routing    │                         │
│              │   • Persistent memory  │                         │
│              └────────────────────────┘                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**New Layer: QA.Stone Formatter + Parser**

```
┌─────────────────────────────────────────────────────────────────┐
│                    QA.Stone Integration                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Instance A (Sender)              Instance B (Receiver)          │
│  ┌────────────────────┐          ┌────────────────────────┐     │
│  │ 1. User copies     │          │ 4. User pastes         │     │
│  │ 2. CNP intercepts  │          │ 5. ZTGI-UI detects     │     │
│  │ 3. Format as Stone │────────▶ │    QA.Stone format     │     │
│  │    with LOD layers │  paste   │ 6. Read header (~50t)  │     │
│  └────────────────────┘          │ 7. Decide LOD needed   │     │
│                                  │ 8. Load/spawn/execute  │     │
│                                  └────────────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## QA.Stone Format Specification

### Structure

```
§QASTONE§
border_hash: <8-char hash of full content>
glow_channel: <category: task|context|handoff|query|data>
stone_type: <clipboard|message|handoff|artifact>
created: <ISO timestamp>
source_agent: <agent_id or "user">
lod_count: <number of LOD levels>
fortune: <LLM-parseable checksum>
─
LOD-0: <1-2 sentence scan - always loaded>
─
LOD-1: <paragraph detail - load on request>
─
LOD-2: <full context - load for complex tasks>
─
LOD-3: <source/history - rarely needed>
§/QASTONE§
```

### Example: Task Handoff

```
§QASTONE§
border_hash: f7a3b2c1
glow_channel: task
stone_type: handoff
created: 2026-01-30T12:00:00Z
source_agent: koda_instance_1
lod_count: 4
fortune: task:repo:ztgi:simple
─
LOD-0: Create GitHub repo for ztgi-ui, shared UI library.
─
LOD-1: ZTGI-UI is a vanilla JS library at ~/ztgi/ztgi-ui serving context menus,
cursor modes, AI assistant. Needs own repo because it's shared by CNP,
Email-for-AI, L&D. Run: git init && gh repo create nothinginfinity/ztgi-ui
─
LOD-2: Architecture: Express server on port 7892 serving bundled JS (148KB).
Components: ActionRouter, ContextMenu, CursorModeManager, KeyboardManager,
SettingsPanel, VisIntegration, EmailForAiClient, AnalyticsTracker,
AiAssistant, MenuCustomizer. Config-driven via /configs/{app}.json.
Integrates with Email-for-AI (8000) for persistence. Already in
localhost-dashboard services.json with github URL placeholder.
─
LOD-3: [Full conversation history about ZTGI-UI development...]
§/QASTONE§
```

### LOD Level Guidelines

| Level | Name | Size | Use Case | Load When |
|-------|------|------|----------|-----------|
| LOD-0 | Scan | 1-2 sentences | Quick assessment | Always |
| LOD-1 | Detail | 1 paragraph | Standard tasks | Simple execution |
| LOD-2 | Deep | Full context | Complex tasks | Need understanding |
| LOD-3 | Source | History/artifacts | Debugging/audit | Rarely |

---

## Components to Build

### 1. QA.Stone Formatter (`cnp_api/qastone_formatter.py`)

**Location:** `~/ztgi/copy_not_paste/cnp_api/qastone_formatter.py`

```python
class QAStoneFormatter:
    def format(self, content: str, metadata: dict) -> str:
        """
        Convert raw content to QA.Stone format with progressive LOD.

        Args:
            content: Raw clipboard/message content
            metadata: {
                glow_channel: str,
                stone_type: str,
                source_agent: str,
                generate_lods: bool  # Use LLM to generate LOD summaries
            }

        Returns:
            QA.Stone formatted string
        """

    def generate_lod_levels(self, content: str) -> dict:
        """Use LLM to create LOD-0, LOD-1, LOD-2 summaries."""

    def calculate_fortune(self, content: str, metadata: dict) -> str:
        """Generate LLM-parseable checksum hint."""
```

**Key Functions:**
- `format()` - Main entry point
- `generate_lod_levels()` - LLM call to summarize content at each level
- `calculate_fortune()` - Create hint string for quick parsing
- `parse_glow_channel()` - Auto-detect content type

### 2. QA.Stone Parser (`ztgi-ui/src/qastone-parser.js`)

**Location:** `~/ztgi/ztgi-ui/src/qastone-parser.js`

```javascript
class QAStoneParser {
    constructor() {
        this.lodCache = new Map();
    }

    /**
     * Detect if content is QA.Stone formatted
     */
    isQAStone(content) {
        return content.trim().startsWith('§QASTONE§');
    }

    /**
     * Parse header only (~50 tokens)
     */
    parseHeader(content) {
        // Returns: { border_hash, glow_channel, stone_type, lod_count, fortune }
    }

    /**
     * Extract specific LOD level
     */
    extractLOD(content, level) {
        // Returns LOD content for requested level
    }

    /**
     * Decide what LOD is needed based on header
     */
    assessRequiredLOD(header, taskContext) {
        // Returns: { level: 0|1|2|3, reason: string, spawnHelper: boolean }
    }

    /**
     * Progressive load - start with LOD-0, load more as needed
     */
    async progressiveLoad(content, maxLevel = 1) {
        // Returns content up to maxLevel
    }
}
```

### 3. AI Assistant Integration (`ztgi-ui/src/ai-assistant.js` update)

**Add to existing AI Assistant:**

```javascript
class AiAssistant {
    // ... existing code ...

    /**
     * Handle paste event - detect QA.Stone and process accordingly
     */
    async handlePaste(event) {
        const content = event.clipboardData.getData('text');

        if (this.qaStoneParser.isQAStone(content)) {
            return this.processQAStone(content);
        }

        // Regular paste handling
        return this.handleRegularPaste(content);
    }

    /**
     * Process QA.Stone formatted paste
     */
    async processQAStone(content) {
        // 1. Parse header only
        const header = this.qaStoneParser.parseHeader(content);

        // 2. Log to analytics (header only = minimal tokens)
        this.analytics.trackQAStoneReceived(header);

        // 3. Assess what LOD is needed
        const assessment = this.qaStoneParser.assessRequiredLOD(
            header,
            this.currentPageContext
        );

        // 4. Act based on assessment
        if (assessment.spawnHelper) {
            return this.spawnHelperForStone(content, assessment);
        }

        // 5. Load required LOD and process
        const lodContent = this.qaStoneParser.extractLOD(
            content,
            assessment.level
        );

        return this.processTask(lodContent, header);
    }

    /**
     * Spawn helper agent for complex stones
     */
    async spawnHelperForStone(content, assessment) {
        // Send to Email-for-AI with full stone
        // Helper agent processes with appropriate LOD
    }
}
```

### 4. Email-for-AI Stone Router (`email-for-ai/src/qastone_router.py`)

**Location:** `~/ztgi/email-for-ai/src/qastone_router.py`

```python
class QAStoneRouter:
    """Route QA.Stones between agents with LOD-aware delivery."""

    async def route_stone(self, stone: str, recipient: str,
                          max_lod: int = 1) -> dict:
        """
        Route stone to recipient, optionally truncating LOD.

        For simple handoffs, only send LOD-0 and LOD-1.
        Recipient can request higher LOD if needed.
        """

    async def request_higher_lod(self, stone_hash: str,
                                  level: int) -> str:
        """
        Recipient requests additional LOD level.
        Fetched from CNP storage by border_hash.
        """

    async def store_stone(self, stone: str) -> str:
        """
        Store full stone in CNP, return border_hash for retrieval.
        """
```

### 5. CNP Copy Hook Enhancement (`cnp_api/clipboard_hook.py` update)

**Add QA.Stone formatting option:**

```python
class ClipboardHook:
    def on_copy(self, content: str, source_app: str) -> dict:
        # Existing: hash, store, track provenance
        entry = self.create_entry(content, source_app)

        # New: Optionally format as QA.Stone
        if self.settings.get('auto_qastone_format'):
            stone = self.formatter.format(content, {
                'glow_channel': self.detect_channel(content),
                'stone_type': 'clipboard',
                'source_agent': 'user'
            })
            entry['qastone'] = stone

        return entry
```

---

## API Contracts

### CNP API Additions

```
POST /api/format-qastone
Body: {
    content: string,
    glow_channel?: string,
    stone_type?: string,
    generate_lods?: boolean
}
Response: {
    qastone: string,
    border_hash: string,
    lod_count: number
}

GET /api/stone/{border_hash}
Response: {
    qastone: string,
    created: string,
    access_count: number
}

GET /api/stone/{border_hash}/lod/{level}
Response: {
    level: number,
    content: string
}
```

### Email-for-AI Additions

```
POST /mcp/inbox/send-stone
Body: {
    recipient: string,
    stone: string,
    max_lod?: number  // Truncate to this LOD for delivery
}
Response: {
    tracking_id: string,
    border_hash: string,
    delivered_lod: number
}

POST /mcp/inbox/request-lod
Body: {
    border_hash: string,
    level: number
}
Response: {
    content: string,
    level: number
}
```

---

## User Flow Examples

### Example 1: Simple Task Handoff

```
Instance A (Koda):
1. Completes task, copies summary
2. CNP formats as QA.Stone with LOD-0,1,2

User pastes into Instance B (Cairn):
3. ZTGI-UI detects QA.Stone format
4. Parses header: glow_channel=task, fortune=simple
5. Assessment: LOD-0 sufficient
6. Loads only LOD-0 (1 sentence)
7. Cairn: "Got it - creating the repo now."

Token usage: 50 instead of 500+ (90% savings)
```

### Example 2: Complex Context Transfer

```
Instance A (Prax):
1. Copies architectural decision with full context
2. CNP formats as QA.Stone with LOD-0,1,2,3

User pastes into Instance B (Koda):
3. ZTGI-UI detects QA.Stone
4. Parses header: glow_channel=context, fortune=architecture:complex
5. Assessment: Need LOD-2, spawn helper for LOD-3
6. Loads LOD-0,1,2 directly
7. Spawns helper agent via Email-for-AI with full stone
8. Helper processes LOD-3, sends summary back

Token usage: 200 main + helper processes rest (50% savings on main context)
```

### Example 3: Query with Progressive Loading

```
User pastes question stone into Instance:
1. Header: glow_channel=query, fortune=codebase:search
2. Assessment: Start with LOD-0, may need more
3. Agent reads LOD-0: "Where is auth handled?"
4. Agent: "I can answer from LOD-0. Auth is in /src/auth/"
   OR
   Agent: "Need more context, loading LOD-1..."
5. Progressive loading only as needed
```

---

## Configuration

### ZTGI-UI Config Addition (`configs/ai-assistant.json`)

```json
{
    "qastone": {
        "enabled": true,
        "autoDetect": true,
        "defaultMaxLod": 1,
        "spawnHelperThreshold": 2,
        "formatOnCopy": false,
        "channels": {
            "task": { "defaultLod": 0, "color": "#4CAF50" },
            "context": { "defaultLod": 1, "color": "#2196F3" },
            "handoff": { "defaultLod": 1, "color": "#FF9800" },
            "query": { "defaultLod": 0, "color": "#9C27B0" },
            "data": { "defaultLod": 2, "color": "#607D8B" }
        }
    }
}
```

### CNP Config Addition

```json
{
    "qastone": {
        "autoFormat": false,
        "generateLods": true,
        "lodModel": "gpt-4o-mini",
        "storeFull": true,
        "ttlDays": 30
    }
}
```

---

## Implementation Phases

### Phase 1: Core Format (Koda)
1. Create `qastone_formatter.py` in CNP
2. Create `qastone-parser.js` in ZTGI-UI
3. Add format/parse unit tests

### Phase 2: Integration (Koda)
4. Update CNP copy hook for optional QA.Stone format
5. Update ZTGI-UI AI Assistant paste handling
6. Add QA.Stone detection to analytics

### Phase 3: Routing (Koda)
7. Create `qastone_router.py` in Email-for-AI
8. Add LOD-aware message delivery
9. Implement progressive LOD requests

### Phase 4: UI/UX (Koda)
10. Add QA.Stone indicator in AI Assistant
11. Show LOD level being used
12. Add "Load more context" button

---

## Verification

1. **Format Test:**
   - Copy text → verify QA.Stone structure
   - Check LOD levels are properly separated
   - Verify border_hash matches content

2. **Parse Test:**
   - Paste QA.Stone → verify header-only read
   - Check token count (should be ~50 for header)
   - Verify LOD extraction works

3. **Integration Test:**
   - Copy in Instance A with QA.Stone format
   - Paste in Instance B
   - Verify assistant detects and processes correctly
   - Check analytics shows QA.Stone event

4. **Token Efficiency Test:**
   - Compare token usage: regular paste vs QA.Stone
   - Measure for simple/medium/complex tasks
   - Target: 50%+ reduction for simple handoffs

---

## Files Summary

| File | Location | Purpose |
|------|----------|---------|
| `qastone_formatter.py` | `~/ztgi/copy_not_paste/` | Format content as QA.Stone |
| `qastone-parser.js` | `~/ztgi/ztgi-ui/src/` | Parse QA.Stone, extract LOD |
| `qastone_router.py` | `~/ztgi/email-for-ai/src/` | Route stones between agents |
| `ai-assistant.js` | `~/ztgi/ztgi-ui/src/` | Update for paste handling |
| `ai-assistant.json` | `~/ztgi/ztgi-ui/configs/` | QA.Stone config |

---

## Success Metrics

- **Token Efficiency:** 50%+ reduction for simple handoffs
- **Parse Speed:** Header parse <10ms
- **User Experience:** Seamless - user just copies/pastes normally
- **Adoption:** QA.Stone format becomes default for inter-agent comms
