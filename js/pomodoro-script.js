// pomodoro-script.js

// DOM Elementleri
const minutesSpan = document.getElementById('minutes');
const secondsSpan = document.getElementById('seconds');
const startStopBtn = document.getElementById('startStopBtn');
const resetBtn = document.getElementById('resetBtn');
const settingsBtn = document.getElementById('settingsBtn');
const modeButtons = document.querySelectorAll('.mode-btn');
const pomodoroCountSpan = document.getElementById('pomodoroCount');
const pomodoroStatusText = document.getElementById('pomodoroStatusText');
const startOverlay = document.getElementById('startOverlay');
const unlockAudioBtn = document.getElementById('unlockAudioBtn');

// Ayarlar Modalı Elementleri
const settingsModal = document.getElementById('settingsModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const pomodoroTimeInput = document.getElementById('pomodoroTime');
const shortBreakTimeInput = document.getElementById('shortBreakTime');
const longBreakTimeInput = document.getElementById('longBreakTime');
const autoStartBreaksInput = document.getElementById('autoStartBreaks');
const autoStartPomodorosInput = document.getElementById('autoStartPomodoros');
const longBreakIntervalInput = document.getElementById('longBreakInterval');
const alarmSoundSelect = document.getElementById('alarmSound');
const alarmVolumeInput = document.getElementById('alarmVolume');

// Zamanlayıcı Değişkenleri
let timerInterval = null;
let endTime = 0;
let remainingTime = 0;
let isRunning = false;
let currentMode = 'pomodoro';
let pomodoroCycle = 1;
let isAudioUnlocked = false;

// Ayarlar
let settings = {
    pomodoro: 25,
    shortBreak: 5,
    longBreak: 15,
    autoStartBreaks: false,
    autoStartPomodoros: false,
    longBreakInterval: 4,
    alarmSound: 'focusChime',
    alarmVolume: 0.5
};

// GÜVENİLİR VE ÇALIŞAN SES LİNKLERİ
const alarmSounds = {
    focusChime: new Audio('https://freesound.org/data/previews/629/629198_11271694-lq.mp3'),
    kitchen: new Audio('https://www.soundjay.com/buttons/sounds/button-37a.mp3'),
    digital: new Audio('https://www.soundjay.com/buttons/sounds/button-7.mp3'),
    bell: new Audio('https://www.soundjay.com/buttons/sounds/button-10.mp3')
};

// ### Fonksiyonlar ###

/**
 * Kullanıcının ilk etkileşimiyle seslerin "kilidini açar".
 */
function unlockAudio() {
    if (isAudioUnlocked) return;

    Object.values(alarmSounds).forEach(sound => {
        sound.volume = 0;
        sound.play().then(() => {
            sound.pause();
            sound.currentTime = 0;
        }).catch(error => { /* Hataları görmezden gel, bu sadece bir deneme */ });
    });
    isAudioUnlocked = true;
    console.log("Ses kilidi açıldı.");
}

function updateDisplay() {
    const minutes = Math.floor(remainingTime / 60000);
    const seconds = Math.floor((remainingTime % 60000) / 1000);
    minutesSpan.textContent = String(minutes).padStart(2, '0');
    secondsSpan.textContent = String(seconds).padStart(2, '0');
    document.title = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} - Pomodoro`;
}

function updatePomodoroCounter() {
    pomodoroCountSpan.textContent = `#${pomodoroCycle}`;
    if (currentMode === 'pomodoro') {
        pomodoroStatusText.textContent = 'Çalışma Zamanı';
    } else if (currentMode === 'shortBreak') {
        pomodoroStatusText.textContent = 'Kısa Mola';
    } else {
        pomodoroStatusText.textContent = 'Uzun Mola';
    }
}

function startTimer() {
    endTime = Date.now() + remainingTime;
    isRunning = true;
    startStopBtn.textContent = 'DURDUR';
    startStopBtn.classList.add('active');

    timerInterval = setInterval(() => {
        remainingTime = endTime - Date.now();
        if (remainingTime <= 0) {
            remainingTime = 0;
            updateDisplay();
            handleTimerEnd();
        } else {
            updateDisplay();
        }
    }, 250);
}

function handleTimerEnd() {
    stopTimer();
    playAlarmSound();

    if (currentMode === 'pomodoro') {
        if (pomodoroCycle > 0 && pomodoroCycle % settings.longBreakInterval === 0) {
            switchMode('longBreak');
        } else {
            switchMode('shortBreak');
        }
        pomodoroCycle++;
    } else {
        switchMode('pomodoro');
    }

    if ((currentMode === 'pomodoro' && settings.autoStartPomodoros) || (currentMode.includes('Break') && settings.autoStartBreaks)) {
        startTimer();
    }
}

function playAlarmSound() {
    if (!isAudioUnlocked) {
        console.warn("Ses izni alınmadığı için alarm çalınamadı. Lütfen sayfayla bir kez etkileşime geçin.");
        return;
    }
    const sound = alarmSounds[settings.alarmSound];
    if (!sound) {
        console.error("Seçili alarm sesi bulunamadı:", settings.alarmSound);
        return;
    }

    sound.volume = settings.alarmVolume;
    let playCount = 0;
    const maxPlays = 5;

    function playRepeat() {
        playCount++;
        if (playCount < maxPlays) {
            sound.currentTime = 0;
            sound.play().catch(error => console.error("Alarm tekrar çalınamadı:", error));
        } else {
            sound.removeEventListener('ended', playRepeat);
        }
    }

    sound.removeEventListener('ended', playRepeat);
    sound.addEventListener('ended', playRepeat);

    sound.currentTime = 0;
    sound.play().catch(error => {
        console.error("Alarm çalınamadı:", error);
    });
}

function stopTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    startStopBtn.textContent = 'BAŞLAT';
    startStopBtn.classList.remove('active');
    document.title = "Pomodoro Zamanlayıcı";
}

function switchMode(mode) {
    currentMode = mode;
    stopTimer();
    remainingTime = settings[mode] * 60 * 1000;
    modeButtons.forEach(button => button.classList.toggle('active', button.dataset.mode === mode));
    document.body.style.backgroundColor = `var(--${mode === 'pomodoro' ? 'bg-color' : (mode === 'shortBreak' ? 'secondary-accent' : 'accent-color')})`;
    updateDisplay();
    updatePomodoroCounter();
}

function resetTimer() {
    stopTimer();
    pomodoroCycle = 1;
    switchMode('pomodoro');
}

function loadSettings() {
    const savedSettings = JSON.parse(localStorage.getItem('pomodoroSettings'));
    if (savedSettings) {
        settings = { ...settings, ...savedSettings };
    }
    pomodoroTimeInput.value = settings.pomodoro;
    shortBreakTimeInput.value = settings.shortBreak;
    longBreakTimeInput.value = settings.longBreak;
    autoStartBreaksInput.checked = settings.autoStartBreaks;
    autoStartPomodorosInput.checked = settings.autoStartPomodoros;
    longBreakIntervalInput.value = settings.longBreakInterval;
    alarmSoundSelect.value = settings.alarmSound;
    alarmVolumeInput.value = settings.alarmVolume;
}

function saveSettings() {
    settings.pomodoro = parseInt(pomodoroTimeInput.value);
    settings.shortBreak = parseInt(shortBreakTimeInput.value);
    settings.longBreak = parseInt(longBreakTimeInput.value);
    settings.autoStartBreaks = autoStartBreaksInput.checked;
    settings.autoStartPomodoros = autoStartPomodorosInput.checked;
    settings.longBreakInterval = parseInt(longBreakIntervalInput.value);
    settings.alarmSound = alarmSoundSelect.value;
    settings.alarmVolume = parseFloat(alarmVolumeInput.value);

    localStorage.setItem('pomodoroSettings', JSON.stringify(settings));

    if (!isRunning) {
        switchMode(currentMode);
    }
    pomodoroCycle = 1;
    updatePomodoroCounter();
}

// ### Event Listener'lar ###

unlockAudioBtn.addEventListener('click', () => {
    unlockAudio();
    startOverlay.classList.add('hidden');
});

startStopBtn.addEventListener('click', () => {
    if (isRunning) {
        stopTimer();
    } else {
        startTimer();
    }
});

resetBtn.addEventListener('click', () => {
    resetTimer();
});

modeButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (isRunning && !confirm("Zamanlayıcı çalışırken modu değiştirmek mevcut ilerlemeyi sıfırlayacak. Devam etmek istiyor musunuz?")) {
            return;
        }
        switchMode(button.dataset.mode);
    });
});

settingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('visible');
});

closeModalBtn.addEventListener('click', () => {
    settingsModal.classList.remove('visible');
});

saveSettingsBtn.addEventListener('click', () => {
    saveSettings();
    settingsModal.classList.remove('visible');
});

window.addEventListener('click', (event) => {
    if (event.target === settingsModal) {
        settingsModal.classList.remove('visible');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    switchMode('pomodoro');
});