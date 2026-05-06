// Using Firebase compat SDK via window.firebase
// ============================================
// FIREBASE CONFIGURATION - REPLACE WITH YOUR OWN
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyCiWLuowpHbZMocSVpchKpee0I1LEW3EvE",
    authDomain: "new-one-55ff4.firebaseapp.com",
    projectId: "new-one-55ff4",
    storageBucket: "new-one-55ff4.firebasestorage.app",
    messagingSenderId: "673714723448",
    appId: "1:673714723448:web:2b3608196387753300ab8d",
    databaseURL: "https://new-one-55ff4-default-rtdb.asia-southeast1.firebasedatabase.app/"
};


// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const dashboardRef = database.ref('dashboard_fresh'); // Use a new ref so it doesn't clash with old data

// Track if we're currently updating to prevent sync loops
let isUpdating = false;
let hasUnsavedChanges = false;

// ============================================
// FULLSCREEN FUNCTIONALITY
// ============================================
function toggleFullscreen() {
    const elem = document.documentElement;

    if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    } else {
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => {
                console.log(`Fullscreen error: ${err.message}`);
                alert('Fullscreen not supported in your browser');
            });
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        } else {
            alert('Fullscreen not supported in your browser');
        }
    }
}

// ============================================
// CALCULATION FUNCTIONS
// ============================================
document.addEventListener('input', function (e) {
    if (e.target.classList.contains('target') || e.target.classList.contains('achieved')) {
        calculatePercentage(e.target);
        markUnsaved();
    }
});

function calculatePercentage(input) {
    const section = input.dataset.section;
    const type = input.dataset.type;

    const targetInput = document.querySelector(`.target[data-section="${section}"][data-type="${type}"]`);
    const achievedInput = document.querySelector(`.achieved[data-section="${section}"][data-type="${type}"]`);
    const percentDisplay = document.getElementById(`${section}-${type}-percent`);

    if (!targetInput || !achievedInput || !percentDisplay) return;

    const target = parseFloat(targetInput.value) || 0;
    const achieved = parseFloat(achievedInput.value) || 0;

    let percentage = 0;
    if (target > 0) {
        percentage = (achieved / target) * 100;
    }

    percentDisplay.textContent = percentage.toFixed(1) + '%';

    // Update color based on percentage
    percentDisplay.classList.remove('good', 'warning', 'danger');
    if (percentage >= 90) {
        percentDisplay.classList.add('good');
    } else if (percentage >= 70) {
        percentDisplay.classList.add('warning');
    } else {
        percentDisplay.classList.add('danger');
    }
}

// ============================================
// CLOUD SYNC FUNCTIONS
// ============================================
function markUnsaved() {
    hasUnsavedChanges = true;
    const syncStatus = document.getElementById('syncStatus');
    const updateBtn = document.getElementById('updateBtn');
    syncStatus.textContent = 'Unsaved changes - Click "Upload to Cloud" to save';
    syncStatus.classList.add('unsaved');
    syncStatus.classList.remove('saved');
    updateBtn.classList.add('pulse');
}

function markSaved() {
    hasUnsavedChanges = false;
    const syncStatus = document.getElementById('syncStatus');
    const updateBtn = document.getElementById('updateBtn');
    syncStatus.textContent = 'All changes saved to cloud';
    syncStatus.classList.remove('unsaved');
    syncStatus.classList.add('saved');
    updateBtn.classList.remove('pulse');

    setTimeout(() => {
        syncStatus.classList.remove('saved');
        syncStatus.textContent = 'Data synced with all users';
    }, 2000);
}

function markSyncing() {
    const syncStatus = document.getElementById('syncStatus');
    const updateBtn = document.getElementById('updateBtn');
    syncStatus.textContent = 'Uploading to cloud...';
    updateBtn.disabled = true;
    updateBtn.innerHTML = '<span class="btn-text">Uploading...</span><span class="btn-icon">⏳</span>';
}

function resetUpdateButton() {
    const updateBtn = document.getElementById('updateBtn');
    updateBtn.disabled = false;
    updateBtn.innerHTML = '<span class="btn-text">Upload to Cloud</span><span class="btn-icon">☁️</span>';
}

// Update data to cloud
async function updateData() {
    if (!hasUnsavedChanges) {
        alert('No changes to save!');
        return;
    }

    markSyncing();

    const data = {};
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        const key = `${input.dataset.section}-${input.dataset.type}-${input.classList[0]}`;
        data[key] = input.value || '';
    });

    // Add timestamp
    data.lastUpdated = new Date().toISOString();
    data.updatedBy = 'User_' + Math.floor(Math.random() * 10000);

    try {
        await dashboardRef.set(data);
        markSaved();
        console.log('Data saved to cloud successfully');
    } catch (error) {
        console.error('Error saving to cloud:', error);
        alert('Failed to save to cloud. Check your Firebase configuration.');
        markUnsaved();
    } finally {
        resetUpdateButton();
    }
}

// Listen for real-time updates from other users
function setupRealtimeListener() {
    dashboardRef.on('value', (snapshot) => {
        if (isUpdating) return;

        const data = snapshot.val();
        if (data) {
            const currentData = getCurrentData();

            if (JSON.stringify(data) !== JSON.stringify(currentData)) {
                loadDataFromObject(data);

                const syncStatus = document.getElementById('syncStatus');
                if (!hasUnsavedChanges) {
                    syncStatus.textContent = 'Synced with cloud';
                    setTimeout(() => {
                        syncStatus.textContent = 'Data synced with all users';
                    }, 2000);
                }
            }
        }
    });
}

function getCurrentData() {
    const data = {};
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        const key = `${input.dataset.section}-${input.dataset.type}-${input.classList[0]}`;
        data[key] = input.value || '';
    });
    return data;
}

function loadDataFromObject(data) {
    isUpdating = true;

    Object.keys(data).forEach(key => {
        if (key === 'lastUpdated' || key === 'updatedBy') return;

        const [section, type, inputType] = key.split('-');
        if (!section || !type || !inputType) return;

        const input = document.querySelector(`.${inputType}[data-section="${section}"][data-type="${type}"]`);
        if (input && data[key] !== undefined) {
            input.value = data[key];
            calculatePercentage(input);
        }
    });

    setTimeout(() => {
        isUpdating = false;
    }, 100);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function quickFill() {
    const sections = ['ecs', 'cil', 'lr', 'erl'];
    const types = ['fresh'];

    sections.forEach(section => {
        types.forEach(type => {
            const targetInput = document.querySelector(`.target[data-section="${section}"][data-type="${type}"]`);
            const achievedInput = document.querySelector(`.achieved[data-section="${section}"][data-type="${type}"]`);

            if (!targetInput || !achievedInput) return;

            const target = Math.floor(Math.random() * 900000) + 100000;
            const achieved = Math.floor(target * (0.5 + Math.random() * 0.7));

            targetInput.value = target;
            achievedInput.value = achieved;

            calculatePercentage(targetInput);
        });
    });

    markUnsaved();
}

function clearAll() {
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        input.value = '';
    });

    const percentages = document.querySelectorAll('.percentage');
    percentages.forEach(percent => {
        percent.textContent = '0%';
        percent.classList.remove('good', 'warning', 'danger');
    });

    markUnsaved();
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function () {
    setupRealtimeListener();

    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
});

// ============================================
// EXPOSE FUNCTIONS TO GLOBAL SCOPE
// ============================================
window.toggleFullscreen = toggleFullscreen;
window.quickFill = quickFill;
window.clearAll = clearAll;
window.updateData = updateData;
