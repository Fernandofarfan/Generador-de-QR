document.addEventListener('DOMContentLoaded', () => {
    // === UI Elements ===
    const navBtns = document.querySelectorAll('.nav-btn');
    const forms = document.querySelectorAll('.form-section');
    const toast = document.getElementById('toast');
    
    // Inputs Map
    const inputs = {
        url: document.getElementById('urlInput'),
        text: document.getElementById('textInput'),
        ssid: document.getElementById('wifiSSID'),
        pass: document.getElementById('wifiPass'),
        wifiType: document.getElementById('wifiType'),
        vFn: document.getElementById('vcardName'),
        vLn: document.getElementById('vcardLastname'),
        vTel: document.getElementById('vcardPhone'),
        vEmail: document.getElementById('vcardEmail'),
        // Location
        locLat: document.getElementById('locLat'),
        locLon: document.getElementById('locLon'),
        // WA
        waPhone: document.getElementById('waPhone'),
        waMessage: document.getElementById('waMessage'),
        // Email
        emailTo: document.getElementById('emailTo'),
        emailSub: document.getElementById('emailSub'),
        emailBody: document.getElementById('emailBody'),
        // Event
        eventTitle: document.getElementById('eventTitle'),
        eventLoc: document.getElementById('eventLoc'),
        eventStart: document.getElementById('eventStart'),
        eventEnd: document.getElementById('eventEnd'),
        // Social
        socialUser: document.getElementById('socialUser'),
        socialPlat: document.getElementById('socialPlat'),
        // Crypto
        cryptoType: document.getElementById('cryptoType'),
        cryptoAddr: document.getElementById('cryptoAddr'),
        cryptoAmount: document.getElementById('cryptoAmount'),
        // PayPal
        paypalUser: document.getElementById('paypalUser'),
        paypalCurrency: document.getElementById('paypalCurrency'),
        paypalAmount: document.getElementById('paypalAmount'),
        // Bulk
        bulk: document.getElementById('bulkInput'),
        // UTM
        utmSource: document.getElementById('utmSource'),
        utmMedium: document.getElementById('utmMedium'),
        utmCampaign: document.getElementById('utmCampaign')
    };

    // Design
    const logoInput = document.getElementById('logoInput');
    const removeBgToggle = document.getElementById('removeBgToggle');
    const logoSize = document.getElementById('logoSize');
    const logoMargin = document.getElementById('logoMargin');
    
    // Actions
    const generateBtn = document.getElementById('generateBtn');
    const shortenBtn = document.getElementById('shortenBtn');
    const locateMeBtn = document.getElementById('locateMeBtn');

    // === State ===
    let currentType = 'url';
    let currentLogo = null;
    let qrCode = new QRCodeStyling({
        width: 300, height: 300, type: "svg", data: "https://qr-suite.pro",
        dotsOptions: { color: "#000", type: "square" },
        backgroundOptions: { color: "#fff" },
        imageOptions: { crossOrigin: "anonymous", margin: 5 }
    });

    // === Initialization ===
    qrCode.append(document.getElementById("qrcode"));
    checkShareTarget();
    loadPresets();

    // === Navigation ===
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update Active State
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Switch Form
            const target = btn.dataset.target;
            currentType = target;
            forms.forEach(f => f.classList.remove('active'));
            
            const activeForm = document.getElementById(`form-${target}`) || document.getElementById('scanner-section');
            if(activeForm) {
                activeForm.classList.add('active');
                if(target === 'scan') {
                    startScanner();
                } else {
                    stopScanner();
                }
            }
        });
    });

    // === CORE: Data Builder ===
    function getQRData() {
        switch(currentType) {
            case 'url': 
                let url = inputs.url.value.trim();
                if(!url) return null;
                // Add UTM
                const src = inputs.utmSource.value.trim();
                const med = inputs.utmMedium.value.trim();
                const cmp = inputs.utmCampaign.value.trim();
                if(src || med || cmp) {
                    try {
                        const urlObj = new URL(url);
                        if(src) urlObj.searchParams.set('utm_source', src);
                        if(med) urlObj.searchParams.set('utm_medium', med);
                        if(cmp) urlObj.searchParams.set('utm_campaign', cmp);
                        return urlObj.toString();
                    } catch(e) { return url; }
                }
                return url;
            case 'text': return inputs.text.value.trim();
            case 'wifi':
                if(!inputs.ssid.value) return null;
                return `WIFI:S:${inputs.ssid.value};T:${inputs.wifiType.value};P:${inputs.pass.value};;`;
            case 'vcard':
                if(!inputs.vFn.value) return null;
                return `BEGIN:VCARD\nVERSION:3.0\nN:${inputs.vLn.value};${inputs.vFn.value};;;\nFN:${inputs.vFn.value} ${inputs.vLn.value}\nTEL:${inputs.vTel.value}\nEMAIL:${inputs.vEmail.value}\nEND:VCARD`;
            case 'location':
                if(!inputs.locLat.value) return null;
                return `geo:${inputs.locLat.value},${inputs.locLon.value}`;
            case 'whatsapp':
                return inputs.waPhone.value ? `https://wa.me/${inputs.waPhone.value}?text=${encodeURIComponent(inputs.waMessage.value)}` : null;
            case 'email':
                return inputs.emailTo.value ? `mailto:${inputs.emailTo.value}?subject=${encodeURIComponent(inputs.emailSub.value)}` : null;
            case 'social':
                const u = inputs.socialUser.value;
                if(!u) return null;
                const p = inputs.socialPlat.value;
                if(p==='instagram') return `https://instagram.com/${u}`;
                if(p==='facebook') return `https://facebook.com/${u}`;
                if(p==='twitter') return `https://x.com/${u}`;
                if(p==='tiktok') return `https://tiktok.com/@${u}`;
                return u;
            case 'crypto':
                if(!inputs.cryptoAddr.value) return null;
                const ct = inputs.cryptoType.value;
                const amt = inputs.cryptoAmount.value; // simple param
                // BIP-21 standard for bitcoin
                if(ct === 'bitcoin') return `bitcoin:${inputs.cryptoAddr.value}${amt ? '?amount='+amt : ''}`;
                if(ct === 'ethereum') return `ethereum:${inputs.cryptoAddr.value}${amt ? '?value='+amt : ''}`;
                return inputs.cryptoAddr.value;
            case 'paypal':
                if(!inputs.paypalUser.value) return null;
                return `https://paypal.me/${inputs.paypalUser.value}/${inputs.paypalAmount.value || ''}${inputs.paypalCurrency.value}`;
            case 'bulk':
                return inputs.bulk.value.trim().split('\n').filter(l => l.length > 0);
            default: return null;
        }
    }

    // === Logic: Update QR ===
    async function updateQR(fromAuto = false) {
        if(currentType === 'bulk') return; 

        const data = getQRData();
        updateDensityUI(data);

        if(!data) {
            if(!fromAuto) showToast("Faltan datos");
            return;
        }

        const options = getStyles();
        qrCode.update({ ...options, data: data });
        if(!fromAuto) saveHistory(data, currentType);
    }

    function updateDensityUI(data) {
        const wrap = document.getElementById('densityWrapper');
        if(!data) { wrap.classList.add('hidden'); return; }
        
        wrap.classList.remove('hidden');
        const len = data.length;
        const ecc = document.getElementById('errorLevel').value;
        const fill = document.getElementById('densityFill');
        const label = document.getElementById('densityLabel');

        // Approximate sweet spots for scan speed
        let limit = ecc === 'L' ? 180 : (ecc === 'M' ? 150 : (ecc === 'Q' ? 100 : 70));
        
        let percent = Math.min((len / (limit * 2)) * 100, 100);
        fill.style.width = `${percent}%`;
        fill.className = 'density-fiil'; // base class if needed, or clear
        
        if(percent < 40) {
            fill.classList.add('density-low');
            label.innerText = `Densidad: Óptima` ;
        } else if(percent < 85) {
            fill.classList.add('density-med');
            label.innerText = `Densidad: Media`;
        } else {
            fill.classList.add('density-high');
            label.innerText = `Complejidad Alta (Reduce datos)`;
        }
    }

    function getStyles() {
        return {
            image: currentLogo,
            dotsOptions: {
                type: document.getElementById('dotsType').value,
                color: document.getElementById('dotsColor').value,
                gradient: document.getElementById('useGradient').checked ? {
                    type: document.getElementById('gradientType').value,
                    rotation: document.getElementById('gradientRotation').value * (Math.PI/180),
                    colorStops: [{offset: 0, color: document.getElementById('dotsColor').value}, {offset:1, color: document.getElementById('gradientColor2').value}]
                } : undefined
            },
            backgroundOptions: { color: document.getElementById('bgColor').value },
            cornersSquareOptions: { type: document.getElementById('cornersType').value },
            imageOptions: { 
                margin: parseInt(logoMargin.value),
                imageSize: parseFloat(logoSize.value),
                crossOrigin: "anonymous"
            }
        };
    }

    // === Features ===

    // Shortener (TinyURL)
    shortenBtn.addEventListener('click', async () => {
        const longUrl = inputs.url.value;
        if(!longUrl) return showToast("Ingresa una URL primero");
        
        showToast("⏳ Acortando...");
        try {
            const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
            if(res.ok) {
                const short = await res.text();
                inputs.url.value = short;
                updateQR();
                showToast("✅ Acortado: " + short);
            } else {
                showToast("❌ Error al conectar");
            }
        } catch(e) {
            showToast("❌ Error de red");
        }
    });

    // Geo Location
    locateMeBtn.addEventListener('click', () => {
        if(!navigator.geolocation) return showToast("No soportado");
        navigator.geolocation.getCurrentPosition(pos => {
            inputs.locLat.value = pos.coords.latitude;
            inputs.locLon.value = pos.coords.longitude;
            updateQR();
        }, () => showToast("Permiso denegado"));
    });

    // Bulk PDF
    document.getElementById('bulkZipBtn').addEventListener('click', generateBulkZip);
    document.getElementById('bulkPdfBtn').addEventListener('click', generateBulkPDF);

    async function generateBulkPDF() {
        const lines = inputs.bulk.value.trim().split('\n').filter(x=>x);
        if(lines.length === 0) return showToast("Lista vacía");
        
        showToast("⏳ Generando PDF A4...");
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        let x = 10, y = 10;
        const size = 40; // mm
        const gap = 10;
        let count = 0;

        for(let line of lines) {
            // Generate canvas temp
            const tempQR = new QRCodeStyling({ ...getStyles(), width: 200, height: 200, data: line });
            const buffer = await tempQR.getRawData('png'); // blob
            // Convert blob to base64
            const base64 = await blobToBase64(buffer);
            
            if(count > 0 && count % 12 === 0) { // 3x4 grid = 12 per page
                doc.addPage();
                x = 10; y = 10;
            }
            
            doc.addImage(base64, 'PNG', x, y, size, size);
            doc.setFontSize(8);
            const text = line.length > 20 ? line.substring(0,20)+'...' : line;
            doc.text(text, x, y + size + 5);

            x += size + gap;
            if(x > 150) { // Next row
                x = 10;
                y += size + gap + 10; // extra space for text
            }
            count++;
        }
        
        doc.save("qrs-labels.pdf");
        showToast("✅ PDF Generado");
    }

    async function generateBulkZip() {
        const lines = inputs.bulk.value.trim().split('\n').filter(x=>x);
        if(lines.length === 0) return showToast("Lista vacía");
        showToast("⏳ Generando ZIP...");
        
        const zip = new JSZip();
        for(let i=0; i<lines.length; i++) {
            const tempQR = new QRCodeStyling({ ...getStyles(), data: lines[i] });
            const blob = await tempQR.getRawData('png');
            zip.file(`qr-${i}.png`, blob);
        }
        const content = await zip.generateAsync({type:"blob"});
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = "qrs.zip";
        link.click();
        showToast("✅ ZIP Listo");
    }

    // Helper
    function blobToBase64(blob) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    }

    // Share Target Handler
    function checkShareTarget() {
        const params = new URLSearchParams(window.location.search);
        const title = params.get('title');
        const text = params.get('text');
        const url = params.get('url');

        if(url || text) {
            // Determine type
            if(url) {
                currentType = 'url';
                inputs.url.value = url;
            } else {
                currentType = 'text';
                inputs.text.value = text;
            }
            // Trigger UI switch
            const btn = document.querySelector(`[data-target="${currentType}"]`);
            if(btn) btn.click();
            setTimeout(() => updateQR(false), 500);
            showToast("🔗 Datos recibidos");
        }
    }

    generateBtn.addEventListener('click', () => updateQR(false));

    // Mini Tabs (History/Presets)
    const miniTabs = document.querySelectorAll('.mini-tab');
    miniTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            miniTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const view = tab.dataset.view;
            if(view === 'history') {
                document.getElementById('view-history').classList.remove('hidden');
                document.getElementById('view-presets').classList.add('hidden');
            } else {
                document.getElementById('view-history').classList.add('hidden');
                document.getElementById('view-presets').classList.remove('hidden');
            }
        });
    });
    
    // Listeners for Live Update
    document.querySelectorAll('input, select, textarea').forEach(el => {
        if(el.id === 'logoInput' || el.type === 'file' || el.id === 'removeBgToggle') return;
        el.addEventListener('input', () => {
            if(document.getElementById('autoGenToggle').checked) updateQR(true);
        }); 
    });

    logoInput.addEventListener('change', async e => {
        const file = e.target.files[0];
        if(file) {
            currentLogo = await processLogo(file);
            updateQR(true);
        }
    });
    
    removeBgToggle.addEventListener('change', async () => {
        if(logoInput.files[0]) {
            currentLogo = await processLogo(logoInput.files[0]);
            updateQR(true);
        }
    });

    async function processLogo(file) {
        const useRemove = removeBgToggle.checked;
        return new Promise(resolve => {
            if(!useRemove) {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(file);
            } else {
                const img = new Image();
                const url = URL.createObjectURL(file);
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0,0,img.width,img.height);
                    const data = imageData.data;
                    // White threshold
                    for(let i=0; i<data.length; i+=4) {
                        const r=data[i], g=data[i+1], b=data[i+2];
                        if(r>230 && g>230 && b>230) data[i+3] = 0;
                    }
                    ctx.putImageData(imageData, 0,0);
                    resolve(canvas.toDataURL());
                    URL.revokeObjectURL(url);
                };
                img.src = url;
            }
        });
    }

    // History
    function saveHistory(data, type) {
        let hist = JSON.parse(localStorage.getItem('qrHistory') || '[]');
        if(hist[0]?.data === data) return;
        hist.unshift({data, type, date: new Date().toLocaleTimeString()});
        if(hist.length > 20) hist.pop();
        localStorage.setItem('qrHistory', JSON.stringify(hist));
        renderList('historyList', hist);
    }
    
    // Presets
    function loadPresets() {
        let presets = JSON.parse(localStorage.getItem('qrPresets') || '{}');
        // Load Defaults if empty
        if(Object.keys(presets).length === 0) {
            presets = {
                "Instagram": { dotsType: "classy", dotsColor: "#E1306C", bgColor: "#ffffff", cornersType: "extra-rounded" },
                "Azul Corp": { dotsType: "square", dotsColor: "#003366", bgColor: "#ffffff", cornersType: "square" },
                "Neon": { dotsType: "dots", dotsColor: "#FF5733", bgColor: "#111827", cornersType: "dot" }
            };
            localStorage.setItem('qrPresets', JSON.stringify(presets));
        }

        const list = document.getElementById('presetsList');
        if(!list) return; 
        list.innerHTML = '';
        Object.keys(presets).forEach(k => {
            const btn = document.createElement('button');
            btn.className = 'history-item'; 
            btn.style.display = 'inline-block';
            btn.style.marginRight = '5px';
            btn.style.cursor = 'pointer';
            btn.innerText = k;
            btn.onclick = () => applyPreset(presets[k]);
            list.appendChild(btn);
        });
    }

    function applyPreset(style) {
        if(style.dotsType) document.getElementById('dotsType').value = style.dotsType;
        if(style.dotsColor) document.getElementById('dotsColor').value = style.dotsColor;
        if(style.bgColor) document.getElementById('bgColor').value = style.bgColor;
        if(style.cornersType) document.getElementById('cornersType').value = style.cornersType;
        updateQR(true);
        showToast("🎨 Estilo aplicado");
    }
    
    function renderList(id, arr) {
        const list = document.getElementById(id);
        if(!list) return;
        list.innerHTML = '';
        arr.forEach(i => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerText = `${i.type}: ${i.data.substring(0,20)}`;
            li.onclick = () => { 
                /* Restore logic could go here, for now just copy data */
                if(navigator.clipboard) navigator.clipboard.writeText(i.data);
                showToast("Copiado al portapapeles");
            };
            list.appendChild(li);
        });
    }

    // Scanner
    let html5QrCode;
    let isFlashOn = false;
    
    function startScanner() {
        html5QrCode = new Html5Qrcode("reader");
        html5QrCode.start({ facingMode: "environment" }, { fps: 10 }, 
            (decoded) => {
                document.getElementById('scanResult').innerHTML = `Escanado: <a href="${decoded}">${decoded}</a>`;
                showToast("✅ QR Detectado");
            }
        ).then(() => {
            const flashBtn = document.getElementById('flashBtn');
            if(flashBtn) flashBtn.classList.remove('hidden');
        }).catch(err => {
            console.error(err);
            document.getElementById('scanResult').innerText = "Error accediendo a cámara";
        });
    }
    
    function stopScanner() {
        if(html5QrCode) {
            html5QrCode.stop().then(() => html5QrCode.clear()).catch(()=>{});
        }
    }

    const flashBtn = document.getElementById('flashBtn');
    if(flashBtn) {
        flashBtn.addEventListener('click', () => {
            isFlashOn = !isFlashOn;
            html5QrCode.applyVideoConstraints({ advanced: [{ torch: isFlashOn }] });
        });
    }

    // Helper: Toast
    function showToast(msg) {
        toast.innerText = msg;
        toast.classList.add('show');
        setTimeout(()=>toast.classList.remove('show'), 3000);
    }
    
    // Init History Render
    renderList('historyList', JSON.parse(localStorage.getItem('qrHistory') || '[]'));
});