// test-script.js

// DOM Elementlerini Seçme (test.html'e özgü)
const testSectionContainer = document.getElementById('testSectionContainer');
const testLoadingMessage = document.getElementById('testLoadingMessage');
const testArea = document.getElementById('testArea');
const questionText = document.getElementById('questionText');
const optionsContainer = document.getElementById('optionsContainer');
const feedbackText = document.getElementById('feedbackText');
const nextQuestionBtn = document.getElementById('nextQuestionBtn');
const endTestBtn = document.getElementById('endTestBtn'); // Ana sayfaya yönlendirecek
const testResultsContainer = document.getElementById('testResultsContainer');
const totalQuestions = document.getElementById('totalQuestions');
const correctAnswers = document.getElementById('correctAnswers');
const wrongAnswers = document.getElementById('wrongAnswers');
const accuracy = document.getElementById('accuracy');
const areasToImproveList = document.getElementById('areasToImproveList');
const backToLearnPageBtn = document.getElementById('backToLearnPageBtn');
const STATS_STORAGE_KEY = 'linguaLinkTestStats';


// Test Durumu İçin Global Değişkenler
let allPairedItemsForTest = [];
let currentTestQuestion = null;
let currentQuestionIndex = 0;
let testQuestions = [];
let userTestStats = {
    correct: 0,
    wrong: 0,
    totalAnswered: 0,
    questions: []
};
const NUM_OPTIONS = 5; // 1 doğru + 4 yanlış
const STORAGE_KEY = 'linguaLinkSessions'; // Ana uygulamayla aynı

// ### Yardımcı Fonksiyonlar (Gerekirse ana script'ten kopyalanabilir veya burada tanımlanabilir) ###
function generateUUID() { // Eğer ana script'te varsa, burada tekrar tanımlamaya gerek yok, ama güvenli olması için ekleyelim.
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getSavedSessions() { // Ana script'ten kopyalandı
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

/**
 * Tüm kaydedilmiş derslerden test için kullanılacak eşleşmeleri toplar.
 */
function gatherAllPairedItemsForTest() {
    allPairedItemsForTest = [];
    const allSessions = getSavedSessions();
    if (allSessions.length === 0) return false;

    allSessions.forEach(session => {
        const engChars = session.englishText.split('');
        const turChars = session.turkishText.split('');

        session.pairs.forEach(pairData => {
            let engPhrase = "";
            pairData.engRanges.forEach(([startIdx, endIdx]) => {
                for (let i = startIdx; i <= endIdx; i++) {
                    if (engChars[i] && engChars[i] !== '\n') engPhrase += engChars[i];
                }
                engPhrase += " "; // Aralıklar arasına boşluk
            });

            let turPhrase = "";
            pairData.turRanges.forEach(([startIdx, endIdx]) => {
                for (let i = startIdx; i <= endIdx; i++) {
                    if (turChars[i] && turChars[i] !== '\n') turPhrase += turChars[i];
                }
                turPhrase += " "; // Aralıklar arasına boşluk
            });

            engPhrase = engPhrase.trim();
            turPhrase = turPhrase.trim();

            if (engPhrase && turPhrase) {
                allPairedItemsForTest.push({
                    english: engPhrase,
                    turkish: turPhrase,
                    id: pairData.id || generateUUID() // Ders kaydında ID yoksa yeni üret
                });
            }
        });
    });

    return allPairedItemsForTest.length >= NUM_OPTIONS;
}

/**
 * Test için soruları hazırlar.
 */
function prepareTestQuestions() {
    testQuestions = [];
    const shuffledItems = [...allPairedItemsForTest].sort(() => 0.5 - Math.random());

    shuffledItems.forEach(item => {
        const askEnglish = Math.random() < 0.5;
        let question, correctAnswer, questionType;

        if (askEnglish) {
            question = item.english;
            correctAnswer = item.turkish;
            questionType = 'en_to_tr';
        } else {
            question = item.turkish;
            correctAnswer = item.english;
            questionType = 'tr_to_en';
        }

        const options = generateOptions(item, questionType);
        if (options.length === NUM_OPTIONS) {
            testQuestions.push({
                question,
                correctAnswer,
                options,
                questionType,
                originalItem: item
            });
        }
    });
}

/**
 * Belirli bir soru için yanlış şıklar üretir.
 */
function generateOptions(correctItem, questionType) {
    const options = new Set();
    options.add(questionType === 'en_to_tr' ? correctItem.turkish : correctItem.english);

    const otherItems = allPairedItemsForTest.filter(item => item.id !== correctItem.id);
    let attempts = 0; // Sonsuz döngüyü engelle

    while (options.size < NUM_OPTIONS && otherItems.length > 0 && attempts < allPairedItemsForTest.length * 2) {
        const randomIndex = Math.floor(Math.random() * otherItems.length);
        const randomItem = otherItems[randomIndex]; // Çıkarmadan al, tekrar kullanılabilir
        const optionToAdd = questionType === 'en_to_tr' ? randomItem.turkish : randomItem.english;
        if (optionToAdd.trim() !== "") { // Boş şık ekleme
            options.add(optionToAdd);
        }
        attempts++;
    }

    if (options.size < NUM_OPTIONS) return [];
    return Array.from(options).sort(() => 0.5 - Math.random());
}

/**
 * Test arayüzünü başlatır ve ilk soruyu yükler.
 */
function initializeTest() {
    if (!gatherAllPairedItemsForTest()) {
        testLoadingMessage.textContent = "Test için yeterli eşleşmiş ifade bulunmuyor (en az " + NUM_OPTIONS + " farklı eşleşme ve " + NUM_OPTIONS + " farklı şık üretilebilmeli). Lütfen daha fazla ders ekleyin ve eşleştirme yapın.";
        testLoadingMessage.style.color = "red";
        testArea.style.display = 'none';
        document.querySelector('.test-controls').style.display = 'none';
        return;
    }
    prepareTestQuestions();

    if (testQuestions.length === 0) {
        testLoadingMessage.textContent = "Test soruları oluşturulamadı. Veri setinizi kontrol edin.";
        testLoadingMessage.style.color = "red";
        return;
    }

    testLoadingMessage.style.display = 'none';
    testArea.style.display = 'block';
    document.querySelector('.test-controls').style.display = 'flex';
    testResultsContainer.style.display = 'none';
    feedbackText.textContent = '';

    currentQuestionIndex = 0;
    userTestStats = { correct: 0, wrong: 0, totalAnswered: 0, questions: [] };

    displayNextQuestion();
}

/**
 * Bir sonraki soruyu gösterir.
 */
function displayNextQuestion() {
    if (currentQuestionIndex >= testQuestions.length) {
        showTestResults();
        return;
    }

    currentTestQuestion = testQuestions[currentQuestionIndex];
    questionText.textContent = currentTestQuestion.question;
    optionsContainer.innerHTML = '';

    currentTestQuestion.options.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option;
        button.onclick = () => checkAnswer(option, button);
        optionsContainer.appendChild(button);
    });

    feedbackText.textContent = '';
    nextQuestionBtn.style.display = 'none';
    Array.from(optionsContainer.children).forEach(btn => btn.disabled = false);
}

/**
 * Kullanıcının cevabını kontrol eder.
 */
function checkAnswer(selectedOption, selectedButton) {
    const isCorrect = selectedOption === currentTestQuestion.correctAnswer;
    userTestStats.totalAnswered++;

    const questionStat = {
        question: currentTestQuestion.question,
        userAnswer: selectedOption,
        correctAnswer: currentTestQuestion.correctAnswer,
        isCorrect: isCorrect,
        originalItem: currentTestQuestion.originalItem
    };

    if (isCorrect) {
        userTestStats.correct++;
        feedbackText.textContent = "Doğru!";
        feedbackText.style.color = 'green';
        selectedButton.classList.add('correct');
    } else {
        userTestStats.wrong++;
        feedbackText.textContent = `Yanlış. Doğru cevap: ${currentTestQuestion.correctAnswer}`;
        feedbackText.style.color = 'red';
        selectedButton.classList.add('incorrect');
        Array.from(optionsContainer.children).forEach(btn => {
            if (btn.textContent === currentTestQuestion.correctAnswer) {
                btn.classList.add('correct');
            }
        });
    }
    userTestStats.questions.push(questionStat);

    // Genel test istatistiklerini güncelle
    updateGlobalTestStats(currentTestQuestion.originalItem.id, isCorrect);

    Array.from(optionsContainer.children).forEach(btn => btn.disabled = true);
    nextQuestionBtn.style.display = 'inline-block';
}

/**
 * Genel test istatistiklerini localStorage'da günceller.
 * @param {string} itemId Test edilen ifadenin ID'si.
 * @param {boolean} isCorrect Cevap doğru mu?
 */
function updateGlobalTestStats(itemId, isCorrect) {
    let stats = JSON.parse(localStorage.getItem(STATS_STORAGE_KEY)) || {};
    if (!stats[itemId]) {
        stats[itemId] = { correctCount: 0, wrongCount: 0, lastTested: new Date().toISOString() };
    }
    if (isCorrect) {
        stats[itemId].correctCount++;
    } else {
        stats[itemId].wrongCount++;
    }
    stats[itemId].lastTested = new Date().toISOString();
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
}

/**
 * Test sonuçlarını gösterir.
 */
function showTestResults() {
    testArea.style.display = 'none';
    document.querySelector('.test-controls').style.display = 'none';
    testResultsContainer.style.display = 'block';

    totalQuestions.textContent = `Toplam Cevaplanan Soru: ${userTestStats.totalAnswered}`;
    correctAnswers.textContent = `Doğru Cevap Sayısı: ${userTestStats.correct}`;
    wrongAnswers.textContent = `Yanlış Cevap Sayısı: ${userTestStats.wrong}`;
    const acc = userTestStats.totalAnswered > 0 ? ((userTestStats.correct / userTestStats.totalAnswered) * 100).toFixed(2) : 0;
    accuracy.textContent = `Başarı Yüzdesi: %${acc}`;

    areasToImproveList.innerHTML = '';
    const globalStats = JSON.parse(localStorage.getItem(STATS_STORAGE_KEY)) || {};
    const itemsToImprove = [];

    // Tüm test edilmiş ifadeler üzerinden geçerek yanlış oranı yüksek olanları bul
    for (const itemId in globalStats) {
        const stat = globalStats[itemId];
        const totalAnswersForItem = stat.correctCount + stat.wrongCount;
        if (totalAnswersForItem > 0 && stat.wrongCount > 0) { // Sadece en az bir kez cevaplanmış ve yanlış yapılmışsa
            // İfadeyi bulmak için allPairedItemsForTest'i kullan (bu liste test başında doluyor)
            const originalItem = allPairedItemsForTest.find(item => item.id === itemId);
            if (originalItem) {
                itemsToImprove.push({
                    ...originalItem,
                    wrongCount: stat.wrongCount,
                    correctCount: stat.correctCount,
                    accuracy: totalAnswersForItem > 0 ? (stat.correctCount / totalAnswersForItem) * 100 : 0
                });
            }
        }
    }

    itemsToImprove.sort((a, b) => b.wrongCount - a.wrongCount || a.accuracy - b.accuracy);
    if (itemsToImprove.length === 0 && userTestStats.totalAnswered > 0 && userTestStats.wrong === 0) {
        const li = document.createElement('li');
        li.textContent = "Harika! Bu testteki tüm soruları doğru cevapladınız ve genel olarak da iyi durumdasınız.";
        li.style.color = "green";
        areasToImproveList.appendChild(li);
    } else if (itemsToImprove.length > 0) {
        itemsToImprove.slice(0, 10).forEach(item => { // En fazla 10 tanesini göster
            const li = document.createElement('li');
            li.innerHTML = `İfade: <span class="original-text">"${item.english} / ${item.turkish}"</span> <br>
                            <small>(Doğru: ${item.correctCount}, Yanlış: ${item.wrongCount}, Başarı: %${item.accuracy.toFixed(0)})</small>`;
            areasToImproveList.appendChild(li);
        });
    } else if (userTestStats.totalAnswered === 0) {
        const li = document.createElement('li');
        li.textContent = "Hiç soru cevaplanmadı.";
        areasToImproveList.appendChild(li);
    }
}


// Event Listener'lar (test.html'e özgü)
nextQuestionBtn.addEventListener('click', () => {
    currentQuestionIndex++;
    displayNextQuestion();
});

endTestBtn.addEventListener('click', () => {
    // Testi bitir her zaman ana öğrenme sayfasına yönlendirir
    window.location.href = 'learn-english.html';
});

backToLearnPageBtn.addEventListener('click', () => {
    window.location.href = 'learn-english.html';
});


// Sayfa yüklendiğinde testi başlat
document.addEventListener('DOMContentLoaded', initializeTest);