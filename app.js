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

// --- Elements ---
const timerDisplay = document.getElementById('timer-display');
const statusLabel = document.getElementById('status-label');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const statsBtn = document.getElementById('stats-btn');
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

// --- Viral Share Config ---
const SHARE_MESSAGE = "Just finished a focus session on FocusFlow! 🚀 Crushing my goals today. Join my study streak here: " + window.location.href;

// --- Task Functions ---
function saveTasks() {
    localStorage.setItem('focusflow_tasks', JSON.stringify(tasks));
    localStorage.setItem('focusflow_active_task', activeTaskId);
    localStorage.setItem('focusflow_synced', isSynced);
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
    document.body.style.backgroundColor = isFocus ? '#F8FAFC' : '#F0FDF4'; 
    statusLabel.style.background = isFocus ? '#FFE4E6' : '#DCFCE7';
    statusLabel.style.color = isFocus ? '#F43F5E' : '#10B981';
    
    if (!isFocus) {
        triggerConfetti();
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
}

function startTimer() {
    if (timerId) {
        clearInterval(timerId);
        timerId = null;
        startBtn.textContent = isFocus ? 'Start Focus' : 'Start Break';
        document.body.classList.remove('focus-mode');
        focusInput.disabled = false;
        breakInput.disabled = false;
        return;
    }

    startBtn.textContent = 'Pause';
    if (isFocus) document.body.classList.add('focus-mode'); 
    focusInput.disabled = true;
    breakInput.disabled = true;
    
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
            body: JSON.stringify({ email, tasks })
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
focusInput.addEventListener('input', handleSettingChange);
breakInput.addEventListener('input', handleSettingChange);
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
renderTasks();
updateDisplay();
console.log('FocusFlow 2.1: Continuous Timer Enabled. 🚀');
