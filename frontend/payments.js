/**
 * Mandazi Payment Tracker - JavaScript
 * Handles M-Pesa payment interactions and UI updates
 */

// Use relative URL for API - works in both dev and production
const API_URL = '/api';

// Store reference to polling interval
let paymentStatusPollingInterval = null;

/**
 * Initialize the payment page
 */
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    checkAuth();

    // Setup event listeners
    setupEventListeners();

    // Load initial data
    loadDashboardStats();
    loadSalesData();

    // Setup auto-refresh
    setInterval(() => {
        loadDashboardStats();
        loadSalesData();
    }, 10000); // Refresh every 10 seconds
});

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Logout button
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Modal close buttons
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.getElementById('cancel-manual').addEventListener('click', closeModal);
    document.getElementById('cancel-payment').addEventListener('click', cancelPayment);

    // Manual payment form
    document.getElementById('manual-payment-form').addEventListener('submit', handleManualPayment);

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal();
        }
    });
}

/**
 * Check if user is authenticated
 */
async function checkAuth() {
    try {
        const response = await apiCall('/auth/status');
        if (!response.authenticated) {
            window.location.href = 'index.html';
        }
    } catch (error) {
        window.location.href = 'index.html';
    }
}

/**
 * Handle logout
 */
async function handleLogout() {
    try {
        await apiCall('/logout', {
            method: 'POST'
        });
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

/**
 * Make API call to backend
 */
async function apiCall(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        ...options,
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
    }

    return data;
}

/**
 * Format currency to KSh format
 */
function formatCurrency(amount) {
    return `KSh ${amount.toLocaleString('en-KE', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    })}`;
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for HTML insertion
 */
function escapeHtml(text) {
    if (text === null || text === undefined) {
        return '';
    }
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

/**
 * Load dashboard statistics
 */
async function loadDashboardStats() {
    try {
        const stats = await apiCall('/dashboard');

        document.getElementById('total-amount').textContent = formatCurrency(stats.totalSales);
        document.getElementById('total-paid').textContent = formatCurrency(stats.totalPaid);
        document.getElementById('total-unpaid').textContent = formatCurrency(stats.totalUnpaid);
    } catch (error) {
        console.error('Failed to load dashboard stats:', error);
    }
}

/**
 * Load all sales data
 */
async function loadSalesData() {
    try {
        const sales = await apiCall('/sales');
        renderSalesTable(sales);
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

/**
 * Render sales table
 */
function renderSalesTable(sales) {
    const tableBody = document.getElementById('sales-table-body');
    const noSalesMessage = document.getElementById('no-sales');

    if (!sales || sales.length === 0) {
        tableBody.innerHTML = '';
        noSalesMessage.classList.remove('hidden');
        return;
    }

    noSalesMessage.classList.add('hidden');

    // Sort sales by date (newest first)
    const sortedSales = [...sales].sort((a, b) => new Date(b.date) - new Date(a.date));

    tableBody.innerHTML = sortedSales.map(sale => {
        // Normalize payment status to uppercase for consistent comparison
        const normalizedStatus = sale.paymentStatus ? .toUpperCase();
        const isPaid = normalizedStatus === 'PAID';
        const rowClass = isPaid ? 'paid-row' : '';
        const phoneNumber = sale.phone_number || sale.phoneNumber || '-';

        return `
            <tr class="${rowClass}" data-sale-id="${sale.id}">
                <td>${escapeHtml(sale.customerName)}</td>
                <td>${escapeHtml(phoneNumber)}</td>
                <td>${sale.quantity} × ${formatCurrency(sale.pricePerUnit)}</td>
                <td><strong>${formatCurrency(sale.totalAmount)}</strong></td>
                <td>
                    <span class="status-badge ${isPaid ? 'paid' : 'pending'}">
                        ${isPaid ? 'PAID' : 'PENDING'}
                    </span>
                </td>
                <td>
                    ${isPaid ? 
                        `<span class="receipt-number">${escapeHtml(sale.mpesa_receipt || 'N/A')}</span>` :
                        `<button class="btn btn-mpesa" onclick="initiateMpesaPayment(${sale.id}, '${escapeHtml(sale.customerName)}', '${escapeHtml(phoneNumber)}', ${sale.totalAmount})">
                            Pay with M-Pesa
                        </button>`
                    }
                </td>
                <td>
                    ${isPaid ? 
                        `<input type="checkbox" checked disabled class="checkbox-manual" title="Payment completed">` :
                        `<input type="checkbox" class="checkbox-manual" onchange="handleManualMarkPaid(this, ${sale.id})" title="Manually mark as paid">`
                    }
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Initiate M-Pesa payment
 */
async function initiateMpesaPayment(saleId, customerName, phoneNumber, amount) {
    // Show processing modal
    showPaymentProcessingModal();

    // If no phone number, prompt for it
    let finalPhone = phoneNumber;
    if (!finalPhone || finalPhone === '-' || finalPhone.length < 10) {
        closeModal(); // Close processing modal temporarily
        finalPhone = prompt('Please enter customer phone number (e.g., 254708374149):');
        if (!finalPhone) {
            showMessage('Phone number is required', 'error');
            return;
        }
        showPaymentProcessingModal();
    }

    try {
        const response = await apiCall('/mpesa/pay', {
            method: 'POST',
            body: JSON.stringify({
                customer_name: customerName,
                phone_number: finalPhone,
                amount: amount,
                sale_id: saleId
            })
        });

        if (response.success) {
            showMessage(`Payment request sent to ${response.customer_phone}. Please check your phone.`, 'success');

            // Start polling for payment status
            startPaymentStatusPolling(saleId);
        }
    } catch (error) {
        closeModal();
        showMessage(error.message, 'error');
    }
}

/**
 * Show payment processing modal
 */
function showPaymentProcessingModal() {
    document.getElementById('payment-processing-modal').classList.remove('hidden');
}

/**
 * Close payment processing modal
 */
function closePaymentProcessingModal() {
    document.getElementById('payment-processing-modal').classList.add('hidden');
    stopPaymentStatusPolling();
}

/**
 * Start polling for payment status
 */
function startPaymentStatusPolling(saleId) {
    stopPaymentStatusPolling(); // Clear any existing polling

    paymentStatusPollingInterval = setInterval(async () => {
        try {
            const status = await apiCall(`/mpesa/status/${saleId}`);

            if (status.payment_status === 'PAID' || status.payment_status === 'Paid') {
                closePaymentProcessingModal();
                showMessage('Payment confirmed! Receipt: ' + status.mpesa_receipt, 'success');
                loadDashboardStats();
                loadSalesData();
            }
        } catch (error) {
            console.error('Payment status check error:', error);
        }
    }, 5000); // Check every 5 seconds

    // Stop polling after 2 minutes (timeout)
    setTimeout(() => {
        if (paymentStatusPollingInterval) {
            closePaymentProcessingModal();
            showMessage('Payment timeout. Please check payment status manually.', 'error');
        }
    }, 120000);
}

/**
 * Stop payment status polling
 */
function stopPaymentStatusPolling() {
    if (paymentStatusPollingInterval) {
        clearInterval(paymentStatusPollingInterval);
        paymentStatusPollingInterval = null;
    }
}

/**
 * Cancel payment (close modal)
 */
function cancelPayment() {
    closePaymentProcessingModal();
    showMessage('Payment cancelled', 'error');
}

/**
 * Handle manual mark as paid checkbox
 */
function handleManualMarkPaid(checkbox, saleId) {
    if (checkbox.checked) {
        // Show modal to enter receipt code
        document.getElementById('manual-sale-id').value = saleId;
        document.getElementById('manual-payment-modal').classList.remove('hidden');
        document.getElementById('receipt-code').focus();
        checkbox.checked = false; // Uncheck until confirmed
    }
}

/**
 * Handle manual payment form submission
 */
async function handleManualPayment(e) {
    e.preventDefault();

    const saleId = document.getElementById('manual-sale-id').value;
    const receiptCode = document.getElementById('receipt-code').value.trim();

    if (!receiptCode) {
        showMessage('Please enter the receipt code', 'error');
        return;
    }

    try {
        const response = await apiCall('/mpesa/manual-pay', {
            method: 'POST',
            body: JSON.stringify({
                sale_id: saleId,
                mpesa_receipt: receiptCode
            })
        });

        if (response.success) {
            showMessage('Payment marked as paid successfully!', 'success');
            closeModal();
            loadDashboardStats();
            loadSalesData();
        }
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

/**
 * Close modal
 */
function closeModal() {
    document.getElementById('manual-payment-modal').classList.add('hidden');
    document.getElementById('receipt-code').value = '';
}

/**
 * Show message to user
 */
function showMessage(message, type) {
    const messageElement = document.getElementById('payment-message');
    messageElement.textContent = message;
    messageElement.className = `message ${type}`;

    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageElement.classList.add('hidden');
    }, 5000);
}

// Export functions for global access
window.initiateMpesaPayment = initiateMpesaPayment;
window.handleManualMarkPaid = handleManualMarkPaid;