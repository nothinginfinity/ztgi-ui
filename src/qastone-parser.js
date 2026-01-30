/**
 * QA.Stone Parser
 *
 * Parses QA.Stone formatted content with progressive LOD loading.
 * Enables token-efficient inter-agent communication by reading
 * only the header first (~50 tokens), then loading LOD as needed.
 *
 * Usage:
 *   const parser = new QAStoneParser();
 *   if (parser.isQAStone(content)) {
 *       const header = parser.parseHeader(content);
 *       const assessment = parser.assessRequiredLOD(header, context);
 *       const lodContent = parser.extractLOD(content, assessment.level);
 *   }
 */

class QAStoneParser {
    constructor() {
        this.lodCache = new Map();
        this.headerCache = new Map();

        // LOD assessment rules by channel
        this.channelRules = {
            task: { defaultLod: 0, complexThreshold: 'complex' },
            context: { defaultLod: 1, complexThreshold: 'medium' },
            handoff: { defaultLod: 1, complexThreshold: 'complex' },
            query: { defaultLod: 0, complexThreshold: 'medium' },
            data: { defaultLod: 2, complexThreshold: 'simple' }
        };
    }

    /**
     * Check if content is QA.Stone formatted
     */
    isQAStone(content) {
        if (!content || typeof content !== 'string') return false;
        return content.trim().startsWith('§QASTONE§');
    }

    /**
     * Parse header only (~50 tokens)
     * Returns metadata without loading full LOD content
     */
    parseHeader(content) {
        if (!this.isQAStone(content)) {
            throw new Error('Not a valid QA.Stone format');
        }

        // Check cache
        const cacheKey = content.substring(0, 100);
        if (this.headerCache.has(cacheKey)) {
            return this.headerCache.get(cacheKey);
        }

        const lines = content.split('\n');
        const header = {
            border_hash: null,
            glow_channel: null,
            stone_type: null,
            created: null,
            source_agent: null,
            lod_count: 0,
            fortune: null,
            raw_header: ''
        };

        let headerEndIndex = 0;

        for (let i = 0; i < lines.length && i < 15; i++) {
            const line = lines[i].trim();

            if (line === '─') {
                headerEndIndex = i;
                break;
            }

            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                const value = line.substring(colonIndex + 1).trim();

                switch (key) {
                    case 'border_hash':
                        header.border_hash = value;
                        break;
                    case 'glow_channel':
                        header.glow_channel = value;
                        break;
                    case 'stone_type':
                        header.stone_type = value;
                        break;
                    case 'created':
                        header.created = value;
                        break;
                    case 'source_agent':
                        header.source_agent = value;
                        break;
                    case 'lod_count':
                        header.lod_count = parseInt(value, 10) || 0;
                        break;
                    case 'fortune':
                        header.fortune = value;
                        break;
                }
            }
        }

        header.raw_header = lines.slice(0, headerEndIndex + 1).join('\n');

        // Cache the parsed header
        this.headerCache.set(cacheKey, header);

        return header;
    }

    /**
     * Parse fortune string into components
     */
    parseFortune(fortune) {
        if (!fortune) return { channel: null, category: null, complexity: null };

        const parts = fortune.split(':');
        return {
            channel: parts[0] || null,
            category: parts[1] || null,
            complexity: parts[2] || null
        };
    }

    /**
     * Extract specific LOD level content
     */
    extractLOD(content, level) {
        if (!this.isQAStone(content)) {
            return content; // Return as-is if not a stone
        }

        // Check cache
        const cacheKey = `${content.substring(0, 50)}:${level}`;
        if (this.lodCache.has(cacheKey)) {
            return this.lodCache.get(cacheKey);
        }

        const lodMarker = `LOD-${level}:`;
        const lines = content.split('\n');
        let lodContent = '';
        let inLod = false;

        for (const line of lines) {
            if (line.startsWith(lodMarker)) {
                inLod = true;
                lodContent = line.substring(lodMarker.length).trim();
            } else if (inLod) {
                if (line.trim() === '─' || line.startsWith('LOD-') || line === '§/QASTONE§') {
                    break;
                }
                lodContent += '\n' + line;
            }
        }

        // Cache the result
        this.lodCache.set(cacheKey, lodContent.trim());

        return lodContent.trim();
    }

    /**
     * Extract all LOD levels up to maxLevel
     */
    extractLODsUpTo(content, maxLevel) {
        const result = {};
        for (let level = 0; level <= maxLevel; level++) {
            const lodContent = this.extractLOD(content, level);
            if (lodContent) {
                result[level] = lodContent;
            }
        }
        return result;
    }

    /**
     * Assess what LOD level is needed based on header and context
     */
    assessRequiredLOD(header, taskContext = {}) {
        const fortune = this.parseFortune(header.fortune);
        const channel = header.glow_channel || 'context';

        // Get channel rules
        const rules = this.channelRules[channel] || { defaultLod: 1, complexThreshold: 'medium' };

        let level = rules.defaultLod;
        let reason = `Default for ${channel} channel`;
        let spawnHelper = false;

        // Adjust based on complexity
        if (fortune.complexity === 'simple') {
            level = Math.min(level, 0);
            reason = 'Simple task, LOD-0 sufficient';
        } else if (fortune.complexity === 'complex') {
            level = Math.max(level, 2);
            reason = 'Complex task, need full context';

            // Consider spawning helper for very complex tasks
            if (header.lod_count >= 4) {
                spawnHelper = true;
                reason = 'Very complex, spawning helper for LOD-3';
            }
        }

        // Adjust based on task context
        if (taskContext.needsFullContext) {
            level = Math.max(level, 2);
            reason = 'Task requires full context';
        }

        if (taskContext.quickAssessment) {
            level = 0;
            reason = 'Quick assessment mode';
        }

        // Adjust based on stone type
        if (header.stone_type === 'handoff' && fortune.complexity !== 'simple') {
            level = Math.max(level, 1);
            reason = 'Handoff requires at least LOD-1';
        }

        return {
            level: level,
            reason: reason,
            spawnHelper: spawnHelper,
            fortune: fortune,
            channel: channel
        };
    }

    /**
     * Progressive load - start with LOD-0, return content up to maxLevel
     */
    progressiveLoad(content, maxLevel = 1) {
        if (!this.isQAStone(content)) {
            return { content: content, loadedLevel: -1, isStone: false };
        }

        const header = this.parseHeader(content);
        const lods = this.extractLODsUpTo(content, maxLevel);

        // Combine LODs into readable format
        let combinedContent = '';
        for (let level = 0; level <= maxLevel; level++) {
            if (lods[level]) {
                if (combinedContent) combinedContent += '\n\n';
                combinedContent += lods[level];
            }
        }

        return {
            content: combinedContent,
            loadedLevel: maxLevel,
            isStone: true,
            header: header,
            lods: lods
        };
    }

    /**
     * Get estimated token count for content
     * Rough estimate: ~0.75 tokens per word
     */
    estimateTokens(content) {
        if (!content) return 0;
        const words = content.split(/\s+/).length;
        return Math.ceil(words * 0.75);
    }

    /**
     * Get token savings info
     */
    getTokenSavings(content, loadedLevel) {
        if (!this.isQAStone(content)) {
            return { saved: 0, percentage: 0, headerTokens: 0, fullTokens: 0 };
        }

        const header = this.parseHeader(content);
        const headerTokens = this.estimateTokens(header.raw_header);

        // Extract all LODs to calculate full size
        const allLods = this.extractLODsUpTo(content, 3);
        let fullContent = Object.values(allLods).join('\n\n');
        const fullTokens = this.estimateTokens(fullContent);

        // Calculate loaded content tokens
        const loadedLods = this.extractLODsUpTo(content, loadedLevel);
        let loadedContent = Object.values(loadedLods).join('\n\n');
        const loadedTokens = this.estimateTokens(loadedContent) + headerTokens;

        const saved = fullTokens - loadedTokens;
        const percentage = fullTokens > 0 ? Math.round((saved / fullTokens) * 100) : 0;

        return {
            saved: saved,
            percentage: percentage,
            headerTokens: headerTokens,
            loadedTokens: loadedTokens,
            fullTokens: fullTokens
        };
    }

    /**
     * Build a QA.Stone from components (for creating stones in JS)
     */
    buildStone(options) {
        const {
            content,
            glow_channel = 'context',
            stone_type = 'clipboard',
            source_agent = 'user',
            lods = null
        } = options;

        // Generate hash
        const border_hash = this._generateHash(content);

        // Generate LODs if not provided
        const lodLevels = lods || this._generateLODs(content);

        // Calculate fortune
        const fortune = this._calculateFortune(content, glow_channel);

        // Build stone
        const timestamp = new Date().toISOString();
        const lodCount = Object.values(lodLevels).filter(v => v).length;

        let stone = `§QASTONE§
border_hash: ${border_hash}
glow_channel: ${glow_channel}
stone_type: ${stone_type}
created: ${timestamp}
source_agent: ${source_agent}
lod_count: ${lodCount}
fortune: ${fortune}
─`;

        for (let level = 0; level <= 3; level++) {
            if (lodLevels[level]) {
                stone += `\nLOD-${level}: ${lodLevels[level]}\n─`;
            }
        }

        stone += '\n§/QASTONE§';

        return stone;
    }

    /**
     * Generate simple hash (8 chars)
     */
    _generateHash(content) {
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(8, '0').substring(0, 8);
    }

    /**
     * Generate LOD levels heuristically
     */
    _generateLODs(content) {
        const sentences = content.split(/[.!?]+/).filter(s => s.trim());
        const paragraphs = content.split(/\n\n+/).filter(p => p.trim());

        // LOD-0: First 1-2 sentences
        let lod0 = sentences[0] || content.substring(0, 100);
        if (sentences.length > 1 && lod0.length < 50) {
            lod0 += '. ' + sentences[1];
        }
        lod0 = lod0.substring(0, 150);

        // LOD-1: First paragraph
        let lod1 = paragraphs[0] || content.substring(0, 500);
        if (lod1.length < 100 && paragraphs.length > 1) {
            lod1 += '\n\n' + paragraphs[1];
        }
        lod1 = lod1.substring(0, 500);

        // LOD-2: Full content
        const lod2 = content;

        // LOD-3: Empty (would need history)
        const lod3 = '';

        return { 0: lod0, 1: lod1, 2: lod2, 3: lod3 };
    }

    /**
     * Calculate fortune hint
     */
    _calculateFortune(content, channel) {
        let category = 'general';
        const contentLower = content.toLowerCase();

        if (/\b(git|repo|github|commit)\b/.test(contentLower)) category = 'repo';
        else if (/\b(api|endpoint|route)\b/.test(contentLower)) category = 'api';
        else if (/\b(database|sql|query)\b/.test(contentLower)) category = 'database';
        else if (/\b(ui|component|style)\b/.test(contentLower)) category = 'ui';
        else if (/\b(test|spec|assert)\b/.test(contentLower)) category = 'test';

        const wordCount = content.split(/\s+/).length;
        let complexity = 'simple';
        if (wordCount > 200) complexity = 'complex';
        else if (wordCount > 50) complexity = 'medium';

        return `${channel}:${category}:${complexity}`;
    }

    /**
     * Clear caches
     */
    clearCache() {
        this.lodCache.clear();
        this.headerCache.clear();
    }
}

export { QAStoneParser };
