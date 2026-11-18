/**
 * Central API client & UI Helper for Smart Placement Management System (SPMS)
 */
let API_BASE_URL = "/api";
const apiConfigReady = fetch('/config.json', { cache: 'no-store' })
  .then((response) => response.ok ? response.json() : null)
  .then((config) => {
    if (typeof config?.apiBaseUrl === 'string' && config.apiBaseUrl.trim()) {
      API_BASE_URL = config.apiBaseUrl.replace(/\/+$/, '');
    }
  })
  .catch(() => {});

function apiAssetUrl(url) {
  if (/^https?:\/\//i.test(url)) return url;
  const serverBase = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${serverBase}${url.startsWith('/') ? '' : '/'}${url}`;
}

function getToken() {
  return localStorage.getItem("token");
}

function getUserRole() {
  return localStorage.getItem("role");
}

function getUserId() {
  return localStorage.getItem("userId");
}

function getUserName() {
  return localStorage.getItem("userName") || "User";
}

function logout(reason = '') {
  localStorage.clear();
  const isSubdir = window.location.pathname.includes('/student/') ||
                   window.location.pathname.includes('/company/') ||
                   window.location.pathname.includes('/admin/');
  const target = isSubdir ? "../login.html" : "login.html";
  window.location.href = reason ? `${target}?reason=${encodeURIComponent(reason)}` : target;
}

/**
 * Route protection guard for frontend pages
 */
function requireAuth(allowedRoles = []) {
  const token = getToken();
  const role = getUserRole();

  if (!token || !role) {
    if (document.body) document.body.style.display = 'none';
    logout('unauthorized');
    return false;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    if (document.body) document.body.style.display = 'none';
    if (role === 'admin') window.location.href = '../admin/dashboard.html';
    else if (role === 'company') window.location.href = '../company/drives.html';
    else if (role === 'student') window.location.href = '../student/drives.html';
    else logout('unauthorized');
    return false;
  }

  // Student verification status check
  if (role === 'student' && !window.location.pathname.includes('verification-pending.html')) {
    const vStatus = localStorage.getItem('verification_status');
    if (vStatus && vStatus !== 'approved') {
      if (document.body) document.body.style.display = 'none';
      window.location.href = 'verification-pending.html';
      return false;
    }
  }

  return true;
}

/**
 * Universal API fetch helper
 */
async function apiRequest(path, { method = "GET", body, auth = true, isFormData = false } = {}) {
  await apiConfigReady;
  const headers = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined)
    });

    const data = await response.json().catch(() => ({ success: false, message: 'Invalid JSON response from server' }));

    if (response.status === 401) {
      // Session expired
      localStorage.clear();
      window.location.href = window.location.pathname.includes('/student/') ||
                             window.location.pathname.includes('/company/') ||
                             window.location.pathname.includes('/admin/')
                             ? "../login.html"
                             : "login.html";
      throw new Error("Session expired. Please log in again.");
    }

    if (!response.ok || data.success === false) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (err) {
    throw err;
  }
}

/**
 * Escapes HTML characters to prevent XSS
 */
function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Display alert inside a specified container
 */
function showAlert(message, type = 'danger', containerId = 'alertBox') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const icons = {
    danger: '⚠️',
    success: '✅',
    warning: '⏳',
    info: 'ℹ️'
  };

  container.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show d-flex align-items-center gap-2 py-2 px-3 mb-3 shadow-sm" role="alert">
      <span>${icons[type] || 'ℹ️'}</span>
      <div class="flex-grow-1">${message}</div>
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
}

/**
 * Date and currency formatting utilities
 */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(val) {
  if (val === null || val === undefined || val === '') return '—';
  return `${Number(val).toFixed(2)} LPA`;
}

/**
 * Fetches unread notifications count and updates any badge element with ID 'unreadNotifBadge'
 */
async function updateNotificationBadge() {
  const badge = document.getElementById('unreadNotifBadge');
  if (!badge || !getToken()) return;

  try {
    const res = await apiRequest('/notifications/my');
    const unread = res.data?.unread_count || 0;
    if (unread > 0) {
      badge.textContent = unread > 99 ? '99+' : unread;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  } catch (e) {
    // Ignore silent badge failure
  }
}

// Auto-check notification badge every 30s if authenticated
if (getToken()) {
  setInterval(updateNotificationBadge, 30000);
}
