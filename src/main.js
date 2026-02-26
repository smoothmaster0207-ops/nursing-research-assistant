/**
 * main.js — Application entry point
 * Manages tab navigation, step rendering, progress bar, settings modal, and summary panel.
 */

import { state } from './state.js';
import { renderStep1, validateStep1 } from './steps/step1-seed.js';
import { renderStep2, validateStep2 } from './steps/step2-rq.js';
import { renderStep3, validateStep3 } from './steps/step3-guideline.js';
import { renderStep4, validateStep4 } from './steps/step4-review.js';
import { renderStep5, validateStep5 } from './steps/step5-data.js';
import { renderStep6, validateStep6 } from './steps/step6-analysis.js';
import { renderStep7, validateStep7 } from './steps/step7-proposal.js';

// Step definitions
const STEPS = [
    { id: 1, render: renderStep1, validate: validateStep1 },
    { id: 2, render: renderStep2, validate: validateStep2 },
    { id: 3, render: renderStep3, validate: validateStep3 },
    { id: 4, render: renderStep4, validate: validateStep4 },
    { id: 5, render: renderStep5, validate: validateStep5 },
    { id: 6, render: renderStep6, validate: validateStep6 },
    { id: 7, render: renderStep7, validate: validateStep7 },
];

// DOM Elements
const stepContent = document.getElementById('stepContent');
const progressFill = document.getElementById('progressFill');
const stepTabs = document.querySelectorAll('.step-tab');
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');
const stepIndicator = document.getElementById('stepIndicator');
const settingsModal = document.getElementById('settingsModal');

let currentStep = state.get('currentStep') || 1;

// ===========================
//  INITIALIZATION
// ===========================

function init() {
    renderCurrentStep();
    updateNavigation();
    initSettings();
    initTabListeners();
    initNavListeners();
    restoreSummary();
}

// ===========================
//  STEP RENDERING
// ===========================

function renderCurrentStep() {
    const step = STEPS.find(s => s.id === currentStep);
    if (step) {
        step.render(stepContent);
    }
}

function goToStep(stepNum) {
    if (stepNum < 1 || stepNum > 7) return;
    currentStep = stepNum;
    state.set('currentStep', currentStep);
    renderCurrentStep();
    updateNavigation();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===========================
//  NAVIGATION
// ===========================

function updateNavigation() {
    // Progress bar
    const pct = (currentStep / 7) * 100;
    progressFill.style.width = `${pct}%`;

    // Tab states
    stepTabs.forEach(tab => {
        const stepNum = parseInt(tab.dataset.step);
        tab.classList.toggle('active', stepNum === currentStep);
        tab.classList.toggle('completed', state.get('completedSteps').has(stepNum));
    });

    // Prev/Next buttons
    btnPrev.disabled = currentStep === 1;

    if (currentStep === 7) {
        btnNext.innerHTML = '✅ 完了';
        btnNext.classList.remove('btn-primary');
        btnNext.classList.add('btn-success');
    } else {
        btnNext.innerHTML = `
      確認して次へ
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
    `;
        btnNext.classList.remove('btn-success');
        btnNext.classList.add('btn-primary');
    }

    // Step indicator
    stepIndicator.textContent = `Step ${currentStep} / 7`;
}

function initTabListeners() {
    stepTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const stepNum = parseInt(tab.dataset.step);
            goToStep(stepNum);
        });
    });
}

function initNavListeners() {
    btnPrev.addEventListener('click', () => {
        goToStep(currentStep - 1);
    });

    btnNext.addEventListener('click', () => {
        // Mark current step as completed
        const completedSteps = state.get('completedSteps');
        completedSteps.add(currentStep);
        state.set('completedSteps', completedSteps);

        if (currentStep < 7) {
            goToStep(currentStep + 1);
        }
    });
}

// ===========================
//  SETTINGS MODAL
// ===========================

function initSettings() {
    const btnSettings = document.getElementById('btnSettings');
    const btnClose = document.getElementById('btnCloseSettings');
    const btnSave = document.getElementById('btnSaveSettings');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const demoToggle = document.getElementById('demoModeToggle');
    const apiProviderSelect = document.getElementById('apiProviderSelect');

    // Load saved values
    apiKeyInput.value = state.get('apiKey') || '';
    demoToggle.checked = state.get('demoMode');
    apiProviderSelect.value = state.get('apiProvider') || 'gemini';

    btnSettings.addEventListener('click', () => {
        settingsModal.classList.add('visible');
    });

    btnClose.addEventListener('click', () => {
        settingsModal.classList.remove('visible');
    });

    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.remove('visible');
        }
    });

    btnSave.addEventListener('click', () => {
        state.saveApiProvider(apiProviderSelect.value);
        state.saveApiKey(apiKeyInput.value.trim());
        state.saveDemoMode(demoToggle.checked);
        settingsModal.classList.remove('visible');

        // Show saved feedback
        btnSave.textContent = '✅ 保存しました';
        setTimeout(() => { btnSave.textContent = '保存'; }, 1500);
    });
}

// ===========================
//  SUMMARY PANEL RESTORE
// ===========================

function restoreSummary() {
    const seed = state.get('seed');
    const rq = state.get('rq');
    const guideline = state.get('guideline');
    const review = state.get('review');
    const data = state.get('data');
    const analysis = state.get('analysis');

    if (seed.refinedResult?.title || seed.question) {
        setSum('Theme', (seed.refinedResult?.title || seed.question).substring(0, 60));
    }
    if (rq.selectedDesign) {
        setSum('Design', rq.selectedDesign);
    }
    if (seed.refinedResult) {
        setSum('RQ', seed.refinedResult.title);
    }
    if (guideline.selected) {
        setSum('Guideline', guideline.selected);
    }
    if (review.aiResult) {
        setSum('Literature', '背景構築済み');
    }
    if (data.types?.length > 0) {
        setSum('Data', `${data.types.length}種類のデータ`);
    }
    if (analysis.aiResult?.primaryAnalysis) {
        setSum('Analysis', analysis.aiResult.primaryAnalysis.method);
    }
}

function setSum(key, value) {
    const el = document.querySelector(`#sum${key}`);
    if (el) {
        el.textContent = value;
        el.classList.add('active');
    }
}

// ===========================
//  START
// ===========================

document.addEventListener('DOMContentLoaded', init);
// For Vite HMR
if (document.readyState !== 'loading') {
    init();
}
