document.addEventListener('DOMContentLoaded', () => {
    // Obtención de elementos del DOM
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const charCount = document.getElementById('charCount'); // Nuevo
    const sourceLang = document.getElementById('sourceLang');
    const targetLang = document.getElementById('targetLang');
    const translateButton = document.getElementById('translateButton');
    const clearButton = document.getElementById('clearButton');
    const swapLanguagesButton = document.getElementById('swapLanguages');
    const copyOutputButton = document.getElementById('copyOutput');
    const shareOutputButton = document.getElementById('shareOutput'); // Nuevo
    const statusMessage = document.getElementById('statusMessage');
    const startRecognitionButton = document.getElementById('startRecognition');
    const speakOutputButton = document.getElementById('speakOutput');
    const micStatus = document.getElementById('micStatus');

    // Verificar que todos los elementos principales existen (Tu lógica de seguridad original)
    if (!inputText || !outputText || !sourceLang || !targetLang || !translateButton ||
        !swapLanguagesButton || !copyOutputButton || !statusMessage || !micStatus ||
        !startRecognitionButton || !speakOutputButton || !clearButton || !shareOutputButton || !charCount) {
        console.error("Error: Uno o más elementos HTML no fueron encontrados. Revisa los IDs en tu HTML y JavaScript.");
        if (statusMessage) statusMessage.textContent = "Error: Faltan elementos de la interfaz. Revisa la consola.";
        return; 
    }

    // Soporte para Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechSynthesis = window.speechSynthesis;
    let recognition;

    // Actualizar contador de caracteres al escribir
    inputText.addEventListener('input', () => {
        charCount.textContent = inputText.value.length;
        if (statusMessage.textContent && !statusMessage.textContent.startsWith('Traduciendo...')) {
            statusMessage.textContent = '';
        }
    });

    // Configuración del Reconocimiento de Voz (Restaurado con tus errores detallados)
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            micStatus.textContent = 'Escuchando... 🎤';
            startRecognitionButton.classList.add('listening');
            startRecognitionButton.disabled = true;
        };

        recognition.onresult = (event) => {
            const spokenText = event.results[0][0].transcript;
            inputText.value = spokenText;
            charCount.textContent = spokenText.length; // Actualizar contador
            translateText(); // Traducir automáticamente
        };

        recognition.onerror = (event) => {
            console.error('Error de reconocimiento de voz:', event.error);
            let errorMessage = 'Error de reconocimiento: ';
            if (event.error === 'no-speech') errorMessage += 'No se detectó voz.';
            else if (event.error === 'audio-capture') errorMessage += 'Problema con el micrófono.';
            else if (event.error === 'not-allowed') errorMessage += 'Permiso de micrófono denegado.';
            else errorMessage += event.error;
            micStatus.textContent = errorMessage;
            setTimeout(() => micStatus.textContent = '', 3000);
        };

        recognition.onend = () => {
            if (micStatus.textContent === 'Escuchando... 🎤') micStatus.textContent = '';
            startRecognitionButton.classList.remove('listening');
            startRecognitionButton.disabled = false;
        };

        startRecognitionButton.addEventListener('click', () => {
            recognition.lang = sourceLang.value;
            try {
                recognition.start();
            } catch (e) {
                console.error("Error al iniciar reconocimiento:", e);
                micStatus.textContent = 'No se pudo iniciar el micrófono.';
                setTimeout(() => micStatus.textContent = '', 3000);
            }
        });

    } else {
        startRecognitionButton.style.display = 'none';
        micStatus.textContent = 'Reconocimiento de voz no soportado.';
    }

    // Configuración de la Síntesis de Voz (Restaurada tu función performSpeak)
    if (speechSynthesis) {
        function speak(text) {
            if (speechSynthesis.speaking) {
                speechSynthesis.cancel();
                setTimeout(() => performSpeak(text), 100);
                return;
            }
            performSpeak(text);
        }

        function performSpeak(text) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = targetLang.value;

            const voices = speechSynthesis.getVoices();
            const targetVoice = voices.find(voice => voice.lang === targetLang.value);
            if (targetVoice) utterance.voice = targetVoice;

            utterance.onstart = () => speakOutputButton.classList.add('speaking');
            utterance.onend = () => speakOutputButton.classList.remove('speaking');
            utterance.onerror = (event) => {
                console.error('Error de síntesis:', event.error);
                statusMessage.textContent = 'Error al reproducir la voz.';
                speakOutputButton.classList.remove('speaking');
            };
            speechSynthesis.speak(utterance);
        }

        speakOutputButton.addEventListener('click', () => {
            if (outputText.value) speak(outputText.value);
            else {
                statusMessage.textContent = 'No hay texto para leer.';
                setTimeout(() => statusMessage.textContent = '', 2000);
            }
        });
    }

    // Función para obtener código base
    function getBaseLanguageCode(fullLangCode) {
        return fullLangCode ? fullLangCode.split('-')[0] : '';
    }

    // Función para traducir texto (Restaurada con tu decodificación HTML)
    async function translateText() {
        const textToTranslate = inputText.value.trim();
        const sLangBase = getBaseLanguageCode(sourceLang.value);
        const tLangBase = getBaseLanguageCode(targetLang.value);

        if (!textToTranslate) {
            outputText.value = '';
            statusMessage.textContent = 'Ingresa texto para traducir.';
            return;
        }

        if (sourceLang.value === targetLang.value) {
            outputText.value = textToTranslate;
            statusMessage.textContent = 'Idioma de origen y destino son iguales.';
            return;
        }

        statusMessage.textContent = 'Traduciendo...';
        translateButton.disabled = true;

        try {
            const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=${sLangBase}|${tLangBase}`;
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.responseData) {
                // Tu truco original para decodificar entidades HTML (ej: &quot; a ")
                const tempTextArea = document.createElement('textarea');
                tempTextArea.innerHTML = data.responseData.translatedText;
                outputText.value = tempTextArea.value;
                statusMessage.textContent = 'Traducción completada.';
            } else {
                statusMessage.textContent = `Error: ${data.responseDetails || 'No se pudo traducir.'}`;
            }
        } catch (error) {
            statusMessage.textContent = 'Error de conexión.';
        } finally {
            translateButton.disabled = false;
            setTimeout(() => {
                if (statusMessage.textContent.startsWith('Traducción completada') ||
                    statusMessage.textContent.startsWith('Idioma de origen')) {
                    statusMessage.textContent = '';
                }
            }, 3000);
        }
    }

    // Función para compartir
    async function shareTranslation() {
        if (!outputText.value) {
            statusMessage.textContent = 'No hay nada que compartir.';
            setTimeout(() => statusMessage.textContent = '', 2000);
            return;
        }
        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'Traducción de Idiomas',
                    text: outputText.value
                });
            } else {
                statusMessage.textContent = 'Navegador no compatible con compartir.';
            }
        } catch (err) { console.log(err); }
    }

    // Función para intercambiar idiomas (Actualizada con contador)
    function swapLanguages() {
        const tempLang = sourceLang.value;
        sourceLang.value = targetLang.value;
        targetLang.value = tempLang;

        const tempInputText = inputText.value;
        inputText.value = outputText.value;
        outputText.value = tempInputText;
        
        charCount.textContent = inputText.value.length;

        if (inputText.value.trim()) translateText();
    }

    // Función para copiar
    function copyOutputText() {
        if (outputText.value) {
            navigator.clipboard.writeText(outputText.value)
                .then(() => {
                    statusMessage.textContent = '¡Texto copiado!';
                    setTimeout(() => statusMessage.textContent = '', 2000);
                });
        }
    }

    // Función para limpiar campos
    function clearFields() {
        inputText.value = '';
        outputText.value = '';
        charCount.textContent = '0'; // Reset contador
        statusMessage.textContent = '';
        micStatus.textContent = '';
        if (speechSynthesis.speaking) speechSynthesis.cancel();
    }

    // Event Listeners
    translateButton.addEventListener('click', translateText);
    clearButton.addEventListener('click', clearFields);
    swapLanguagesButton.addEventListener('click', swapLanguages);
    copyOutputButton.addEventListener('click', copyOutputText);
    shareOutputButton.addEventListener('click', shareTranslation);

    inputText.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            inputText.blur();
            translateText();
        }
    });
});