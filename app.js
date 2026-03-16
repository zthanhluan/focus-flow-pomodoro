// --- Constants (Now dynamic based on inputs) ---
const getFocusTime = () => (parseInt(document.getElementById('focus-input').value) || 53) * 60;
const getBreakTime = () => (parseInt(document.getElementById('break-input').value) || 7) * 60;

// --- State ---
let timeLeft = getFocusTime();
let timerId = null;
let isFocus = true;
let tasks = JSON.parse(localStorage.getItem('focusflow_tasks')) || [];
let activeTaskId = localStorage.getItem('focusflow_active_task') || null;
let isSynced = localStorage.getItem('focusflow_synced') === 'true';

// Gamification State
let totalFocusMinutes = parseInt(localStorage.getItem('focusflow_total_mins')) || 0;
let streak = parseInt(localStorage.getItem('focusflow_streak')) || 0;
let lastFocusDate = localStorage.getItem('focusflow_last_date') || null; // YYYY-MM-DD

const RANKS = [
    { name: 'Novice', min: 0 },
    { name: 'Student', min: 60 },
    { name: 'Scholar', min: 300 },
    { name: 'Expert', min: 1200 },
    { name: 'Master', min: 3000 },
    { name: 'Zen Sage', min: 6000 }
];

// Default Links
const DEFAULT_FOCUS_MUSIC = 'https://www.youtube.com/watch?v=_4kHxtiuML0'; // New Focus Music
const DEFAULT_BREAK_MUSIC = 'https://www.youtube.com/watch?v=m8PILb6pHqw'; // Relaxing Nature
const DEFAULT_BG_IMAGE = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=1920';

let focusMusicUrl = localStorage.getItem('focusflow_focus_music') || DEFAULT_FOCUS_MUSIC;
let breakMusicUrl = localStorage.getItem('focusflow_break_music') || DEFAULT_BREAK_MUSIC;
let bgUrl = localStorage.getItem('focusflow_bg_url') || DEFAULT_BG_IMAGE;
let isDarkMode = localStorage.getItem('focusflow_dark_mode') === 'true';
let player = null;
let apiReady = false;

// --- Elements ---
const timerDisplay = document.getElementById('timer-display');
const statusLabel = document.getElementById('status-label');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const statsBtn = document.getElementById('stats-btn');
const themeToggle = document.getElementById('theme-toggle');
const moonIcon = document.getElementById('moon-icon');
const sunIcon = document.getElementById('sun-icon');
const streakCountEl = document.getElementById('streak-count');
const rankNameEl = document.getElementById('rank-name');
const rankBadgeEl = document.getElementById('rank-badge');
const notifSound = document.getElementById('notif-sound');
const modal = document.getElementById('modal-overlay');
const closeModal = document.getElementById('close-modal');
const subscribeForm = document.getElementById('subscribe-form');
const formMessage = document.getElementById('form-message');
const shareContainer = document.getElementById('share-container');
const whatsappBtn = document.getElementById('share-whatsapp');
const twitterBtn = document.getElementById('share-twitter');
const taskInput = document.getElementById('task-input');
const addTaskBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');
const focusInput = document.getElementById('focus-input');
const breakInput = document.getElementById('break-input');
const focusMusicInput = document.getElementById('focus-music');
const breakMusicInput = document.getElementById('break-music');
const bgUrlInput = document.getElementById('bg-url');
const resetSettingsBtn = document.getElementById('reset-settings-btn');
const presetBtnsContainer = document.querySelector('.timer-presets');
const presetBtns = document.querySelectorAll('.preset-btn');
const playerWrapper = document.getElementById('player-wrapper');

// --- Theme Logic ---
function applyTheme() {
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        moonIcon.classList.add('hidden');
        sunIcon.classList.remove('hidden');
    } else {
        document.body.classList.remove('dark-mode');
        moonIcon.classList.remove('hidden');
        sunIcon.classList.add('hidden');
    }
    localStorage.setItem('focusflow_dark_mode', isDarkMode);
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    applyTheme();
}

// --- Debug Preset for Localhost ---
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const debugBtn = document.createElement('button');
    debugBtn.className = 'preset-btn debug-btn';
    debugBtn.textContent = '🛠️ 1/1';
    debugBtn.dataset.focus = '1';
    debugBtn.dataset.break = '1';
    debugBtn.style.borderColor = '#3B82F6';
    debugBtn.style.color = '#3B82F6';
    debugBtn.addEventListener('click', handlePresetClick);
    presetBtnsContainer.appendChild(debugBtn);
}

// --- Gamification Logic ---
function getRank(mins) {
    return [...RANKS].reverse().find(r => mins >= r.min) || RANKS[0];
}

function updateGamificationUI() {
    if (streakCountEl) streakCountEl.textContent = streak;
    const currentRank = getRank(totalFocusMinutes);
    if (rankNameEl) {
        const oldRankName = rankNameEl.textContent;
        rankNameEl.textContent = currentRank.name;

        if (oldRankName && oldRankName !== currentRank.name && oldRankName !== 'Novice') {
            if (rankBadgeEl) {
                rankBadgeEl.classList.add('level-up');
                triggerConfetti();
                setTimeout(() => rankBadgeEl.classList.remove('level-up'), 2000);
            }
        }
    }
}

function updateStatsOnFocusComplete() {
    const today = new Date().toISOString().split('T')[0];
    const minsFocused = Math.round(getFocusTime() / 60);
    totalFocusMinutes += minsFocused;

    // Streak Logic
    if (lastFocusDate) {
        const last = new Date(lastFocusDate);
        const current = new Date(today);
        const diffTime = Math.abs(current - last);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            streak++;
        } else if (diffDays > 1) {
            streak = 1;
        }
    } else {
        streak = 1;
    }

    lastFocusDate = today;
    saveTasks();
    updateGamificationUI();
    
    // Play sound
    if (notifSound) notifSound.play().catch(() => {});
}

// --- Background Function ---
function applyBackground() {
    if (bgUrl) {
        document.body.style.backgroundImage = `url('${bgUrl}')`;
        document.body.style.backgroundColor = 'transparent';
    } else {
        document.body.style.backgroundImage = 'none';
        document.body.style.backgroundColor = isFocus ? '#F8FAFC' : '#F0FDF4';
    }
}

function updatePresetActiveState() {
    const focus = focusInput.value;
    const breakVal = breakInput.value;
    presetBtns.forEach(btn => {
        if (btn.dataset.focus === focus && btn.dataset.break === breakVal) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function handlePresetClick(e) {
    const focus = e.target.dataset.focus;
    const breakVal = e.target.dataset.break;
    
    focusInput.value = focus;
    breakInput.value = breakVal;
    
    // Reset to Focus Mode and stop any running timer
    clearInterval(timerId);
    timerId = null;
    isFocus = true;
    
    timeLeft = getFocusTime();
    startBtn.textContent = 'Start Focus';
    statusLabel.textContent = 'Focus Time';
    document.body.classList.remove('focus-mode');
    focusInput.disabled = false;
    breakInput.disabled = false;
    
    applyBackground();
    statusLabel.style.background = '#FFE4E6';
    statusLabel.style.color = '#F43F5E';
    
    if (player && player.stopVideo) {
        player.stopVideo();
        playerWrapper.classList.add('hidden');
    }

    updateDisplay();
    updatePresetActiveState();
}

function resetSettings() {
    focusMusicUrl = DEFAULT_FOCUS_MUSIC;
    breakMusicUrl = DEFAULT_BREAK_MUSIC;
    bgUrl = DEFAULT_BG_IMAGE;
    
    // Update inputs
    focusMusicInput.value = focusMusicUrl;
    breakMusicInput.value = breakMusicUrl;
    bgUrlInput.value = bgUrl;
    
    // Apply changes
    saveTasks();
    applyBackground();
    if (apiReady) playCurrentMusic();
    
    // Notify user
    formMessage.textContent = 'Settings restored to defaults! ✨';
    formMessage.className = 'form-message success';
    setTimeout(() => {
        if (formMessage.textContent === 'Settings restored to defaults! ✨') {
            formMessage.textContent = '';
        }
    }, 3000);
}

// --- Viral Share Config ---
const SHARE_MESSAGE = "Just finished a focus session on FocusFlow! 🚀 Crushing my goals today. Join my study streak here: " + window.location.href;

// --- YouTube API ---
function extractVideoId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

window.onYouTubeIframeAPIReady = () => {
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        playerVars: {
            'autoplay': 0,
            'controls': 1,
            'modestbranding': 1,
            'rel': 0
        },
        events: {
            'onReady': () => { apiReady = true; }
        }
    });
};

function playCurrentMusic() {
    if (!apiReady || !player) return;
    const url = isFocus ? focusMusicUrl : breakMusicUrl;
    const videoId = extractVideoId(url);
    
    if (videoId) {
        player.loadVideoById(videoId);
        playerWrapper.classList.remove('hidden');
    } else {
        player.stopVideo();
        playerWrapper.classList.add('hidden');
    }
}

// --- Task Functions ---
function saveTasks() {
    localStorage.setItem('focusflow_tasks', JSON.stringify(tasks));
    localStorage.setItem('focusflow_active_task', activeTaskId);
    localStorage.setItem('focusflow_synced', isSynced);
    localStorage.setItem('focusflow_focus_music', focusMusicUrl);
    localStorage.setItem('focusflow_break_music', breakMusicUrl);
    localStorage.setItem('focusflow_bg_url', bgUrl);
    localStorage.setItem('focusflow_total_mins', totalFocusMinutes);
    localStorage.setItem('focusflow_streak', streak);
    localStorage.setItem('focusflow_last_date', lastFocusDate);
}

function renderTasks() {
    taskList.innerHTML = '';
    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.id === activeTaskId ? 'active' : ''} ${task.completed ? 'done' : ''}`;
        li.innerHTML = `
            <span onclick="selectTask('${task.id}')">${task.text}</span>
            <div class="pomo-count">${task.pomoCount} 🍅</div>
            <button class="delete-task" onclick="deleteTask('${task.id}')">&times;</button>
        `;
        taskList.appendChild(li);
    });
}

window.selectTask = (id) => {
    activeTaskId = (activeTaskId === id) ? null : id;
    saveTasks();
    renderTasks();
};

window.deleteTask = (id) => {
    tasks = tasks.filter(t => t.id !== id);
    if (activeTaskId === id) activeTaskId = null;
    saveTasks();
    renderTasks();
};

function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;
    const newTask = {
        id: Date.now().toString(),
        text: text,
        pomoCount: 0,
        completed: false
    };
    tasks.push(newTask);
    taskInput.value = '';
    saveTasks();
    renderTasks();
}

// --- Timer Functions ---
function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.title = `(${timerDisplay.textContent}) FocusFlow`;
}

function triggerConfetti() {
    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F43F5E', '#10B981', '#3B82F6']
    });
}

function switchMode() {
    isFocus = !isFocus;
    timeLeft = isFocus ? getFocusTime() : getBreakTime();
    statusLabel.textContent = isFocus ? 'Focus Time' : 'Break Time';
    
    // UI Polish
    applyBackground();
    statusLabel.style.background = isFocus ? '#FFE4E6' : '#DCFCE7';
    statusLabel.style.color = isFocus ? '#F43F5E' : '#10B981';
    
    if (!isFocus) {
        triggerConfetti();
        updateStatsOnFocusComplete(); // Gamification Update
        
        if (activeTaskId) {
            const task = tasks.find(t => t.id === activeTaskId);
            if (task) task.pomoCount++;
            saveTasks();
            renderTasks();
        }
        if (!isSynced) {
            setTimeout(() => modal.classList.remove('hidden'), 1500);
        }
    }
    
    updateDisplay();
    // Automatically start the next session
    startTimer();
    playCurrentMusic(); // Play music for the new mode
}

function startTimer() {
    if (timerId) {
        clearInterval(timerId);
        timerId = null;
        startBtn.textContent = isFocus ? 'Start Focus' : 'Start Break';
        document.body.classList.remove('focus-mode');
        focusInput.disabled = false;
        breakInput.disabled = false;
        
        // Pause music when timer is paused
        if (player && player.pauseVideo) player.pauseVideo();
        return;
    }

    startBtn.textContent = 'Pause';
    if (isFocus) document.body.classList.add('focus-mode'); 
    focusInput.disabled = true;
    breakInput.disabled = true;
    
    // Play music when timer starts
    if (player && player.playVideo) {
        const url = isFocus ? focusMusicUrl : breakMusicUrl;
        const currentVideoId = extractVideoId(player.getVideoUrl());
        const targetVideoId = extractVideoId(url);
        
        if (targetVideoId && currentVideoId !== targetVideoId) {
            playCurrentMusic();
        } else if (targetVideoId) {
            player.playVideo();
        }
    } else {
        playCurrentMusic();
    }
    
    timerId = setInterval(() => {
        timeLeft--;
        updateDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerId);
            timerId = null;
            document.body.classList.remove('focus-mode');
            switchMode(); // This will reset timeLeft and call startTimer() again
        }
    }, 1000);
}

function resetTimer() {
    clearInterval(timerId);
    timerId = null;
    timeLeft = isFocus ? getFocusTime() : getBreakTime();
    startBtn.textContent = isFocus ? 'Start Focus' : 'Start Break';
    document.body.classList.remove('focus-mode');
    focusInput.disabled = false;
    breakInput.disabled = false;
    
    // Stop music on reset
    if (player && player.stopVideo) {
        player.stopVideo();
        playerWrapper.classList.add('hidden');
    }
    
    updateDisplay();
}

function handleSettingChange() {
    if (!timerId) {
        timeLeft = isFocus ? getFocusTime() : getBreakTime();
        updateDisplay();
    }
}

// --- API Integration ---
async function handleSubscribe(e) {
    e.preventDefault();
    const email = document.getElementById('subscriber-email').value;
    formMessage.textContent = 'Syncing your sessions to the cloud...';
    formMessage.className = 'form-message';

    try {
        const response = await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email, 
                tasks, 
                totalFocusMinutes, 
                streak, 
                lastFocusDate 
            })
        });

        const data = await response.json();

        if (response.ok) {
            isSynced = true;
            saveTasks();
            formMessage.textContent = data.message;
            formMessage.classList.add('success');
            subscribeForm.classList.add('hidden');
            shareContainer.classList.remove('hidden');
            statsBtn.innerHTML = '<span style="color: #10B981">●</span> Cloud Sync';
        } else {
            formMessage.textContent = data.error;
            formMessage.classList.add('error');
        }
    } catch (err) {
        formMessage.textContent = 'Server is currently offline. Your progress is saved locally!';
        formMessage.classList.add('error');
    }
}

function shareOnWhatsApp() {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(SHARE_MESSAGE)}`, '_blank');
}

function shareOnTwitter() {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_MESSAGE)}`, '_blank');
}

// --- Event Listeners ---
startBtn.addEventListener('click', startTimer);
resetBtn.addEventListener('click', resetTimer);
themeToggle.addEventListener('click', toggleTheme);
focusInput.addEventListener('input', () => { handleSettingChange(); updatePresetActiveState(); });
breakInput.addEventListener('input', () => { handleSettingChange(); updatePresetActiveState(); });
presetBtns.forEach(btn => btn.addEventListener('click', handlePresetClick));
focusMusicInput.addEventListener('change', (e) => {
    focusMusicUrl = e.target.value;
    saveTasks();
    if (isFocus) playCurrentMusic();
});
breakMusicInput.addEventListener('change', (e) => {
    breakMusicUrl = e.target.value;
    saveTasks();
    if (!isFocus) playCurrentMusic();
});
bgUrlInput.addEventListener('change', (e) => {
    bgUrl = e.target.value;
    saveTasks();
    applyBackground();
});
resetSettingsBtn.addEventListener('click', resetSettings);
statsBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
    if (!isSynced) {
        subscribeForm.classList.remove('hidden');
        shareContainer.classList.add('hidden');
    } else {
        subscribeForm.classList.add('hidden');
        shareContainer.classList.remove('hidden');
        formMessage.textContent = 'Your study sessions are safely synced! ☁️';
        formMessage.classList.add('success');
    }
});
closeModal.addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
subscribeForm.addEventListener('submit', handleSubscribe);
whatsappBtn.addEventListener('click', shareOnWhatsApp);
twitterBtn.addEventListener('click', shareOnTwitter);
addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTask(); });

// Init
if (isSynced) statsBtn.innerHTML = '<span style="color: #10B981">●</span> Cloud Sync';
focusMusicInput.value = focusMusicUrl;
breakMusicInput.value = breakMusicUrl;
bgUrlInput.value = bgUrl;
applyTheme(); // Init Theme
applyBackground();
updatePresetActiveState();
updateGamificationUI(); // Init Gamification
renderTasks();
updateDisplay();

// Check if we should show the player initially
setTimeout(() => {
    if (apiReady) playCurrentMusic();
}, 1000);

console.log('FocusFlow 2.1: Continuous Timer Enabled. 🚀');

