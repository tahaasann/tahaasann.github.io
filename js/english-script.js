// DOM Elementlerini Seçme
const englishInput = document.getElementById('englishInput');
const turkishInput = document.getElementById('turkishInput');
const processTextsBtn = document.getElementById('processTextsBtn');
const englishDisplay = document.getElementById('englishDisplay');
const turkishDisplay = document.getElementById('turkishDisplay');
const pairButton = document.getElementById('pairButton');
const saveSessionBtn = document.getElementById('saveSessionBtn');
const resetButton = document.getElementById('resetButton');
const statusMessage = document.getElementById('statusMessage');
const viewSessionsBtn = document.getElementById('viewSessionsBtn');
const clearEnglishSelectionBtn = document.getElementById('clearEnglishSelectionBtn'); // Yeni buton
const clearTurkishSelectionBtn = document.getElementById('clearTurkishSelectionBtn'); // Yeni buton
const exportSessionsBtn = document.getElementById('exportSessionsBtn');
const importSessionsFile = document.getElementById('importSessionsFile');
const triggerImportBtn = document.getElementById('triggerImportBtn'); // <<< triggerImportBtn olarak değişti

// Uygulama Durum Değişkenleri
let selectedEnglishSpans = new Set(); // Seçili İngilizce span'leri tutar (Set, tekrarları önler)
let selectedTurkishSpans = new Set(); // Seçili Türkçe span'leri tutar
let currentColorIndex = 0;    // Hangi renk paletini kullanacağımızı belirler
// pairedElements artık daha karmaşık: her bir eşleşme, bir veya daha fazla aralık içerebilir
// Örnek: { id: ..., colorClass: ..., engRanges: [[s1, e1], [s2, e2]], turRanges: [[sA, eA]] }
let pairedElements = [];

// Karakter bazlı tıklama ile seçim için durum değişkenleri
let pendingEnglishSelectionStart = null; // İngilizce'de bekleyen başlangıç span'i
let pendingTurkishSelectionStart = null; // Türkçe'de bekleyen başlangıç span'i

// Renk paletindeki CSS sınıfları (CSS'deki :root içindeki --pair-color-X ile eşleşmeli)
// script.js - Yaklaşık satır 27
const colorClasses = [
    'paired-color-0', 'paired-color-1', 'paired-color-2', 'paired-color-3', 'paired-color-4',
    'paired-color-5', 'paired-color-6', 'paired-color-7', 'paired-color-8', 'paired-color-9',
    'paired-color-10', 'paired-color-11', 'paired-color-12', 'paired-color-13', 'paired-color-14',
    'paired-color-15', 'paired-color-16', 'paired-color-17', 'paired-color-18', 'paired-color-19',
    'paired-color-20', 'paired-color-21', 'paired-color-22', 'paired-color-23', 'paired-color-24'
];

// Speech Synthesis API için sesler
let speechVoices = [];
function populateVoiceList() {
    speechVoices = window.speechSynthesis.getVoices();
}
if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = populateVoiceList;
    populateVoiceList();
}

// ### Yardımcı Fonksiyonlar ###

/**
 * Benzersiz bir ID oluşturur (basit bir yaklaşım).
 * @returns {string} Benzersiz ID.
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Verilen metni karakterlere ayırır ve her karakteri tıklanabilir bir span'e sarar.
 * @param {string} text Metin içeriği.
 * @param {HTMLElement} container Metnin ekleneceği DOM elemanı.
 * @param {string} lang 'en' veya 'tr' (dil bilgisi için).
 * @returns {Array<HTMLElement>} Oluşturulan tüm span elemanları.
 */
function createClickableSpans(text, container, lang) {
    container.innerHTML = '';
    const charSpansInOrder = []; // Tüm spanleri sırasıyla tutar (BR'ler dahil)

    text.split('').forEach((char, index) => {
        if (char === '\n') { // Satır sonlarını <br> olarak işleme
            const br = document.createElement('br');
            br.dataset.index = charSpansInOrder.length.toString(); // BR'nin de bir indeksi olsun
            container.appendChild(br);
            charSpansInOrder.push(br);
        } else {
            const span = document.createElement('span');
            span.textContent = char;
            span.classList.add('char-span');
            if (char.trim() === '') {
                span.classList.add('whitespace');
            }
            span.dataset.lang = lang;
            span.dataset.index = charSpansInOrder.length.toString(); // Metin içindeki sırasını kaydet
            container.appendChild(span);
            charSpansInOrder.push(span);
        }
    });

    // Önceki listener'ları kaldır, sonra ekle (mükerrer eklemeyi önler)
    container.removeEventListener('click', handleCharClick);
    container.removeEventListener('click', handlePairedSpanClick);

    container.addEventListener('click', handleCharClick); // Tek tıklama ile seçim
    container.addEventListener('click', handlePairedSpanClick); // Eşleşmiş span'lere tıklama

    return charSpansInOrder;
}

/**
 * Uygulamanın seçim ve eşleştirme modunu etkinleştirir.
 */
function enablePairingMode() {
    processTextsBtn.disabled = true;
    englishInput.disabled = true;
    turkishInput.disabled = true;
    resetButton.disabled = false;
    saveSessionBtn.disabled = false;
    viewSessionsBtn.removeAttribute('disabled'); // 'disabled' HTML niteliğini kaldır
    clearEnglishSelectionBtn.disabled = false;
    clearTurkishSelectionBtn.disabled = false;
    // script.js - enablePairingMode fonksiyonu içinde
    clearTurkishSelectionBtn.disabled = false;
    exportSessionsBtn.disabled = false; // <<< BU SATIRI EKLEYİN <<<
    triggerImportBtn.removeAttribute('disabled'); // <<< BU SATIRI DİKKATLİCE GÜNCELLEYİN <<<
}

/**
 * Uygulamanın seçim ve eşleştirme modunu devre dışı bırakır.
 */
function disablePairingMode() {
    processTextsBtn.disabled = false;
    englishInput.disabled = false;
    turkishInput.disabled = false;
    resetButton.disabled = true;
    saveSessionBtn.disabled = true;
    viewSessionsBtn.setAttribute('disabled', 'true'); // 'disabled' HTML niteliğini ekle
    clearEnglishSelectionBtn.disabled = true;
    clearTurkishSelectionBtn.disabled = true;
    // script.js - disablePairingMode fonksiyonu içinde
    clearTurkishSelectionBtn.disabled = true;
    exportSessionsBtn.disabled = true; // <<< BU SATIRI EKLEYİN <<<
    triggerImportBtn.setAttribute('disabled', 'true'); // <<< BU SATIRI DİKKATLİCE GÜNCELLEYİN <<<
}

// ### Metin İşleme ve Yükleme ###

/**
 * Metinleri hazırlar ve tıklanabilir hale getirir.
 * @param {string} englishText Metin kutusundan alınan İngilizce metin.
 * @param {string} turkishText Metin kutusundan alınan Türkçe metin.
 * @param {Array} [initialPairedElements=[]] Yüklenecek eşleşme verileri.
 */
function processAndDisplayTexts(englishText, turkishText, initialPairedElements = []) {
    statusMessage.textContent = ''; // Durum mesajını temizle
    resetSelections(); // Mevcut geçici seçimleri sıfırla

    englishDisplay.innerHTML = '';
    turkishDisplay.innerHTML = '';

    const englishCharSpans = createClickableSpans(englishText, englishDisplay, 'en');
    const turkishCharSpans = createClickableSpans(turkishText, turkishDisplay, 'tr');

    // Kaydedilmiş eşleşmeleri yeniden uygula
    pairedElements = []; // Temizle
    currentColorIndex = 0; // Renk indeksini sıfırla

    initialPairedElements.forEach(savedPair => {
        const colorClass = savedPair.colorClass;
        const newPairId = pairedElements.length;

        const engSpansInPair = [];
        savedPair.engRanges.forEach(([startIdx, endIdx]) => {
            for (let i = startIdx; i <= endIdx; i++) {
                const span = englishCharSpans.find(s => parseInt(s.dataset.index) === i);
                if (span && span.tagName !== 'BR') { // BR'leri eşleşmeye dahil etme
                    span.classList.add(colorClass);
                    span.classList.add('paired');
                    span.classList.add('paired-bg'); // Yeni arka plan sınıfı
                    span.dataset.pairId = newPairId;
                    engSpansInPair.push(span);
                }
            }
        });

        const turSpansInPair = [];
        savedPair.turRanges.forEach(([startIdx, endIdx]) => {
            for (let i = startIdx; i <= endIdx; i++) {
                const span = turkishCharSpans.find(s => parseInt(s.dataset.index) === i);
                if (span && span.tagName !== 'BR') { // BR'leri eşleşmeye dahil etme
                    span.classList.add(colorClass);
                    span.classList.add('paired');
                    span.classList.add('paired-bg'); // Yeni arka plan sınıfı
                    span.dataset.pairId = newPairId;
                    turSpansInPair.push(span);
                }
            }
        });

        pairedElements.push({
            pairId: newPairId,
            colorClass: colorClass,
            eng: engSpansInPair, // Tüm bağlı span referansları
            tur: turSpansInPair,
            engRanges: savedPair.engRanges, // Orijinal aralık verileri (kayıt/yükleme için)
            turRanges: savedPair.turRanges
        });
        currentColorIndex++;
    });

    enablePairingMode();
}

// ### Karakter Bazlı Çoklu Seçim Mantığı (Tıklama Tabanlı) ###

function handleCharClick(event) {
    const clickedSpan = event.target;

    if (!clickedSpan.classList.contains('char-span')) {
        // Eğer tıklanan element char-span değilse (örn: boş alana tıklama), bekleyen seçimi iptal et
        if (clickedSpan.parentElement === englishDisplay) {
            pendingEnglishSelectionStart = null;
            // Not: Bu kısımda `clearSelectionInLanguage('en')` çağırmıyoruz
            // çünkü boşluğa tıklama mevcut çoklu seçimi silmemeli, sadece pending'i sıfırlamalı.
        } else if (clickedSpan.parentElement === turkishDisplay) {
            pendingTurkishSelectionStart = null;
            // Not: Bu kısımda `clearSelectionInLanguage('tr')` çağırmıyoruz
        }
        updatePairButtonState(); // Buton durumunu güncelle
        return;
    }

    // Eğer tıklanan span zaten eşleşmiş bir çiftin parçasıysa, sadece vurgulama/seslendirme yap
    if (clickedSpan.classList.contains('paired')) {
        handlePairedSpanClick(event);
        return;
    }

    const lang = clickedSpan.dataset.lang;
    let pendingStart = (lang === 'en') ? pendingEnglishSelectionStart : pendingTurkishSelectionStart;
    let selectedSpans = (lang === 'en') ? selectedEnglishSpans : selectedTurkishSpans;
    const allSpans = Array.from((lang === 'en' ? englishDisplay : turkishDisplay).querySelectorAll('.char-span, br'));

    if (pendingStart === null) { // Seçim başlangıcı (ilk tıklama)
        // Eğer zaten seçiliyse ve yeni bir aralık başlamıyorsa, seçimden kaldır
        if (selectedSpans.has(clickedSpan)) {
            clickedSpan.classList.remove('selected');
            selectedSpans.delete(clickedSpan);
        } else {
            // Seçili değilse, yeni bir aralık başlangıcı olarak işaretle
            pendingStart = clickedSpan;
            if (lang === 'en') {
                pendingEnglishSelectionStart = clickedSpan;
            } else {
                pendingTurkishSelectionStart = clickedSpan;
            }
            clickedSpan.classList.add('selected');
            selectedSpans.add(clickedSpan); // Tek bir karakter seçimi olarak ekle
        }
    } else { // Seçim sonu (ikinci tıklama)
        const startIndex = parseInt(pendingStart.dataset.index);
        const endIndex = parseInt(clickedSpan.dataset.index);

        const actualStart = Math.min(startIndex, endIndex);
        const actualEnd = Math.max(startIndex, endIndex);

        // Bekleyen başlangıç span'ini de seçili hale getir (tek tıklama ile başlamışsa)
        if (!selectedSpans.has(pendingStart) && pendingStart.tagName !== 'BR' && !pendingStart.classList.contains('paired')) {
            pendingStart.classList.add('selected');
            selectedSpans.add(pendingStart);
        }

        // Aralıktaki tüm span'leri seçime ekle
        for (let i = actualStart; i <= actualEnd; i++) {
            const span = allSpans.find(s => parseInt(s.dataset.index) === i);
            // Sadece char-span'leri ve eşleşmemiş olanları seçime dahil et
            if (span && span.tagName !== 'BR' && !span.classList.contains('paired')) {
                span.classList.add('selected');
                selectedSpans.add(span);
            }
        }
        // Bekleyen seçimi sıfırla
        if (lang === 'en') {
            pendingEnglishSelectionStart = null;
        } else {
            pendingTurkishSelectionStart = null;
        }
    }

    updatePairButtonState();
}

/**
 * Belirli bir dildeki tüm geçici seçimleri temizler.
 * @param {string} langToClear 'en' veya 'tr'.
 */
function clearSelectionInLanguage(langToClear) {
    let spansToClear = [];
    if (langToClear === 'en') {
        spansToClear = Array.from(selectedEnglishSpans);
        selectedEnglishSpans.clear();
        pendingEnglishSelectionStart = null;
    } else if (langToClear === 'tr') {
        spansToClear = Array.from(selectedTurkishSpans);
        selectedTurkishSpans.clear();
        pendingTurkishSelectionStart = null;
    }
    spansToClear.forEach(span => span.classList.remove('selected'));
    updatePairButtonState();
}

/**
 * Tüm geçici seçimleri sıfırlar (hem İngilizce hem Türkçe).
 * Bu, `processAndDisplayTexts` veya `resetApp` gibi tüm seçimi temizlemek istendiğinde kullanılır.
 */
function resetSelections() {
    clearSelectionInLanguage('en');
    clearSelectionInLanguage('tr');
}


// ### Eşleştirme Mantığı ###

/**
 * Seçili ifadeleri eşleştirir ve renklendirir.
 */
function pairSelected() {
    if (selectedEnglishSpans.size === 0 || selectedTurkishSpans.size === 0) {
        statusMessage.textContent = 'Lütfen hem İngilizce hem de Türkçe metinden ifade seçin.';
        setTimeout(() => statusMessage.textContent = '', 3000);
        return;
    }

    const colorClass = colorClasses[currentColorIndex % colorClasses.length];
    const newPairId = pairedElements.length;

    // Seçilen span'leri gruplayarak ardışık aralıkları bul
    const engRanges = getContiguousRanges(Array.from(selectedEnglishSpans));
    const turRanges = getContiguousRanges(Array.from(selectedTurkishSpans));

    if (engRanges.length === 0 || turRanges.length === 0) {
        statusMessage.textContent = 'Geçerli bir seçim bulunamadı (eşleşmiş kısımlar veya sadece boşluklar seçilemez).';
        setTimeout(() => statusMessage.textContent = '', 3000);
        return;
    }

    // Seçilen tüm span'leri renklendir ve pairId ata
    Array.from(selectedEnglishSpans).forEach(span => {
        if (!span.classList.contains('paired')) { // Zaten eşleşmişse tekrar işaretleme
            span.classList.remove('selected');
            span.classList.add(colorClass);
            span.classList.add('paired');
            span.classList.add('paired-bg'); // Yeni arka plan sınıfı
            span.dataset.pairId = newPairId;
        }
    });

    Array.from(selectedTurkishSpans).forEach(span => {
        if (!span.classList.contains('paired')) {
            span.classList.remove('selected');
            span.classList.add(colorClass);
            span.classList.add('paired');
            span.classList.add('paired-bg'); // Yeni arka plan sınıfı
            span.dataset.pairId = newPairId;
        }
    });

    // Eşleşmeyi kaydet (şimdi birden çok aralık içerebilir)
    pairedElements.push({
        pairId: newPairId,
        colorClass: colorClass,
        eng: Array.from(selectedEnglishSpans), // Referansları da tut
        tur: Array.from(selectedTurkishSpans),
        engRanges: engRanges, // Kaydedilecek aralıklar
        turRanges: turRanges
    });

    // Seçimleri sıfırla ve buton durumunu güncelle
    resetSelections(); // Her iki dildeki seçimleri de temizle
    currentColorIndex++;
    statusMessage.textContent = 'İfadeler başarıyla eşleştirildi!';
    setTimeout(() => statusMessage.textContent = '', 2000);
}

/**
 * Bir dizi span'den ardışık aralıkları bulur.
 * @param {Array<HTMLElement>} spans Seçili span elemanları.
 * @returns {Array<[number, number]>} Ardışık aralıkların listesi [[startIdx, endIdx]].
 */
function getContiguousRanges(spans) {
    if (spans.length === 0) return [];

    // dataset.index'e göre sırala
    const sortedSpans = [...spans].sort((a, b) => parseInt(a.dataset.index) - parseInt(b.dataset.index));
    const ranges = [];

    // Geçici olarak tüm orijinal düğümleri alalım (char-span ve br)
    const parentContainer = sortedSpans[0].parentElement;
    const allNodes = Array.from(parentContainer.childNodes);

    let currentRangeStart = parseInt(sortedSpans[0].dataset.index);
    let currentRangeEnd = parseInt(sortedSpans[0].dataset.index);

    for (let i = 1; i < sortedSpans.length; i++) {
        const currentSpan = sortedSpans[i];
        const currentIdx = parseInt(currentSpan.dataset.index);

        // Önceki span ile şimdiki span arasındaki boşlukları kontrol et
        let isDirectlyContiguous = true;
        for (let j = currentRangeEnd + 1; j < currentIdx; j++) {
            const intermediateNode = allNodes.find(node => parseInt(node.dataset?.index) === j);
            // Eğer arada bir düğüm yoksa VEYA düğüm BR ya da boşluk karakteri değilse VEYA eşleşmiş bir span ise
            if (!intermediateNode || (intermediateNode.tagName !== 'BR' && !intermediateNode.classList.contains('whitespace')) || intermediateNode.classList.contains('paired')) {
                isDirectlyContiguous = false;
                break;
            }
        }

        if (isDirectlyContiguous) {
            currentRangeEnd = currentIdx;
        } else {
            // Yeni bir aralık başlat
            ranges.push([currentRangeStart, currentRangeEnd]);
            currentRangeStart = currentIdx;
            currentRangeEnd = currentIdx;
        }
    }
    ranges.push([currentRangeStart, currentRangeEnd]); // Son aralığı ekle

    return ranges;
}


/**
 * Eşleştirme butonu durumunu günceller.
 */
function updatePairButtonState() {
    if (selectedEnglishSpans.size > 0 && selectedTurkishSpans.size > 0) {
        pairButton.disabled = false;
    } else {
        pairButton.disabled = true;
    }
}

/**
 * Eşleşmiş bir span'e tıklandığında vurgulama ve seslendirme yapar.
 * @param {Event} event Olay nesnesi.
 */
function handlePairedSpanClick(event) {
    const clickedSpan = event.target;

    // Sadece .paired sınıfına sahip char-span elementlerine tepki ver
    if (!clickedSpan.classList.contains('char-span') || !clickedSpan.classList.contains('paired')) {
        return;
    }

    const lang = clickedSpan.dataset.lang;
    const pairId = clickedSpan.dataset.pairId;

    if (pairId !== undefined) {
        const pairedInfo = pairedElements[parseInt(pairId)]; // Eşleşen bilgiyi al

        if (pairedInfo) {
            // Eşleşen tüm span'leri vurgula
            pairedInfo.eng.forEach(s => {
                s.classList.add('highlight-effect');
                setTimeout(() => s.classList.remove('highlight-effect'), 500);
            });
            pairedInfo.tur.forEach(s => {
                s.classList.add('highlight-effect');
                setTimeout(() => s.classList.remove('highlight-effect'), 500);
            });

            // İngilizce olanı seslendir
            if (lang === 'en') {
                // Seçilen karakterlerden oluşan metni birleştir
                // `pairedInfo.eng` içindeki span'ler zaten doğru sıradadır (oluşturulma sırası)
                const phraseToSpeak = pairedInfo.eng
                    .map(s => s.textContent)
                    .join('');
                speakText(phraseToSpeak);
            }
        }
    }
}

/**
 * Web Speech API kullanarak metni seslendirir.
 * @param {string} text Seslendirilecek metin.
 */
function speakText(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';

        const preferredVoice = speechVoices.find(voice =>
            (voice.lang === 'en-US' && (voice.name.includes('Google') || voice.name.includes('Microsoft')))
        );
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        } else {
            const fallbackVoice = speechVoices.find(voice => voice.lang === 'en-US');
            if (fallbackVoice) {
                utterance.voice = fallbackVoice;
            } else {
                console.warn('Hiçbir en-US sesi bulunamadı.');
            }
        }

        utterance.pitch = 1;
        utterance.rate = 1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    } else {
        console.warn('Tarayıcınız SpeechSynthesis API\'sini desteklemiyor.');
        statusMessage.textContent = 'Seslendirme tarayıcınız tarafından desteklenmiyor.';
        setTimeout(() => statusMessage.textContent = '', 3000);
    }
}

// ### Depolama (localStorage) Mantığı ###

const STORAGE_KEY = 'linguaLinkSessions';

/**
 * Tüm kaydedilmiş dersleri localStorage'dan alır.
 * @returns {Array<Object>} Kaydedilmiş derslerin listesi.
 */
function getSavedSessions() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

/**
 * Kaydedilmiş dersleri localStorage'a kaydeder.
 * @param {Array<Object>} sessions Kaydedilecek derslerin listesi.
 */
function saveSessions(sessions) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

/**
 * Mevcut dersi localStorage'a kaydeder.
 */
function saveCurrentSession() {
    const englishText = englishInput.value.trim();
    const turkishText = turkishInput.value.trim();

    if (!englishText || !turkishText || pairedElements.length === 0) {
        statusMessage.textContent = 'Lütfen metinleri girin ve en az bir eşleştirme yapın.';
        setTimeout(() => statusMessage.textContent = '', 3000);
        return;
    }

    const sessionName = prompt('Ders için bir isim girin:');
    if (!sessionName || sessionName.trim() === '') {
        statusMessage.textContent = 'Ders kaydedilmedi (isim boş bırakılamaz).';
        setTimeout(() => statusMessage.textContent = '', 3000);
        return;
    }

    // pairedElements'i serializable bir formata dönüştür
    // Sadece engRanges ve turRanges'i kaydediyoruz, DOM referanslarını değil.
    const serializablePairs = pairedElements.map(pair => ({
        colorClass: pair.colorClass,
        engRanges: pair.engRanges,
        turRanges: pair.turRanges
    }));

    const newSession = {
        id: generateUUID(),
        name: sessionName,
        englishText: englishText,
        turkishText: turkishText,
        pairs: serializablePairs,
        createdAt: new Date().toLocaleString()
    };

    const allSessions = getSavedSessions();
    allSessions.push(newSession);
    saveSessions(allSessions);
    statusMessage.textContent = `Ders "${sessionName}" başarıyla kaydedildi!`;
    setTimeout(() => statusMessage.textContent = '', 2000);
}

/**
 * Belirli bir dersi yükler.
 * @param {string} sessionId Yüklenecek dersin ID'si.
 */
function loadSession(sessionId) {
    const allSessions = getSavedSessions();
    const sessionToLoad = allSessions.find(session => session.id === sessionId);

    if (sessionToLoad) {
        englishInput.value = sessionToLoad.englishText;
        turkishInput.value = sessionToLoad.turkishText;
        processAndDisplayTexts(sessionToLoad.englishText, sessionToLoad.turkishText, sessionToLoad.pairs);
        statusMessage.textContent = `Ders "${sessionToLoad.name}" yüklendi.`;
        setTimeout(() => statusMessage.textContent = '', 2000);
    } else {
        statusMessage.textContent = 'Ders bulunamadı.';
        setTimeout(() => statusMessage.textContent = '', 2000);
    }
}

// script.js - loadSession fonksiyonundan sonra veya uygun bir yere ekleyin

/**
 * Tüm kaydedilmiş dersleri bir JSON dosyası olarak dışa aktarır.
 */
function exportSessions() {
    const allSessions = getSavedSessions();
    if (allSessions.length === 0) {
        statusMessage.textContent = 'Dışa aktarılacak ders bulunmamaktadır.';
        setTimeout(() => statusMessage.textContent = '', 2000);
        return;
    }

    const dataStr = JSON.stringify(allSessions, null, 2); // JSON'ı daha okunur hale getir
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `linguajournal_backup_${new Date().toISOString().split('T')[0]}.json`; // Örn: linguajournal_backup_2024-05-25.json
    document.body.appendChild(a); // Elementi DOM'a ekle (görünmez)
    a.click(); // Otomatik tıklama ile indirimi başlat
    document.body.removeChild(a); // Elementi DOM'dan kaldır
    URL.revokeObjectURL(url); // Bellek sızıntısını önle

    statusMessage.textContent = 'Tüm dersler başarıyla dışa aktarıldı!';
    setTimeout(() => statusMessage.textContent = '', 2000);
}

/**
 * Bir JSON dosyasından dersleri içe aktarır.
 */
function importSessions(event) {
    const file = event.target.files[0];
    if (!file) {
        statusMessage.textContent = 'Dosya seçilmedi.';
        setTimeout(() => statusMessage.textContent = '', 2000);
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const importedSessions = JSON.parse(e.target.result);
            if (!Array.isArray(importedSessions)) {
                throw new Error('İçe aktarılan dosya geçerli bir ders listesi içermiyor.');
            }

            const existingSessions = getSavedSessions();
            let importedCount = 0;
            let skippedCount = 0;

            importedSessions.forEach(newSession => {
                // Eğer aynı ID'ye sahip bir ders zaten varsa atla (veya güncelleme mantığı ekleyebiliriz)
                if (!existingSessions.some(s => s.id === newSession.id)) {
                    existingSessions.push(newSession);
                    importedCount++;
                } else {
                    skippedCount++;
                }
            });

            saveSessions(existingSessions); // Güncellenmiş listeyi kaydet
            statusMessage.textContent = `Başarıyla ${importedCount} ders içe aktarıldı. ${skippedCount} ders atlandı.`;
            setTimeout(() => statusMessage.textContent = '', 4000);
        } catch (error) {
            statusMessage.textContent = 'Dosya okunamadı veya formatı hatalı: ' + error.message;
            setTimeout(() => statusMessage.textContent = '', 4000);
        }
    };
    reader.readAsText(file); // Dosyayı metin olarak oku
}

/**
 * Tüm uygulamayı sıfırlar.
 */
function resetApp() {
    englishInput.value = '';
    turkishInput.value = '';
    englishDisplay.innerHTML = '';
    turkishDisplay.innerHTML = '';

    resetSelections(); // Seçili spanleri temizle (her iki dilde de)
    currentColorIndex = 0;
    pairedElements = [];

    disablePairingMode(); // Butonları ve girişleri devre dışı bırak
    statusMessage.textContent = 'Uygulama sıfırlandı. Yeni metinler girebilirsiniz.';
    setTimeout(() => statusMessage.textContent = '', 2000);

    // Tüm event listener'ları kaldır (yalnızca text-display'lerden)
    englishDisplay.removeEventListener('click', handleCharClick);
    englishDisplay.removeEventListener('click', handlePairedSpanClick);
    turkishDisplay.removeEventListener('click', handleCharClick);
    turkishDisplay.removeEventListener('click', handlePairedSpanClick);
}

// ### Event Listener'lar ###
processTextsBtn.addEventListener('click', () => {
    const englishText = englishInput.value.trim();
    const turkishText = turkishInput.value.trim();
    if (!englishText || !turkishText) {
        statusMessage.textContent = 'Lütfen her iki metin kutusunu da doldurun.';
        setTimeout(() => statusMessage.textContent = '', 3000);
        return;
    }
    processAndDisplayTexts(englishText, turkishText);
});
pairButton.addEventListener('click', pairSelected);
saveSessionBtn.addEventListener('click', saveCurrentSession);
resetButton.addEventListener('click', resetApp);

// Yeni "Seçimi Temizle" butonları için listener'lar
clearEnglishSelectionBtn.addEventListener('click', () => clearSelectionInLanguage('en'));
clearTurkishSelectionBtn.addEventListener('click', () => clearSelectionInLanguage('tr'));


// Uygulama yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    disablePairingMode(); // Başlangıçta butonları devre dışı bırak

    // URL'den loadSession parametresini kontrol et
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdToLoad = urlParams.get('loadSession');

    if (sessionIdToLoad) {
        loadSession(sessionIdToLoad);
        // URL'yi temizle (history API ile)
        history.replaceState({}, document.title, window.location.pathname);
    }
});

// script.js - En alttaki event listener'lar bölümüne ekleyin
// Yeni "Dışa Aktar" ve "İçe Aktar" butonları için listener'lar
exportSessionsBtn.addEventListener('click', exportSessions);
// triggerImportBtn.addEventListener('click', () => importSessionsFile.click()); // <<< BU SATIRI SİLİN <<<
importSessionsFile.addEventListener('change', importSessions); // <<< BU SATIR KALACAK >>>