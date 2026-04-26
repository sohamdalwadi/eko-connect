// eko dev lab — Script
// Flashing handled by esp-web-tools <esp-web-install-button> via manifest.json

// UI elements
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
    preorderSuccess: document.getElementById('preorder-success')
};

let releaseData = null;
let formSubmitted = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Theme initialization
    const isLight = localStorage.getItem('eko-light-mode') === 'true';
    if (isLight) document.body.classList.add('light-mode');
    ui.themeBtn.addEventListener('click', toggleTheme);

    // Data loading
    loadLatestVersion();
    ui.refreshBtn.addEventListener('click', loadLatestVersion);
    ui.productSelect.addEventListener('change', loadLatestVersion);
    ui.buildSelect.addEventListener('change', loadLatestVersion);

    // Product card interaction — scroll to pre-order instead of firmware
    ui.productCards.forEach(card => {
        card.addEventListener('click', () => {
            const product = card.getAttribute('data-product');
            // Update firmware dropdown
            ui.productSelect.value = product;
            loadLatestVersion();
            // Update pre-order dropdown if it exists
            const preorderProduct = document.getElementById('preorder-product');
            if (preorderProduct) {
                const mapping = {
                    'eko-buddy': 'eko Buddy',
                    'eko-drive': 'eko Drive',
                    'eko-ai': 'eko AI'
                };
                preorderProduct.value = mapping[product] || '';
            }
        });
    });

    // Pre-order form submission
    if (ui.preorderForm) {
        ui.preorderForm.addEventListener('submit', () => {
            formSubmitted = true;
        });
    }
});

// Called when the hidden iframe loads (after form submission)
function onFormSubmit() {
    if (formSubmitted && ui.preorderForm && ui.preorderSuccess) {
        ui.preorderForm.style.display = 'none';
        ui.preorderSuccess.style.display = 'block';
        formSubmitted = false;
    }
}

// Make it global so the iframe onload can call it
window.onFormSubmit = onFormSubmit;

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem('eko-light-mode', isLight);
    
    // Update icon
    const icon = ui.themeBtn.querySelector('.material-icons');
    if (icon) {
        icon.textContent = isLight ? 'light_mode' : 'dark_mode';
    }
}

// Firmware info
async function loadLatestVersion() {
    try {
        const product = ui.productSelect.value;
        const buildType = ui.buildSelect.value;
        const buildFolder = `${product}/${buildType}`;
        
        ui.refreshBtn.disabled = true;
        ui.versionEl.textContent = '...';
        ui.timestampEl.textContent = '...';
        ui.firmwareSizeEl.textContent = '...';
        ui.firmwareMd5El.textContent = '...';

        // Update manifest path for esp-web-tools
        ui.installBtn.setAttribute('manifest', `${buildFolder}/manifest.json`);

        const response = await fetch(`${buildFolder}/latest.json`);
        if (!response.ok) {
            // Fallback for local development
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
        ui.versionEl.textContent = '[ERR]';
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
    return date.toLocaleString();
}
