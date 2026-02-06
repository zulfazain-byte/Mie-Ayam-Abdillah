// enhancements.js - client-side scaffolding for PWA, offline storage, login/roles, printer/payment stubs
// This file is intentionally lightweight and acts as scaffolding for further backend integration.

(() => {
    // Utilities
    const log = (...args) => console.log('[enhancements]', ...args);

    // --- Simple Auth (client-side scaffold) ---
    const USERS_KEY = 'pos_users';
    const CURRENT_USER_KEY = 'pos_current_user';

    const defaultUsers = [
        { username: 'admin', role: 'admin' },
        { username: 'kasir', role: 'cashier' }
    ];

    function getUsers() {
        try { return JSON.parse(localStorage.getItem(USERS_KEY)) || defaultUsers; } catch(e) { return defaultUsers; }
    }
    function saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }

    function performLogin() {
        const username = document.getElementById('login-username').value.trim();
        const role = document.getElementById('login-role').value;
        if (!username) { window.alert('Masukkan nama pengguna'); return; }
        const users = getUsers();
        let user = users.find(u => u.username === username);
        if (!user) { user = { username, role }; users.push(user); saveUsers(users); }
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        closeLoginModal();
        showToast && showToast(`Masuk sebagai ${user.username} (${user.role})`, 'success');
        applyRoleToUI(user.role);
    }
    window.performLogin = performLogin;
    window.closeLoginModal = () => document.getElementById('login-modal').classList.add('hidden');
    window.showLoginModal = () => document.getElementById('login-modal').classList.remove('hidden');

    function getCurrentUser() { try { return JSON.parse(localStorage.getItem(CURRENT_USER_KEY)); } catch(e) { return null; } }

    function applyRoleToUI(role) {
        // Example: restrict access to settings & inventory for non-admins
        const settingsButtons = document.querySelectorAll('[onclick*="showSettingsModal"], [onclick*="showInventoryModal"]');
        settingsButtons.forEach(b => {
            if (role !== 'admin') { b.setAttribute('disabled', 'true'); b.classList.add('opacity-50', 'cursor-not-allowed'); } else { b.removeAttribute('disabled'); b.classList.remove('opacity-50', 'cursor-not-allowed'); }
        });
    }

    // Apply role on load
    document.addEventListener('DOMContentLoaded', () => {
        const user = getCurrentUser();
        if (user) applyRoleToUI(user.role);
        else showLoginModal();
    });

    // --- IndexedDB (lightweight wrapper) ---
    const DB_NAME = 'pos-db';
    const DB_VERSION = 1;
    let db = null;
    function openDB() {
        return new Promise((resolve, reject) => {
            if (db) return resolve(db);
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = (e) => {
                const _db = e.target.result;
                if (!_db.objectStoreNames.contains('transactions')) _db.createObjectStore('transactions', { keyPath: 'id' });
                if (!_db.objectStoreNames.contains('menuItems')) _db.createObjectStore('menuItems', { keyPath: 'id' });
                if (!_db.objectStoreNames.contains('customers')) _db.createObjectStore('customers', { keyPath: 'id' });
            };
            req.onsuccess = (e) => { db = e.target.result; resolve(db); };
            req.onerror = (e) => reject(e.target.error);
        });
    }

    async function saveToStore(storeName, item) { const _db = await openDB(); return new Promise((res, rej) => { const tx = _db.transaction([storeName], 'readwrite'); tx.objectStore(storeName).put(item); tx.oncomplete = () => res(true); tx.onerror = (e) => rej(e); }); }
    async function getAllFromStore(storeName) { const _db = await openDB(); return new Promise((res, rej) => { const tx = _db.transaction([storeName], 'readonly'); const req = tx.objectStore(storeName).getAll(); req.onsuccess = () => res(req.result); req.onerror = (e) => rej(e); }); }

    window.posDB = { openDB, saveToStore, getAllFromStore };
    // --- Low stock alert ---
    async function checkLowStock(threshold = 5) {
        try {
            const menu = await (window.menuItems ? Promise.resolve(window.menuItems) : window.posDB.getAllFromStore('menuItems'));
            if (!menu) return;
            const low = menu.filter(i => (i.stock || 0) <= threshold);
            if (low.length > 0) {
                low.forEach(it => showToast && showToast(`Stok rendah: ${it.name} (${it.stock})`, 'error'));
            }
        } catch (e) { console.warn('checkLowStock err', e); }
    }
    setInterval(checkLowStock, 1000 * 60 * 5); // check every 5 minutes

    // --- Loyalty / Rewards scaffolding ---
    function addLoyaltyPoints(customerId, points) {
        const customers = window.customers || [];
        const c = customers.find(x => x.id === customerId);
        if (c) { c.points = (c.points || 0) + points; saveData && saveData(); showToast && showToast(`${c.name} mendapatkan ${points} poin. Total: ${c.points}`, 'success'); }
    }
    window.addLoyaltyPoints = addLoyaltyPoints;

    // --- Printer / ESC-POS stub ---
    async function printThermal(htmlContent) {
        // Try WebUSB / WebSerial in real implementation. Here is a graceful fallback.
        try {
            if (navigator.usb) {
                // stub: real implementation would enumerate devices and send ESC/POS commands
                log('WebUSB available - implement device pairing for receipts');
            }
        } catch (e) { log('printThermal error', e); }
        // Fallback - open print preview
        const w = window.open('', 'PRINT', 'height=600,width=400');
        w.document.write('<html><head><title>Nota</title></head><body>' + htmlContent + '</body></html>');
        w.document.close();
        w.focus();
        w.print();
        w.close();
    }
    window.printThermal = printThermal;

    // --- Payment gateway stub (simulate) ---
    function processExternalPayment(method, amount) {
        return new Promise((resolve) => {
            log(`Simulating external payment ${method} for ${amount}`);
            setTimeout(() => resolve({ success: true, method, amount }), 1500);
        });
    }
    window.processExternalPayment = processExternalPayment;

    // --- Offline sync stub ---
    async function syncWithServer() {
        // Placeholder: gather local changes and POST to server endpoint
        log('Syncing with server (stub)');
        // Example: push transactions to server and get confirmation
    }
    window.syncWithServer = syncWithServer;

    // --- Export improved (includes IndexedDB stores) ---
    async function exportFullData() {
        const menu = await getAllFromStore('menuItems').catch(() => []);
        const transactions = await getAllFromStore('transactions').catch(() => []);
        const customers = await getAllFromStore('customers').catch(() => []);
        const payload = { menu, transactions, customers, settings: window.settings || {} };
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
        const link = document.createElement('a');
        link.setAttribute('href', dataUri);
        link.setAttribute('download', `pos_backup_${new Date().toISOString().slice(0,10)}.json`);
        link.click();
        showToast && showToast('Data diekspor (termasuk DB lokal)', 'success');
    }
    window.exportFullData = exportFullData;

    // --- PWA: service worker registration & install prompt ---
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        log('beforeinstallprompt captured');
    });

    async function registerSW() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/sw.js');
                log('Service Worker registered');
            } catch (e) { log('SW register failed', e); }
        }
    }
    registerSW();

    // --- keyboard shortcuts ---
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') { showLoginModal(); }
    });

    // --- expose utilities for debugging ---
    window.posEnhancements = { performLogin, getCurrentUser, openDB, saveToStore, getAllFromStore, checkLowStock, addLoyaltyPoints, printThermal, processExternalPayment, syncWithServer, exportFullData };

})();
