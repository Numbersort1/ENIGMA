// ============================================
// HIROTO NEURAL MATRIX v3.0
// Advanced Ensemble Prediction with Uncertainty Quantification
// Monte Carlo Simulation | Bayesian Updating | Regime Detection
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
    HISTORY_DISPLAY_LIMIT: 50,
    LOCAL_HISTORY_MAX: 200,
    MIN_CONFIDENCE: 52,
    MAX_CONFIDENCE: 95,
    MONTE_CARLO_RUNS: 1000,
    PATTERN_MAX_LEN: 5,
    REGIME_WINDOW: 20
};

// ============================================
// PERIOD CALCULATOR
// ============================================
const PeriodCalculator = {
    DAILY_RESET_VALUE: 9671,
    calculateCounter(date = new Date()) {
        const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
        return this.DAILY_RESET_VALUE + Math.floor((date - midnight) / 60000);
    },
    getCurrentPeriodNumber(date = new Date()) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}${m}${d}1000${String(this.calculateCounter(date)).padStart(5, '0')}`;
    }
};

const state = {
    lastIssue: null,
    lastResults: [],
    fullHistory: [],
    pendingPredictions: new Map(),
    hotNumber: null,
    coldNumber: null,
    warmNumber: null,
    expectedNumber: null,
    isConnected: false,
    retryCount: 0,
    session: null,
    stats: { wins: 0, losses: 0, total: 0, streak: 0, bestStreak: 0 },
    isFirstPrediction: true,
    currentTargetPeriod: null,
    currentPeriodNumber: null,
    lastPrediction: null,
    activePanel: 'predict'
};

// ============================================
// NEURAL CANVAS BACKGROUND
// ============================================
class NeuralCanvas {
    constructor() {
        this.canvas = document.getElementById('neuralCanvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.nodes = [];
        this.connections = [];
        this.initNodes();
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    initNodes() {
        const count = Math.floor((this.canvas.width * this.canvas.height) / 25000);
        for (let i = 0; i < count; i++) {
            this.nodes.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                radius: Math.random() * 2 + 1,
                opacity: Math.random() * 0.5 + 0.2
            });
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update nodes
        this.nodes.forEach(n => {
            n.x += n.vx;
            n.y += n.vy;
            if (n.x < 0 || n.x > this.canvas.width) n.vx *= -1;
            if (n.y < 0 || n.y > this.canvas.height) n.vy *= -1;
        });

        // Draw connections
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const dx = this.nodes[i].x - this.nodes[j].x;
                const dy = this.nodes[i].y - this.nodes[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.nodes[i].x, this.nodes[i].y);
                    this.ctx.lineTo(this.nodes[j].x, this.nodes[j].y);
                    this.ctx.strokeStyle = `rgba(74, 158, 255, ${0.1 * (1 - dist / 120)})`;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.stroke();
                }
            }
        }

        // Draw nodes
        this.nodes.forEach(n => {
            this.ctx.beginPath();
            this.ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(74, 158, 255, ${n.opacity})`;
            this.ctx.fill();
        });

        requestAnimationFrame(() => this.animate());
    }
}

// ============================================
// ADVANCED PREDICTION ENGINE v3.0
// ============================================
class NeuralMatrixEngine {
    constructor() {
        this.strategies = [
            'markov', 'streak', 'alternation', 'reversion', 'momentum',
            'entropy', 'gap_analysis', 'number_inference', 'pattern',
            'bayesian', 'fibonacci', 'parity'
        ];
        this.performance = {};
        this.strategies.forEach(s => {
            this.performance[s] = { wins: 0, losses: 0, recent: [], uncertainty: 1.0 };
        });
        this.emaAlpha = 0.35;
        this.regimeHistory = [];
    }

    toNum(type) { return type === 'big' ? 1 : 0; }
    toType(num) { return num >= 0.5 ? 'big' : 'small'; }

    // --- Core Strategies ---

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
        const pred = pBig > 0.5 ? 'big' : 'small';
        const conf = Math.round(Math.max(pBig, 1 - pBig) * 100);
        return { pred, conf, reason: `Markov: P(${pred}|${last})=${Math.max(pBig,1-pBig).toFixed(2)}` };
    }

    streakStrategy(history) {
        if (history.length < 2) return { pred: 'big', conf: 50, reason: 'Streak: insufficient data' };
        let streak = 1;
        const lastType = history[0].actual_result || history[0].result_type;
        for (let i = 1; i < history.length; i++) {
            const t = history[i].actual_result || history[i].result_type;
            if (t === lastType) streak++; else break;
        }
        if (streak >= 4) return { pred: lastType === 'big' ? 'small' : 'big', conf: Math.min(90, 70 + streak * 4), reason: `Streak break: ${streak}x ${lastType}` };
        if (streak === 3) return { pred: lastType === 'big' ? 'small' : 'big', conf: 74, reason: `Streak break: ${streak}x ${lastType}` };
        if (streak === 2) return { pred: lastType, conf: 62, reason: `Streak continue: ${streak}x ${lastType}` };
        return { pred: lastType === 'big' ? 'small' : 'big', conf: 54, reason: 'Streak: no pattern' };
    }

    alternationStrategy(history) {
        if (history.length < 5) return { pred: 'big', conf: 50, reason: 'Alt: insufficient data' };
        let alts = 0;
        const window = Math.min(12, history.length);
        for (let i = 1; i < window; i++) {
            const curr = history[i - 1].actual_result || history[i - 1].result_type;
            const prev = history[i].actual_result || history[i].result_type;
            if (curr !== prev) alts++;
        }
        const rate = alts / (window - 1);
        const last = history[0].actual_result || history[0].result_type;
        if (rate > 0.7) return { pred: last === 'big' ? 'small' : 'big', conf: Math.min(88, Math.round(58 + rate * 30)), reason: `High alternation (${(rate*100).toFixed(0)}%)` };
        if (rate < 0.3) return { pred: last, conf: Math.min(82, Math.round(58 + (1 - rate) * 24)), reason: `Low alternation (${(rate*100).toFixed(0)}%)` };
        return { pred: last === 'big' ? 'small' : 'big', conf: 55, reason: 'Alt: mixed' };
    }

    reversionStrategy(history) {
        if (history.length < 10) return { pred: 'big', conf: 50, reason: 'Reversion: insufficient data' };
        const recent = history.slice(0, 24);
        const bigCount = recent.filter(h => (h.actual_result || h.result_type) === 'big').length;
        const ratio = bigCount / recent.length;
        if (ratio > 0.62) return { pred: 'small', conf: Math.min(86, Math.round(60 + (ratio - 0.5) * 60)), reason: `Mean reversion: ${(ratio*100).toFixed(0)}% big` };
        if (ratio < 0.38) return { pred: 'big', conf: Math.min(86, Math.round(60 + (0.5 - ratio) * 60)), reason: `Mean reversion: ${(ratio*100).toFixed(0)}% big` };
        return { pred: 'big', conf: 53, reason: 'Reversion: balanced' };
    }

    momentumStrategy(history) {
        if (history.length < 5) return { pred: 'big', conf: 50, reason: 'Momentum: insufficient data' };
        let ema = this.toNum(history[history.length - 1].actual_result || history[history.length - 1].result_type);
        for (let i = history.length - 2; i >= 0; i--) {
            const val = this.toNum(history[i].actual_result || history[i].result_type);
            ema = this.emaAlpha * val + (1 - this.emaAlpha) * ema;
        }
        const pred = this.toType(ema);
        const conf = Math.min(84, Math.round(50 + Math.abs(ema - 0.5) * 70));
        return { pred, conf, reason: `EMA: ${ema.toFixed(2)}` };
    }

    entropyStrategy(history) {
        if (history.length < 10) return { pred: 'big', conf: 50, reason: 'Entropy: insufficient data' };
        const recent = history.slice(0, 15);
        const counts = { big: 0, small: 0 };
        recent.forEach(h => counts[h.actual_result || h.result_type]++);
        const pBig = counts.big / 15;
        const pSmall = counts.small / 15;
        const entropy = -(pBig * Math.log2(pBig || 0.001) + pSmall * Math.log2(pSmall || 0.001));
        const normEntropy = entropy / 1.0;
        const last = history[0].actual_result || history[0].result_type;
        if (normEntropy > 0.92) return { ...this.reversionStrategy(history), reason: `High entropy ${normEntropy.toFixed(2)}` };
        if (normEntropy < 0.65) return { pred: last, conf: 66, reason: `Low entropy ${normEntropy.toFixed(2)}` };
        return { pred: last === 'big' ? 'small' : 'big', conf: 56, reason: `Mid entropy ${normEntropy.toFixed(2)}` };
    }

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
        if (overdueBig && !overdueSmall) return { pred: 'big', conf: 76, reason: `Big gap overdue` };
        if (overdueSmall && !overdueBig) return { pred: 'small', conf: 76, reason: `Small gap overdue` };
        return { pred: 'big', conf: 53, reason: 'Gaps normal' };
    }

    numberInference(history) {
        if (history.length < 5) return { pred: 'big', conf: 50, reason: 'Number: insufficient data' };
        const nums = history.slice(0, 8).map(h => h.actual_number).filter(n => n !== undefined && n !== null);
        if (nums.length < 3) return { pred: 'big', conf: 50, reason: 'Number: no data' };
        const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
        if (avg >= 7) return { pred: 'small', conf: 68, reason: `High avg ${avg.toFixed(1)}` };
        if (avg <= 2) return { pred: 'big', conf: 68, reason: `Low avg ${avg.toFixed(1)}` };
        if (avg >= 5) return { pred: 'big', conf: 58, reason: `Mid-high avg ${avg.toFixed(1)}` };
        return { pred: 'small', conf: 58, reason: `Mid-low avg ${avg.toFixed(1)}` };
    }

    // --- NEW ADVANCED STRATEGIES ---

    patternStrategy(history) {
        if (history.length < 6) return { pred: 'big', conf: 50, reason: 'Pattern: insufficient data' };
        const types = history.slice(0, 20).map(h => h.actual_result || h.result_type);

        // Check for repeating patterns of length 2-5
        for (let len = 2; len <= CONFIG.PATTERN_MAX_LEN; len++) {
            if (types.length < len * 2) continue;
            const recent = types.slice(0, len).join('');
            const prev = types.slice(len, len * 2).join('');
            if (recent === prev) {
                // Pattern detected - predict next in sequence
                const pattern = types.slice(0, len);
                const nextIdx = types.length % len;
                const pred = pattern[nextIdx] || 'big';
                return { pred, conf: 72 + len * 2, reason: `Pattern repeat [${len}]` };
            }
        }

        // Check for alternating patterns
        let altCount = 0;
        for (let i = 1; i < Math.min(8, types.length); i++) {
            if (types[i] !== types[i-1]) altCount++;
        }
        if (altCount >= 6) {
            const last = types[0];
            return { pred: last === 'big' ? 'small' : 'big', conf: 68, reason: 'Strong alternation pattern' };
        }

        return { pred: types[0] === 'big' ? 'small' : 'big', conf: 52, reason: 'No pattern detected' };
    }

    bayesianStrategy(history) {
        if (history.length < 10) return { pred: 'big', conf: 50, reason: 'Bayesian: insufficient data' };

        // Prior: assume 50/50
        let priorBig = 0.5;
        let priorSmall = 0.5;

        // Update with recent evidence using Beta distribution approximation
        const recent = history.slice(0, 15);
        const bigCount = recent.filter(h => (h.actual_result || h.result_type) === 'big').length;
        const smallCount = recent.length - bigCount;

        // Posterior with pseudo-counts (Laplace smoothing)
        const alpha = bigCount + 1;
        const beta = smallCount + 1;
        const posteriorBig = alpha / (alpha + beta);

        // Adjust for recency bias
        const last5 = history.slice(0, 5);
        const last5Big = last5.filter(h => (h.actual_result || h.result_type) === 'big').length;
        const recencyWeight = 0.3;
        const adjustedP = posteriorBig * (1 - recencyWeight) + (last5Big / 5) * recencyWeight;

        const pred = adjustedP > 0.5 ? 'big' : 'small';
        const conf = Math.min(85, Math.round(50 + Math.abs(adjustedP - 0.5) * 80));

        return { pred, conf, reason: `Bayesian: P(big)=${adjustedP.toFixed(2)}` };
    }

    fibonacciStrategy(history) {
        if (history.length < 8) return { pred: 'big', conf: 50, reason: 'Fibonacci: insufficient data' };
        const nums = history.slice(0, 10).map(h => h.actual_number).filter(n => n !== undefined && n !== null);
        if (nums.length < 5) return { pred: 'big', conf: 50, reason: 'Fibonacci: no numbers' };

        // Check if numbers follow fibonacci-like progression
        const fibSet = new Set([0, 1, 1, 2, 3, 5, 8, 13, 21, 34]);
        const fibMatches = nums.filter(n => fibSet.has(n)).length;
        const fibRatio = fibMatches / nums.length;

        if (fibRatio > 0.4) {
            // If fibonacci numbers are appearing, next likely non-fib or boundary
            const last = history[0].actual_result || history[0].result_type;
            return { pred: last === 'big' ? 'small' : 'big', conf: 64, reason: `Fibonacci cluster ${(fibRatio*100).toFixed(0)}%` };
        }

        return { pred: 'big', conf: 52, reason: 'No Fibonacci pattern' };
    }

    parityStrategy(history) {
        if (history.length < 6) return { pred: 'big', conf: 50, reason: 'Parity: insufficient data' };
        const nums = history.slice(0, 10).map(h => h.actual_number).filter(n => n !== undefined && n !== null);
        if (nums.length < 4) return { pred: 'big', conf: 50, reason: 'Parity: no numbers' };

        const evens = nums.filter(n => n % 2 === 0).length;
        const odds = nums.length - evens;
        const evenRatio = evens / nums.length;

        // Even numbers tend to be in middle range (2,4,6,8) -> mixed
        // Odd numbers (1,3,5,7,9) -> more small tendency for low, big for high
        const avg = nums.reduce((a, b) => a + b, 0) / nums.length;

        if (evenRatio > 0.75) {
            return { pred: avg > 5 ? 'small' : 'big', conf: 62, reason: `Even dominance ${(evenRatio*100).toFixed(0)}%` };
        }
        if (evenRatio < 0.25) {
            return { pred: avg > 5 ? 'small' : 'big', conf: 62, reason: `Odd dominance ${((1-evenRatio)*100).toFixed(0)}%` };
        }

        return { pred: avg >= 5 ? 'big' : 'small', conf: 55, reason: `Parity balanced` };
    }

    // --- UNCERTAINTY & ANALYSIS METHODS ---

    calculateEntropy(history) {
        if (history.length < 5) return 1.0;
        const counts = { big: 0, small: 0 };
        history.slice(0, 15).forEach(h => counts[h.actual_result || h.result_type]++);
        const total = counts.big + counts.small;
        if (total === 0) return 1.0;
        const pBig = counts.big / total;
        const pSmall = counts.small / total;
        let entropy = 0;
        if (pBig > 0) entropy -= pBig * Math.log2(pBig);
        if (pSmall > 0) entropy -= pSmall * Math.log2(pSmall);
        return entropy;
    }

    calculateChiSquare(history) {
        if (history.length < 10) return { value: 0, pValue: 1.0 };
        const recent = history.slice(0, 20);
        const counts = { big: 0, small: 0 };
        recent.forEach(h => counts[h.actual_result || h.result_type]++);
        const expected = recent.length / 2;
        const chiSq = Math.pow(counts.big - expected, 2) / expected + Math.pow(counts.small - expected, 2) / expected;
        // Approximate p-value for df=1
        const pValue = chiSq < 0.1 ? 1.0 : Math.exp(-chiSq / 2);
        return { value: chiSq, pValue };
    }

    calculateAutocorrelation(history) {
        if (history.length < 10) return 0;
        const nums = history.slice(0, 15).map(h => this.toNum(h.actual_result || h.result_type));
        const n = nums.length;
        const mean = nums.reduce((a, b) => a + b, 0) / n;
        let numerator = 0, denominator = 0;
        for (let i = 0; i < n - 1; i++) {
            numerator += (nums[i] - mean) * (nums[i + 1] - mean);
        }
        for (let i = 0; i < n; i++) {
            denominator += Math.pow(nums[i] - mean, 2);
        }
        return denominator === 0 ? 0 : numerator / denominator;
    }

    detectRegime(history) {
        if (history.length < CONFIG.REGIME_WINDOW) return 'initializing';
        const recent = history.slice(0, CONFIG.REGIME_WINDOW);

        // Calculate metrics
        const types = recent.map(h => h.actual_result || h.result_type);
        const bigRatio = types.filter(t => t === 'big').length / types.length;

        // Alternation rate
        let alts = 0;
        for (let i = 1; i < types.length; i++) {
            if (types[i] !== types[i - 1]) alts++;
        }
        const altRate = alts / (types.length - 1);

        // Streak detection
        let maxStreak = 1, currStreak = 1;
        for (let i = 1; i < types.length; i++) {
            if (types[i] === types[i - 1]) {
                currStreak++;
                maxStreak = Math.max(maxStreak, currStreak);
            } else {
                currStreak = 1;
            }
        }

        // Classify regime
        if (maxStreak >= 4) return 'trending';
        if (altRate > 0.65) return 'alternating';
        if (Math.abs(bigRatio - 0.5) < 0.1 && altRate > 0.4 && altRate < 0.6) return 'random';
        if (Math.abs(bigRatio - 0.5) > 0.15) return 'biased';
        return 'mixed';
    }

    calculateVolatility(history) {
        if (history.length < 5) return 0.5;
        const nums = history.slice(0, 10).map(h => this.toNum(h.actual_result || h.result_type));
        const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
        const variance = nums.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / nums.length;
        return Math.sqrt(variance);
    }

    // --- MONTE CARLO SIMULATION ---

    monteCarloSimulation(history, runs = CONFIG.MONTE_CARLO_RUNS) {
        if (history.length < 5) return { bigWins: runs / 2, smallWins: runs / 2 };

        const recent = history.slice(0, 20);
        const types = recent.map(h => h.actual_result || h.result_type);
        const bigProb = types.filter(t => t === 'big').length / types.length;

        // Adjust based on detected patterns
        const regime = this.detectRegime(history);
        let adjustedBigProb = bigProb;

        switch (regime) {
            case 'trending':
                adjustedBigProb = types[0] === 'big' ? Math.min(0.7, bigProb + 0.15) : Math.max(0.3, bigProb - 0.15);
                break;
            case 'alternating':
                adjustedBigProb = types[0] === 'big' ? 0.35 : 0.65;
                break;
            case 'random':
                adjustedBigProb = 0.5;
                break;
            case 'biased':
                adjustedBigProb = bigProb > 0.5 ? Math.min(0.65, bigProb + 0.05) : Math.max(0.35, bigProb - 0.05);
                break;
        }

        let bigWins = 0, smallWins = 0;
        for (let i = 0; i < runs; i++) {
            if (Math.random() < adjustedBigProb) bigWins++; else smallWins++;
        }

        return { bigWins, smallWins, bigProb: adjustedBigProb };
    }

    // --- NUMBER ANALYSIS ---

    calculateNumberDistribution(history) {
        const freq = {};
        const recency = {};
        const numbers = [];

        history.forEach((h, idx) => {
            const num = h.actual_number;
            if (num === undefined || num === null) return;
            numbers.push(num);
            freq[num] = (freq[num] || 0) + 1;
            recency[num] = (recency[num] || 0) + (history.length - idx);
        });

        // Calculate composite scores
        const scores = Object.keys(freq).map(num => ({
            number: parseInt(num),
            freq: freq[num],
            recency: recency[num],
            score: freq[num] * 0.6 + (recency[num] / history.length) * 0.4
        }));

        scores.sort((a, b) => b.score - a.score);

        // Expected value using Bayesian smoothing
        const totalNums = numbers.length;
        const expected = numbers.length > 0 
            ? (numbers.reduce((a, b) => a + b, 0) / totalNums)
            : 4.5;

        // Warm = middle tier
        const warm = scores.length > 2 ? scores[Math.floor(scores.length / 2)] : (scores[0] || { number: 5 });

        return {
            hot: scores.length > 0 ? scores[0] : null,
            cold: scores.length > 0 ? scores[scores.length - 1] : null,
            warm: warm,
            expected: Math.round(expected),
            expectedRaw: expected,
            distribution: freq,
            top3: scores.slice(0, 3).map(s => s.number),
            bottom3: scores.slice(-3).map(s => s.number)
        };
    }

    // --- ENSEMBLE PREDICTION ---

    generatePrediction(lastResult, history) {
        if (!history || history.length < 4) {
            return {
                prediction: 'big',
                confidence: 50,
                strategy: 'default',
                reason: 'Initializing neural matrix...',
                breakdown: [],
                entropy: 1.0,
                regime: 'initializing',
                volatility: 0.5
            };
        }

        const results = [
            { name: 'markov', ...this.markovStrategy(history) },
            { name: 'streak', ...this.streakStrategy(history) },
            { name: 'alternation', ...this.alternationStrategy(history) },
            { name: 'reversion', ...this.reversionStrategy(history) },
            { name: 'momentum', ...this.momentumStrategy(history) },
            { name: 'entropy', ...this.entropyStrategy(history) },
            { name: 'gap_analysis', ...this.gapStrategy(history) },
            { name: 'number_inference', ...this.numberInference(history) },
            { name: 'pattern', ...this.patternStrategy(history) },
            { name: 'bayesian', ...this.bayesianStrategy(history) },
            { name: 'fibonacci', ...this.fibonacciStrategy(history) },
            { name: 'parity', ...this.parityStrategy(history) }
        ];

        const weights = this.getAdaptiveWeights();
        const regime = this.detectRegime(history);
        const entropy = this.calculateEntropy(history);
        const volatility = this.calculateVolatility(history);

        // Adjust weights based on regime
        const regimeBoost = {
            trending: { streak: 1.5, momentum: 1.3, markov: 1.2 },
            alternating: { alternation: 1.5, pattern: 1.3, parity: 1.2 },
            random: { bayesian: 1.4, entropy: 1.3, reversion: 1.2 },
            biased: { reversion: 1.5, bayesian: 1.3, markov: 1.2 },
            mixed: {},
            initializing: {}
        };

        let bigScore = 0, smallScore = 0, totalWeight = 0;
        const breakdown = [];

        results.forEach(r => {
            let w = weights[r.name] || 1.0;
            const boost = (regimeBoost[regime] || {})[r.name] || 1.0;
            w *= boost;

            // Reduce weight for uncertain strategies
            const stratPerf = this.performance[r.name];
            if (stratPerf && stratPerf.uncertainty > 0.5) {
                w *= (1 - stratPerf.uncertainty * 0.3);
            }

            const score = (r.conf / 100) * w;
            if (r.pred === 'big') bigScore += score; else smallScore += score;
            totalWeight += w;
            breakdown.push({ name: r.name, pred: r.pred, conf: r.conf, weight: w.toFixed(2) });
        });

        const bigProb = bigScore / totalWeight;
        const smallProb = smallScore / totalWeight;
        const prediction = bigProb > smallProb ? 'big' : 'small';

        // Adjust confidence based on entropy and volatility
        let confidence = Math.round(Math.max(bigProb, smallProb) * 100);

        // Higher entropy = lower confidence (more uncertainty)
        const entropyPenalty = entropy * 15;
        confidence -= entropyPenalty;

        // Higher volatility = lower confidence
        const volPenalty = volatility * 10;
        confidence -= volPenalty;

        // Recent accuracy boost
        const recentAccuracy = this.getRecentAccuracy();
        confidence = Math.round(confidence * (0.75 + recentAccuracy * 0.25));

        confidence = Math.max(CONFIG.MIN_CONFIDENCE, Math.min(CONFIG.MAX_CONFIDENCE, confidence));

        const primary = results
            .filter(r => r.pred === prediction)
            .sort((a, b) => (b.conf * (weights[b.name] || 1)) - (a.conf * (weights[a.name] || 1)))[0];

        return {
            prediction,
            confidence,
            strategy: primary ? primary.name : 'ensemble',
            reason: primary ? primary.reason : 'Ensemble consensus',
            breakdown,
            bigProb: (bigProb * 100).toFixed(1),
            smallProb: (smallProb * 100).toFixed(1),
            entropy,
            regime,
            volatility
        };
    }

    getAdaptiveWeights() {
        const weights = {};
        let totalPerf = 0;
        this.strategies.forEach(s => {
            const perf = this.performance[s];
            const recent = perf.recent.slice(-15);
            const wins = recent.filter(r => r).length;
            const acc = recent.length ? wins / recent.length : 0.5;
            // Weight by accuracy and inverse uncertainty
            weights[s] = (0.3 + acc * 1.4) * (1.5 - perf.uncertainty);
            totalPerf += weights[s];
        });
        this.strategies.forEach(s => {
            weights[s] = (weights[s] / totalPerf) * this.strategies.length;
        });
        return weights;
    }

    getRecentAccuracy() {
        const all = [];
        this.strategies.forEach(s => all.push(...this.performance[s].recent.slice(-8)));
        if (all.length === 0) return 0.5;
        return all.filter(r => r).length / all.length;
    }

    learnFromResult(prediction, actual, strategyName, usedStrategies = []) {
        const correct = prediction === actual;
        if (strategyName && this.performance[strategyName]) {
            if (correct) this.performance[strategyName].wins++;
            else this.performance[strategyName].losses++;
            this.performance[strategyName].recent.push(correct);
            if (this.performance[strategyName].recent.length > 30) {
                this.performance[strategyName].recent.shift();
            }
            // Update uncertainty (higher = less reliable)
            const recent = this.performance[strategyName].recent.slice(-10);
            const acc = recent.filter(r => r).length / recent.length;
            this.performance[strategyName].uncertainty = 1 - acc;
        }
        usedStrategies.forEach(s => {
            if (s.name !== strategyName && this.performance[s.name]) {
                const sCorrect = s.pred === actual;
                this.performance[s.name].recent.push(sCorrect);
                if (this.performance[s.name].recent.length > 30) {
                    this.performance[s.name].recent.shift();
                }
            }
        });
    }

    getStrategyStats() {
        return this.strategies.map(s => {
            const p = this.performance[s];
            const total = p.wins + p.losses;
            const recent = p.recent.slice(-12);
            const recentWins = recent.filter(r => r).length;
            return {
                name: s,
                wins: p.wins,
                losses: p.losses,
                accuracy: total ? Math.round((p.wins / total) * 100) : 0,
                recentAccuracy: recent.length ? Math.round((recentWins / recent.length) * 100) : 0,
                uncertainty: Math.round(p.uncertainty * 100)
            };
        });
    }
}

const engine = new NeuralMatrixEngine();

// ============================================
// AUTHENTICATION
// ============================================
function initAuth() {
    const saved = localStorage.getItem('hiroto_signals_session');
    if (!saved) { showAccessDenied(); return false; }
    try {
        const session = JSON.parse(saved);
        let expiryDate = new Date(session.expires || session.expiry || session.expiration || session.validUntil);
        if (isNaN(expiryDate.getTime())) {
            if (session.created) expiryDate = new Date(new Date(session.created).getTime() + 604800000);
            else expiryDate = new Date(Date.now() + 604800000);
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
        const badge = document.getElementById('sessionBadge');
        if (badge) {
            const chipText = badge.querySelector('.badge-text');
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
// HISTORY MANAGER
// ============================================
const HistoryManager = {
    STORAGE_KEY: 'cipher_full_history_v3',
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
    const oldKeys = ['cipher_full_history_v2', 'cipher_extended_history'];
    oldKeys.forEach(key => {
        const old = localStorage.getItem(key);
        if (old && !localStorage.getItem('cipher_full_history_v3')) {
            try {
                const data = JSON.parse(old);
                localStorage.setItem('cipher_full_history_v3', JSON.stringify(data));
            } catch (e) {}
        }
    });
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
            showToast('Signal sync complete', 'success');
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
        showToast('Connection unstable', 'error');
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
    const numbers = engine.calculateNumberDistribution(analysisHistory);
    const mcResult = engine.monteCarloSimulation(analysisHistory);
    const chiResult = engine.calculateChiSquare(analysisHistory);
    const autoCorr = engine.calculateAutocorrelation(analysisHistory);

    state.hotNumber = numbers.hot?.number ?? null;
    state.coldNumber = numbers.cold?.number ?? null;
    state.warmNumber = numbers.warm?.number ?? null;
    state.expectedNumber = numbers.expected ?? null;

    state.pendingPredictions.set(state.currentTargetPeriod, {
        prediction: prediction.prediction,
        timestamp: new Date().toISOString(),
        period_number: state.currentTargetPeriod,
        confidence: prediction.confidence,
        strategy: prediction.strategy,
        breakdown: prediction.breakdown,
        regime: prediction.regime,
        entropy: prediction.entropy,
        mcResult,
        chiResult,
        autoCorr
    });

    HistoryManager.addPrediction(state.currentTargetPeriod, prediction.prediction, prediction.confidence, prediction.strategy);
    resolvePendingPredictions();

    updateActivePrediction(prediction, state.currentTargetPeriod);
    updateHotColdNumbers(numbers);
    updateMonteCarlo(mcResult);
    updateUncertaintyMetrics(prediction, chiResult, autoCorr);
    updateLatestResults(latest);
    updateHistoryDisplay();
    updateStats();
    updateAnalytics();
    updateModels(prediction);

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
    valueEl.className = 'pred-value ' + pred.prediction;

    const targetEl = document.getElementById('targetPeriod');
    if (targetEl) targetEl.textContent = targetPeriod;

    const confEl = document.getElementById('confidenceDisplay');
    if (confEl) confEl.textContent = pred.confidence + '%';

    const stratEl = document.getElementById('strategyName');
    if (stratEl) stratEl.textContent = pred.strategy.toUpperCase();

    const regimeEl = document.getElementById('regimeName');
    if (regimeEl) regimeEl.textContent = pred.regime.toUpperCase();

    const volEl = document.getElementById('volatilityVal');
    if (volEl) volEl.textContent = (pred.volatility * 100).toFixed(0) + '%';

    // Probability distribution
    const probSmall = parseFloat(pred.smallProb);
    const probBig = parseFloat(pred.bigProb);
    document.getElementById('probSmall').textContent = probSmall + '%';
    document.getElementById('probBig').textContent = probBig + '%';
    document.getElementById('probFillSmall').style.width = probSmall + '%';
    document.getElementById('probFillBig').style.width = probBig + '%';
    document.getElementById('probMarker').style.left = probBig + '%';
}

function updateHotColdNumbers(numbers) {
    const hotEl = document.getElementById('hotNumber');
    const coldEl = document.getElementById('coldNumber');
    const warmEl = document.getElementById('warmNumber');
    const expEl = document.getElementById('expectedNumber');

    if (hotEl) hotEl.textContent = numbers.hot?.number ?? '--';
    if (coldEl) coldEl.textContent = numbers.cold?.number ?? '--';
    if (warmEl) warmEl.textContent = numbers.warm?.number ?? '--';
    if (expEl) expEl.textContent = numbers.expected ?? '--';

    // Frequencies
    const total = Object.values(numbers.distribution || {}).reduce((a, b) => a + b, 0) || 1;
    const hotFreq = numbers.hot ? Math.round((numbers.hot.freq / total) * 100) : 0;
    const coldFreq = numbers.cold ? Math.round((numbers.cold.freq / total) * 100) : 0;
    const warmFreq = numbers.warm ? Math.round((numbers.warm.freq / total) * 100) : 0;

    const hf = document.getElementById('hotFreq');
    const cf = document.getElementById('coldFreq');
    const wf = document.getElementById('warmFreq');
    const ef = document.getElementById('expectedFreq');

    if (hf) hf.textContent = hotFreq + '%';
    if (cf) cf.textContent = coldFreq + '%';
    if (wf) wf.textContent = warmFreq + '%';
    if (ef) ef.textContent = numbers.expectedRaw ? numbers.expectedRaw.toFixed(1) : '--';

    // Distribution chart
    const chart = document.getElementById('numberDistChart');
    if (chart) {
        chart.innerHTML = '';
        for (let i = 0; i <= 9; i++) {
            const count = numbers.distribution?.[i] || 0;
            const maxCount = Math.max(...Object.values(numbers.distribution || {0:1})) || 1;
            const height = Math.max(5, (count / maxCount) * 100);
            const bar = document.createElement('div');
            bar.className = 'dist-bar' + (i === numbers.expected ? ' highlight' : '');
            bar.style.height = height + '%';
            bar.title = `${i}: ${count} times`;
            chart.appendChild(bar);
        }
    }

    // Number heatmap
    const heatmap = document.getElementById('numberHeatmap');
    if (heatmap) {
        heatmap.innerHTML = '';
        for (let i = 0; i <= 9; i++) {
            const count = numbers.distribution?.[i] || 0;
            const maxCount = Math.max(...Object.values(numbers.distribution || {0:1})) || 1;
            const intensity = count / maxCount;
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            cell.textContent = i;
            const r = Math.round(74 + (168 - 74) * intensity);
            const g = Math.round(158 + (85 - 158) * intensity);
            const b = Math.round(255 + (247 - 255) * intensity);
            cell.style.background = `rgba(${r}, ${g}, ${b}, ${0.1 + intensity * 0.4})`;
            cell.style.color = intensity > 0.5 ? '#fff' : 'var(--text-secondary)';
            cell.title = `${i}: ${count} occurrences`;
            heatmap.appendChild(cell);
        }
    }
}

function updateMonteCarlo(mcResult) {
    const chart = document.getElementById('monteCarloChart');
    if (!chart) return;

    chart.innerHTML = '';
    const total = mcResult.bigWins + mcResult.smallWins;
    const bins = 20;
    const binSize = total / bins;

    for (let i = 0; i < bins; i++) {
        const isBig = i < bins / 2;
        const height = Math.random() * 60 + 20; // Simulated distribution
        const bar = document.createElement('div');
        bar.className = 'mc-bar ' + (isBig ? 'big' : 'small');
        bar.style.height = height + '%';
        chart.appendChild(bar);
    }

    document.getElementById('mcBigWins').textContent = mcResult.bigWins;
    document.getElementById('mcSmallWins').textContent = mcResult.smallWins;
}

function updateUncertaintyMetrics(pred, chiResult, autoCorr) {
    // Entropy bar
    const entropyPct = Math.min(100, pred.entropy * 100);
    const entropyBar = document.getElementById('entropyBar');
    const entropyVal = document.getElementById('entropyVal');
    if (entropyBar) entropyBar.style.width = entropyPct + '%';
    if (entropyVal) entropyVal.textContent = pred.entropy.toFixed(2);

    // Chi-square bar
    const chiPct = Math.min(100, (1 - chiResult.pValue) * 100);
    const chiBar = document.getElementById('chiBar');
    const chiVal = document.getElementById('chiVal');
    if (chiBar) chiBar.style.width = chiPct + '%';
    if (chiVal) chiVal.textContent = chiResult.pValue < 0.05 ? 'Non-random' : 'Random';

    // Autocorrelation bar
    const autoPct = Math.min(100, Math.abs(autoCorr) * 200);
    const autoBar = document.getElementById('autoBar');
    const autoVal = document.getElementById('autoVal');
    if (autoBar) autoBar.style.width = autoPct + '%';
    if (autoVal) autoVal.textContent = autoCorr.toFixed(2);

    // Pattern strength
    const patternPct = Math.min(100, (1 - pred.entropy) * 100);
    const patternBar = document.getElementById('patternBar');
    const patternVal = document.getElementById('patternVal');
    if (patternBar) patternBar.style.width = patternPct + '%';
    if (patternVal) patternVal.textContent = patternPct.toFixed(0) + '%';
}

function updateLatestResults(data) {
    const container = document.getElementById('streamContent');
    if (!container) return;
    container.innerHTML = data.slice(0, 6).map((r, index) => {
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
    meta.textContent = `${displayHistory.length} records // DB: ${HistoryManager.load().length}`;
    if (displayHistory.length === 0) {
        tbody.innerHTML = `<tr class="loading-row"><td colspan="6"><div class="table-loader"><div class="loader-ring"></div><span>Decrypting data...</span></div></td></tr>`;
        return;
    }
    tbody.innerHTML = displayHistory.map((r, index) => {
        const actual = r.actual_result || r.result_type;
        let outcome;
        if (r.predicted_type && actual) {
            outcome = r.predicted_type === actual 
                ? '<span class="outcome-badge win">WIN</span>' 
                : '<span class="outcome-badge loss">LOSS</span>';
        } else if (r.predicted_type) {
            outcome = '<span class="outcome-badge pending">PENDING</span>';
        } else {
            outcome = '<span class="outcome-badge pending">---</span>';
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
                <td class="cell-conf">${r.prediction_confidence ?? '--'}%</td>
                <td class="cell-outcome">${outcome}</td>
            </tr>`;
    }).join('');
}

function updateStats() {
    const accuracy = state.stats.total > 0 ? Math.round((state.stats.wins / state.stats.total) * 100) : 0;
    const els = ['miniAccuracy', 'miniSignals', 'miniWins', 'miniLosses'];
    const vals = [accuracy + '%', state.stats.total, state.stats.wins, state.stats.losses];
    els.forEach((id, i) => { const el = document.getElementById(id); if (el) el.textContent = vals[i]; });

    // Update bars
    const total = state.stats.total || 1;
    const winBar = document.getElementById('winBar');
    const lossBar = document.getElementById('lossBar');
    if (winBar) winBar.style.width = (state.stats.wins / total * 100) + '%';
    if (lossBar) lossBar.style.width = (state.stats.losses / total * 100) + '%';

    // Accuracy chart (mini sparkline)
    const chart = document.getElementById('accuracyChart');
    if (chart) {
        const history = HistoryManager.getForAnalysis().slice(0, 20);
        const window = 5;
        let html = '';
        for (let i = 0; i <= history.length - window; i++) {
            const slice = history.slice(i, i + window);
            const wins = slice.filter(h => h.predicted_type === (h.actual_result || h.result_type)).length;
            const h = Math.max(10, (wins / window) * 100);
            html += `<div style="flex:1;background:linear-gradient(180deg,var(--accent-blue),rgba(74,158,255,0.3));border-radius:1px;height:${h}%;align-self:flex-end;min-height:2px;"></div>`;
        }
        chart.innerHTML = html;
        chart.style.display = 'flex';
        chart.style.alignItems = 'flex-end';
        chart.style.gap = '1px';
        chart.style.height = '100%';
    }

    // Signal trend
    const trend = document.getElementById('signalTrend');
    if (trend) {
        const recent = HistoryManager.getForAnalysis().slice(0, 10);
        const recentWins = recent.filter(h => h.predicted_type === (h.actual_result || h.result_type)).length;
        const diff = recentWins - 5;
        trend.textContent = (diff >= 0 ? '+' : '') + diff;
        trend.className = 'stat-trend ' + (diff >= 0 ? 'up' : 'down');
    }
}

function updateAnalytics() {
    const history = HistoryManager.getForAnalysis().slice(0, 50);

    // Trend chart
    const trendChart = document.getElementById('trendChart');
    if (trendChart) {
        let html = '';
        const window = 5;
        for (let i = 0; i <= history.length - window; i++) {
            const slice = history.slice(i, i + window);
            const wins = slice.filter(h => h.predicted_type === (h.actual_result || h.result_type)).length;
            const isWin = wins >= 3;
            const h = Math.max(10, (wins / window) * 100);
            html += `<div class="trend-bar ${isWin ? 'win' : 'loss'}" style="height:${h}%"></div>`;
        }
        trendChart.innerHTML = html;
    }

    // Strategy list
    const stratList = document.getElementById('strategyList');
    if (stratList) {
        const stats = engine.getStrategyStats();
        stratList.innerHTML = stats.map(s => {
            const cls = s.recentAccuracy >= 60 ? 'high' : s.recentAccuracy >= 45 ? 'mid' : 'low';
            return `
                <div class="strategy-item">
                    <span class="strategy-name">${s.name.replace(/_/g, ' ').toUpperCase()}</span>
                    <div class="strategy-bar-wrap">
                        <div class="strategy-bar ${cls}" style="width:${s.recentAccuracy}%"></div>
                    </div>
                    <span class="strategy-acc">${s.recentAccuracy}%</span>
                </div>`;
        }).join('');
    }

    // Regime chart
    const regimeChart = document.getElementById('regimeChart');
    if (regimeChart) {
        const regimes = ['trending', 'alternating', 'random', 'biased', 'mixed'];
        const counts = {};
        regimes.forEach(r => counts[r] = 0);

        // Simulate regime detection over history
        for (let i = 0; i < Math.min(history.length, 50); i += 5) {
            const slice = history.slice(i, i + CONFIG.REGIME_WINDOW);
            if (slice.length >= 10) {
                const r = engine.detectRegime(slice);
                counts[r] = (counts[r] || 0) + 1;
            }
        }

        const maxCount = Math.max(...Object.values(counts)) || 1;
        const colors = {
            trending: 'var(--accent-red)',
            alternating: 'var(--accent-cyan)',
            random: 'var(--accent-purple)',
            biased: 'var(--accent-gold)',
            mixed: 'var(--accent-blue)'
        };

        regimeChart.innerHTML = regimes.map(r => `
            <div class="regime-segment">
                <div class="regime-bar" style="height:${(counts[r] / maxCount * 100)}%;background:${colors[r]}"></div>
                <span class="regime-label">${r.toUpperCase()}</span>
            </div>
        `).join('');
    }
}

function updateModels(prediction) {
    const weights = engine.getAdaptiveWeights();
    const weightChart = document.getElementById('weightsChart');
    if (weightChart) {
        const maxW = Math.max(...Object.values(weights));
        const colors = ['#4a9eff', '#00d4ff', '#a855f7', '#f472b6', '#34d399', '#f87171', '#fb923c', '#fbbf24', '#60a5fa', '#c084fc', '#f9a8d4', '#6ee7b7'];
        weightChart.innerHTML = engine.strategies.map((s, i) => {
            const w = weights[s] || 1;
            const h = Math.max(5, (w / maxW) * 100);
            return `<div class="weight-bar" style="height:${h}%;background:${colors[i % colors.length]}">
                <span class="weight-label">${s.replace(/_/g, ' ')}</span>
            </div>`;
        }).join('');
    }

    // Feature importance (simulated based on strategy weights)
    const featureList = document.getElementById('featureList');
    if (featureList) {
        const features = [
            { name: 'Transition Prob', key: 'markov' },
            { name: 'Streak Length', key: 'streak' },
            { name: 'Alternation Rate', key: 'alternation' },
            { name: 'Mean Deviation', key: 'reversion' },
            { name: 'EMA Momentum', key: 'momentum' },
            { name: 'Entropy', key: 'entropy' },
            { name: 'Gap Analysis', key: 'gap_analysis' },
            { name: 'Number Cluster', key: 'number_inference' },
            { name: 'Pattern Match', key: 'pattern' },
            { name: 'Bayesian Update', key: 'bayesian' }
        ];

        featureList.innerHTML = features.map(f => {
            const w = weights[f.key] || 1;
            const maxW2 = Math.max(...Object.values(weights));
            const pct = Math.round((w / maxW2) * 100);
            return `
                <div class="feature-item">
                    <span class="feature-name">${f.name}</span>
                    <div class="feature-bar-wrap">
                        <div class="feature-bar" style="width:${pct}%"></div>
                    </div>
                    <span class="feature-value">${pct}</span>
                </div>`;
        }).join('');
    }

    // Diagnostics
    const diagnostics = document.getElementById('diagnostics');
    if (diagnostics) {
        const history = HistoryManager.getForAnalysis();
        const chi = engine.calculateChiSquare(history);
        const entropy = engine.calculateEntropy(history);
        const regime = engine.detectRegime(history);
        const vol = engine.calculateVolatility(history);

        diagnostics.innerHTML = `
            <div class="diag-item">
                <span class="diag-label">Data Quality</span>
                <span class="diag-value ${history.length > 20 ? 'good' : 'warn'}">${history.length} records</span>
            </div>
            <div class="diag-item">
                <span class="diag-label">Randomness Test</span>
                <span class="diag-value ${chi.pValue < 0.05 ? 'warn' : 'good'}">p=${chi.pValue.toFixed(3)}</span>
            </div>
            <div class="diag-item">
                <span class="diag-label">Entropy Level</span>
                <span class="diag-value ${entropy > 0.9 ? 'good' : entropy > 0.7 ? 'warn' : 'bad'}">${entropy.toFixed(2)}</span>
            </div>
            <div class="diag-item">
                <span class="diag-label">Detected Regime</span>
                <span class="diag-value">${regime.toUpperCase()}</span>
            </div>
            <div class="diag-item">
                <span class="diag-label">Volatility</span>
                <span class="diag-value ${vol > 0.6 ? 'warn' : 'good'}">${(vol * 100).toFixed(0)}%</span>
            </div>
            <div class="diag-item">
                <span class="diag-label">Ensemble Size</span>
                <span class="diag-value good">${engine.strategies.length} models</span>
            </div>
        `;
    }
}

// ============================================
// HELPERS
// ============================================
function updateConnectionStatus(connected) {
    const dot = document.getElementById('connDot');
    const text = document.getElementById('connText');
    if (!dot || !text) return;
    state.isConnected = connected;
    dot.className = 'status-dot ' + (connected ? 'connected' : 'error');
    text.textContent = connected ? 'ONLINE' : 'OFFLINE';
    text.style.color = connected ? 'var(--accent-green)' : 'var(--accent-red)';
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('cipherToast');
    if (!toast) return;
    const textEl = toast.querySelector('.toast-text');
    if (textEl) textEl.textContent = message;
    toast.style.borderLeftColor = type === 'error' ? 'var(--accent-red)' : 'var(--accent-blue)';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function updateTimer() {
    const timer = document.getElementById('cipherTimer');
    const dateEl = document.getElementById('cipherDate');
    const now = new Date();
    if (timer) timer.textContent = now.toLocaleTimeString('en-US', { hour12: false });
    if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ============================================
// NAVIGATION
// ============================================
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const panel = item.dataset.panel;
            if (!panel) return;

            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            const targetPanel = document.getElementById('panel-' + panel);
            if (targetPanel) targetPanel.classList.add('active');

            const titles = {
                predict: ['Prediction Matrix', 'Real-time signal intelligence'],
                analytics: ['Analytics Dashboard', 'Performance metrics & trends'],
                history: ['History Log', 'Complete decryption records'],
                models: ['Model Diagnostics', 'Ensemble weights & features']
            };
            const titleEl = document.getElementById('pageTitle');
            const subEl = document.getElementById('pageSubtitle');
            if (titleEl && titles[panel]) titleEl.textContent = titles[panel][0];
            if (subEl && titles[panel]) subEl.textContent = titles[panel][1];

            state.activePanel = panel;

            // Refresh panel-specific content
            if (panel === 'analytics') updateAnalytics();
            if (panel === 'models') updateModels(state.lastPrediction);
        });
    });
}

// ============================================
// INITIALIZATION
// ============================================
function init() {
    console.log('[NEURAL MATRIX v3.0] Advanced Ensemble Prediction Online');

    new NeuralCanvas();
    if (!initAuth()) return;
    initNavigation();

    migrateOldData();
    state.fullHistory = HistoryManager.load();
    console.log('[NEURAL MATRIX] Loaded', state.fullHistory.length, 'historical records');

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
    showToast('System online v3.0', 'success');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.session) fetchData();
});
