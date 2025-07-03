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

        const allPairedItems = [];

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
                        engPhrase += " "; // Aralıklar arasına boşluk
                    });
                }

                let turPhrase = "";
                if (pairData.turRanges) {
                    pairData.turRanges.forEach(([startIdx, endIdx]) => {
                        for (let i = startIdx; i <= endIdx; i++) {
                            if (turChars[i] && turChars[i] !== '\n') turPhrase += turChars[i];
                        }
                        turPhrase += " "; // Aralıklar arasına boşluk
                    });
                }

                engPhrase = engPhrase.trim();
                turPhrase = turPhrase.trim();

                if (engPhrase && turPhrase) {
                    allPairedItems.push({
                        english: engPhrase,
                        turkish: turPhrase
                    });
                }
            });
        });

        if (allPairedItems.length === 0) {
            loadingMessage.textContent = "Tekrar edilecek eşleşmiş ifade bulunamadı.";
            return;
        }

        // Listeyi render etmeden önce container'ı temizle
        reviewListContainer.innerHTML = '';

        allPairedItems.forEach(item => {
            const reviewItemDiv = document.createElement('div');
            reviewItemDiv.className = 'review-item';

            const englishDiv = document.createElement('div');
            englishDiv.className = 'review-english';
            englishDiv.textContent = item.english;
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