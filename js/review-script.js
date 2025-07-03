// review-script.js

document.addEventListener('DOMContentLoaded', () => {
    const reviewListContainer = document.getElementById('reviewListContainer');
    const loadingMessage = document.getElementById('loadingMessage');
    const STORAGE_KEY = 'linguaLinkSessions'; // Ana uygulamayla aynı olmalı

    let speechVoices = [];

    function populateVoiceList() {
        speechVoices = window.speechSynthesis.getVoices();
    }

    if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = populateVoiceList;
        populateVoiceList();
    }

    function getSavedSessions() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

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
                }
            }
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
        } else {
            console.warn('Tarayıcınız SpeechSynthesis API\'sini desteklemiyor.');
        }
    }

    function renderReviewList() {
        const allSessions = getSavedSessions();
        if (allSessions.length === 0) {
            loadingMessage.textContent = "Tekrar edilecek kayıtlı ders bulunamadı.";
            return;
        }

        // 1. Eşleşmeleri saymak için bir Map oluştur
        const pairCountsMap = new Map();

        allSessions.forEach(session => {
            if (!session.pairs || !session.englishText || !session.turkishText) return;

            const engChars = session.englishText.split('');
            const turChars = session.turkishText.split('');

            session.pairs.forEach(pairData => {
                let engPhrase = "";
                if (pairData.engRanges) {
                    pairData.engRanges.forEach(([startIdx, endIdx]) => {
                        for (let i = startIdx; i <= endIdx; i++) {
                            if (engChars[i] && engChars[i] !== '\n') engPhrase += engChars[i];
                        }
                        engPhrase += " ";
                    });
                }

                let turPhrase = "";
                if (pairData.turRanges) {
                    pairData.turRanges.forEach(([startIdx, endIdx]) => {
                        for (let i = startIdx; i <= endIdx; i++) {
                            if (turChars[i] && turChars[i] !== '\n') turPhrase += turChars[i];
                        }
                        turPhrase += " ";
                    });
                }

                engPhrase = engPhrase.trim();
                turPhrase = turPhrase.trim();

                if (engPhrase && turPhrase) {
                    // 2. Her çift için benzersiz bir anahtar oluştur
                    const uniqueKey = `${engPhrase.toLowerCase()}|||${turPhrase.toLowerCase()}`;

                    if (pairCountsMap.has(uniqueKey)) {
                        // Eğer haritada varsa, sayacını artır
                        pairCountsMap.get(uniqueKey).count++;
                    } else {
                        // Eğer yoksa, yeni bir giriş oluştur
                        pairCountsMap.set(uniqueKey, {
                            english: engPhrase,
                            turkish: turPhrase,
                            count: 1
                        });
                    }
                }
            });
        });

        // 3. Map'i bir diziye çevir ve en çok tekrar edilene göre sırala
        const allPairedItems = Array.from(pairCountsMap.values());
        allPairedItems.sort((a, b) => b.count - a.count);

        if (allPairedItems.length === 0) {
            loadingMessage.textContent = "Tekrar edilecek eşleşmiş ifade bulunamadı.";
            return;
        }

        reviewListContainer.innerHTML = '';

        // 4. Sıralanmış listeyi ekrana bas
        allPairedItems.forEach(item => {
            const reviewItemDiv = document.createElement('div');
            reviewItemDiv.className = 'review-item';

            const englishDiv = document.createElement('div');
            englishDiv.className = 'review-english';

            const englishTextSpan = document.createElement('span'); // Sadece metin için span
            englishTextSpan.textContent = item.english;

            englishDiv.appendChild(englishTextSpan);

            // Eğer sayaç 1'den büyükse, sayacı gösteren span'i ekle
            if (item.count > 1) {
                const countSpan = document.createElement('span');
                countSpan.className = 'review-item-count';
                countSpan.textContent = `(x${item.count})`;
                countSpan.title = `Bu ifade ${item.count} kez kaydedilmiş.`;
                englishDiv.appendChild(countSpan);
            }

            englishDiv.title = 'Dinlemek için tıkla';
            englishDiv.addEventListener('click', () => {
                speakText(item.english);
            });

            const turkishDiv = document.createElement('div');
            turkishDiv.className = 'review-turkish';
            turkishDiv.textContent = item.turkish;

            reviewItemDiv.appendChild(englishDiv);
            reviewItemDiv.appendChild(turkishDiv);
            reviewListContainer.appendChild(reviewItemDiv);
        });
    }

    renderReviewList();
});