document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DEL DOM ---
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const sourceLang = document.getElementById('sourceLang');
    const targetLang = document.getElementById('targetLang');
    const translateButton = document.getElementById('translateButton');
    const clearButton = document.getElementById('clearButton');
    const swapLanguagesButton = document.getElementById('swapLanguages');
    const copyOutputButton = document.getElementById('copyOutput'); // Corregido: Variable definida
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
    const searchStorage = document.getElementById('searchStorage');

    // --- VARIABLES DE ESTADO ---
    let currentView = 'history'; 
    let history = JSON.parse(localStorage.getItem('traductor_history')) || [];
    let favorites = JSON.parse(localStorage.getItem('traductor_favorites')) || [];

    // --- RECONOCIMIENTO DE VOZ ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.onstart = () => {
            micStatus.textContent = 'Escuchando... 🎤';
            startRecognitionButton.classList.add('listening');
        };
        recognition.onresult = (event) => {
            inputText.value = event.results[0][0].transcript;
            translateText();
        };
        recognition.onend = () => {
            micStatus.textContent = '';
            startRecognitionButton.classList.remove('listening');
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
                
                addToHistory(text, outputText.value);
            }
        } catch (e) {
            statusMessage.textContent = 'Error de conexión.';
        } finally {
            translateButton.disabled = false;
            setTimeout(() => statusMessage.textContent = '', 2000);
        }
    }

    // --- GESTIÓN DE ALMACENAMIENTO ---
    function addToHistory(original, translated) {
        if (history.length > 0 && history[0].original === original) return;
        const item = { original, translated, id: Date.now() };
        history.unshift(item);
        if (history.length > 20) history.pop(); 
        saveAndRender();
    }

    window.deleteItem = (id) => {
        if (currentView === 'history') {
            history = history.filter(i => i.id !== id);
        } else {
            favorites = favorites.filter(i => i.id !== id);
        }
        saveAndRender();
    };

    window.copyItem = (text) => {
        navigator.clipboard.writeText(text);
        statusMessage.textContent = '¡Copiado!';
        setTimeout(() => statusMessage.textContent = '', 1500);
    };

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
        const query = (searchStorage.value || '').toLowerCase();

        const filtered = list.filter(item => 
            item.original.toLowerCase().includes(query) || 
            item.translated.toLowerCase().includes(query)
        );

        if (filtered.length === 0) {
            storageList.innerHTML = `<div style="text-align:center; padding:10px; color:#666;">No hay resultados</div>`;
            return;
        }

        filtered.forEach(item => {
            const div = document.createElement('div');
            div.className = 'storage-item'; // Usa la clase de tu CSS nuevo
            div.innerHTML = `
                <div class="item-text" onclick="loadItem(${item.id})">
                    <b>${item.original}</b>
                    <span>${item.translated}</span>
                </div>
                <div class="item-actions">
                    <button class="btn-copy" onclick="event.stopPropagation(); copyItem('${item.translated}')" title="Copiar">📋</button>
                    <button class="btn-del" onclick="event.stopPropagation(); deleteItem(${item.id})" title="Eliminar">🗑️</button>
                </div>
            `;
            storageList.appendChild(div);
        });
    }

    window.loadItem = (id) => {
        const list = currentView === 'history' ? history : favorites;
        const item = list.find(i => i.id === id);
        if (item) {
            inputText.value = item.original;
            outputText.value = item.translated;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // --- FUNCIONES DE VOZ ---
    function speak(text, lang) {
        // Usamos window.speechSynthesis directamente para evitar errores de undefined
        if (window.speechSynthesis) {
            if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
            const ut = new SpeechSynthesisUtterance(text);
            ut.lang = lang;
            window.speechSynthesis.speak(ut);
        }
    }

    // --- EVENTOS ---
    searchStorage.addEventListener('input', renderStorage);
    
    // Intro para traducir y esconder teclado
    inputText.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); 
            inputText.blur();   
            translateText();    
        }
    });
    
    translateButton.addEventListener('click', translateText);
    
    clearButton.addEventListener('click', () => {
        inputText.value = ''; 
        outputText.value = '';
        // Corrección del error: Verificar si el navegador soporta voz y si está hablando
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
    });

    swapLanguagesButton.addEventListener('click', () => {
        const tempL = sourceLang.value; sourceLang.value = targetLang.value; targetLang.value = tempL;
        const tempT = inputText.value; inputText.value = outputText.value; outputText.value = tempT;
    });

    copyOutputButton.addEventListener('click', () => {
        if (outputText.value) copyItem(outputText.value);
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
        if (confirm('¿Borrar lista?')) {
            if (currentView === 'history') history = []; else favorites = [];
            saveAndRender();
        }
    });

    speakOutputButton.addEventListener('click', () => {
        if (outputText.value) {
            speak(outputText.value, targetLang.value);
        }
    });

    // Cargar historial al inicio
    renderStorage();
});