// Global Error Boundary - Catches ALL uncaught errors and makes them LOUD
// This ensures no errors fail silently

/**
 * Global error handler for uncaught errors
 */
window.addEventListener('error', (event) => {
    console.error('═══════════════════════════════════════════════════════════');
    console.error('🚨 UNCAUGHT ERROR DETECTED 🚨');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('Message:', event.message);
    console.error('Source:', event.filename);
    console.error('Line:', event.lineno);
    console.error('Column:', event.colno);
    console.error('Error object:', event.error);
    if (event.error) {
        console.error('Stack trace:', event.error.stack);
        console.error('Error name:', event.error.name);
        console.error('Full error:', JSON.stringify(event.error, Object.getOwnPropertyNames(event.error), 2));
    }
    console.error('═══════════════════════════════════════════════════════════');

    // Show user-friendly notification
    showErrorNotification(`Error: ${event.message}`, 'error');
});

/**
 * Global handler for unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
    console.error('═══════════════════════════════════════════════════════════');
    console.error('🚨 UNHANDLED PROMISE REJECTION 🚨');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('Reason:', event.reason);
    if (event.reason instanceof Error) {
        console.error('Error message:', event.reason.message);
        console.error('Stack trace:', event.reason.stack);
        console.error('Error name:', event.reason.name);
        console.error('Full error:', JSON.stringify(event.reason, Object.getOwnPropertyNames(event.reason), 2));
    }
    console.error('Promise:', event.promise);
    console.error('═══════════════════════════════════════════════════════════');

    // Show user-friendly notification
    const message = event.reason instanceof Error ? event.reason.message : String(event.reason);
    showErrorNotification(`Async error: ${message}`, 'error');

    // Prevent the default browser behavior (console warning)
    // We've already logged it loudly
    event.preventDefault();
});

/**
 * Wrap Array.prototype methods to catch errors
 */
const wrapArrayMethod = (methodName) => {
    const original = Array.prototype[methodName];
    Array.prototype[methodName] = function(...args) {
        try {
            return original.apply(this, args);
        } catch (error) {
            console.error(`═══════════════════════════════════════════════════════════`);
            console.error(`🚨 ERROR IN Array.${methodName}() 🚨`);
            console.error(`═══════════════════════════════════════════════════════════`);
            console.error('Array:', this);
            console.error('Arguments:', args);
            console.error('Error:', error.message);
            console.error('Stack:', error.stack);
            console.error('═══════════════════════════════════════════════════════════');
            throw error; // Re-throw so it's caught by global handler
        }
    };
};

// Wrap common array methods that might fail
['map', 'filter', 'forEach', 'reduce', 'find', 'some', 'every'].forEach(wrapArrayMethod);

/**
 * Wrap setTimeout and setInterval to catch errors in callbacks
 */
const originalSetTimeout = window.setTimeout;
window.setTimeout = function(callback, delay, ...args) {
    return originalSetTimeout(() => {
        try {
            callback(...args);
        } catch (error) {
            console.error('═══════════════════════════════════════════════════════════');
            console.error('🚨 ERROR IN setTimeout CALLBACK 🚨');
            console.error('═══════════════════════════════════════════════════════════');
            console.error('Error:', error.message);
            console.error('Stack:', error.stack);
            console.error('═══════════════════════════════════════════════════════════');
            throw error;
        }
    }, delay);
};

const originalSetInterval = window.setInterval;
window.setInterval = function(callback, delay, ...args) {
    return originalSetInterval(() => {
        try {
            callback(...args);
        } catch (error) {
            console.error('═══════════════════════════════════════════════════════════');
            console.error('🚨 ERROR IN setInterval CALLBACK 🚨');
            console.error('═══════════════════════════════════════════════════════════');
            console.error('Error:', error.message);
            console.error('Stack:', error.stack);
            console.error('═══════════════════════════════════════════════════════════');
            throw error;
        }
    }, delay);
};

/**
 * Wrap addEventListener to catch errors in event handlers
 */
const originalAddEventListener = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function(type, listener, options) {
    const wrappedListener = function(event) {
        try {
            return listener.call(this, event);
        } catch (error) {
            console.error('═══════════════════════════════════════════════════════════');
            console.error(`🚨 ERROR IN ${type.toUpperCase()} EVENT HANDLER 🚨`);
            console.error('═══════════════════════════════════════════════════════════');
            console.error('Target:', this);
            console.error('Event:', event);
            console.error('Error:', error.message);
            console.error('Stack:', error.stack);
            console.error('═══════════════════════════════════════════════════════════');
            throw error;
        }
    };

    // Store original listener for removeEventListener compatibility
    wrappedListener._original = listener;

    return originalAddEventListener.call(this, type, wrappedListener, options);
};

/**
 * Wrap fetch to log all API errors loudly
 */
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    const url = args[0];
    console.log(`[FETCH] Calling: ${url}`);

    try {
        const response = await originalFetch(...args);
        console.log(`[FETCH] Response from ${url}:`, response.status, response.statusText);

        if (!response.ok) {
            console.error('═══════════════════════════════════════════════════════════');
            console.error('🚨 HTTP ERROR RESPONSE 🚨');
            console.error('═══════════════════════════════════════════════════════════');
            console.error('URL:', url);
            console.error('Status:', response.status);
            console.error('Status Text:', response.statusText);
            console.error('Headers:', Object.fromEntries(response.headers.entries()));

            // Clone response to read body
            const cloned = response.clone();
            try {
                const text = await cloned.text();
                console.error('Response body:', text);
            } catch (e) {
                console.error('Could not read response body:', e.message);
            }
            console.error('═══════════════════════════════════════════════════════════');
        }

        return response;
    } catch (error) {
        console.error('═══════════════════════════════════════════════════════════');
        console.error('🚨 FETCH NETWORK ERROR 🚨');
        console.error('═══════════════════════════════════════════════════════════');
        console.error('URL:', url);
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.error('═══════════════════════════════════════════════════════════');
        throw error;
    }
};

/**
 * Safe wrapper for JSON.parse
 */
const originalJSONParse = JSON.parse;
JSON.parse = function(text, reviver) {
    try {
        return originalJSONParse(text, reviver);
    } catch (error) {
        console.error('═══════════════════════════════════════════════════════════');
        console.error('🚨 JSON.parse ERROR 🚨');
        console.error('═══════════════════════════════════════════════════════════');
        console.error('Input text:', text?.substring(0, 200));
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.error('═══════════════════════════════════════════════════════════');
        throw error;
    }
};

/**
 * Show visual error notification
 */
function showErrorNotification(message, type = 'error') {
    // Only show if showToast is available (from shared-utils.js)
    if (typeof window.showToast === 'function') {
        window.showToast(message, type, 5000);
    }
}

console.log('✅ Error Boundary initialized - ALL errors will be logged loudly!');
console.log('🔊 Monitoring: uncaught errors, promise rejections, array operations, events, fetch, JSON.parse');
