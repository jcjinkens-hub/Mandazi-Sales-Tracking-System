// Authentication utility functions

// Show loading screen
function showLoadingScreen() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
    }
}

// Hide loading screen
function hideLoadingScreen() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

// Format currency
function formatCurrency(amount) {
    return `KSh ${(amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Format date
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

// Check authentication status
async function checkAuth() {
    try {
        const response = await fetch('http://localhost:3001/api/auth/status', {
            credentials: 'include'
        });

        const data = await response.json();

        if (!data.authenticated) {
            // Not logged in, redirect to login
            const currentPage = window.location.pathname;
            if (!currentPage.includes('login.html') &&
                !currentPage.includes('signup.html') &&
                !currentPage.includes('forgot-password.html')) {
                window.location.href = 'login.html';
            }
        }

        return data.authenticated;
    } catch (error) {
        console.error('Auth check error:', error);
        return false;
    }
}

// Initialize theme from preferences
async function initTheme() {
    try {
        const response = await fetch('http://localhost:3001/api/user/preferences', {
            credentials: 'include'
        });

        if (response.ok) {
            const prefs = await response.json();

            if (prefs.theme === 'dark') {
                document.body.classList.add('dark-mode');
            }

            if (prefs.layout === 'compact') {
                document.body.classList.add('compact-layout');
            }
        }
    } catch (error) {
        console.error('Error initializing theme:', error);
    }
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showLoadingScreen,
        hideLoadingScreen,
        formatCurrency,
        formatDate,
        checkAuth,
        initTheme
    };
}