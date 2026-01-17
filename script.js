document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DEL DOM ---
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const charCount = document.getElementById('charCount');
    const sourceLang = document.getElementById('sourceLang');
    const targetLang = document.getElementById('targetLang');
    const translateButton = document.getElementById('translateButton');
    const clearButton = document.getElementById('clearButton');
    const swapLanguagesButton = document.getElementById('swapLanguages');
    const copyOutputButton = document.getElementById('copyOutput');
    const shareOutputButton = document.getElementById('shareOutput');
    const favOutputButton = document.getElementById('favOutput');
    const statusMessage = document.getElementById('statusMessage');
    const startRecognitionButton = document.getElementById('startRecognition');
    const speakOutputButton = document.getElementById('speakOutput');
    const micStatus = document.getElementById('micStatus');
    
    // Elementos de almacenamiento
    const showHistoryBtn = document.getElementById('showHistory');
    const showFavoritesBtn = document.getElementById('showFavorites');
    const storageList = document.getElementById('storageList');
    const clearStorageBtn = document.getElementById('clearStorage');

    // --- VARIABLES DE ESTADO ---
    let currentView = 'history'; 
    let history = JSON.parse(localStorage.getItem('traductor_history')) || [];
    let favorites = JSON.parse(localStorage.getItem('traductor_favorites')) || [];

    // --- CONFIGURACIÓN DE VOZ ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechSynthesis = window.speechSynthesis;
    let recognition;

    // --- RECONOCIMIENTO DE VOZ ---
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.onstart = () => {
            micStatus.textContent = 'Escuchando... 🎤';
            startRecognitionButton.classList.add('listening');
            startRecognitionButton.disabled = true;
        };
        recognition.onresult = (event) => {
            inputText.value = event.results[0][0].transcript;
            charCount.textContent = inputText.value.length;
            translateText();
        };
        recognition.onerror = () => {
            micStatus.textContent = 'Error de micrófono.';
            setTimeout(() => micStatus.textContent = '', 3000);
        };
        recognition.onend = () => {
            micStatus.textContent = '';
            startRecognitionButton.classList.remove('listening');
            startRecognitionButton.disabled = false;
        };
        startRecognitionButton.addEventListener('click', () => {
            recognition.lang = sourceLang.value;
            recognition.start();
        });
    }

    // --- TRADUCCIÓN ---
    async function translateText() {
        const text = inputText.value.trim();
        if (!text) return;

        statusMessage.textContent = 'Traduciendo...';
        translateButton.disabled = true;

        try {
            const s = sourceLang.value.split('-')[0];
            const t = targetLang.value.split('-')[0];
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${s}|${t}`;
            
            const res = await fetch(url);
            const data = await res.json();

            if (data.responseData) {
                const temp = document.createElement('textarea');
                temp.innerHTML = data.responseData.translatedText;
                outputText.value = temp.value;
                statusMessage.textContent = 'Traducción completada.';
                favOutputButton.classList.remove('active');
                
                // Guardar en historial
                addToHistory(text, outputText.value);
            }
        } catch (e) {
            statusMessage.textContent = 'Error de conexión.';
        } finally {
            translateButton.disabled = false;
            setTimeout(() => statusMessage.textContent = '', 3000);
        }
    }

    // --- GESTIÓN DE ALMACENAMIENTO ---
    function addToHistory(original, translated) {
        // Evitar duplicados consecutivos
        if (history.length > 0 && history[0].original === original && history[0].translated === translated) return;

        const item = { original, translated, id: Date.now() };
        history.unshift(item);
        if (history.length > 10) history.pop(); 
        saveAndRender();
    }

    function toggleFavorite() {
        if (!outputText.value) return;
        
        const exists = favorites.find(f => f.translated === outputText.value);
        if (exists) {
            favorites = favorites.filter(f => f.translated !== outputText.value);
            favOutputButton.classList.remove('active');
        } else {
            favorites.unshift({ original: inputText.value, translated: outputText.value, id: Date.now() });
            favOutputButton.classList.add('active');
        }
        saveAndRender();
    }

    function saveAndRender() {
        localStorage.setItem('traductor_history', JSON.stringify(history));
        localStorage.setItem('traductor_favorites', JSON.stringify(favorites));
        renderStorage();
    }

    function renderStorage() {
        storageList.innerHTML = '';
        const list = currentView === 'history' ? history : favorites;
        
        if (list.length === 0) {
            storageList.innerHTML = `<div style="text-align:center; padding:10px; color:#888; font-style:italic;">Lista vacía</div>`;
            return;
        }

        list.forEach(item => {
            const div = document.createElement('div');
            div.className = 'storage-item';
            div.innerHTML = `<div><b>${item.original}</b> <br> <span>${item.translated}</span></div>`;
            div.onclick = () => {
                inputText.value = item.original;
                outputText.value = item.translated;
                charCount.textContent = inputText.value.length;
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
            storageList.appendChild(div);
        });
    }

    // --- EVENT LISTENERS ---
    translateButton.addEventListener('click', translateText);
    
    clearButton.addEventListener('click', () => {
        inputText.value = '';
        outputText.value = '';
        charCount.textContent = '0';
        favOutputButton.classList.remove('active');
        statusMessage.textContent = '';
        if (speechSynthesis.speaking) speechSynthesis.cancel();
    });

    swapLanguagesButton.addEventListener('click', () => {
        const tempL = sourceLang.value;
        sourceLang.value = targetLang.value;
        targetLang.value = tempL;
        const tempT = inputText.value;
        inputText.value = outputText.value;
        outputText.value = tempT;
        charCount.textContent = inputText.value.length;
    });

    copyOutputButton.addEventListener('click', () => {
        if (outputText.value) {
            navigator.clipboard.writeText(outputText.value);
            statusMessage.textContent = '¡Copiado!';
            setTimeout(() => statusMessage.textContent = '', 2000);
        }
    });

    shareOutputButton.addEventListener('click', async () => {
        if (navigator.share && outputText.value) {
            await navigator.share({ title: 'Traducción', text: outputText.value });
        }
    });

    favOutputButton.addEventListener('click', toggleFavorite);

    showHistoryBtn.addEventListener('click', () => {
        currentView = 'history';
        showHistoryBtn.classList.add('active');
        showFavoritesBtn.classList.remove('active');
        renderStorage();
    });

    showFavoritesBtn.addEventListener('click', () => {
        currentView = 'favorites';
        showFavoritesBtn.classList.add('active');
        showHistoryBtn.classList.remove('active');
        renderStorage();
    });

    clearStorageBtn.addEventListener('click', () => {
        if (confirm('¿Borrar toda la lista?')) {
            if (currentView === 'history') history = [];
            else favorites = [];
            saveAndRender();
        }
    });

    inputText.addEventListener('input', () => charCount.textContent = inputText.value.length);
    
    inputText.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            inputText.blur();
            translateText();
        }
    });

    speakOutputButton.addEventListener('click', () => {
        if (!outputText.value) return;
        if (speechSynthesis.speaking) speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(outputText.value);
        ut.lang = targetLang.value;
        ut.onstart = () => speakOutputButton.classList.add('speaking');
        ut.onend = () => speakOutputButton.classList.remove('speaking');
        speechSynthesis.speak(ut);
    });

    renderStorage();
});