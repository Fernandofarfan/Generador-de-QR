document.addEventListener('DOMContentLoaded', () => {
    // UI References
    const tabs = document.querySelectorAll('.tab-btn');
    const forms = document.querySelectorAll('.form-section');
    
    const inputs = {
        url: document.getElementById('urlInput'),
        ssid: document.getElementById('wifiSSID'),
        pass: document.getElementById('wifiPass'),
        wifiType: document.getElementById('wifiType'),
        text: document.getElementById('textInput'),
        vFn: document.getElementById('vcardName'),
        vLn: document.getElementById('vcardLastname'),
        vTel: document.getElementById('vcardPhone'),
        vEmail: document.getElementById('vcardEmail')
    };

    const dotsSelect = document.getElementById('dotsType');
    const cornersSelect = document.getElementById('cornersType');
    const dotsColor = document.getElementById('dotsColor');
    const bgColor = document.getElementById('bgColor');
    const logoInput = document.getElementById('logoInput');
    
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const formatSelect = document.getElementById('downloadFormat');
    const darkModeBtn = document.getElementById('darkModeToggle');
    
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistory');

    let currentType = 'url';
    let currentLogo = null;
    let qrCode = null;
    let html5QrCode = null;
    let isScanning = false;
    let deferredPrompt;

    // PWA Install
    const installBtn = document.getElementById('installApp');
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.style.display = 'block';
    });

    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                deferredPrompt = null;
            }
            installBtn.style.display = 'none';
        }
    });

    // Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(console.error);
    }

    // Dark Mode
    darkModeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        darkModeBtn.textContent = isDark ? '☀' : '🌙';
        localStorage.setItem('darkMode', isDark);
    });

    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        darkModeBtn.textContent = '☀';
    }

    // Tabs
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const target = tab.dataset.target;
            currentType = target;
            
            forms.forEach(f => f.classList.remove('active'));
            const activeForm = document.getElementById(`form-${target}`);
            if (activeForm) activeForm.classList.add('active');
            
            const designSection = document.getElementById('designSection');
            if (designSection) {
                designSection.style.display = target === 'scan' ? 'none' : 'block';
            }

            if (target === 'scan') {
                startScanner();
            } else {
                stopScanner();
            }
        });
    });

    // Scanner
    function startScanner() {
        if (isScanning) return;
        
        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("reader");
        }
        
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
        .then(() => {
            isScanning = true;
        })
        .catch(err => {
            isScanning = false;
            let msg = "Error al iniciar cámara.";
            if (err && err.toString().includes("NotFound")) {
                msg = "📷 No se encontró ninguna cámara.";
            } else if (err && err.toString().includes("NotAllowed")) {
                msg = "🚫 Permiso denegado.";
            }
            const resEl = document.getElementById('scanResult');
            if(resEl) resEl.innerText = msg;
        });
    }

    function stopScanner() {
        if (html5QrCode && isScanning) {
            html5QrCode.stop().then(() => {
                html5QrCode.clear();
                isScanning = false;
            }).catch(console.error);
        }
    }

    function onScanSuccess(decodedText) {
        const resEl = document.getElementById('scanResult');
        if(resEl) resEl.innerText = decodedText;
        
        const copyBtn = document.getElementById('copyScanBtn');
        if (copyBtn) {
            copyBtn.style.display = 'inline-block';
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(decodedText);
                alert("¡Copiado!");
            };
        }
    }

    // QR Initialization
    qrCode = new QRCodeStyling({
        width: 300,
        height: 300,
        type: "svg",
        data: "https://ejemplo.com",
        image: "",
        dotsOptions: { color: "#000000", type: "square" },
        cornersSquareOptions: { type: "square" },
        backgroundOptions: { color: "#ffffff" },
        imageOptions: { crossOrigin: "anonymous", margin: 10 }
    });
    qrCode.append(document.getElementById("qrcode"));

    // Logo
    logoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => { currentLogo = reader.result; };
            reader.readAsDataURL(file);
        } else {
            currentLogo = null;
        }
    });

    // Helper: Data Builder
    function getQRData() {
        switch(currentType) {
            case 'url':
                return inputs.url.value.trim();
            case 'text':
                return inputs.text.value.trim();
            case 'wifi':
                const ssid = inputs.ssid.value.trim();
                const pass = inputs.pass.value.trim();
                const type = inputs.wifiType.value;
                if(!ssid) return null;
                return `WIFI:S:${ssid};T:${type};P:${pass};;`;
            case 'vcard':
                const n = inputs.vFn.value.trim();
                const ln = inputs.vLn.value.trim();
                const tel = inputs.vTel.value.trim();
                const email = inputs.vEmail.value.trim();
                if(!n && !ln) return null;
                return `BEGIN:VCARD\nVERSION:3.0\nN:${ln};${n};;;\nFN:${n} ${ln}\nTEL;TYPE=CELL:${tel}\nEMAIL:${email}\nEND:VCARD`;
            default:
                return null;
        }
    }

    // Generate/Update
    function updateQR() {
        const data = getQRData();
        
        if (!data) {
            alert("Por favor completa los campos necesarios.");
            return;
        }

        qrCode.update({
            data: data,
            image: currentLogo,
            dotsOptions: {
                color: dotsColor.value,
                type: dotsSelect.value
            },
            cornersSquareOptions: {
                type: cornersSelect.value
            },
            backgroundOptions: {
                color: bgColor.value
            }
        });

        downloadBtn.disabled = false;
        saveToHistory(data);
    }

    downloadBtn.addEventListener('click', () => {
        qrCode.download({ 
            name: `qr-${currentType}-${Date.now()}`, 
            extension: formatSelect.value 
        });
    });

    // History
    function saveToHistory(data) {
        let history = JSON.parse(localStorage.getItem('qrHistory') || '[]');
        const display = data.length > 40 ? data.substring(0, 40) + '...' : data;
        
        // Avoid dupes at top
        if (history.length > 0 && history[0].data === data) return;

        history.unshift({ data: data, display: display, type: currentType });
        if (history.length > 10) history.pop();

        localStorage.setItem('qrHistory', JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        let history = JSON.parse(localStorage.getItem('qrHistory') || '[]');
        historyList.innerHTML = '';

        history.forEach(item => {
            const li = document.createElement('li');
            li.className = 'history-item';
            const icon = item.type === 'wifi' ? '📶' : item.type === 'vcard' ? '👤' : '🔗';
            li.innerHTML = `<strong>${icon}</strong> ${item.display}`;
            
            li.addEventListener('click', () => {
                qrCode.update({ data: item.data });
            });
            historyList.appendChild(li);
        });
    }

    clearHistoryBtn.addEventListener('click', () => {
        localStorage.removeItem('qrHistory');
        renderHistory();
    });

    generateBtn.addEventListener('click', updateQR);
    
    // Initial Render
    renderHistory();
});