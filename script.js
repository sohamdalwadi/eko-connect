// eko dev labs • Web Flasher & Simulator Logic
// Handles ESP Web Tools manifest routing & Interactive OLED Simulator

const ui = {
    themeBtn: document.getElementById('themeBtn'),
    versionEl: document.getElementById('version'),
    timestampEl: document.getElementById('timestamp'),
    firmwareSizeEl: document.getElementById('firmware-size'),
    firmwareMd5El: document.getElementById('firmware-md5'),
    refreshBtn: document.getElementById('refresh-btn'),
    productSelect: document.getElementById('product-select'),
    buildSelect: document.getElementById('build-select'),
    installBtn: document.getElementById('install-btn'),
    productCards: document.querySelectorAll('.product-card'),
    preorderForm: document.getElementById('preorder-form'),
    preorderSuccess: document.getElementById('preorder-success'),
    simModeBtns: document.querySelectorAll('.sim-mode-btn'),
    simSceneGraphic: document.getElementById('simSceneGraphic'),
    simTimeText: document.getElementById('simTimeText'),
    simModeTag: document.getElementById('simModeTag')
};

let releaseData = null;
let formSubmitted = false;

// Simulator Modes Configuration
const SIM_MODES = {
    mario: {
        icon: '🍄',
        tag: 'SUPER MARIO CLOCK',
        update: () => {
            const now = new Date();
            const h = String(now.getHours() % 12 || 12).padStart(2, '0');
            const m = String(now.getMinutes()).padStart(2, '0');
            const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
            return `${h}:${m}<span class="sim-sec">${ampm}</span>`;
        }
    },
    pacman: {
        icon: '🟡 ᗧ • • • 👻',
        tag: 'PAC-MAN PELLET CHOMP',
        update: () => {
            const now = new Date();
            const h = String(now.getHours()).padStart(2, '0');
            const m = String(now.getMinutes()).padStart(2, '0');
            const s = String(now.getSeconds()).padStart(2, '0');
            return `${h}:${m}<span class="sim-sec">:${s}</span>`;
        }
    },
    invaders: {
        icon: '👾 👾 👾',
        tag: 'SPACE INVADERS BATTLE',
        update: () => {
            const now = new Date();
            const h = String(now.getHours() % 12 || 12).padStart(2, '0');
            const m = String(now.getMinutes()).padStart(2, '0');
            return `${h}:${m}<span class="sim-sec">DEFEND</span>`;
        }
    },
    sprite: {
        icon: '🚀 💥',
        tag: 'CUSTOM SPRITE ALERT',
        update: () => 'LAUNCH!<span class="sim-sec">100%</span>'
    },
    weather: {
        icon: '🌦️',
        tag: 'LIVE WEATHER RADAR',
        update: () => '26°C<span class="sim-sec">SUNNY</span>'
    }
};

let currentSimKey = 'mario';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Theme setup
    const isLight = localStorage.getItem('eko-light-mode') === 'true';
    if (isLight) document.body.classList.add('light-mode');
    if (ui.themeBtn) ui.themeBtn.addEventListener('click', toggleTheme);

    // Data loading
    loadLatestVersion();
    if (ui.refreshBtn) ui.refreshBtn.addEventListener('click', loadLatestVersion);
    if (ui.productSelect) ui.productSelect.addEventListener('change', loadLatestVersion);
    if (ui.buildSelect) ui.buildSelect.addEventListener('change', loadLatestVersion);

    // Simulator button handlers
    ui.simModeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            ui.simModeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mode = btn.getAttribute('data-sim');
            if (SIM_MODES[mode]) {
                currentSimKey = mode;
                renderSimulator();
            }
        });
    });

    // Start Simulator Clock Tick
    setInterval(renderSimulator, 1000);
    renderSimulator();

    // Product Card quick select
    ui.productCards.forEach(card => {
        card.addEventListener('click', () => {
            const product = card.getAttribute('data-product');
            if (ui.productSelect && (product === 'eko-buddy' || product === 'eko-drive')) {
                ui.productSelect.value = product;
                loadLatestVersion();
            }
        });
    });

    // Pre-order form submit
    if (ui.preorderForm) {
        ui.preorderForm.addEventListener('submit', () => {
            formSubmitted = true;
        });
    }
});

function renderSimulator() {
    const config = SIM_MODES[currentSimKey];
    if (!config) return;
    if (ui.simSceneGraphic) ui.simSceneGraphic.textContent = config.icon;
    if (ui.simModeTag) ui.simModeTag.textContent = config.tag;
    if (ui.simTimeText) ui.simTimeText.innerHTML = config.update();
}

function onFormSubmit() {
    if (formSubmitted && ui.preorderForm && ui.preorderSuccess) {
        ui.preorderForm.style.display = 'none';
        ui.preorderSuccess.style.display = 'block';
        formSubmitted = false;
    }
}
window.onFormSubmit = onFormSubmit;

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem('eko-light-mode', isLight);
    const icon = ui.themeBtn.querySelector('.material-icons');
    if (icon) {
        icon.textContent = isLight ? 'light_mode' : 'dark_mode';
    }
}

// Firmware Manifest Loader
async function loadLatestVersion() {
    try {
        const product = ui.productSelect ? ui.productSelect.value : 'eko-buddy';
        const buildType = ui.buildSelect ? ui.buildSelect.value : 'release';
        const buildFolder = `${product}/${buildType}`;
        
        if (ui.refreshBtn) ui.refreshBtn.disabled = true;
        if (ui.versionEl) ui.versionEl.textContent = 'Checking...';
        if (ui.timestampEl) ui.timestampEl.textContent = '...';
        if (ui.firmwareSizeEl) ui.firmwareSizeEl.textContent = '...';
        if (ui.firmwareMd5El) ui.firmwareMd5El.textContent = '...';

        if (ui.installBtn) {
            ui.installBtn.setAttribute('manifest', `${buildFolder}/manifest.json`);
        }

        const response = await fetch(`${buildFolder}/latest.json`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const latestJson = await response.json();
        displayData(latestJson);
    } catch (error) {
        console.warn('Could not fetch remote latest.json, falling back:', error);
        if (ui.versionEl) ui.versionEl.textContent = 'v2.4.0 (Live)';
        if (ui.timestampEl) ui.timestampEl.textContent = 'Ready to Flash';
        if (ui.firmwareSizeEl) ui.firmwareSizeEl.textContent = '1.77 MB';
        if (ui.firmwareMd5El) ui.firmwareMd5El.textContent = '174c930b510c...';
    } finally {
        if (ui.refreshBtn) ui.refreshBtn.disabled = false;
    }
}

function displayData(latestJson) {
    releaseData = latestJson;
    if (ui.versionEl) ui.versionEl.textContent = latestJson.version || 'v2.4.0';
    if (ui.timestampEl) ui.timestampEl.textContent = formatDate(latestJson.timestamp) || 'Recent Build';
    if (latestJson.files && latestJson.files['firmware.bin']) {
        const fw = latestJson.files['firmware.bin'];
        if (ui.firmwareSizeEl) ui.firmwareSizeEl.textContent = formatBytes(fw.size);
        if (ui.firmwareMd5El) ui.firmwareMd5El.textContent = fw.md5.substring(0, 16) + '...';
    }
}

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(isoString) {
    if (!isoString) return null;
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
