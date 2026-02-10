document.addEventListener('DOMContentLoaded', () => {
    // --- UI References ---
    const tabs = document.querySelectorAll('.tab-btn');
    const forms = document.querySelectorAll('.form-section');
    
    // Inputs Map
    const inputs = {
        url: document.getElementById('urlInput'),
        ssid: document.getElementById('wifiSSID'),
        pass: document.getElementById('wifiPass'),
        wifiType: document.getElementById('wifiType'),
        text: document.getElementById('textInput'),
        vFn: document.getElementById('vcardName'),
        vLn: document.getElementById('vcardLastname'),
        vTel: document.getElementById('vcardPhone'),
        vEmail: document.getElementById('vcardEmail'),
        waPhone: document.getElementById('waPhone'),
        waMessage: document.getElementById('waMessage'),
        emailTo: document.getElementById('emailTo'),
        emailSub: document.getElementById('emailSub'),
        emailBody: document.getElementById('emailBody'),
        eventTitle: document.getElementById('eventTitle'),
        eventLoc: document.getElementById('eventLoc'),
        eventStart: document.getElementById('eventStart'),
        eventEnd: document.getElementById('eventEnd'),
        bulk: document.getElementById('bulkInput')
    };

    // Design Inputs
    const dotsSelect = document.getElementById('dotsType');
    const cornersSelect = document.getElementById('cornersType');
    const dotsColor = document.getElementById('dotsColor');
    const bgColor = document.getElementById('bgColor');
    const errorLevel = document.getElementById('errorLevel');
    const logoInput = document.getElementById('logoInput');
    const logoSize = document.getElementById('logoSize');
    const logoMargin = document.getElementById('logoMargin');

    // Gradient
    const useGradient = document.getElementById('useGradient');
    const gradientSection = document.getElementById('gradientSection');
    const gradientType = document.getElementById('gradientType');
    const gradientColor2 = document.getElementById('gradientColor2');
    const gradientRotation = document.getElementById('gradientRotation');
    
    // Buttons & Toggles
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const shareBtn = document.getElementById('shareBtn');
    const formatSelect = document.getElementById('downloadFormat');
    const darkModeBtn = document.getElementById('darkModeToggle');
    const autoGenToggle = document.getElementById('autoGenToggle');
    const langToggle = document.getElementById('langToggle');
    
    // Scanner
    const flashBtn = document.getElementById('flashBtn');
    const scanTabBtn = document.querySelector('[data-target="scan"]');
    const fileScanBtn = document.getElementById('fileScanInput');
    const scanResult = document.getElementById('scanResult');

    // Lists
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistory');
    const presetsList = document.getElementById('presetsList');
    const savePresetBtn = document.getElementById('savePresetBtn');
    
    // Toast
    const toast = document.getElementById('toast');

    // State
    let currentType = 'url';
    let currentLogo = null;
    let qrCode = null;
    let html5QrCode = null; // Scanner instance
    let cameraOn = false;
    let deferredPrompt;
    let currentLang = 'es';

    // --- Helpers ---
    function showToast(msg) {
        toast.innerText = msg;
        toast.className = "toast show";
        setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
    }

    // --- Initialization ---

    // QR Instance
    qrCode = new QRCodeStyling({
        width: 300,
        height: 300,
        type: "svg",
        data: "https://ejemplo.com",
        image: "",
        dotsOptions: { color: "#000000", type: "square" },
        cornersSquareOptions: { type: "square" },
        backgroundOptions: { color: "#ffffff" },
        qrOptions: { errorCorrectionLevel: 'M' },
        imageOptions: { crossOrigin: "anonymous", margin: 10 }
    });
    qrCode.append(document.getElementById("qrcode"));

    // Function to get data string based on current type
    function getQRData() {
        switch(currentType) {
            case 'url': return inputs.url.value.trim();
            case 'text': return inputs.text.value.trim();
            case 'wifi':
                const ssid = inputs.ssid.value.trim();
                const pass = inputs.pass.value.trim();
                if(!ssid) return null;
                return `WIFI:S:${ssid};T:${inputs.wifiType.value};P:${pass};;`;
            case 'vcard':
                const n = inputs.vFn.value.trim();
                const ln = inputs.vLn.value.trim();
                if(!n && !ln) return null;
                return `BEGIN:VCARD\nVERSION:3.0\nN:${ln};${n};;;\nFN:${n} ${ln}\nTEL;TYPE=CELL:${inputs.vTel.value}\nEMAIL:${inputs.vEmail.value}\nEND:VCARD`;
            case 'whatsapp':
                const phone = inputs.waPhone.value.trim();
                if(!phone) return null;
                return `https://wa.me/${phone}?text=${encodeURIComponent(inputs.waMessage.value)}`;
            case 'email':
                const to = inputs.emailTo.value.trim();
                if(!to) return null;
                return `mailto:${to}?subject=${encodeURIComponent(inputs.emailSub.value)}&body=${encodeURIComponent(inputs.emailBody.value)}`;
            case 'event':
                const title = inputs.eventTitle.value.trim();
                if(!title) return null;
                const start = inputs.eventStart.value.replace(/[-:]/g, "") + "00";
                const end = inputs.eventEnd.value.replace(/[-:]/g, "") + "00";
                return `BEGIN:VEVENT\nSUMMARY:${title}\nLOCATION:${inputs.eventLoc.value}\nDTSTART:${start}\nDTEND:${end}\nEND:VEVENT`;
            case 'bulk':
                const lines = inputs.bulk.value.trim().split('\n');
                return lines.length > 0 && lines[0] !== "" ? lines : null;
            default: return null;
        }
    }

    // Core Update Function
    async function updateQR(fromAuto = false) {
        const data = getQRData();
        
        if (!data) {
            if(!fromAuto) showToast(currentLang === 'es' ? "Completa los campos." : "Fill required fields.");
            // Don't clear QR, just return
            return;
        }

        // Config Options
        const options = {
            image: currentLogo,
            dotsOptions: {
                type: dotsSelect.value,
                color: dotsColor.value
            },
            cornersSquareOptions: { type: cornersSelect.value },
            backgroundOptions: { color: bgColor.value },
            qrOptions: { errorCorrectionLevel: errorLevel.value },
            imageOptions: { 
                crossOrigin: "anonymous", 
                margin: parseInt(logoMargin.value),
                imageSize: parseFloat(logoSize.value)
            }
        };

        // Gradient logic
        if(useGradient.checked) {
            options.dotsOptions.gradient = {
                type: gradientType.value,
                rotation: parseInt(gradientRotation.value) * (Math.PI / 180),
                colorStops: [
                    { offset: 0, color: dotsColor.value },
                    { offset: 1, color: gradientColor2.value }
                ]
            };
        }

        // BULK DOWNLOAD SHORTCUT
        if (currentType === 'bulk') {
            if (fromAuto) return; // Don't zip on type
            
            showToast("⏳ Generando ZIP...");
            const zip = new JSZip();
            const folder = zip.folder("v5-qrs");
            
            for (let i = 0; i < data.length; i++) {
                const text = data[i].trim();
                if(!text) continue;
                // Update internal state without drawing to DOM to speed up? 
                // Creating new instance is safer for async loops
                const tempQR = new QRCodeStyling({ ...options, data: text, width: 500, height: 500 });
                const blob = await tempQR.getRawData('png');
                folder.file(`qr-${i+1}.png`, blob);
            }
            
            const content = await zip.generateAsync({type:"blob"});
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = "qrs-bulk.zip";
            link.click();
            showToast("✅ ZIP Descargado");
            return;
        }

        // Single Update
        qrCode.update({ ...options, data: data });

        downloadBtn.disabled = false;
        shareBtn.disabled = false;
        
        if(!fromAuto && data) saveToHistory(data);
    }

    // --- Scanner Logic ---
    function startScanner() {
        html5QrCode = new Html5Qrcode("reader");
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                scanResult.innerHTML = `Detectado: <a href="${decodedText}" target="_blank">${decodedText}</a>`;
                showToast("✅ QR Detectado");
                // play beep
                // new Audio('beep.mp3').play().catch(()=>{}); 
            },
            () => {}
        ).then(() => {
            cameraOn = true;
            flashBtn.classList.remove("hidden");
        }).catch(err => {
            scanResult.innerText = "Error acceso cámara: " + err;
        });
    }

    function stopScanner() {
        if (html5QrCode && cameraOn) {
            html5QrCode.stop().then(() => {
                cameraOn = false;
                html5QrCode.clear();
                flashBtn.classList.add("hidden");
            }).catch(console.error);
        }
    }

    // Flashlight
    let isFlashOn = false;
    flashBtn.addEventListener('click', () => {
        if(!html5QrCode || !cameraOn) return;
        isFlashOn = !isFlashOn;
        html5QrCode.applyVideoConstraints({
            advanced: [{ torch: isFlashOn }]
        }).then(() => {
            flashBtn.innerText = isFlashOn ? "🔦 OFF" : "🔦 ON";
        });
    });

    // --- Event Listeners ---
    
    // Tabs
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            forms.forEach(f => f.classList.remove('active'));
            const target = tab.dataset.target;
            currentType = target;
            
            const activeForm = document.getElementById(`form-${target}`);
            if(activeForm) activeForm.classList.add('active');

            // Toggle Camera
            if (target === 'scan') {
                document.getElementById('generator-section').classList.add('hidden');
                document.getElementById('scanner-section').classList.remove('hidden');
                startScanner();
            } else {
                document.getElementById('generator-section').classList.remove('hidden');
                document.getElementById('scanner-section').classList.add('hidden');
                stopScanner();
            }
        });
    });

    generateBtn.addEventListener('click', () => updateQR(false));

    downloadBtn.addEventListener('click', () => {
        if(currentType === 'bulk') return; 
        qrCode.download({ 
            name: `qr-${currentType}-${Date.now()}`, 
            extension: formatSelect.value 
        });
    });

    shareBtn.addEventListener('click', async () => {
        if (!navigator.share) { showToast("No soportado"); return; }
        try {
            const blob = await qrCode.getRawData('png');
            const file = new File([blob], "qr.png", { type: "image/png" });
            await navigator.share({
                title: 'QR Code',
                text: 'Creado con QR Gen',
                files: [file]
            });
        } catch (e) { console.log(e); }
    });

    // Auto Gen
    const triggerInputs = document.querySelectorAll('input, select, textarea');
    triggerInputs.forEach(el => {
        // Exclude specific inputs
        if(el.id === 'downloadFormat' || el.id === 'logoInput' || el.type === 'file') return;
        el.addEventListener('input', () => {
            if(autoGenToggle.checked) updateQR(true);
        });
    });

    // Logo
    logoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                currentLogo = reader.result;
                updateQR(true);
            };
            reader.readAsDataURL(file);
        } else {
            currentLogo = null;
            updateQR(true);
        }
    });

    // Presets Logic
    function loadPresets() {
        const presets = JSON.parse(localStorage.getItem('qrPresets') || '{}');
        presetsList.innerHTML = '';
        Object.keys(presets).forEach(key => {
            const btn = document.createElement('button');
            btn.className = 'tab-btn';
            btn.style.fontSize = '0.8em';
            btn.innerText = key;
            btn.onclick = () => applyPreset(presets[key]);
            btn.oncontextmenu = (e) => {
                e.preventDefault();
                if(confirm("¿Borrar preset?")) {
                    delete presets[key];
                    localStorage.setItem('qrPresets', JSON.stringify(presets));
                    loadPresets();
                }
            };
            presetsList.appendChild(btn);
        });
    }

    savePresetBtn.addEventListener('click', () => {
        const name = prompt("Nombre del estilo:");
        if(!name) return;
        const preset = {
            dotsType: dotsSelect.value, dotsColor: dotsColor.value,
            bgColor: bgColor.value, cornersType: cornersSelect.value,
            useGradient: useGradient.checked, gradientType: gradientType.value,
            gradientColor2: gradientColor2.value,
            logoMargin: logoMargin.value, logoSize: logoSize.value
        };
        const presets = JSON.parse(localStorage.getItem('qrPresets') || '{}');
        presets[name] = preset;
        localStorage.setItem('qrPresets', JSON.stringify(presets));
        loadPresets();
        showToast("Preset guardado");
    });

    function applyPreset(p) {
        dotsSelect.value = p.dotsType;
        dotsColor.value = p.dotsColor;
        bgColor.value = p.bgColor;
        cornersSelect.value = p.cornersType;
        useGradient.checked = p.useGradient;
        
        if(p.useGradient) {
            gradientSection.classList.remove('hidden');
            gradientType.value = p.gradientType;
            gradientColor2.value = p.gradientColor2;
        } else {
            gradientSection.classList.add('hidden');
        }
        logoMargin.value = p.logoMargin || 0;
        logoSize.value = p.logoSize || 0.4;
        updateQR(true);
        showToast("Estilo cargado");
    }

    loadPresets();

    // History Logic
    function saveToHistory(data) {
        if(currentType === 'bulk') return;
        let history = JSON.parse(localStorage.getItem('qrHistory') || '[]');
        if (history.length > 0 && history[0].data === data) return;

        const display = data.length > 30 ? data.substring(0, 30) + '...' : data;
        let icon = '🔗';
        if(currentType === 'wifi') icon = '📶';
        else if(currentType === 'vcard') icon = '👤';
        
        history.unshift({ data, display, icon });
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
            li.innerHTML = `<strong>${item.icon}</strong> ${item.display}`;
            li.onclick = () => { qrCode.update({ data: item.data }); };
            historyList.appendChild(li);
        });
    }

    clearHistoryBtn.onclick = () => {
        localStorage.removeItem('qrHistory');
        renderHistory();
    };
    renderHistory();

    // Language Toggle
    const dict = {
        es: { gen: "Generar Code", dl: "⬇ Descargar", sh: "🔗 Compartir" },
        en: { gen: "Generate QR", dl: "⬇ Download", sh: "🔗 Share" }
    };

    langToggle.addEventListener('click', () => {
        currentLang = currentLang === 'es' ? 'en' : 'es';
        langToggle.innerText = currentLang === 'es' ? '🇪🇸' : '🇺🇸';
        generateBtn.innerText = dict[currentLang].gen;
        downloadBtn.innerText = dict[currentLang].dl;
        shareBtn.innerText = dict[currentLang].sh;
        showToast("Language changed");
    });
    
    // Service Worker & PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(console.error);
    }
    const installBtn = document.getElementById('installApp');
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.style.display = 'block';
    });
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt = null;
            installBtn.style.display = 'none';
        }
    });
    
    // Dark Mode
    if(localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        darkModeBtn.textContent = '☀';
    }
    darkModeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        darkModeBtn.textContent = isDark ? '☀' : '🌙';
        localStorage.setItem('darkMode', isDark);
    });

    // Check query params used for initial state if needed
    // End 
});