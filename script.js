document.addEventListener('DOMContentLoaded', () => {
    // Referencias al DOM
    const urlInput = document.getElementById('urlInput');
    const dotsColor = document.getElementById('dotsColor');
    const bgColor = document.getElementById('bgColor');
    const logoInput = document.getElementById('logoInput');
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistory');

    let currentLogo = null;
    let qrCode = null;

    // 1. Inicializar la librería QRCodeStyling
    // Documentación: https://qr-code-styling.com/
    qrCode = new QRCodeStyling({
        width: 300,
        height: 300,
        type: "svg",
        data: "https://ejemplo.com",
        image: "",
        dotsOptions: {
            color: "#000000",
            type: "rounded"
        },
        backgroundOptions: {
            color: "#ffffff",
        },
        imageOptions: {
            crossOrigin: "anonymous",
            margin: 10
        }
    });

    // Renderizar QR inicial vacío o de ejemplo
    qrCode.append(document.getElementById("qrcode"));

    // 2. Manejo de Logo
    logoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                currentLogo = reader.result;
            };
            reader.readAsDataURL(file);
        } else {
            currentLogo = null;
        }
    });

    // 3. Función Principal: Generar
    function updateQR() {
        const url = urlInput.value.trim();
        
        if (!url) {
            alert("Por favor escribe un enlace.");
            return;
        }

        // Configurar opciones nuevas
        qrCode.update({
            data: url,
            image: currentLogo,
            dotsOptions: {
                color: dotsColor.value
            },
            backgroundOptions: {
                color: bgColor.value
            }
        });

        // Habilitar descarga
        downloadBtn.disabled = false;

        // Guardar en historial
        saveToHistory(url);
    }

    // 4. Descargar
    downloadBtn.addEventListener('click', () => {
        qrCode.download({ name: "mi-qr", extension: "png" });
    });

    // 5. Historial (LocalStorage)
    function saveToHistory(url) {
        let history = JSON.parse(localStorage.getItem('qrHistory') || '[]');
        
        // Evitar duplicados seguidos
        if (history.length > 0 && history[0] === url) return;

        // Agregar al inicio
        history.unshift(url);
        
        // Mantener solo últimos 5
        if (history.length > 5) history.pop();

        localStorage.setItem('qrHistory', JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        let history = JSON.parse(localStorage.getItem('qrHistory') || '[]');
        historyList.innerHTML = '';

        history.forEach(url => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.textContent = url;
            li.title = "Click para cargar este link";
            
            // Al hacer clic en un item del historial, cargarlo
            li.addEventListener('click', () => {
                urlInput.value = url;
                updateQR();
            });

            historyList.appendChild(li);
        });
    }

    clearHistoryBtn.addEventListener('click', () => {
        localStorage.removeItem('qrHistory');
        renderHistory();
    });

    // Event Listeners
    generateBtn.addEventListener('click', updateQR);
    urlInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') updateQR();
    });

    // Cargar historial al inicio
    renderHistory();
});