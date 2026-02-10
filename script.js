document.addEventListener('DOMContentLoaded', () => {
    // --- Referencias UI ---
    // Tabs & Forms
    const tabs = document.querySelectorAll('.tab-btn');
    const forms = document.querySelectorAll('.form-section');
    
    // Inputs
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

    // Estilos
    const dotsSelect = document.getElementById('dotsType');
    const cornersSelect = document.getElementById('cornersType');
    const dotsColor = document.getElementById('dotsColor');
    const bgColor = document.getElementById('bgColor');
    const logoInput = document.getElementById('logoInput');
    
    // Botones
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const formatSelect = document.getElementById('downloadFormat');
    const darkModeBtn = document.getElementById('darkModeToggle');
    
    // Historial
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistory');

    // Estado local
    let currentType = 'url';
    let currentLogo = null;
    let qrCode = null;
    let html5QrCode = null;
    let deferredPrompt;

    // --- 0. PWA Install Logic ---
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

    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('SW Registrado'));
    }

    // --- 1. Dark Mode ---
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

    // --- 2. Sistema de Pestañas ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Activar UI visual
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Mostrar formulario correspondiente
            const target = tab.dataset.target;
            currentType = target;
            
            forms.forEach(f => f.classList.remove('active'));
            document.getElementById(`form-${target}`).classList.add('active');
            
            // Toggle Design Section
            const designSection = document.getElementById('designSection');
            if (designSection) {
                designSection.style.display = target === 'scan' ? 'none' : 'block';
            }

            // Manejar Scanner
            if (target === 'scan') {
                startScanner();
            } else {
                stopScanner();
            }
        });
    });

    // --- 2.5 Logic Scanner ---
    function startScanner() {
        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("reader");
        }
        
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
        .catch(err => {
            document.getElementById('scanResult').innerText = "Error al iniciar cámara: " + err;
        });
    }

    function stopScanner() {
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().then(() => {
                html5QrCode.clear();
            }).catch(err => console.error(err));
        }
    }

    function onScanSuccess(decodedText, decodedResult) {
        document.getElementById('scanResult').innerText = decodedText;
        const copyBtn = document.getElementById('copyScanBtn');
        copyBtn.style.display = 'inline-block';
        
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(decodedText);
            alert("¡Copiado al portapapeles!");
        };
        
        // Opcional: Detener al escanear
        // stopScanner(); 
    }

    // --- 3. Inicializar QR ---
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

    // --- 4. Manejo de Logo ---
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

    // --- 5. Construcción de Datos ---
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
                // Formato simple VCard 3.0
                return `BEGIN:VCARD\nVERSION:3.0\nN:${ln};${n};;;\nFN:${n} ${ln}\nTEL;TYPE=CELL:${tel}\nEMAIL:${email}\nEND:VCARD`;
            default:
                return null;
        }
    }

    // --- 6. Generar QR ---
    function updateQR() {
        const data = getQRData();
        
        if (!data) {
            alert("Por favor completa los campos necesarios para este tipo de QR.");
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

    // --- 7. Descargar ---
    downloadBtn.addEventListener('click', () => {
        const format = formatSelect.value;
        qrCode.download({ 
            name: `qr-${currentType}-${Date.now()}`, 
            extension: format 
        });
    });

    // --- 8. Historial ---
    function saveToHistory(data) {
        let history = JSON.parse(localStorage.getItem('qrHistoryV3') || '[]');
        
        // Truncar texto largo para visualización
        const display = data.length > 50 ? data.substring(0, 50) + '...' : data;
        
        if (history.length > 0 && history[0].data === data) return;

        history.unshift({ data: data, display: display, type: currentType });
        if (history.length > 10) history.pop(); // Guardar ultimos 10

        localStorage.setItem('qrHistoryV3', JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        let history = JSON.parse(localStorage.getItem('qrHistoryV3') || '[]');
        historyList.innerHTML = '';

        history.forEach(item => {
            const li = document.createElement('li');
            li.className = 'history-item';
            // Icono simple según tipo
            const icon = item.type === 'wifi' ? '📶' : item.type === 'vcard' ? '👤' : '🔗';
            li.innerHTML = `<strong>${icon}</strong> ${item.display}`;
            
            li.addEventListener('click', () => {
                alert("Nota: El historial solo muestra los datos crudos. Para editar, por favor ingresa los datos de nuevo.");
            });
            historyList.appendChild(li);
        });
    }

    clearHistoryBtn.addEventListener('click', () => {
        localStorage.removeItem('qrHistoryV3');
        renderHistory();
    });

    // Event Listeners Globales
    generateBtn.addEventListener('click', updateQR);
    
    // Init Hooks
    renderHistory();
});