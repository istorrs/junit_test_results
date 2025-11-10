// JUnit Test Results Dashboard - Shared Utilities
// Common functions used across multiple pages

/**
 * Log errors with comprehensive details for debugging
 * @param {string} context - Description of where the error occurred
 * @param {Error} error - The error object
 */
function logError(context, error) {
    console.error(`[ERROR] ${context}`);
    console.error('Error message:', error.message || 'No message');
    console.error('Error stack:', error.stack || 'No stack trace');

    // Log HTTP response details if available (for API errors)
    if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
    }

    // Log the full error object with all properties
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
}

/**
 * Navigate to test case history page
 * @param {string} testName - Name of the test
 * @param {string} className - Class name of the test
 */
function viewTestHistory(testName, className) {
    window.location.href = `test-case-history.html?name=${encodeURIComponent(testName)}&classname=${encodeURIComponent(className)}`;
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} - HTML-escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format a timestamp as a human-readable date string
 * @param {string|Date} timestamp - ISO timestamp or Date object
 * @returns {string} - Formatted date string
 */
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    try {
        const date = new Date(timestamp);
        return date.toLocaleString();
    } catch (e) {
        return timestamp;
    }
}

/**
 * Format seconds as human-readable time
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time string (e.g., "1.23s", "2m 15s")
 */
function formatTime(seconds) {
    if (seconds === null || seconds === undefined) return 'N/A';

    if (seconds < 1) {
        return `${(seconds * 1000).toFixed(0)}ms`;
    } else if (seconds < 60) {
        return `${seconds.toFixed(2)}s`;
    } else {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}m ${remainingSeconds}s`;
    }
}

/**
 * Format a number with delta styling (+ or -)
 * @param {number} value - The numeric value
 * @param {string} suffix - Suffix to append (default: '')
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} - Formatted delta string
 */
function formatDelta(value, suffix = '', decimals = 0) {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';

    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(decimals)}${suffix}`;
}

/**
 * Get URL parameter value
 * @param {string} param - Parameter name
 * @returns {string|null} - Parameter value or null
 */
function getUrlParameter(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

/**
 * Debounce function to limit how often a function can run
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Show a temporary toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 transition-opacity duration-300`;

    // Set color based on type
    const colors = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        warning: 'bg-orange-600',
        info: 'bg-blue-600'
    };
    toast.classList.add(colors[type] || colors.info);

    toast.textContent = message;
    document.body.appendChild(toast);

    // Fade out and remove
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, duration);
}

// Export functions to window for global access
window.logError = logError;
window.viewTestHistory = viewTestHistory;
window.escapeHtml = escapeHtml;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.formatDelta = formatDelta;
window.getUrlParameter = getUrlParameter;
window.debounce = debounce;
window.showToast = showToast;
