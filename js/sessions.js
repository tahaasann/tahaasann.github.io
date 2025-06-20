// localStorage anahtarı (ana uygulamayla aynı olmalı)
const STORAGE_KEY = 'linguaLinkSessions';

// DOM Elementlerini Seçme
const savedSessionsList = document.getElementById('savedSessionsList');
const noSessionsMessage = document.getElementById('noSessionsMessage');
const deleteAllSessionsBtn = document.getElementById('deleteAllSessionsBtn');

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
            listItem.dataset.sessionId = session.id; // Düzenleme modu için ID'yi li'ye ekle
            listItem.innerHTML = `
                <div class="session-details">
                    <div class="session-name-container">
                        <span class="session-name-text">${session.name}</span>
                        <input type="text" class="session-name-input" value="${session.name}" style="display: none;" />
                    </div>
                    <small class="session-date">(${session.createdAt})</small>
                </div>
                <div class="session-actions">
                    <button class="edit-btn" data-id="${session.id}" title="İsmi Düzenle">Düzenle</button>
                    <button class="load-btn" data-id="${session.id}" title="Yükle">Yükle</button>
                    <button class="delete-btn" data-id="${session.id}" title="Sil">Sil</button>
                    <button class="save-edit-btn" data-id="${session.id}" style="display: none;" title="Kaydet">Kaydet</button>
                    <button class="cancel-edit-btn" data-id="${session.id}" style="display: none;" title="İptal">İptal</button>
                </div>
            `;
            savedSessionsList.appendChild(listItem);
        });
    }
}

/**
 * Tüm kaydedilmiş dersleri siler.
 */
function deleteAllSessions() {
    if (getSavedSessions().length === 0) {
        alert("Silinecek ders bulunmamaktadır.");
        return;
    }
    if (confirm('TÜM kaydedilmiş dersleri silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) {
        if (confirm('Son bir kez soruyorum: GERÇEKTEN TÜM DERSLERİ SİLMEK İSTİYOR MUSUNUZ?')) {
            localStorage.removeItem(STORAGE_KEY); // Tüm dersleri sil
            localStorage.removeItem(STATS_STORAGE_KEY); // İlgili test istatistiklerini de sil
            renderSavedSessions(); // Listeyi güncelle (boşaltacak)
            alert("Tüm dersler ve ilgili test istatistikleri başarıyla silindi.");
        }
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
    const target = event.target.closest('button');
    if (!target) return;

    const sessionId = target.dataset.id;
    const listItem = target.closest('li');

    if (!sessionId || !listItem) return;

    const nameSpan = listItem.querySelector('.session-name-text');
    const nameInput = listItem.querySelector('.session-name-input');

    // Butonları göster/gizle yardımcı fonksiyonu
    const toggleEditModeView = (isEditing) => {
        listItem.querySelector('.edit-btn').style.display = isEditing ? 'none' : 'inline-flex';
        listItem.querySelector('.load-btn').style.display = isEditing ? 'none' : 'inline-flex';
        listItem.querySelector('.delete-btn').style.display = isEditing ? 'none' : 'inline-flex';
        listItem.querySelector('.save-edit-btn').style.display = isEditing ? 'inline-flex' : 'none';
        listItem.querySelector('.cancel-edit-btn').style.display = isEditing ? 'inline-flex' : 'none';

        nameSpan.style.display = isEditing ? 'none' : 'block'; // veya 'inline'
        nameInput.style.display = isEditing ? 'block' : 'none'; // veya 'inline-block'
        if (isEditing) {
            nameInput.value = nameSpan.textContent; // Input'u güncel span değeriyle doldur
            nameInput.focus();
            nameInput.select();
        }
    };

    if (target.classList.contains('load-btn')) {
        window.location.href = `learn-english.html?loadSession=${sessionId}`;
    } else if (target.classList.contains('delete-btn')) {
        deleteSession(sessionId); // Bu fonksiyon zaten saveSessions -> renderSavedSessions çağırıyor.
    } else if (target.classList.contains('edit-btn')) {
        toggleEditModeView(true);
    } else if (target.classList.contains('save-edit-btn')) {
        const newName = nameInput.value.trim();
        if (newName) {
            const allSessions = getSavedSessions();
            const sessionIndex = allSessions.findIndex(s => s.id === sessionId);
            if (sessionIndex > -1) {
                allSessions[sessionIndex].name = newName;
                saveSessions(allSessions); // Bu, renderSavedSessions'ı çağırarak arayüzü güncelleyecek
                // ve düzenleme modundan çıkılmış olacak.
            } else {
                toggleEditModeView(false); // Bir sorun olursa düzenleme modundan çık
            }
        } else {
            // İsim boş bırakılamaz uyarısı
            nameInput.style.borderColor = 'red';
            setTimeout(() => nameInput.style.borderColor = '#ccc', 2000);
        }
    } else if (target.classList.contains('cancel-edit-btn')) {
        toggleEditModeView(false);
        // Input değerini span'deki değere geri döndürmeye gerek yok çünkü renderSavedSessions her şeyi yeniden çizecek
        // ya da bir sonraki edit'te span'den alacak.
    }
});

// Yeni "Tüm Dersleri Sil" butonu için event listener
if (deleteAllSessionsBtn) { // Butonun varlığını kontrol et (önemli)
    deleteAllSessionsBtn.addEventListener('click', deleteAllSessions);
}

// Sayfa yüklendiğinde dersleri göster
document.addEventListener('DOMContentLoaded', renderSavedSessions);