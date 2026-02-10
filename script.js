document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('urlInput');
    const btn = document.getElementById('generateBtn');
    const qrContainer = document.getElementById('qrcode');

    function generateQR() {
        const url = input.value.trim();
        
        qrContainer.innerHTML = '';

        if (!url) {
            alert('Por favor ingresa un enlace válido');
            return;
        }

        new QRCode(qrContainer, {
            text: url,
            width: 200,
            height: 200,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
    }

    btn.addEventListener('click', generateQR);

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            generateQR();
        }
    });
});