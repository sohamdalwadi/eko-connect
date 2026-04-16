// eko Firmware Flasher
// Flashing handled by esp-web-tools <esp-web-install-button> via manifest.json

// UI elements
const ui = {
    themeBtn: document.getElementById('themeBtn'),
    versionEl: document.getElementById('version'),
    timestampEl: document.getElementById('timestamp'),
    firmwareSizeEl: document.getElementById('firmware-size'),
    firmwareMd5El: document.getElementById('firmware-md5'),
    refreshBtn: document.getElementById('refresh-btn'),
    buildSelect: document.getElementById('build-select'),
    installBtn: document.getElementById('install-btn'),
};

let releaseData = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const isDark = !localStorage.getItem('eko-light-mode');
    if (!isDark) document.body.classList.add('light-mode');
    ui.themeBtn.addEventListener('click', toggleTheme);

    loadLatestVersion();
    ui.refreshBtn.addEventListener('click', loadLatestVersion);
    ui.buildSelect.addEventListener('change', loadLatestVersion);
    initEyeTracking();
});

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('eko-light-mode', document.body.classList.contains('light-mode') ? 'true' : '');
}

// Firmware info
async function loadLatestVersion() {
    try {
        const buildFolder = ui.buildSelect.value;
        ui.refreshBtn.disabled = true;
        ui.versionEl.textContent = 'Loading...';
        ui.timestampEl.textContent = 'Loading...';
        ui.firmwareSizeEl.textContent = 'Loading...';
        ui.firmwareMd5El.textContent = 'Loading...';

        // Update manifest path for esp-web-tools
        ui.installBtn.setAttribute('manifest', `${buildFolder}/manifest.json`);

        const response = await fetch(`${buildFolder}/latest.json`);
        if (!response.ok) {
            // Fallback for local development or if subfolders don't exist yet
            if (response.status === 404) {
                const fallbackResponse = await fetch('latest.json');
                if (fallbackResponse.ok) {
                    const fallbackData = await fallbackResponse.json();
                    displayData(fallbackData);
                    ui.installBtn.setAttribute('manifest', 'manifest.json');
                    return;
                }
            }
            throw new Error(`Failed to fetch latest.json: ${response.status}`);
        }
        const latestJson = await response.json();
        displayData(latestJson);
    } catch (error) {
        console.error('Load version failed:', error);
        ui.versionEl.textContent = '[ERR] Load failed';
    } finally {
        ui.refreshBtn.disabled = false;
    }
}

function displayData(latestJson) {
    releaseData = latestJson;
    ui.versionEl.textContent = latestJson.version || 'Unknown';
    ui.timestampEl.textContent = formatDate(latestJson.timestamp) || 'Unknown';
    if (latestJson.files && latestJson.files['firmware.bin']) {
        const fw = latestJson.files['firmware.bin'];
        ui.firmwareSizeEl.textContent = formatBytes(fw.size);
        ui.firmwareMd5El.textContent = fw.md5.substring(0, 16) + '...';
    }
}

// Helpers
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(isoString) {
    if (!isoString) return null;
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

// Dasai Mochi eye tracking
function initEyeTracking() {
    const faceSvg = document.getElementById('yeti-face');
    if (!faceSvg) return;
    const eyeL = document.getElementById('eye-group-l');
    const eyeR = document.getElementById('eye-group-r');
    if (!eyeL || !eyeR) return;

    // ViewBox dimensions & eye centres (SVG units)
    const VW = 460, VH = 200;
    const eyes = [
        { el: eyeL, cx: 145, cy: 90 },
        { el: eyeR, cx: 315, cy: 90 },
    ];
    // sclera r=32, iris r=17 → max travel = 32 - 17 - 3 = 12 SVG units
    const MAX = 12;

    let raf = null;
    function move(clientX, clientY) {
        const r = faceSvg.getBoundingClientRect();
        if (r.width === 0) return;
        const sx = VW / r.width, sy = VH / r.height;
        eyes.forEach(({ el, cx, cy }) => {
            const dx = (clientX - r.left) * sx - cx;
            const dy = (clientY - r.top)  * sy - cy;
            const d  = Math.sqrt(dx * dx + dy * dy);
            const s  = d > MAX ? MAX / d : 1;
            el.setAttribute('transform', `translate(${(dx*s).toFixed(2)},${(dy*s).toFixed(2)})`);
        });
    }

    document.addEventListener('mousemove', (e) => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => move(e.clientX, e.clientY));
    });
    document.addEventListener('touchmove', (e) => {
        const t = e.touches[0];
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => move(t.clientX, t.clientY));
    }, { passive: true });
}
