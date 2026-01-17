document.addEventListener('DOMContentLoaded', () => {
    // Obtención de elementos del DOM
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const sourceLang = document.getElementById('sourceLang');
    const targetLang = document.getElementById('targetLang');
    const translateButton = document.getElementById('translateButton');
    const clearButton = document.getElementById('clearButton'); // Nuevo botón
    const swapLanguagesButton = document.getElementById('swapLanguages');
    const copyOutputButton = document.getElementById('copyOutput');
    const statusMessage = document.getElementById('statusMessage');
    const startRecognitionButton = document.getElementById('startRecognition');
    const speakOutputButton = document.getElementById('speakOutput');
    const micStatus = document.getElementById('micStatus');

    // Verificar que todos los elementos principales existen
    if (!inputText || !outputText || !sourceLang || !targetLang || !translateButton ||
        !swapLanguagesButton || !copyOutputButton || !statusMessage || !micStatus ||
        !startRecognitionButton || !speakOutputButton || !clearButton) {
        console.error("Error: Uno o más elementos HTML no fueron encontrados. Revisa los IDs en tu HTML y JavaScript.");
        if (statusMessage) statusMessage.textContent = "Error: Faltan elementos de la interfaz. Revisa la consola.";
        return; // Detener la ejecución si faltan elementos cruciales
    }

    // Soporte para Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechSynthesis = window.speechSynthesis;
    let recognition;

    // Configuración del Reconocimiento de Voz
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
                micStatus.textContent = 'No se pudo iniciar el micrófono. ¿Ya está en uso o permiso denegado?';
                setTimeout(() => micStatus.textContent = '', 3000);
            }
        });

    } else {
        startRecognitionButton.style.display = 'none';
        micStatus.textContent = 'Reconocimiento de voz no soportado en este navegador.';
        console.warn("Web Speech API (Recognition) no soportada.");
    }

    // Configuración de la Síntesis de Voz
    if (speechSynthesis) {
        function speak(text) {
            if (speechSynthesis.speaking) {
                speechSynthesis.cancel();
                // Esperar un poco para que 'cancel' termine antes de hablar de nuevo
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
            else console.warn(`No se encontró voz para ${targetLang.value}. Usando defecto.`);

            utterance.onstart = () => speakOutputButton.classList.add('speaking');
            utterance.onend = () => speakOutputButton.classList.remove('speaking');
            utterance.onerror = (event) => {
                console.error('Error de síntesis de voz:', event.error);
                statusMessage.textContent = 'Error al reproducir la voz.';
                setTimeout(() => statusMessage.textContent = '', 3000);
                speakOutputButton.classList.remove('speaking');
            };
            speechSynthesis.speak(utterance);
        }

        speakOutputButton.addEventListener('click', () => {
            const textToSpeak = outputText.value;
            if (textToSpeak) {
                speak(textToSpeak);
            } else {
                statusMessage.textContent = 'No hay texto traducido para leer.';
                setTimeout(() => statusMessage.textContent = '', 2000);
            }
        });

        // Asegurarse de que las voces se carguen (necesario en algunos navegadores)
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => {
                // Las voces están listas, no es necesario hacer nada aquí explícitamente
                // a menos que se quiera llenar una lista de voces seleccionables.
            };
        }
    } else {
        speakOutputButton.style.display = 'none';
        console.warn("Web Speech API (Synthesis) no soportada.");
        // No mostramos mensaje en micStatus si el reconocimiento sí funciona
        if (!SpeechRecognition && micStatus) {
             micStatus.textContent = 'Reconocimiento y síntesis de voz no soportados.';
        }
    }


    // Función para obtener código base del idioma (ej: 'es' de 'es-ES')
    function getBaseLanguageCode(fullLangCode) {
        return fullLangCode ? fullLangCode.split('-')[0] : '';
    }

    // Función para traducir texto
    async function translateText() {
        const textToTranslate = inputText.value.trim();
        const sLangBase = getBaseLanguageCode(sourceLang.value);
        const tLangBase = getBaseLanguageCode(targetLang.value);

        if (!textToTranslate) {
            outputText.value = '';
            statusMessage.textContent = 'Ingresa texto para traducir.';
            return;
        }

        if (sourceLang.value === targetLang.value) { // Comparamos códigos completos
            outputText.value = textToTranslate;
            statusMessage.textContent = 'Idioma de origen y destino son iguales.';
            return;
        }

        statusMessage.textContent = 'Traduciendo...';
        translateButton.disabled = true;
        outputText.value = '';

        try {
            const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=${sLangBase}|${tLangBase}`;
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.responseData) {
                const tempTextArea = document.createElement('textarea');
                tempTextArea.innerHTML = data.responseData.translatedText;
                outputText.value = tempTextArea.value;
                statusMessage.textContent = 'Traducción completada.';
            } else {
                statusMessage.textContent = `Error: ${data.responseDetails || 'No se pudo traducir.'}`;
                outputText.value = '';
            }
        } catch (error) {
            console.error('Error en la solicitud de traducción:', error);
            statusMessage.textContent = 'Error de conexión. Inténtalo de nuevo.';
            outputText.value = '';
        } finally {
            translateButton.disabled = false;
            setTimeout(() => {
                if (statusMessage.textContent.startsWith('Traducción completada') ||
                    statusMessage.textContent.startsWith('Idioma de origen') ||
                    statusMessage.textContent.startsWith('Ingresa texto')) {
                    statusMessage.textContent = '';
                }
            }, 3000);
        }
    }

    // Función para intercambiar idiomas
    function swapLanguages() {
        const tempLang = sourceLang.value;
        sourceLang.value = targetLang.value;
        targetLang.value = tempLang;

        const tempInputText = inputText.value;
        inputText.value = outputText.value;
        outputText.value = tempInputText; // Simplemente intercambiar textos

        if (inputText.value.trim()) { // Si hay texto en el input después del swap, traducir
            translateText();
        } else {
            statusMessage.textContent = 'Idiomas intercambiados.';
             setTimeout(() => statusMessage.textContent = '', 2000);
        }
    }

    // Función para copiar texto traducido
    function copyOutputText() {
        if (outputText.value) {
            navigator.clipboard.writeText(outputText.value)
                .then(() => {
                    statusMessage.textContent = '¡Texto copiado!';
                    setTimeout(() => statusMessage.textContent = '', 2000);
                })
                .catch(err => {
                    console.error('Error al copiar:', err);
                    statusMessage.textContent = 'No se pudo copiar.';
                    setTimeout(() => statusMessage.textContent = '', 2000);
                });
        } else {
            statusMessage.textContent = 'No hay texto para copiar.';
            setTimeout(() => statusMessage.textContent = '', 2000);
        }
    }

    // Función para limpiar campos
    function clearFields() {
        inputText.value = '';
        outputText.value = '';
        statusMessage.textContent = '';
        micStatus.textContent = '';
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }
    }

    // Event Listeners para botones principales
    translateButton.addEventListener('click', translateText);
    clearButton.addEventListener('click', clearFields);
    swapLanguagesButton.addEventListener('click', swapLanguages);
    copyOutputButton.addEventListener('click', copyOutputText);

    // Traducir al presionar Enter en el input
    inputText.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            inputText.blur(); // Hace que el teclado desaparezca en móviles
            translateText();
        }
    });

    // Limpiar mensaje de estado si el usuario empieza a escribir
    inputText.addEventListener('input', () => {
        if (statusMessage.textContent && !statusMessage.textContent.startsWith('Traduciendo...')) {
            statusMessage.textContent = '';
        }
    });

});