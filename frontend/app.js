// Mandazi Sales Tracker - Frontend JavaScript

const API_URL = 'http://localhost:3001/api';

// Utility Functions
function formatCurrency(amount) {
  return `KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function showError(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
    element.classList.remove('hidden');
    setTimeout(() => {
      element.classList.add('hidden');
    }, 5000);
  }
}

function showSuccess(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
    element.classList.remove('hidden');
    setTimeout(() => {
      element.classList.add('hidden');
    }, 3000);
  }
}

// Navigation
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.add('hidden');
  });
  document.getElementById(pageId).classList.remove('hidden');
}

// API Calls
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

// Auth Functions
async function checkAuth() {
  try {
    const response = await apiCall('/auth/status');
    if (response.authenticated) {
      showPage('dashboard-page');
      loadDashboard();
    } else {
      showPage('login-page');
    }
  } catch (error) {
    showPage('login-page');
  }
}

async function login(username, password) {
  try {
    const response = await apiCall('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    showPage('dashboard-page');
    loadDashboard();
  } catch (error) {
    showError('login-error', error.message);
  }
}

async function logout() {
  try {
    await apiCall('/logout', { method: 'POST' });
    showPage('login-page');
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Dashboard Functions
async function loadDashboard() {
  try {
    const stats = await apiCall('/dashboard');
    
    document.getElementById('total-sales').textContent = formatCurrency(stats.totalSales);
    document.getElementById('total-paid').textContent = formatCurrency(stats.totalPaid);
    document.getElementById('total-unpaid').textContent = formatCurrency(stats.totalUnpaid);
    document.getElementById('total-count').textContent = stats.totalSalesCount;

    const recentSalesBody = document.getElementById('recent-sales-body');
    const noRecentSales = document.getElementById('no-recent-sales');

    if (stats.recentSales && stats.recentSales.length > 0) {
      recentSalesBody.innerHTML = stats.recentSales.map(sale => `
        <tr>
          <td>${sale.customerName}</td>
          <td>${sale.quantity}</td>
          <td>${formatCurrency(sale.totalAmount)}</td>
          <td><span class="status-badge ${sale.paymentStatus === 'Paid' ? 'status-paid' : 'status-unpaid'}">${sale.paymentStatus}</span></td>
          <td>${formatDate(sale.date)}</td>
        </tr>
      `).join('');
      noRecentSales.classList.add('hidden');
    } else {
      recentSalesBody.innerHTML = '';
      noRecentSales.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Dashboard load error:', error);
  }
}

// Record Sale Functions
function calculateTotal() {
  const quantity = parseFloat(document.getElementById('quantity').value) || 0;
  const pricePerUnit = parseFloat(document.getElementById('price-per-unit').value) || 0;
  const total = quantity * pricePerUnit;
  document.getElementById('total-amount').textContent = formatCurrency(total);
}

async function recordSale(customerName, quantity, pricePerUnit, paymentStatus) {
  try {
    const totalAmount = quantity * pricePerUnit;
    await apiCall('/sales', {
      method: 'POST',
      body: JSON.stringify({
        customerName,
        quantity,
        pricePerUnit,
        totalAmount,
        paymentStatus,
      }),
    });
    showSuccess('record-success', 'Sale recorded successfully!');
    document.getElementById('record-sale-form').reset();
    calculateTotal();
    setTimeout(() => {
      showPage('dashboard-page');
      loadDashboard();
    }, 1500);
  } catch (error) {
    showError('record-error', error.message);
  }
}

// View Sales Functions
async function loadAllSales() {
  try {
    const sales = await apiCall('/sales');
    const salesBody = document.getElementById('all-sales-body');
    const noSales = document.getElementById('no-sales');

    if (sales && sales.length > 0) {
      salesBody.innerHTML = sales.map(sale => `
        <tr>
          <td>#${sale.id}</td>
          <td>${sale.customerName}</td>
          <td>${sale.quantity}</td>
          <td>${formatCurrency(sale.totalAmount)}</td>
          <td><span class="status-badge ${sale.paymentStatus === 'Paid' ? 'status-paid' : 'status-unpaid'}">${sale.paymentStatus}</span></td>
          <td>${formatDate(sale.date)}</td>
          <td>
            <div class="action-btns">
              <button class="btn btn-icon btn-edit" data-id="${sale.id}">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-icon btn-delete" data-id="${sale.id}">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #ef4444;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
      noSales.classList.add('hidden');

      // Add event listeners for edit and delete buttons
      document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const saleId = e.currentTarget.dataset.id;
          loadSaleForEdit(saleId);
        });
      });

      document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const saleId = e.currentTarget.dataset.id;
          if (confirm('Are you sure you want to delete this sale?')) {
            deleteSale(saleId);
          }
        });
      });
    } else {
      salesBody.innerHTML = '';
      noSales.classList.remove('hidden');
    }
  } catch (error) {
    showError('sales-error', error.message);
  }
}

async function deleteSale(saleId) {
  try {
    await apiCall(`/sales/${saleId}`, { method: 'DELETE' });
    loadAllSales();
    loadDashboard();
  } catch (error) {
    showError('sales-error', error.message);
  }
}

// View Unpaid Functions
async function loadUnpaidSales() {
  try {
    const sales = await apiCall('/sales/unpaid');
    const unpaidBody = document.getElementById('unpaid-sales-body');
    const noUnpaid = document.getElementById('no-unpaid');

    if (sales && sales.length > 0) {
      unpaidBody.innerHTML = sales.map(sale => `
        <tr>
          <td>#${sale.id}</td>
          <td>${sale.customerName}</td>
          <td>${sale.quantity}</td>
          <td class="red" style="font-weight: 600;">${formatCurrency(sale.totalAmount)}</td>
          <td>${formatDate(sale.date)}</td>
          <td>
            <button class="btn btn-success btn-mark-paid" data-id="${sale.id}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Mark as Paid
            </button>
          </td>
        </tr>
      `).join('');
      noUnpaid.classList.add('hidden');

      // Add event listeners for mark as paid buttons
      document.querySelectorAll('.btn-mark-paid').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const saleId = e.currentTarget.dataset.id;
          markAsPaid(saleId);
        });
      });
    } else {
      unpaidBody.innerHTML = '';
      noUnpaid.classList.remove('hidden');
    }
  } catch (error) {
    showError('unpaid-error', error.message);
  }
}

async function markAsPaid(saleId) {
  try {
    await apiCall(`/sales/${saleId}/mark-paid`, { method: 'PATCH' });
    showSuccess('unpaid-success', 'Sale marked as paid!');
    loadUnpaidSales();
    loadDashboard();
  } catch (error) {
    showError('unpaid-error', error.message);
  }
}

// Edit Sale Functions
async function loadSaleForEdit(saleId) {
  try {
    const sale = await apiCall(`/sales/${saleId}`);
    document.getElementById('edit-sale-id').value = sale.id;
    document.getElementById('edit-quantity').value = sale.quantity;
    document.getElementById('edit-price-per-unit').value = sale.pricePerUnit;
    document.getElementById('edit-payment-status').value = sale.paymentStatus;
    calculateEditTotal();
    showPage('edit-sale-page');
  } catch (error) {
    showError('sales-error', error.message);
  }
}

function calculateEditTotal() {
  const quantity = parseFloat(document.getElementById('edit-quantity').value) || 0;
  const pricePerUnit = parseFloat(document.getElementById('edit-price-per-unit').value) || 0;
  const total = quantity * pricePerUnit;
  document.getElementById('edit-total-amount').textContent = formatCurrency(total);
}

async function updateSale(saleId, quantity, pricePerUnit, paymentStatus) {
  try {
    const totalAmount = quantity * pricePerUnit;
    await apiCall(`/sales/${saleId}`, {
      method: 'PUT',
      body: JSON.stringify({
        quantity,
        pricePerUnit,
        totalAmount,
        paymentStatus,
      }),
    });
    showSuccess('edit-success', 'Sale updated successfully!');
    setTimeout(() => {
      showPage('view-sales-page');
      loadAllSales();
      loadDashboard();
    }, 1500);
  } catch (error) {
    showError('edit-error', error.message);
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Check auth status on load
  checkAuth();

  // Login Form
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    login(username, password);
  });

  // Logout Button
  document.getElementById('logout-btn').addEventListener('click', logout);

  // Dashboard Navigation
  document.getElementById('btn-record-sale').addEventListener('click', () => {
    showPage('record-sale-page');
  });

  document.getElementById('btn-view-sales').addEventListener('click', () => {
    showPage('view-sales-page');
    loadAllSales();
  });

  document.getElementById('btn-view-unpaid').addEventListener('click', () => {
    showPage('view-unpaid-page');
    loadUnpaidSales();
  });

  // Back Buttons
  document.getElementById('back-from-record').addEventListener('click', () => {
    showPage('dashboard-page');
  });

  document.getElementById('cancel-record').addEventListener('click', () => {
    showPage('dashboard-page');
  });

  document.getElementById('back-from-sales').addEventListener('click', () => {
    showPage('dashboard-page');
  });

  document.getElementById('back-from-unpaid').addEventListener('click', () => {
    showPage('dashboard-page');
  });

  document.getElementById('back-from-edit').addEventListener('click', () => {
    showPage('view-sales-page');
  });

  document.getElementById('cancel-edit').addEventListener('click', () => {
    showPage('view-sales-page');
  });

  // Record Sale Form
  document.getElementById('quantity').addEventListener('input', calculateTotal);
  document.getElementById('price-per-unit').addEventListener('input', calculateTotal);

  document.getElementById('record-sale-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const customerName = document.getElementById('customer-name').value;
    const quantity = parseInt(document.getElementById('quantity').value);
    const pricePerUnit = parseFloat(document.getElementById('price-per-unit').value);
    const paymentStatus = document.getElementById('payment-status').value;
    recordSale(customerName, quantity, pricePerUnit, paymentStatus);
  });

  // Edit Sale Form
  document.getElementById('edit-quantity').addEventListener('input', calculateEditTotal);
  document.getElementById('edit-price-per-unit').addEventListener('input', calculateEditTotal);

  document.getElementById('edit-sale-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const saleId = document.getElementById('edit-sale-id').value;
    const quantity = parseInt(document.getElementById('edit-quantity').value);
    const pricePerUnit = parseFloat(document.getElementById('edit-price-per-unit').value);
    const paymentStatus = document.getElementById('edit-payment-status').value;
    updateSale(saleId, quantity, pricePerUnit, paymentStatus);
  });
});

// Prevent back button after logout
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    checkAuth();
  }
});
