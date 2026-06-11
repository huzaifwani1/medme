const API_URL = '/api';

function getToken() {
    return localStorage.getItem('token');
}

function setAuth(token, role) {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
}

function logout() {
    localStorage.clear();
    window.location.href = '/';
}

function requireAuth(role) {
    const token = getToken();
    const currentRole = localStorage.getItem('role');
    if (!token) {
        window.location.href = '/';
    }
    if (role && currentRole !== role) {
        window.location.href = '/';
    }
}

async function fetchAPI(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }
    const response = await fetch(API_URL + endpoint, { ...options, headers });
    const data = await response.json();
    if (!response.ok) {
        if (response.status === 401) {
            logout();
        }
        throw new Error(data.error || 'API Error');
    }
    return data;
}
