/**
 * state.js — Lightweight application state store
 * Manages all step data, AI outputs, and current navigation state.
 */

const DEFAULT_STATE = {
    // 全体設定
    apiKey: '',
    apiProvider: 'gemini', // 'gemini' or 'openai'
    demoMode: true,
    currentStep: 1,
    completedSteps: new Set(),

    // Step 1: 種と整理 (Initial Seed + Chat)
    seed: {
        question: '',
        target: '',
        direction: '',
        chatHistory: [],
        refinedResult: null, // { type, title, target, goal, approaches }
    },

    // Step 2: デザイン案 (Research Design Proposals)
    rq: {
        aiResults: null, // List of 10 FINER proposals
        selectedDesign: null,
    },

    // Step 3: ガイドライン
    guideline: {
        selected: null,
        checklist: [],
        notes: {},
    },

    // Step 4: 文献レビュー
    review: {
        keywords: '',
        years: '5',
        language: 'ja+en',
        database: 'PubMed',
        aiResult: null,
    },

    // Step 5: データ収集
    data: {
        types: [],
        sampleSize: '',
        grouping: '',
    },

    // Step 6: 分析方法
    analysis: {
        aiResult: null,
    },

    // Step 7: 研究計画書
    proposal: {
        draft: '',
    },
};

class AppState {
    constructor() {
        this._state = JSON.parse(JSON.stringify(DEFAULT_STATE, (key, value) =>
            value instanceof Set ? [...value] : value
        ));
        this._state.completedSteps = new Set();
        this._listeners = [];
        this._load();
    }

    get(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this._state);
    }

    set(path, value) {
        const keys = path.split('.');
        const last = keys.pop();
        const target = keys.reduce((obj, key) => obj[key], this._state);
        target[last] = value;
        this._notify(path);
        this._save();
    }

    update(path, updater) {
        const current = this.get(path);
        this.set(path, updater(current));
    }

    subscribe(listener) {
        this._listeners.push(listener);
        return () => {
            this._listeners = this._listeners.filter(l => l !== listener);
        };
    }

    _notify(path) {
        this._listeners.forEach(l => l(path, this._state));
    }

    _save() {
        try {
            const serializable = { ...this._state };
            serializable.completedSteps = [...this._state.completedSteps];
            localStorage.setItem('research-app-state', JSON.stringify(serializable));
        } catch (e) { /* ignore */ }
    }

    _load() {
        try {
            // APIの設定のみ復元（研究データは毎回リセット）
            const key = localStorage.getItem('research-app-api-key');
            if (key) this._state.apiKey = key;
            const demo = localStorage.getItem('research-app-demo-mode');
            if (demo !== null) this._state.demoMode = demo === 'true';
            const provider = localStorage.getItem('research-app-api-provider');
            if (provider) this._state.apiProvider = provider;
        } catch (e) {
            console.warn('Failed to load state, using defaults', e);
        }
    }

    saveApiKey(key) {
        this._state.apiKey = key;
        localStorage.setItem('research-app-api-key', key);
    }

    saveDemoMode(val) {
        this._state.demoMode = val;
        localStorage.setItem('research-app-demo-mode', String(val));
    }

    saveApiProvider(val) {
        this._state.apiProvider = val;
        localStorage.setItem('research-app-api-provider', val);
    }

    reset() {
        localStorage.removeItem('research-app-state');
        location.reload();
    }
}

export const state = new AppState();
