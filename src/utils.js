/**
 * ZTGI-UI Utilities
 */

// Debounce function
function debounce(fn, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
}

// Throttle function
function throttle(fn, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            fn.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Deep merge objects
function deepMerge(target, source) {
    const output = { ...target };
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            output[key] = deepMerge(target[key] || {}, source[key]);
        } else {
            output[key] = source[key];
        }
    }
    return output;
}

// Copy to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        } catch (e) {
            document.body.removeChild(textarea);
            return false;
        }
    }
}

// Show toast notification
function showToast(message, duration = 3000) {
    const existing = document.querySelector('.ztgi-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'ztgi-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('ztgi-toast-visible');
    });

    setTimeout(() => {
        toast.classList.remove('ztgi-toast-visible');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Get element data attributes as object
function getElementData(el) {
    if (!el || !el.dataset) return {};
    return { ...el.dataset };
}

// Find closest parent with data-context
function findContextParent(el) {
    while (el && el !== document.body) {
        if (el.dataset && el.dataset.context) {
            return el;
        }
        el = el.parentElement;
    }
    return null;
}

export {
    debounce,
    throttle,
    deepMerge,
    copyToClipboard,
    showToast,
    getElementData,
    findContextParent
};
