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
        aiResults: null, // 現在の提案（単一オブジェクト）
        proposalHistory: [], // 過去の提案履歴
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
        suggestedQueries: null,
        aiResult: null,
    },

    // Step 5: データ収集
    data: {
        types: [],
        typeOtherText: '',
        sampleSize: '',
        grouping: '',
        groupingOtherText: '',
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
            // APIの設定を復元
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

    /** 保存済み研究データがあるかチェック */
    hasSavedData() {
        try {
            const raw = localStorage.getItem('research-app-state');
            if (!raw) return false;
            const saved = JSON.parse(raw);
            // 最低限 seed.question があればデータありとみなす
            return !!(saved.seed?.question || saved.seed?.refinedResult || saved.rq?.selectedDesign);
        } catch {
            return false;
        }
    }

    /** 保存済みの研究データを復元 */
    loadFullState() {
        try {
            const raw = localStorage.getItem('research-app-state');
            if (!raw) return false;
            const saved = JSON.parse(raw);

            // 研究データをマージ（API設定以外の全項目）
            const dataKeys = ['seed', 'rq', 'guideline', 'review', 'data', 'analysis', 'proposal', 'currentStep'];
            dataKeys.forEach(key => {
                if (saved[key] !== undefined) {
                    this._state[key] = saved[key];
                }
            });

            // completedSteps を復元（Set に変換）
            if (saved.completedSteps) {
                this._state.completedSteps = new Set(saved.completedSteps);
            }

            this._notify('*');
            return true;
        } catch (e) {
            console.warn('Failed to load full state:', e);
            return false;
        }
    }

    /** 研究データをJSONファイルとしてエクスポート */
    exportToJSON() {
        const exportData = {
            _exportedAt: new Date().toISOString(),
            _version: '1.0',
            seed: this._state.seed,
            rq: this._state.rq,
            guideline: this._state.guideline,
            review: this._state.review,
            data: this._state.data,
            analysis: this._state.analysis,
            proposal: this._state.proposal,
            currentStep: this._state.currentStep,
            completedSteps: [...this._state.completedSteps],
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        const theme = (this._state.seed?.refinedResult?.rq || this._state.seed?.refinedResult?.title || '研究計画').substring(0, 20);
        a.href = url;
        a.download = `研究計画_${theme}_${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /** JSONファイルから研究データをインポート */
    importFromJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const imported = JSON.parse(e.target.result);
                    const dataKeys = ['seed', 'rq', 'guideline', 'review', 'data', 'analysis', 'proposal', 'currentStep'];
                    dataKeys.forEach(key => {
                        if (imported[key] !== undefined) {
                            this._state[key] = imported[key];
                        }
                    });
                    if (imported.completedSteps) {
                        this._state.completedSteps = new Set(imported.completedSteps);
                    }
                    this._save();
                    this._notify('*');
                    resolve(true);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
            reader.readAsText(file);
        });
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
