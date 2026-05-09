// ============================================
// CIPHER CORE v2.0 — ADVANCED NEURAL PREDICTION MATRIX
// Multi-strategy ensemble engine with adaptive weighting
// Persistent history: 200 records internal / 50 displayed
// ============================================

const CONFIG = {
    API_LATEST: 'https://tirangaprediction.ai/api_fixed.php?action=latest_results&source=1M',
    API_HISTORY: 'https://tirangaprediction.ai/api_fixed.php?action=history&source=1M',
    PROXY_LATEST: 'https://api.allorigins.win/raw?url=https://tirangaprediction.ai/api_fixed.php?action=latest_results&source=1M',
    PROXY_HISTORY: 'https://api.allorigins.win/raw?url=https://tirangaprediction.ai/api_fixed.php?action=history&source=1M',
    USE_PROXY: false,
    REFRESH_INTERVAL: 5000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
    API_RESULT_LIMIT: 8,
    HISTORY_DISPLAY_LIMIT: 50,
    LOCAL_HISTORY_MAX: 200,
    PREDICTION_WINDOW: 20,
    MIN_CONFIDENCE: 55,
    MAX_CONFIDENCE: 92
};

// ============================================
// PERIOD NUMBER CALCULATOR
// ============================================
const PeriodCalculator = {
    DAILY_RESET_VALUE: 9671,

    calculateCounter(date = new Date()) {
        const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
        const minutesSinceMidnight = Math.floor((date - midnight) / (1000 * 60));
        return this.DAILY_RESET_VALUE + minutesSinceMidnight;
    },

    getCurrentPeriodNumber(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const counter = this.calculateCounter(date);
        return `${year}${month}${day}1000${String(counter).padStart(5, '0')}`;
    },

    getCounter(periodNumber) {
        return parseInt(periodNumber.slice(-5));
    },

    isToday(periodNumber) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return periodNumber.startsWith(`${year}${month}${day}`);
    }
};

const state = {
    lastIssue: null,
    lastResults: [],
    fullHistory: [],
    pendingPredictions: new Map(),
    hotNumber: null,
    coldNumber: null,
    isConnected: false,
    retryCount: 0,
    session: null,
    stats: { wins: 0, losses: 0, total: 0, streak: 0, bestStreak: 0 },
    isFirstPrediction: true,
    currentTargetPeriod: null,
    currentPeriodNumber: null,
    lastPrediction: null
};

// ============================================
// MATRIX RAIN EFFECT
// ============================================
class MatrixRain {
    constructor() {
        this.canvas = document.getElementById('matrixRain');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.characters = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF';
        this.fontSize = 14;
        this.columns = this.canvas.width / this.fontSize;
        this.drops = [];
        for (let i = 0; i < this.columns; i++) this.drops[i] = Math.random() * -100;
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.columns = this.canvas.width / this.fontSize;
        this.drops = [];
        for (let i = 0; i < this.columns; i++) this.drops[i] = Math.random() * -100;
    }

    animate() {
        this.ctx.fillStyle = 'rgba(27, 38, 44, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#3282B8';
        this.ctx.font = this.fontSize + 'px monospace';
        for (let i = 0; i < this.drops.length; i++) {
            const text = this.characters.charAt(Math.floor(Math.random() * this.characters.length));
            this.ctx.fillText(text, i * this.fontSize, this.drops[i] * this.fontSize);
            if (this.drops[i] * this.fontSize > this.canvas.height && Math.random() > 0.975) this.drops[i] = 0;
            this.drops[i]++;
        }
        requestAnimationFrame(() => this.animate());
    }
}

// ============================================
// ADVANCED ENSEMBLE PREDICTION ENGINE
// ============================================
class AdvancedCipherEngine {
    constructor() {
        this.strategies = [
            'markov', 'streak', 'alternation', 'reversion',
            'momentum', 'entropy', 'gap_analysis', 'number_inference'
        ];
        this.performance = {};
        this.strategies.forEach(s => {
            this.performance[s] = { wins: 0, losses: 0, recent: [] };
        });
        this.emaAlpha = 0.35;
    }

    toNum(type) { return type === 'big' ? 1 : 0; }
    toType(num) { return num >= 0.5 ? 'big' : 'small'; }

    // 1. Markov Chain transition probabilities
    markovStrategy(history) {
        if (history.length < 4) return { pred: 'big', conf: 50, reason: 'Markov: insufficient data' };
        const trans = { big: { big: 0, small: 0 }, small: { big: 0, small: 0 } };
        for (let i = 1; i < history.length; i++) {
            const prev = history[i].actual_result || history[i].result_type;
            const curr = history[i - 1].actual_result || history[i - 1].result_type;
            if (prev && curr) trans[prev][curr]++;
        }
        const last = history[0].actual_result || history[0].result_type;
        const total = trans[last].big + trans[last].small;
        if (total === 0) return { pred: 'big', conf: 50, reason: 'Markov: no transitions' };
        const pBig = trans[last].big / total;
        const pSmall = trans[last].small / total;
        const pred = pBig > pSmall ? 'big' : 'small';
        const conf = Math.round(Math.max(pBig, pSmall) * 100);
        return { pred, conf, reason: `Markov: P(${pred}|${last})=${(Math.max(pBig,pSmall)).toFixed(2)}` };
    }

    // 2. Streak detection & break prediction
    streakStrategy(history) {
        if (history.length < 2) return { pred: 'big', conf: 50, reason: 'Streak: insufficient data' };
        let streak = 1;
        const lastType = history[0].actual_result || history[0].result_type;
        for (let i = 1; i < history.length; i++) {
            const t = history[i].actual_result || history[i].result_type;
            if (t === lastType) streak++; else break;
        }
        if (streak >= 4) {
            return { pred: lastType === 'big' ? 'small' : 'big', conf: Math.min(88, 68 + streak * 4), reason: `Streak break imminent: ${streak}x ${lastType}` };
        } else if (streak === 3) {
            return { pred: lastType === 'big' ? 'small' : 'big', conf: 72, reason: `Streak break: ${streak}x ${lastType}` };
        } else if (streak === 2) {
            return { pred: lastType, conf: 64, reason: `Streak continue: ${streak}x ${lastType}` };
        }
        return { pred: lastType === 'big' ? 'small' : 'big', conf: 54, reason: 'Streak: no pattern' };
    }

    // 3. Alternation rhythm analysis
    alternationStrategy(history) {
        if (history.length < 5) return { pred: 'big', conf: 50, reason: 'Alt: insufficient data' };
        let alts = 0;
        const window = Math.min(10, history.length);
        for (let i = 1; i < window; i++) {
            const curr = history[i - 1].actual_result || history[i - 1].result_type;
            const prev = history[i].actual_result || history[i].result_type;
            if (curr !== prev) alts++;
        }
        const rate = alts / (window - 1);
        const last = history[0].actual_result || history[0].result_type;
        if (rate > 0.7) {
            return { pred: last === 'big' ? 'small' : 'big', conf: Math.min(88, Math.round(58 + rate * 28)), reason: `High alternation rhythm (${(rate*100).toFixed(0)}%)` };
        } else if (rate < 0.3) {
            return { pred: last, conf: Math.min(82, Math.round(58 + (1 - rate) * 22)), reason: `Low alternation momentum (${(rate*100).toFixed(0)}%)` };
        }
        return { pred: last === 'big' ? 'small' : 'big', conf: 55, reason: 'Alt: mixed rhythm' };
    }

    // 4. Mean reversion (frequency bias correction)
    reversionStrategy(history) {
        if (history.length < 10) return { pred: 'big', conf: 50, reason: 'Reversion: insufficient data' };
        const recent = history.slice(0, 24);
        const bigCount = recent.filter(h => (h.actual_result || h.result_type) === 'big').length;
        const ratio = bigCount / recent.length;
        if (ratio > 0.62) {
            return { pred: 'small', conf: Math.min(86, Math.round(62 + (ratio - 0.5) * 60)), reason: `Mean reversion: ${(ratio*100).toFixed(0)}% big (overdue small)` };
        } else if (ratio < 0.38) {
            return { pred: 'big', conf: Math.min(86, Math.round(62 + (0.5 - ratio) * 60)), reason: `Mean reversion: ${(ratio*100).toFixed(0)}% big (overdue big)` };
        }
        return { pred: 'big', conf: 53, reason: 'Reversion: balanced' };
    }

    // 5. Exponential moving average momentum
    momentumStrategy(history) {
        if (history.length < 5) return { pred: 'big', conf: 50, reason: 'Momentum: insufficient data' };
        let ema = this.toNum(history[history.length - 1].actual_result || history[history.length - 1].result_type);
        for (let i = history.length - 2; i >= 0; i--) {
            const val = this.toNum(history[i].actual_result || history[i].result_type);
            ema = this.emaAlpha * val + (1 - this.emaAlpha) * ema;
        }
        const pred = this.toType(ema);
        const conf = Math.min(84, Math.round(50 + Math.abs(ema - 0.5) * 70));
        return { pred, conf, reason: `EMA momentum: ${ema.toFixed(2)}` };
    }

    // 6. Entropy / randomness detection
    entropyStrategy(history) {
        if (history.length < 10) return { pred: 'big', conf: 50, reason: 'Entropy: insufficient data' };
        const recent = history.slice(0, 12);
        const counts = { big: 0, small: 0 };
        recent.forEach(h => counts[h.actual_result || h.result_type]++);
        const pBig = counts.big / 12;
        const pSmall = counts.small / 12;
        const entropy = -(pBig * Math.log2(pBig || 0.001) + pSmall * Math.log2(pSmall || 0.001));
        const normEntropy = entropy / 1.0;
        const last = history[0].actual_result || history[0].result_type;
        if (normEntropy > 0.92) {
            return { ...this.reversionStrategy(history), reason: `High entropy ${normEntropy.toFixed(2)} → reversion` };
        } else if (normEntropy < 0.65) {
            return { pred: last, conf: 66, reason: `Low entropy pattern ${normEntropy.toFixed(2)}` };
        }
        return { pred: last === 'big' ? 'small' : 'big', conf: 56, reason: `Mid entropy ${normEntropy.toFixed(2)}` };
    }

    // 7. Gap analysis (time since last occurrence)
    gapStrategy(history) {
        if (history.length < 10) return { pred: 'big', conf: 50, reason: 'Gap: insufficient data' };
        const gaps = { big: [], small: [] };
        let lastIdx = { big: -1, small: -1 };
        history.forEach((h, idx) => {
            const type = h.actual_result || h.result_type;
            if (lastIdx[type] !== -1) gaps[type].push(idx - lastIdx[type]);
            lastIdx[type] = idx;
        });
        const avgGapBig = gaps.big.length ? gaps.big.reduce((a, b) => a + b, 0) / gaps.big.length : 2;
        const avgGapSmall = gaps.small.length ? gaps.small.reduce((a, b) => a + b, 0) / gaps.small.length : 2;
        let currGap = { big: 0, small: 0 };
        for (let i = 0; i < history.length; i++) {
            const type = history[i].actual_result || history[i].result_type;
            if (currGap.big === 0 && type === 'big') currGap.big = i;
            if (currGap.small === 0 && type === 'small') currGap.small = i;
            if (currGap.big && currGap.small) break;
        }
        const overdueBig = currGap.big > avgGapBig * 1.4;
        const overdueSmall = currGap.small > avgGapSmall * 1.4;
        if (overdueBig && !overdueSmall) return { pred: 'big', conf: 74, reason: `Big gap overdue (${currGap.big} > avg ${avgGapBig.toFixed(1)})` };
        if (overdueSmall && !overdueBig) return { pred: 'small', conf: 74, reason: `Small gap overdue (${currGap.small} > avg ${avgGapSmall.toFixed(1)})` };
        return { pred: 'big', conf: 53, reason: 'Gaps within normal range' };
    }

    // 8. Number clustering inference
    numberInference(history) {
        if (history.length < 5) return { pred: 'big', conf: 50, reason: 'Number: insufficient data' };
        const nums = history.slice(0, 6).map(h => h.actual_number).filter(n => n !== undefined && n !== null);
        if (nums.length < 3) return { pred: 'big', conf: 50, reason: 'Number: no numeric data' };
        const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
        if (avg >= 7) return { pred: 'small', conf: 66, reason: `High num avg ${avg.toFixed(1)} → reversion` };
        if (avg <= 2) return { pred: 'big', conf: 66, reason: `Low num avg ${avg.toFixed(1)} → reversion` };
        if (avg >= 5) return { pred: 'big', conf: 58, reason: `Mid-high num avg ${avg.toFixed(1)}` };
        return { pred: 'small', conf: 58, reason: `Mid-low num avg ${avg.toFixed(1)}` };
    }

    // Ensemble with adaptive weighting
    generatePrediction(lastResult, history) {
        if (!history || history.length < 4) {
            return { prediction: 'big', confidence: 50, strategy: 'default', reason: 'Initializing neural matrix...', breakdown: [] };
        }

        const results = [
            { name: 'markov', ...this.markovStrategy(history) },
            { name: 'streak', ...this.streakStrategy(history) },
            { name: 'alternation', ...this.alternationStrategy(history) },
            { name: 'reversion', ...this.reversionStrategy(history) },
            { name: 'momentum', ...this.momentumStrategy(history) },
            { name: 'entropy', ...this.entropyStrategy(history) },
            { name: 'gap_analysis', ...this.gapStrategy(history) },
            { name: 'number_inference', ...this.numberInference(history) }
        ];

        const weights = this.getAdaptiveWeights();
        let bigScore = 0, smallScore = 0, totalWeight = 0;
        const breakdown = [];

        results.forEach(r => {
            const w = weights[r.name] || 1.0;
            const score = (r.conf / 100) * w;
            if (r.pred === 'big') bigScore += score; else smallScore += score;
            totalWeight += w;
            breakdown.push({ name: r.name, pred: r.pred, conf: r.conf, weight: w.toFixed(2) });
        });

        const bigProb = bigScore / totalWeight;
        const smallProb = smallScore / totalWeight;
        const prediction = bigProb > smallProb ? 'big' : 'small';
        let confidence = Math.round(Math.max(bigProb, smallProb) * 100);

        const primary = results
            .filter(r => r.pred === prediction)
            .sort((a, b) => (b.conf * (weights[b.name] || 1)) - (a.conf * (weights[a.name] || 1)))[0];

        const recentAccuracy = this.getRecentAccuracy();
        confidence = Math.round(confidence * (0.72 + recentAccuracy * 0.28));
        confidence = Math.max(CONFIG.MIN_CONFIDENCE, Math.min(CONFIG.MAX_CONFIDENCE, confidence));

        return {
            prediction,
            confidence,
            strategy: primary ? primary.name : 'ensemble',
            reason: primary ? primary.reason : 'Ensemble consensus',
            breakdown,
            bigProb: (bigProb * 100).toFixed(1),
            smallProb: (smallProb * 100).toFixed(1)
        };
    }

    getAdaptiveWeights() {
        const weights = {};
        let totalPerf = 0;
        this.strategies.forEach(s => {
            const perf = this.performance[s];
            const recent = perf.recent.slice(-12);
            const wins = recent.filter(r => r).length;
            const acc = recent.length ? wins / recent.length : 0.5;
            weights[s] = 0.4 + acc * 1.2;
            totalPerf += weights[s];
        });
        this.strategies.forEach(s => {
            weights[s] = (weights[s] / totalPerf) * this.strategies.length;
        });
        return weights;
    }

    getRecentAccuracy() {
        const all = [];
        this.strategies.forEach(s => all.push(...this.performance[s].recent.slice(-6)));
        if (all.length === 0) return 0.5;
        return all.filter(r => r).length / all.length;
    }

    learnFromResult(prediction, actual, strategyName, usedStrategies = []) {
        const correct = prediction === actual;
        if (strategyName && this.performance[strategyName]) {
            if (correct) this.performance[strategyName].wins++;
            else this.performance[strategyName].losses++;
            this.performance[strategyName].recent.push(correct);
            if (this.performance[strategyName].recent.length > 24) this.performance[strategyName].recent.shift();
        }
        usedStrategies.forEach(s => {
            if (s.name !== strategyName && this.performance[s.name]) {
                const sCorrect = s.pred === actual;
                this.performance[s.name].recent.push(sCorrect);
                if (this.performance[s.name].recent.length > 24) this.performance[s.name].recent.shift();
            }
        });
    }

    calculateHotColdNumbers(history) {
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
            score: freq[num] * 0.65 + (recency[num] / history.length) * 0.35
        }));
        scores.sort((a, b) => b.score - a.score);
        return {
            hot: scores.length > 0 ? scores[0].number : null,
            cold: scores.length > 0 ? scores[scores.length - 1].number : null,
            top3: scores.slice(0, 3).map(s => s.number)
        };
    }

    getStrategyStats() {
        return this.strategies.map(s => {
            const p = this.performance[s];
            const total = p.wins + p.losses;
            const recent = p.recent.slice(-10);
            const recentWins = recent.filter(r => r).length;
            return {
                name: s,
                wins: p.wins,
                losses: p.losses,
                accuracy: total ? Math.round((p.wins / total) * 100) : 0,
                recentAccuracy: recent.length ? Math.round((recentWins / recent.length) * 100) : 0
            };
        });
    }
}

const engine = new AdvancedCipherEngine();

// ============================================
// AUTHENTICATION
// ============================================
function initAuth() {
    console.log('[CIPHER CORE v2.0] Initializing authentication...');
    const saved = localStorage.getItem('hiroto_signals_session');
    if (!saved) {
        showAccessDenied();
        return false;
    }
    try {
        const session = JSON.parse(saved);
        let expiryDate;
        if (session.expires) {
            expiryDate = new Date(session.expires);
            if (isNaN(expiryDate.getTime())) {
                if (typeof session.expires === 'object' && session.expires.seconds) {
                    expiryDate = new Date(session.expires.seconds * 1000);
                } else if (typeof session.expires === 'number') {
                    expiryDate = new Date(session.expires * 1000);
                }
            }
        }
        if (!expiryDate || isNaN(expiryDate.getTime())) {
            if (session.expiry) expiryDate = new Date(session.expiry);
            else if (session.expiration) expiryDate = new Date(session.expiration);
            else if (session.validUntil) expiryDate = new Date(session.validUntil);
        }
        if (!expiryDate || isNaN(expiryDate.getTime())) {
            if (session.created) {
                expiryDate = new Date(new Date(session.created).getTime() + (7 * 24 * 60 * 60 * 1000));
            } else {
                expiryDate = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));
            }
        }
        if (expiryDate < new Date()) {
            localStorage.removeItem('hiroto_signals_session');
            showAccessDenied();
            return false;
        }
        state.session = session;
        state.session.parsedExpiry = expiryDate.toISOString();
        document.getElementById('accessDenied').classList.add('hidden');
        document.getElementById('dashboardContent').classList.remove('hidden');
        const days = Math.ceil((expiryDate - new Date()) / 86400000);
        const badge = document.getElementById('sessionChip');
        if (badge) {
            const chipText = badge.querySelector('.chip-text');
            if (chipText) chipText.textContent = `${days} DAYS`;
        }
        return true;
    } catch (e) {
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

window.setTestSession = function () {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    localStorage.setItem('hiroto_signals_session', JSON.stringify({
        key: 'CIPHER-XXXX-XXXX-XXXX', status: 'active',
        created: new Date().toISOString(), expires: expiry.toISOString()
    }));
    location.reload();
};

window.clearSession = function () {
    localStorage.removeItem('hiroto_signals_session');
    location.reload();
};

// ============================================
// PERSISTENT HISTORY MANAGER (200 records)
// ============================================
const HistoryManager = {
    STORAGE_KEY: 'cipher_full_history_v2',

    load() {
        try { const d = localStorage.getItem(this.STORAGE_KEY); return d ? JSON.parse(d) : []; }
        catch (e) { return []; }
    },

    save(history) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history.slice(0, CONFIG.LOCAL_HISTORY_MAX)));
    },

    merge(apiResults, latestResults) {
        let stored = this.load();
        const allNew = [...latestResults, ...apiResults];
        const map = new Map();
        stored.forEach(item => { if (item.issue_number) map.set(item.issue_number, item); });
        allNew.forEach(item => {
            if (!item.issue_number) return;
            const existing = map.get(item.issue_number);
            if (existing) {
                map.set(item.issue_number, {
                    ...existing, ...item,
                    predicted_type: existing.predicted_type || item.predicted_type,
                    prediction_confidence: existing.prediction_confidence || item.prediction_confidence,
                    strategy_used: existing.strategy_used || item.strategy_used
                });
            } else {
                map.set(item.issue_number, item);
            }
        });
        const sorted = Array.from(map.values()).sort((a, b) => parseInt(b.issue_number) - parseInt(a.issue_number));
        this.save(sorted);
        return sorted;
    },

    addPrediction(issueNumber, prediction, confidence, strategy) {
        const history = this.load();
        const item = history.find(h => h.issue_number === issueNumber);
        if (item) {
            item.predicted_type = prediction;
            item.prediction_confidence = confidence;
            item.strategy_used = strategy;
            item.prediction_time = new Date().toISOString();
        } else {
            history.unshift({
                issue_number: issueNumber, predicted_type: prediction,
                prediction_confidence: confidence, strategy_used: strategy,
                prediction_time: new Date().toISOString(),
                actual_result: null, actual_number: null
            });
        }
        this.save(history);
    },

    updateOutcome(issueNumber, actualResult, actualNumber) {
        const history = this.load();
        const item = history.find(h => h.issue_number === issueNumber);
        if (item) {
            item.actual_result = actualResult;
            item.actual_number = actualNumber;
            item.outcome_time = new Date().toISOString();
        }
        this.save(history);
    },

    getForDisplay(limit = CONFIG.HISTORY_DISPLAY_LIMIT) {
        return this.load().slice(0, limit);
    },

    getForAnalysis() {
        return this.load().filter(h => h.actual_result || h.result_type);
    }
};

function migrateOldData() {
    const oldExt = localStorage.getItem('cipher_extended_history');
    if (oldExt && !localStorage.getItem('cipher_full_history_v2')) {
        try {
            const data = JSON.parse(oldExt);
            localStorage.setItem('cipher_full_history_v2', JSON.stringify(data));
            console.log('[CIPHER CORE] Migrated old history to v2.0');
        } catch (e) { }
    }
}

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
            fetch(urls[0], { signal: controller.signal, headers: { 'Accept': 'application/json' } }),
            fetch(urls[1], { signal: controller.signal, headers: { 'Accept': 'application/json' } })
        ]);
        clearTimeout(timeoutId);
        if (!latestRes.ok || !historyRes.ok) throw new Error(`HTTP ${latestRes.status}`);
        const latest = await latestRes.json();
        const apiHistory = await historyRes.json();
        if (!Array.isArray(latest) || latest.length === 0) throw new Error('Invalid data');
        updateConnectionStatus(true);
        const currentIssue = latest[0]?.issue_number;
        if (currentIssue !== state.lastIssue) {
            state.lastIssue = currentIssue;
            state.lastResults = latest;
            state.fullHistory = HistoryManager.merge(apiHistory || [], latest);
            processData(latest);
            triggerGlitch();
            showToast('シグナル同期完了 // SIGNAL_SYNC_COMPLETE', 'success');
        }
        state.retryCount = 0;
    } catch (error) { handleFetchError(error); }
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
function processData(latest) {
    const lastResult = latest[0];
    state.currentPeriodNumber = PeriodCalculator.getCurrentPeriodNumber();
    state.currentTargetPeriod = state.currentPeriodNumber;

    const analysisHistory = HistoryManager.getForAnalysis();
    const prediction = engine.generatePrediction(lastResult, analysisHistory);
    const numbers = engine.calculateHotColdNumbers(analysisHistory);
    state.hotNumber = numbers.hot;
    state.coldNumber = numbers.cold;

    state.pendingPredictions.set(state.currentTargetPeriod, {
        prediction: prediction.prediction,
        timestamp: new Date().toISOString(),
        period_number: state.currentTargetPeriod,
        confidence: prediction.confidence,
        strategy: prediction.strategy,
        breakdown: prediction.breakdown
    });

    HistoryManager.addPrediction(state.currentTargetPeriod, prediction.prediction, prediction.confidence, prediction.strategy);
    resolvePendingPredictions();
    updateActivePrediction(prediction, state.currentTargetPeriod);
    updateHotColdNumbers();
    updateLatestResults(latest);
    updateHistoryDisplay();
    updateStats();
    logStrategyPerformance();

    document.getElementById('miniAccuracy').textContent = state.stats.total > 0 ? Math.round((state.stats.wins / state.stats.total) * 100) + '%' : '0%';
    document.getElementById('miniSignals').textContent = state.stats.total;
    document.getElementById('miniWins').textContent = state.stats.wins;
    document.getElementById('miniLosses').textContent = state.stats.losses;

    if (state.isFirstPrediction) state.isFirstPrediction = false;
}

function resolvePendingPredictions() {
    const history = HistoryManager.load();
    state.pendingPredictions.forEach((pred, issueNum) => {
        const result = history.find(h => h.issue_number === issueNum && (h.actual_result || h.result_type));
        if (result) {
            const actual = result.actual_result || result.result_type;
            const isCorrect = pred.prediction === actual;
            HistoryManager.updateOutcome(issueNum, actual, result.actual_number);
            engine.learnFromResult(pred.prediction, actual, pred.strategy, pred.breakdown);
            state.stats.total++;
            if (isCorrect) {
                state.stats.wins++;
                state.stats.streak++;
                if (state.stats.streak > state.stats.bestStreak) state.stats.bestStreak = state.stats.streak;
            } else {
                state.stats.losses++;
                state.stats.streak = 0;
            }
            state.pendingPredictions.delete(issueNum);
        }
    });
    recalculateStats();
}

function recalculateStats() {
    const history = HistoryManager.getForAnalysis().slice(0, 50);
    const valid = history.filter(h => h.predicted_type && (h.actual_result || h.result_type));
    const wins = valid.filter(h => h.predicted_type === (h.actual_result || h.result_type)).length;
    state.stats.total = valid.length;
    state.stats.wins = wins;
    state.stats.losses = valid.length - wins;
}

// ============================================
// UI UPDATES
// ============================================
function updateActivePrediction(pred, targetPeriod) {
    const valueEl = document.getElementById('predictionValue');
    if (!valueEl) return;
    valueEl.textContent = pred.prediction.toUpperCase();
    valueEl.className = 'core-value ' + pred.prediction;
    const targetPeriodEl = document.getElementById('targetPeriod');
    if (targetPeriodEl) targetPeriodEl.textContent = targetPeriod;
    const confidenceVal = document.getElementById('confidenceVal');
    if (confidenceVal) confidenceVal.textContent = pred.confidence + '%';
    const fillEl = document.getElementById('confidenceFill');
    if (fillEl) fillEl.style.width = pred.confidence + '%';
    const periodBar = document.getElementById('periodBar');
    if (periodBar) { periodBar.style.width = '0%'; setTimeout(() => periodBar.style.width = '100%', 100); }
    state.lastPrediction = pred;
}

function updateHotColdNumbers() {
    const hotEl = document.getElementById('hotNumber');
    const coldEl = document.getElementById('coldNumber');
    if (hotEl) hotEl.textContent = state.hotNumber ?? '--';
    if (coldEl) coldEl.textContent = state.coldNumber ?? '--';
}

function updateLatestResults(data) {
    const container = document.getElementById('streamContent');
    if (!container) return;
    container.innerHTML = data.slice(0, 5).map((r, index) => {
        const type = r.result_type || 'small';
        const isLatest = index === 0;
        return `<div class="stream-item ${type} ${isLatest ? 'latest' : ''}">${r.actual_number ?? '--'}</div>`;
    }).join('');
}

function updateHistoryDisplay() {
    const tbody = document.getElementById('historyBody');
    const meta = document.getElementById('historyMeta');
    if (!tbody || !meta) return;
    const displayHistory = HistoryManager.getForDisplay(CONFIG.HISTORY_DISPLAY_LIMIT);
    meta.textContent = `${displayHistory.length} RECORDS // DB: ${HistoryManager.load().length}`;
    if (displayHistory.length === 0) {
        tbody.innerHTML = `<tr class="loading-row"><td colspan="5"><div class="table-loader"><div class="loader-ring"></div><span>DECRYPTING_DATA...</span></div></td></tr>`;
        return;
    }
    tbody.innerHTML = displayHistory.map((r, index) => {
        const actual = r.actual_result || r.result_type;
        let outcome;
        if (r.predicted_type && actual) {
            outcome = r.predicted_type === actual ? '<span class="outcome-badge win">WIN</span>' : '<span class="outcome-badge loss">LOSS</span>';
        } else if (r.predicted_type) {
            outcome = '<span class="outcome-badge na">PENDING</span>';
        } else {
            outcome = '<span class="outcome-badge na">---</span>';
        }
        const predClass = r.predicted_type || 'pending';
        const predText = r.predicted_type ? r.predicted_type.toUpperCase() : '---';
        const actualClass = actual || 'small';
        const actualText = actual ? actual.toUpperCase() : '---';
        return `
            <tr class="${index === 0 ? 'new-result' : ''}">
                <td class="cell-issue">${r.issue_number || '--'}</td>
                <td class="cell-prediction ${predClass}">${predText}</td>
                <td class="cell-actual ${actualClass}">${actualText}</td>
                <td class="cell-number">${r.actual_number ?? '--'}</td>
                <td class="cell-outcome">${outcome}</td>
            </tr>`;
    }).join('');
}

function updateStats() {
    const accuracy = state.stats.total > 0 ? Math.round((state.stats.wins / state.stats.total) * 100) : 0;
    const els = ['miniAccuracy', 'miniSignals', 'miniWins', 'miniLosses'];
    const vals = [accuracy + '%', state.stats.total, state.stats.wins, state.stats.losses];
    els.forEach((id, i) => { const el = document.getElementById(id); if (el) el.textContent = vals[i]; });
}

function logStrategyPerformance() {
    const stats = engine.getStrategyStats();
    console.table(stats.map(s => ({
        Strategy: s.name,
        Wins: s.wins,
        Losses: s.losses,
        Overall: s.accuracy + '%',
        Recent: s.recentAccuracy + '%'
    })));
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
        dot.classList.add('connected'); dot.classList.remove('error');
        text.textContent = 'LINK_ACTIVE'; text.style.color = 'var(--success)';
    } else {
        dot.classList.remove('connected'); dot.classList.add('error');
        text.textContent = 'LINK_DOWN'; text.style.color = 'var(--danger)';
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('cipherToast');
    if (!toast) return;
    const textEl = toast.querySelector('.toast-text');
    if (textEl) textEl.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function updateTimer() {
    const timer = document.getElementById('cipherTimer');
    const predTimer = document.getElementById('predTimer');
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (timer) timer.textContent = timeStr;
    if (predTimer) predTimer.textContent = timeStr;
}

function triggerGlitch() {
    const overlay = document.getElementById('glitchOverlay');
    if (overlay) { overlay.classList.add('active'); setTimeout(() => overlay.classList.remove('active'), 300); }
}

// ============================================
// INITIALIZATION
// ============================================
function init() {
    console.log('[CIPHER CORE v2.0] Advanced Neural Prediction Matrix Online');
    console.log('[CIPHER CORE] Internal DB limit:', CONFIG.LOCAL_HISTORY_MAX, '| Display:', CONFIG.HISTORY_DISPLAY_LIMIT);

    new MatrixRain();
    if (!initAuth()) return;

    migrateOldData();
    state.fullHistory = HistoryManager.load();
    console.log('[CIPHER CORE] Loaded', state.fullHistory.length, 'historical records');

    // Restore pending predictions from storage
    state.fullHistory.forEach(h => {
        if (h.predicted_type && !h.actual_result && !h.result_type) {
            state.pendingPredictions.set(h.issue_number, {
                prediction: h.predicted_type,
                timestamp: h.prediction_time,
                period_number: h.issue_number,
                confidence: h.prediction_confidence,
                strategy: h.strategy_used
            });
        }
    });

    fetchData();
    setInterval(fetchData, CONFIG.REFRESH_INTERVAL);
    setInterval(updateTimer, 1000);
    updateTimer();
    showToast('システムオンライン // SYSTEM_ONLINE v2.0', 'success');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.session) fetchData();
});
