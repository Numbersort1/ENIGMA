// ============================================
// CIPHER CORE - NEURAL PREDICTION MATRIX
// ============================================

const CONFIG = {
    API_LATEST: 'https://tirangaprediction.ai/api_fixed.php?action=latest_results&source=1M',
    API_HISTORY: 'https://tirangaprediction.ai/api_fixed.php?action=history&source=1M',
    PROXY_LATEST: 'https://api.allorigins.win/raw?url=https://tirangaprediction.ai/api_fixed.php?action=latest_results&source=1M',
    PROXY_HISTORY: 'https://api.allorigins.win/raw?url=https://tirangaprediction.ai/api_fixed.php?action=history&source=1M',
    USE_PROXY: false,
    REFRESH_INTERVAL: 5000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000
};

const state = {
    lastIssue: null,
    lastResults: [],
    apiHistory: [],
    localHistory: [],
    pendingPredictions: new Map(),
    hotNumbers: [],
    isConnected: false,
    retryCount: 0,
    session: null,
    stats: { wins: 0, losses: 0, total: 0 }
};

// ============================================
// MATRIX RAIN EFFECT
// ============================================
class MatrixRain {
    constructor() {
        this.canvas = document.getElementById('matrixRain');
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.characters = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF';
        this.fontSize = 14;
        this.columns = this.canvas.width / this.fontSize;
        this.drops = [];

        for (let i = 0; i < this.columns; i++) {
            this.drops[i] = Math.random() * -100;
        }

        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    animate() {
        this.ctx.fillStyle = 'rgba(27, 38, 44, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#3282B8';
        this.ctx.font = this.fontSize + 'px monospace';

        for (let i = 0; i < this.drops.length; i++) {
            const text = this.characters.charAt(Math.floor(Math.random() * this.characters.length));
            this.ctx.fillText(text, i * this.fontSize, this.drops[i] * this.fontSize);

            if (this.drops[i] * this.fontSize > this.canvas.height && Math.random() > 0.975) {
                this.drops[i] = 0;
            }
            this.drops[i]++;
        }

        requestAnimationFrame(() => this.animate());
    }
}

// ============================================
// CIPHER ENGINE
// ============================================
class CipherEngine {
    constructor() {
        this.strategies = ['alternating', 'streak_break', 'reversion', 'momentum'];
        this.strategyWeights = { alternating: 0.25, streak_break: 0.25, reversion: 0.25, momentum: 0.25 };
        this.performance = {};
    }

    analyzeSequence(history) {
        if (history.length < 2) return { type: 'neutral', confidence: 50 };

        const results = history.map(h => h.result_type || h.actual_result);
        const recent = results.slice(0, 10);

        let alternations = 0;
        let streaks = [];
        let currentStreak = 1;

        for (let i = 1; i < recent.length; i++) {
            if (recent[i] !== recent[i-1]) {
                alternations++;
                if (currentStreak > 1) streaks.push(currentStreak);
                currentStreak = 1;
            } else {
                currentStreak++;
            }
        }
        if (currentStreak > 1) streaks.push(currentStreak);

        const altRate = alternations / (recent.length - 1);
        const avgStreak = streaks.length > 0 ? streaks.reduce((a,b) => a+b, 0) / streaks.length : 1;

        let pattern = 'neutral';
        let strength = 50;

        if (altRate > 0.7) {
            pattern = 'alternating';
            strength = 70 + (altRate - 0.7) * 50;
        } else if (avgStreak > 2.5) {
            pattern = 'streaking';
            strength = 60 + (avgStreak - 2) * 15;
        } else if (altRate < 0.3) {
            pattern = 'momentum';
            strength = 65;
        } else {
            pattern = 'mixed';
            strength = 55;
        }

        return { 
            pattern, 
            strength: Math.min(85, Math.round(strength)),
            altRate,
            avgStreak,
            lastStreak: currentStreak
        };
    }

    selectStrategy(analysis, lastResult) {
        const lastType = lastResult.result_type;

        if (analysis.pattern === 'alternating' && analysis.strength > 65) {
            return { 
                name: 'alternating', 
                prediction: lastType === 'big' ? 'small' : 'big',
                confidence: analysis.strength,
                reason: 'High alternation detected'
            };
        }

        if (analysis.pattern === 'streaking' && analysis.lastStreak >= 3) {
            return {
                name: 'streak_break',
                prediction: lastType === 'big' ? 'small' : 'big',
                confidence: 75,
                reason: 'Streak break imminent'
            };
        }

        if (analysis.pattern === 'momentum') {
            return {
                name: 'momentum',
                prediction: lastType,
                confidence: 60,
                reason: 'Momentum continuation'
            };
        }

        const bigCount = state.localHistory.filter(h => h.actual_result === 'big').length;
        const total = state.localHistory.length || 1;
        const bigRatio = bigCount / total;

        if (bigRatio > 0.6) {
            return {
                name: 'reversion',
                prediction: 'small',
                confidence: Math.round(60 + (bigRatio - 0.5) * 40),
                reason: 'Reversion to mean'
            };
        } else if (bigRatio < 0.4) {
            return {
                name: 'reversion',
                prediction: 'big',
                confidence: Math.round(60 + (0.5 - bigRatio) * 40),
                reason: 'Reversion to mean'
            };
        }

        return {
            name: 'alternating',
            prediction: lastType === 'big' ? 'small' : 'big',
            confidence: 55,
            reason: 'Default alternation'
        };
    }

    generatePrediction(lastResult, history) {
        const analysis = this.analyzeSequence(history);
        const strategy = this.selectStrategy(analysis, lastResult);
        const recentAccuracy = this.calculateRecentAccuracy();
        strategy.confidence = Math.round(strategy.confidence * (0.8 + recentAccuracy * 0.2));

        return {
            prediction: strategy.prediction,
            confidence: Math.min(90, strategy.confidence),
            strategy: strategy.name,
            reason: strategy.reason,
            analysis
        };
    }

    calculateRecentAccuracy() {
        const recent = state.localHistory.slice(0, 10).filter(h => h.status !== 'na');
        if (recent.length === 0) return 0.5;
        const wins = recent.filter(h => h.status === 'win').length;
        return wins / recent.length;
    }

    calculateHotNumbers(history) {
        const freq = {};
        const recency = {};

        history.forEach((h, idx) => {
            const num = h.actual_number;
            if (num === undefined || num === null) return;

            freq[num] = (freq[num] || 0) + 1;
            recency[num] = (recency[num] || 0) + (history.length - idx);
        });

        const scores = Object.keys(freq).map(num => ({
            number: parseInt(num),
            score: freq[num] * 0.6 + (recency[num] / history.length) * 0.4
        }));

        scores.sort((a, b) => b.score - a.score);

        return {
            hot: scores.slice(0, 2).map(s => s.number),
            cold: scores.length > 2 ? [scores[scores.length - 1].number] : [0]
        };
    }

    learnFromResult(prediction, actual, strategy) {
        const correct = prediction === actual;
        if (!this.performance[strategy]) {
            this.performance[strategy] = { wins: 0, losses: 0 };
        }
        if (correct) {
            this.performance[strategy].wins++;
        } else {
            this.performance[strategy].losses++;
        }
    }
}

const engine = new CipherEngine();

// ============================================
// AUTHENTICATION
// ============================================
function initAuth() {
    console.log('[CIPHER CORE] Initializing authentication...');

    const saved = localStorage.getItem('hiroto_signals_session');

    if (!saved) {
        console.error('[CIPHER CORE] No session found');
        showAccessDenied();
        return false;
    }

    try {
        const session = JSON.parse(saved);
        const expiry = new Date(session.expires);

        if (expiry < new Date()) {
            console.error('[CIPHER CORE] Session expired');
            localStorage.removeItem('hiroto_signals_session');
            showAccessDenied();
            return false;
        }

        state.session = session;

        document.getElementById('accessDenied').classList.add('hidden');
        document.getElementById('dashboardContent').classList.remove('hidden');

        const days = Math.ceil((expiry - new Date()) / 86400000);
        const badge = document.getElementById('sessionChip');
        if (badge) badge.querySelector('.chip-text').textContent = `${days} DAYS`;

        console.log('[CIPHER CORE] Authentication successful');
        return true;

    } catch(e) {
        console.error('[CIPHER CORE] Auth error:', e);
        localStorage.removeItem('hiroto_signals_session');
        showAccessDenied();
        return false;
    }
}

function showAccessDenied() {
    const deniedEl = document.getElementById('accessDenied');
    const dashboardEl = document.getElementById('dashboardContent');

    if (deniedEl) deniedEl.classList.remove('hidden');
    if (dashboardEl) dashboardEl.classList.add('hidden');
}

// Debug helpers
window.setTestSession = function() {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);

    const session = {
        key: 'CIPHER-XXXX-XXXX-XXXX',
        status: 'active',
        created: new Date().toISOString(),
        expires: expiry.toISOString()
    };

    localStorage.setItem('hiroto_signals_session', JSON.stringify(session));
    console.log('[CIPHER CORE] Test session set. Reloading...');
    location.reload();
};

window.clearSession = function() {
    localStorage.removeItem('hiroto_signals_session');
    console.log('[CIPHER CORE] Session cleared. Reloading...');
    location.reload();
};

// ============================================
// API FETCHING
// ============================================
async function fetchData() {
    const urls = CONFIG.USE_PROXY ? 
        [CONFIG.PROXY_LATEST, CONFIG.PROXY_HISTORY] : 
        [CONFIG.API_LATEST, CONFIG.API_HISTORY];

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const [latestRes, historyRes] = await Promise.all([
            fetch(urls[0], { 
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            }),
            fetch(urls[1], { 
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            })
        ]);

        clearTimeout(timeoutId);

        if (!latestRes.ok || !historyRes.ok) {
            throw new Error(`HTTP ${latestRes.status}`);
        }

        const latest = await latestRes.json();
        const apiHistory = await historyRes.json();

        if (!Array.isArray(latest) || latest.length === 0) {
            throw new Error('Invalid data');
        }

        updateConnectionStatus(true);

        const currentIssue = latest[0]?.issue_number;

        if (currentIssue !== state.lastIssue) {
            state.lastIssue = currentIssue;
            state.lastResults = latest;
            state.apiHistory = apiHistory || [];

            processData(latest, apiHistory);
            triggerGlitch();
            showToast('シグナル同期完了 // SIGNAL_SYNC_COMPLETE', 'success');
        }

        state.retryCount = 0;

    } catch (error) {
        handleFetchError(error);
    }
}

function handleFetchError(error) {
    state.retryCount++;

    if (error.message.includes('CORS') && state.retryCount === 1 && !CONFIG.USE_PROXY) {
        CONFIG.USE_PROXY = true;
        setTimeout(fetchData, 1000);
        return;
    }

    updateConnectionStatus(false, error.message);

    if (state.retryCount >= CONFIG.MAX_RETRIES) {
        showToast('接続不安定 // CONNECTION_UNSTABLE', 'error');
        state.retryCount = 0;
    } else {
        setTimeout(fetchData, CONFIG.RETRY_DELAY);
    }
}

// ============================================
// DATA PROCESSING
// ============================================
function processData(latest, history) {
    const lastResult = latest[0];
    const prediction = engine.generatePrediction(lastResult, history);
    const numbers = engine.calculateHotNumbers(history);
    state.hotNumbers = numbers;

    const nextIssue = (parseInt(lastResult.issue_number) + 1).toString();
    state.pendingPredictions.set(nextIssue, prediction.prediction);

    updateLocalHistory();
    updateActivePrediction(prediction, nextIssue);
    updateLatestResults(latest);
    updateHotNumbers();
    updateHistoryDisplay();
    updateStats();

    // Update hero stats
    document.getElementById('miniAccuracy').textContent = 
        state.stats.total > 0 ? Math.round((state.stats.wins / state.stats.total) * 100) + '%' : '0%';
    document.getElementById('miniSignals').textContent = state.stats.total;
}

function updateLocalHistory() {
    const sorted = [...state.apiHistory].sort((a, b) => 
        parseInt(a.issue_number) - parseInt(b.issue_number)
    );

    state.localHistory = sorted.map((item, index) => {
        const issueNum = item.issue_number;
        const actualType = item.result_type || item.actual_result;
        const actualNum = item.actual_number;

        let predictedType = null;
        let status = 'na';
        let isCorrect = null;

        if (state.pendingPredictions.has(issueNum)) {
            predictedType = state.pendingPredictions.get(issueNum);
            isCorrect = predictedType === actualType;
            status = isCorrect ? 'win' : 'loss';
            state.pendingPredictions.delete(issueNum);
            engine.learnFromResult(predictedType, actualType, 'pending');
        } else if (index > 0) {
            const prev = sorted[index - 1];
            const prevType = prev.result_type || prev.actual_result;
            predictedType = prevType === 'big' ? 'small' : 'big';
            isCorrect = predictedType === actualType;
            status = isCorrect ? 'win' : 'loss';
        }

        return {
            issue_number: issueNum,
            predicted_type: predictedType,
            actual_result: actualType,
            actual_number: actualNum,
            status: status,
            is_correct: isCorrect
        };
    });

    state.localHistory.reverse();
    calculateStats();
}

function calculateStats() {
    const valid = state.localHistory.filter(h => h.status !== 'na');
    state.stats.total = valid.length;
    state.stats.wins = valid.filter(h => h.status === 'win').length;
    state.stats.losses = valid.filter(h => h.status === 'loss').length;
}

// ============================================
// UI UPDATES
// ============================================
function updateActivePrediction(pred, nextIssue) {
    const valueEl = document.getElementById('predictionValue');
    if (!valueEl) return;

    valueEl.textContent = pred.prediction.toUpperCase();
    valueEl.className = 'core-value ' + pred.prediction;

    const targetPeriod = document.getElementById('targetPeriod');
    if (targetPeriod) targetPeriod.textContent = nextIssue;

    const confidenceVal = document.getElementById('confidenceVal');
    if (confidenceVal) confidenceVal.textContent = pred.confidence + '%';

    const fillEl = document.getElementById('confidenceFill');
    if (fillEl) fillEl.style.width = pred.confidence + '%';

    const periodBar = document.getElementById('periodBar');
    if (periodBar) {
        periodBar.style.width = '0%';
        setTimeout(() => periodBar.style.width = '100%', 100);
    }
}

function updateLatestResults(data) {
    const container = document.getElementById('streamContent');
    if (!container) return;

    container.innerHTML = data.slice(0, 5).map((r, index) => {
        const type = r.result_type || 'small';
        const isLatest = index === 0;
        return `
            <div class="stream-item ${type} ${isLatest ? 'latest' : ''}">
                ${r.actual_number ?? '--'}
            </div>
        `;
    }).join('');
}

function updateHotNumbers() {
    const container = document.getElementById('signaturesGrid');
    if (!container) return;

    const { hot, cold } = state.hotNumbers;

    const labels = ['HOT_PRIMARY', 'HOT_SECONDARY', 'COLD_SIGNAL'];
    const subs = ['ホットプライマリ', 'ホットセカンダリ', 'コールドシグナル'];
    const types = ['hot', 'hot', 'cold'];
    const values = [hot[0], hot[1], cold[0]];

    container.innerHTML = values.map((val, idx) => `
        <div class="signature-card">
            <div class="sig-label">${labels[idx]}</div>
            <div class="sig-value ${types[idx]}">${val ?? '--'}</div>
            <div class="sig-sub">${subs[idx]}</div>
        </div>
    `).join('');
}

function updateHistoryDisplay() {
    const tbody = document.getElementById('historyBody');
    const meta = document.getElementById('historyMeta');

    if (!tbody || !meta) return;

    meta.textContent = `${state.localHistory.length} RECORDS`;

    if (state.localHistory.length === 0) {
        tbody.innerHTML = `
            <tr class="loading-row">
                <td colspan="5">
                    <div class="table-loader">
                        <div class="loader-ring"></div>
                        <span>DECRYPTING_DATA...</span>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = state.localHistory.slice(0, 30).map((r, index) => {
        let outcome;
        if (r.status === 'win') {
            outcome = '<span class="outcome-badge win">WIN</span>';
        } else if (r.status === 'loss') {
            outcome = '<span class="outcome-badge loss">LOSS</span>';
        } else {
            outcome = '<span class="outcome-badge na">PENDING</span>';
        }

        const predClass = r.predicted_type || 'pending';
        const predText = r.predicted_type ? r.predicted_type.toUpperCase() : '---';

        return `
            <tr class="${index === 0 ? 'new-result' : ''}">
                <td class="cell-issue">${r.issue_number || '--'}</td>
                <td class="cell-prediction ${predClass}">${predText}</td>
                <td class="cell-actual ${r.actual_result || 'small'}">${(r.actual_result || 'small').toUpperCase()}</td>
                <td class="cell-number">${r.actual_number ?? '--'}</td>
                <td class="cell-outcome">${outcome}</td>
            </tr>
        `;
    }).join('');
}

function updateStats() {
    const winCount = document.getElementById('winCount');
    const lossCount = document.getElementById('lossCount');
    const accuracyVal = document.getElementById('accuracyVal');
    const miniAccuracy = document.getElementById('miniAccuracy');

    if (winCount) winCount.textContent = state.stats.wins;
    if (lossCount) lossCount.textContent = state.stats.losses;

    const accuracy = state.stats.total > 0 
        ? Math.round((state.stats.wins / state.stats.total) * 100) 
        : 0;
    if (accuracyVal) accuracyVal.textContent = accuracy + '%';
    if (miniAccuracy) miniAccuracy.textContent = accuracy + '%';
}

// ============================================
// HELPERS
// ============================================
function updateConnectionStatus(connected, errorMsg = '') {
    const dot = document.querySelector('.node-dot');
    const text = document.querySelector('.node-label');

    if (!dot || !text) return;

    state.isConnected = connected;

    if (connected) {
        dot.classList.add('connected');
        dot.classList.remove('error');
        text.textContent = 'LINK_ACTIVE';
        text.style.color = 'var(--success)';
    } else {
        dot.classList.remove('connected');
        dot.classList.add('error');
        text.textContent = 'LINK_DOWN';
        text.style.color = 'var(--danger)';
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('cipherToast');
    if (!toast) return;

    toast.querySelector('.toast-text').textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function updateTimer() {
    const timer = document.getElementById('cipherTimer');
    const predTimer = document.getElementById('predTimer');

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { 
        hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });

    if (timer) timer.textContent = timeStr;
    if (predTimer) predTimer.textContent = timeStr;
}

function triggerGlitch() {
    const overlay = document.getElementById('glitchOverlay');
    if (overlay) {
        overlay.classList.add('active');
        setTimeout(() => overlay.classList.remove('active'), 300);
    }
}

// ============================================
// INITIALIZATION
// ============================================
function init() {
    console.log('[CIPHER CORE] Initializing Neural Prediction Matrix...');

    // Start matrix rain
    new MatrixRain();

    if (!initAuth()) return;

    fetchData();
    setInterval(fetchData, CONFIG.REFRESH_INTERVAL);
    setInterval(updateTimer, 1000);
    updateTimer();

    showToast('システムオンライン // SYSTEM_ONLINE', 'success');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.session) fetchData();
});
