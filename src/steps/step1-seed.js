/**
 * step1-seed.js — 種と整理 (Initial Seed + Chat)
 */

import { state } from '../state.js';
import { callAI } from '../ai-client.js';
import { PROMPTS, DEMO_RESPONSES } from '../prompts/index.js';

export function renderStep1(container) {
  const seed = state.get('seed');
  const chatHistory = seed.chatHistory || [];
  const refinedResult = seed.refinedResult || null;

  container.innerHTML = `
    <div class="fade-in">
      <h2 class="step-title">🌱 Step 1：種と整理</h2>
      <p class="step-description">
        現場で感じている疑問、課題、あるいは漠然とした仮説を入力してください。研究方法論の専門家が対話を通じてそれを整理します。
      </p>

      <div class="card" style="margin-bottom: var(--space-6);">
        <div class="form-group">
          <label for="seedQuestion">現場の疑問・課題・違和感</label>
          <textarea id="seedQuestion" class="textarea" placeholder="例：高齢の入院患者が退院後すぐに再入院してしまうケースが多い。退院支援のやり方を変えれば防げるのではないか？">${seed.question || ''}</textarea>
        </div>

        <button class="btn btn-primary btn-lg" id="btnStartChat" ${!seed.question ? 'disabled' : ''}>
          <span class="spinner hidden" id="chatSpinner"></span>
          🤖 アドバイザーと対話を始める
        </button>
      </div>

      <div id="chatArea" class="${chatHistory.length > 0 ? '' : 'hidden'}">
        <div class="card expert-chat-card">
          <h3 class="section-title">🗣 壁打ち（Brainstorming）</h3>
          <div class="chat-container" id="chatContainer">
            ${chatHistory.map(msg => renderChatMessage(msg)).join('')}
          </div>

          <div class="chat-input-area">
            <textarea class="textarea" id="chatInput" placeholder="回答を入力してください..." rows="3"></textarea>
            <button class="btn btn-primary" id="btnSend">送信</button>
          </div>
        </div>

        <div id="refinedResultArea" class="${refinedResult ? '' : 'hidden'}">
          ${refinedResult ? renderRefinedResult(refinedResult) : ''}
        </div>
      </div>
    </div>
  `;

  // Event listeners
  const textarea = container.querySelector('#seedQuestion');
  const btnStartChat = container.querySelector('#btnStartChat');
  const chatArea = container.querySelector('#chatArea');
  const input = container.querySelector('#chatInput');
  const btnSend = container.querySelector('#btnSend');

  textarea.addEventListener('input', () => {
    state.set('seed.question', textarea.value);
    btnStartChat.disabled = !textarea.value.trim();
  });

  btnStartChat.addEventListener('click', async () => {
    chatArea.classList.remove('hidden');
    if ((state.get('seed.chatHistory') || []).length === 0) {
      await startChat(textarea.value);
    }
    textarea.closest('.card').scrollIntoView({ behavior: 'smooth' });
  });

  const handleSend = () => {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    input.style.height = 'auto';
    sendMessage(text);
  };

  btnSend.addEventListener('click', handleSend);
  // Enterキーでの送信を明示的にブロック（改行のみ許可）
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      // デフォルト動作（改行）は許可し、送信はしない
      e.stopPropagation();
    }
  });

  // textarea の高さを入力内容に合わせて自動調整
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 150) + 'px';
  });

  if (refinedResult) {
    const area = container.querySelector('#refinedResultArea');
    attachRefinedResultListeners(area, refinedResult);
  }
}

function renderChatMessage(msg) {
  return `
    <div class="chat-message ${msg.role}">
      <div class="chat-avatar">${msg.role === 'ai' ? '🤖' : '👤'}</div>
      <div class="chat-bubble">${msg.content.replace(/\n/g, '<br>')}</div>
    </div>
  `;
}

async function startChat(question) {
  const isDemo = state.get('demoMode') || !state.get('apiKey');

  if (isDemo) {
    const initialMsg = {
      role: 'ai',
      content: `素敵な研究の種ですね！「${question}」は、看護実践の質に直結する大切なテーマだと思います。\n\nもう少し研究を具体化していくために、いくつか教えていただけますか？すべてに答える必要はありません。書きやすいものだけで大丈夫です。\n\n- **研究対象**: どのような患者さん・場面を想定していますか？\n- **研究目的**: 最終的に何を明らかにしたい、もしくは改善したいですか？\n- **背景**: すでに分かっていること、まだ明らかでないことは？\n- **今の悩み**: テーマが広すぎる、方法が分からない、など困っていることは？\n\nお気軽にお聞かせください。一緒に整理していきましょう！`,
    };
    addMessage(initialMsg);
  } else {
    const chatContainer = document.querySelector('#chatContainer');
    chatContainer.insertAdjacentHTML('beforeend', `
      <div class="chat-message ai" id="loadingMsg">
        <div class="chat-avatar">🤖</div>
        <div class="chat-bubble"><span class="spinner" style="width:16px;height:16px;border-width:2px;"></span> 考え中...</div>
      </div>
    `);
    try {
      const response = await callAI(PROMPTS.rqAssistant, `研究の種: ${question}`, { module: 'rqAssistant' });
      document.querySelector('#loadingMsg')?.remove();
      addMessage({ role: 'ai', content: response });
    } catch (error) {
      document.querySelector('#loadingMsg')?.remove();
      addMessage({ role: 'ai', content: `⚠️ エラーが発生しました: ${error.message}` });
    }
  }
}

function addMessage(msg) {
  const history = state.get('seed.chatHistory') || [];
  history.push(msg);
  state.set('seed.chatHistory', history);

  const chatContainer = document.querySelector('#chatContainer');
  if (chatContainer) {
    chatContainer.insertAdjacentHTML('beforeend', renderChatMessage(msg));
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

async function sendMessage(text) {
  addMessage({ role: 'user', content: text });

  const chatContainer = document.querySelector('#chatContainer');
  chatContainer.insertAdjacentHTML('beforeend', `
    <div class="chat-message ai" id="loadingMsg">
      <div class="chat-avatar">🤖</div>
      <div class="chat-bubble"><span class="spinner" style="width:16px;height:16px;border-width:2px;"></span> 考え中...</div>
    </div>
  `);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  const history = (state.get('seed.chatHistory') || []).map(m => ({
    role: m.role === 'ai' ? 'assistant' : 'user',
    content: m.content,
  }));

  try {
    const response = await callAI(PROMPTS.rqAssistant, text, {
      module: 'rqAssistant',
      history: history.slice(0, -1),
    });

    document.querySelector('#loadingMsg')?.remove();
    addMessage({ role: 'ai', content: response });

    // Check if we should conclude (after some exchanges)
    if ((state.get('seed.chatHistory') || []).length >= 6 && !state.get('seed.refinedResult')) {
      setTimeout(() => generateRefinedResult(), 500);
    }
  } catch (error) {
    document.querySelector('#loadingMsg')?.remove();
    addMessage({ role: 'ai', content: `⚠️ エラーが発生しました: ${error.message}` });
  }
}

async function generateRefinedResult() {
  const isDemo = state.get('demoMode') || !state.get('apiKey');
  let result;

  if (isDemo) {
    await new Promise(r => setTimeout(r, 800));
    result = JSON.parse(DEMO_RESPONSES.rqOverview);
  } else {
    const history = (state.get('seed.chatHistory') || []).map(m => m.content).join('\n');
    const resp = await callAI(
      `これまでの対話に基づき、研究の骨子を整理してJSON出力してください。
以下の3つのうち最適なカテゴリーを選択し、その形式で出力してください。

【出力形式（JSONのみ）】
{
  "type": "research" | "practice" | "qi",
  "rq": "整理されたリサーチクエスチョン（必ず「〜は〜にどのような影響を与えるか？」などの疑問形で出力すること。実践報告やQIの場合はその目標を疑問形で構文すること）",
  "target": "対象者（母集団）",
  "goal": "目的・核心的な到達点",
  "approaches": [
    { "name": "アプローチ名", "description": "具体的な方法や工夫の概要" }
  ]
}`,
      history,
      { module: 'rqOverview' }
    );
    try {
      result = JSON.parse(resp.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch {
      result = null;
    }
  }

  if (result) {
    state.set('seed.refinedResult', result);
    const area = document.querySelector('#refinedResultArea');
    if (area) {
      area.classList.remove('hidden');
      area.innerHTML = renderRefinedResult(result);
      attachRefinedResultListeners(area, result);
    }
  }
}

function renderRefinedResult(result) {
  const isConfirmed = state.get('seed.rqConfirmed');
  const typeLabels = {
    research: { title: 'リサーチクエスチョン', badge: '学術研究' },
    practice: { title: '実践報告の焦点', badge: '実践報告' },
    qi: { title: 'QIプロジェクト目標', badge: '質改善' },
  };
  const labels = typeLabels[result.type] || typeLabels.research;

  return `
    <div class="ai-response expert-view" style="margin-top: var(--space-6);">
      <div class="ai-response-header">
        <span class="badge recommended">${labels.badge}として整理完了</span>
        整理された研究の骨子
      </div>
      <div class="ai-response-body">
        <p class="text-muted" style="margin-bottom: var(--space-4); font-size: 0.9rem;">
          AIが提案したリサーチクエスチョン（RQ）を必要に応じて編集し、納得できる内容になったら「このRQで確定する」ボタンを押してください。
        </p>
        <div class="format-block">
          <div class="format-row" style="flex-direction: column; align-items: stretch; gap: var(--space-2);">
            <span class="format-label">${labels.title}:</span>
            <textarea id="refinedRqInput" class="textarea input-rq" style="min-height: 80px; width: 100%; box-sizing: border-box; overflow: hidden; resize: none; font-size: 0.95rem; line-height: 1.6;" ${isConfirmed ? 'readonly' : ''}>${result.rq || result.title || ''}</textarea>
          </div>
          <div class="format-row mt-4">
            <span class="format-label">対象:</span>
            <span class="format-value">${result.target}</span>
          </div>
          <div class="format-row">
            <span class="format-label">ゴール:</span>
            <span class="format-value">${result.goal}</span>
          </div>
        </div>
        
        <div style="margin-top: var(--space-5); text-align: center;">
          <button class="btn ${isConfirmed ? 'btn-secondary' : 'btn-primary'}" id="btnConfirmRq" ${isConfirmed ? 'disabled' : ''}>
            ${isConfirmed ? '✓ 確定済み' : '✨ このRQで確定する'}
          </button>
        </div>
      </div>
    </div>
  `;
}

function updateSummary(key, value) {
  const el = document.querySelector(`#sum${key}`);
  if (el) {
    el.textContent = value;
    el.classList.add('active');
  }
}

export function validateStep1() {
  return !!state.get('seed.refinedResult') && !!state.get('seed.rqConfirmed');
}

function attachRefinedResultListeners(area, result) {
  const btnConfirm = area.querySelector('#btnConfirmRq');
  const rqInput = area.querySelector('#refinedRqInput');
  if (!btnConfirm || !rqInput) return;

  const autoResize = () => {
    rqInput.style.height = 'auto';
    rqInput.style.height = Math.max(80, rqInput.scrollHeight + 2) + 'px';
  };

  // 初期表示時の高さ調整
  requestAnimationFrame(autoResize);
  setTimeout(autoResize, 100); // 念のため少し後にも調整

  rqInput.addEventListener('input', autoResize);

  btnConfirm.addEventListener('click', () => {
    if (!rqInput.value.trim()) return;

    result.rq = rqInput.value.trim();
    state.set('seed.refinedResult', result);
    state.set('seed.rqConfirmed', true);

    updateSummary('Theme', result.rq);

    // 再描画とリスナー再アタッチ
    area.innerHTML = renderRefinedResult(result);
    attachRefinedResultListeners(area, result);
  });
}
