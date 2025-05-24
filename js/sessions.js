// localStorage anahtarı (ana uygulamayla aynı olmalı)
const STORAGE_KEY = 'linguaLinkSessions';

// DOM Elementlerini Seçme
const savedSessionsList = document.getElementById('savedSessionsList');
const noSessionsMessage = document.getElementById('noSessionsMessage');

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
    renderSavedSessions(); // Listeyi yeniden çiz
}

/**
 * Kaydedilmiş dersleri listede gösterir.
 */
function renderSavedSessions() {
    const allSessions = getSavedSessions();
    savedSessionsList.innerHTML = ''; // Listeyi temizle

    if (allSessions.length === 0) {
        noSessionsMessage.style.display = 'block';
    } else {
        noSessionsMessage.style.display = 'none';
        allSessions.forEach(session => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <span>${session.name} <small>(${session.createdAt})</small></span>
                <div class="session-actions">
                    <button class="load-btn" data-id="${session.id}">Yükle</button>
                    <button class="delete-btn" data-id="${session.id}">Sil</button>
                </div>
            `;
            savedSessionsList.appendChild(listItem);
        });
    }
}

/**
 * Belirli bir dersi siler.
 * @param {string} sessionId Silinecek dersin ID'si.
 */
function deleteSession(sessionId) {
    if (!confirm('Bu dersi silmek istediğinize emin misiniz?')) {
        return;
    }
    const allSessions = getSavedSessions();
    const updatedSessions = allSessions.filter(session => session.id !== sessionId);
    saveSessions(updatedSessions); // Listeyi kaydet ve yeniden render et
}

// Event Delegation for Load/Delete buttons
savedSessionsList.addEventListener('click', (event) => {
    const target = event.target;
    const sessionId = target.dataset.id;

    if (!sessionId) return; // Eğer data-id yoksa bir şey yapma

    if (target.classList.contains('load-btn')) {
        // index.html'e yönlendir ve session ID'sini URL parametresi olarak gönder
        window.location.href = `learn-english.html?loadSession=${sessionId}`;
    } else if (target.classList.contains('delete-btn')) {
        deleteSession(sessionId);
    }
});

// Sayfa yüklendiğinde dersleri göster
document.addEventListener('DOMContentLoaded', renderSavedSessions);