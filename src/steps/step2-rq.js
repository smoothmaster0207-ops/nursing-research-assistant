/**
 * step2-rq.js — デザイン案 (Research Design Proposal)
 * 最優先の1案を提案し、代替デザインも希望できる設計
 */

import { state } from '../state.js';
import { callAI } from '../ai-client.js';
import { PROMPTS } from '../prompts/index.js';

export function renderStep2(container) {
  const rq = state.get('rq');
  const refinedResult = state.get('seed.refinedResult');

  if (!refinedResult) {
    container.innerHTML = `
      <div class="fade-in">
        <h2 class="step-title">📋 Step 2：デザイン案</h2>
        <div class="card" style="text-align: center; padding: var(--space-12);">
          <p class="text-muted">先にStep 1で「整理された骨子」を完成させてください。</p>
          <button class="btn btn-primary mt-4" onclick="document.querySelector('[data-step=\\'1\\']').click()">Step 1へ戻る</button>
        </div>
      </div>
    `;
    return;
  }

  // 現在の提案と履歴
  const currentProposal = rq.aiResults;
  const history = rq.proposalHistory || [];
  const selectedDesign = rq.selectedDesign;

  container.innerHTML = `
    <div class="fade-in">
      <h2 class="step-title">📋 Step 2：研究デザイン提案</h2>
      <p class="step-description">
        整理された骨子に基づき、FINER基準に準拠した最適な研究デザインを提案します。
      </p>

      <div class="card highlight-card" style="margin-bottom: var(--space-6);">
        <div class="format-row">
          <span class="format-label">整理されたテーマ:</span>
          <span class="format-value"><strong>${refinedResult.title}</strong></span>
        </div>
        <div class="format-row">
          <span class="format-label">対象:</span>
          <span class="format-value">${refinedResult.target}</span>
        </div>
      </div>

      <div id="designProposalArea">
        ${currentProposal ? renderProposal(currentProposal, selectedDesign, history) : `
          <div style="text-align: center; padding: var(--space-8);">
            <button class="btn btn-primary btn-lg" id="btnGenerateDesign">
              <span class="spinner hidden" id="designSpinner"></span>
              🤖 最適な研究デザインを提案してもらう
            </button>
          </div>
        `}
      </div>
    </div>
  `;

  const btnGenerate = container.querySelector('#btnGenerateDesign');
  if (btnGenerate) {
    btnGenerate.addEventListener('click', generateDesign);
  } else if (currentProposal) {
    attachListeners(container);
  }
}

async function generateDesign(requestAlternative = false) {
  const btn = document.querySelector('#btnGenerateDesign') || document.querySelector('#btnAlternativeDesign');
  const spinner = document.querySelector('#designSpinner') || document.querySelector('#altSpinner');
  if (btn) btn.disabled = true;
  if (spinner) spinner.classList.remove('hidden');

  const refinedResult = state.get('seed.refinedResult');
  const history = state.get('rq.proposalHistory') || [];
  const currentProposal = state.get('rq.aiResults');

  // 代替リクエスト時は、過去の提案を「避けるべきデザイン」として伝える
  let userMsg = `
整理されたテーマ: ${refinedResult.title}
対象: ${refinedResult.target}
ゴール: ${refinedResult.goal}
アプローチ例: ${(refinedResult.approaches || []).map(a => a.name).join(', ')}
  `.trim();

  if (requestAlternative && (currentProposal || history.length > 0)) {
    const pastDesigns = [];
    history.forEach(h => pastDesigns.push(h.design));
    if (currentProposal) pastDesigns.push(currentProposal.design);

    userMsg += `\n\n【重要】以下の研究デザインはすでに提案済みです。これらとは異なる視点・方法論の研究デザインを提案してください：\n${pastDesigns.map((d, i) => `${i + 1}. ${d}`).join('\n')}`;
  }

  try {
    const response = await callAI(PROMPTS.designSelection, userMsg, { module: 'designSelection' });
    const parsed = parseAIResponse(response);
    const proposal = parsed.proposals[0]; // 1案のみ使用

    // 現在の提案があれば履歴に移動
    if (requestAlternative && currentProposal) {
      const updatedHistory = [...history, currentProposal];
      state.set('rq.proposalHistory', updatedHistory);
    }

    state.set('rq.aiResults', proposal);
    state.set('rq.selectedDesign', null); // 新しい提案なので選択をリセット

    const area = document.querySelector('#designProposalArea');
    if (area) {
      const newHistory = state.get('rq.proposalHistory') || [];
      area.innerHTML = renderProposal(proposal, null, newHistory);
      attachListeners(area);
    }
  } catch (error) {
    const area = document.querySelector('#designProposalArea');
    if (area) {
      area.innerHTML = `
        <div class="card" style="border-color: var(--color-danger); background: var(--color-danger-bg);">
          <p style="color: var(--color-danger);">⚠️ エラーが発生しました: ${error.message}</p>
          <button class="btn btn-primary mt-4" id="btnGenerateDesign">🔄 再試行する</button>
        </div>
      `;
      area.querySelector('#btnGenerateDesign')?.addEventListener('click', () => generateDesign(false));
    }
  } finally {
    if (btn) btn.disabled = false;
    if (spinner) spinner.classList.add('hidden');
  }
}

/**
 * AIレスポンスからJSONをパースする
 */
function parseAIResponse(response) {
  let jsonStr = response;

  // マークダウンのコードブロック除去
  const codeBlockMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1];
  }

  // JSONパースを試行
  try {
    const parsed = JSON.parse(jsonStr.trim());
    if (parsed.proposals && Array.isArray(parsed.proposals)) {
      return normalizeProposals(parsed);
    }
    if (Array.isArray(parsed)) {
      return normalizeProposals({ proposals: parsed });
    }
    // 単一オブジェクトの場合（1案形式）
    if (parsed.design || parsed.title || parsed.vision) {
      return normalizeProposals({ proposals: [parsed] });
    }
    return normalizeProposals({ proposals: [parsed] });
  } catch (e) {
    console.warn('JSON parse failed:', e);
  }

  // 途切れたJSONの修復を試行
  try {
    const repaired = repairTruncatedJSON(jsonStr.trim());
    if (repaired) {
      const parsed = JSON.parse(repaired);
      if (parsed.proposals && Array.isArray(parsed.proposals)) {
        return normalizeProposals(parsed);
      }
    }
  } catch (e) {
    console.warn('JSON repair failed:', e);
  }

  // レスポンス内からJSON部分を抽出
  const jsonMatch = response.match(/\{[\s\S]*"design"\s*:[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const obj = JSON.parse(jsonMatch[0]);
      return normalizeProposals({ proposals: [obj] });
    } catch (_) { /* skip */ }
  }

  // フォールバック
  return {
    proposals: [{
      design: 'AIからの提案',
      vision: response.substring(0, 800),
      finer: {},
      reason: '（JSONの解析に失敗したため、テキストとして表示しています。再度お試しください。）'
    }]
  };
}

function normalizeProposals(data) {
  if (!data.proposals) return data;
  data.proposals = data.proposals.map((p, i) => ({
    design: p.design || p.title || p.name || `提案 ${i + 1}`,
    vision: p.vision || p.description || p.overview || '',
    finer: p.finer || {},
    reason: p.reason || p.recommendation || p.rationale || '',
  }));
  return data;
}

/**
 * 途切れたJSONを修復する
 */
function repairTruncatedJSON(str) {
  const proposalsIdx = str.indexOf('"proposals"');
  if (proposalsIdx === -1) {
    // proposals キーがない場合、単一オブジェクトとして修復を試みる
    const designIdx = str.indexOf('"design"');
    if (designIdx === -1) return null;
    // 開き括弧と閉じ括弧の数を合わせる
    let opens = 0, closes = 0;
    for (const ch of str) {
      if (ch === '{') opens++;
      if (ch === '}') closes++;
    }
    if (opens > closes) {
      return str + '}'.repeat(opens - closes);
    }
    return null;
  }

  const arrayStart = str.indexOf('[', proposalsIdx);
  if (arrayStart === -1) return null;

  let lastCompleteObj = -1;
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = arrayStart + 1; i < str.length; i++) {
    const ch = str[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) lastCompleteObj = i;
    }
  }

  if (lastCompleteObj === -1) return null;
  const prefix = str.substring(0, lastCompleteObj + 1);
  return prefix.replace(/,\s*$/, '') + ']}';
}

/**
 * メイン提案カードをレンダリング
 */
function renderProposal(proposal, selectedDesign, history) {
  const isSelected = selectedDesign === proposal.design;
  const finerRows = renderFinerDetails(proposal.finer);

  let historySection = '';
  if (history.length > 0) {
    historySection = `
      <div class="card" style="margin-top: var(--space-6); background: var(--color-bg-secondary, #f8f9fa);">
        <h4 style="margin-bottom: var(--space-3); font-size: 0.9rem; color: var(--color-text-secondary);">
          📁 過去の提案（${history.length}件）
        </h4>
        <p class="small text-muted" style="margin-bottom: var(--space-3);">以前の提案を採用したい場合はクリックしてください。</p>
        <div class="history-list">
          ${history.map((h, i) => `
            <div class="history-item ${selectedDesign === h.design ? 'selected' : ''}" data-history-index="${i}" data-design="${escapeHtml(h.design)}">
              <span class="history-number">${i + 1}</span>
              <span class="history-title">${escapeHtml(h.design)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  return `
    <div class="ai-response">
      <div class="ai-response-header">🤖 熟練研究者による研究デザイン提案</div>
      <div class="ai-response-body">
        <p class="mb-4">最新の知見と研究の意義に基づき、FINER基準に準拠した最適な研究デザインを提案します。</p>
        
        <div class="proposal-card main-proposal ${isSelected ? 'selected' : ''}" data-design="${escapeHtml(proposal.design)}" data-is-current="true">
          <div class="proposal-header">
            <span class="badge recommended">★ 推奨デザイン</span>
          </div>
          
          <h3 class="proposal-title">${escapeHtml(proposal.design)}</h3>
          
          ${proposal.vision ? `
            <div class="proposal-section">
              <h4>🔭 研究のビジョン</h4>
              <p>${escapeHtml(proposal.vision)}</p>
            </div>
          ` : ''}

          ${finerRows}
          
          ${proposal.reason ? `
            <div class="proposal-section mt-2">
              <h4>📝 推奨理由</h4>
              <p class="small text-muted">${escapeHtml(proposal.reason)}</p>
            </div>
          ` : ''}
          
          <div class="select-hint">${isSelected ? '✅ 選択済み — クリックで選択解除' : 'クリックしてこのデザインを採用'}</div>
        </div>

        <div style="text-align: center; margin-top: var(--space-6);">
          <p class="small text-muted" style="margin-bottom: var(--space-3);">このデザインがしっくりこない場合は、別の視点から再提案できます。</p>
          <button class="btn btn-outline" id="btnAlternativeDesign" style="font-size: 0.9rem;">
            <span class="spinner hidden" id="altSpinner"></span>
            🔄 別の視点でデザインを提案してもらう
          </button>
        </div>
      </div>
    </div>

    ${historySection}

    <div class="card" style="margin-top: var(--space-6);">
      <h3 class="section-title">✍️ 自分で研究デザインを選択する</h3>
      <p class="text-muted" style="margin-bottom: var(--space-4);">AIの提案がイメージと違う場合、以下のリストから自分で研究デザイン（研究タイプ）を選択できます。</p>
      
      <div class="form-group">
        <label for="manualDesignSelect">研究タイプを選択</label>
        <select id="manualDesignSelect" class="select" style="max-width: 400px;">
          <option value="">（選択してください）</option>
          <option value="介入研究" ${selectedDesign === '介入研究' ? 'selected' : ''}>介入研究（RCTなど）</option>
          <option value="観察研究" ${selectedDesign === '観察研究' ? 'selected' : ''}>観察研究（コホート・横断など）</option>
          <option value="質的研究" ${selectedDesign === '質的研究' ? 'selected' : ''}>質的研究（インタビューなど）</option>
          <option value="QI（質改善）" ${selectedDesign === 'QI（質改善）' ? 'selected' : ''}>QI（質改善プロジェクト）</option>
          <option value="事例／実践報告" ${selectedDesign === '事例／実践報告' ? 'selected' : ''}>事例／実践報告</option>
          <option value="システマティックレビュー" ${selectedDesign === 'システマティックレビュー' ? 'selected' : ''}>システマティックレビュー</option>
          <option value="スコーピングレビュー" ${selectedDesign === 'スコーピングレビュー' ? 'selected' : ''}>スコーピングレビュー</option>
          <option value="混合研究法" ${selectedDesign === '混合研究法' ? 'selected' : ''}>混合研究法</option>
        </select>
        <p class="hint">これを選択すると、AIの提案ではなくここで選んだデザインが採用されます。</p>
      </div>
    </div>
  `;
}

function renderFinerDetails(finer) {
  if (!finer || Object.keys(finer).length === 0) {
    return '';
  }

  const labels = {
    f: { icon: '✅', label: '実現可能性' },
    i: { icon: '💡', label: '面白さ' },
    n: { icon: '🆕', label: '新規性' },
    e: { icon: '🛡️', label: '倫理性' },
    r: { icon: '🎯', label: '関連性' },
  };

  const rows = Object.entries(labels).map(([key, meta]) => {
    const value = finer[key];
    if (!value || value === true) return '';
    return `
      <div class="finer-detail-row">
        <span class="finer-label">${meta.icon} ${meta.label}</span>
        <span class="finer-value">${escapeHtml(String(value))}</span>
      </div>
    `;
  }).filter(r => r).join('');

  if (!rows) return '';

  return `
    <div class="proposal-section finer-details">
      <h4>📊 FINER基準評価</h4>
      ${rows}
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function attachListeners(container) {
  // メイン提案カードのクリック
  const mainCard = container.querySelector('.proposal-card[data-is-current="true"]');
  if (mainCard) {
    mainCard.addEventListener('click', () => {
      const design = mainCard.dataset.design;
      const currentSelected = state.get('rq.selectedDesign');

      const manualSelect = container.querySelector('#manualDesignSelect');

      if (currentSelected === design) {
        // 選択解除
        state.set('rq.selectedDesign', null);
        mainCard.classList.remove('selected');
        mainCard.querySelector('.select-hint').textContent = 'クリックしてこのデザインを採用';
      } else {
        // 選択
        container.querySelectorAll('.proposal-card, .history-item').forEach(c => c.classList.remove('selected'));
        mainCard.classList.add('selected');
        state.set('rq.selectedDesign', design);
        mainCard.querySelector('.select-hint').textContent = '✅ 選択済み — クリックで選択解除';
        if (manualSelect) manualSelect.value = ''; // セレクトボックスをリセット
      }
      updateSummary('Design', state.get('rq.selectedDesign') || '');
    });
  }

  // 履歴アイテムのクリック
  container.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const design = item.dataset.design;
      const currentSelected = state.get('rq.selectedDesign');

      const manualSelect = container.querySelector('#manualDesignSelect');

      if (currentSelected === design) {
        state.set('rq.selectedDesign', null);
        item.classList.remove('selected');
      } else {
        container.querySelectorAll('.proposal-card, .history-item').forEach(c => c.classList.remove('selected'));
        item.classList.add('selected');
        state.set('rq.selectedDesign', design);
        // メインカードの選択ヒントをリセット
        const hint = container.querySelector('.proposal-card[data-is-current="true"] .select-hint');
        if (hint) hint.textContent = 'クリックしてこのデザインを採用';
        if (manualSelect) manualSelect.value = ''; // セレクトボックスをリセット
      }
      updateSummary('Design', state.get('rq.selectedDesign') || '');
    });
  });

  // 手動デザイン選択セレクトボックス
  const manualSelect = container.querySelector('#manualDesignSelect');
  if (manualSelect) {
    manualSelect.addEventListener('change', (e) => {
      const design = e.target.value;
      if (design) {
        // カードと履歴の選択を解除
        container.querySelectorAll('.proposal-card, .history-item').forEach(c => c.classList.remove('selected'));
        const hint = container.querySelector('.proposal-card[data-is-current="true"] .select-hint');
        if (hint) hint.textContent = 'クリックしてこのデザインを採用';

        state.set('rq.selectedDesign', design);
      } else {
        state.set('rq.selectedDesign', null);
      }
      updateSummary('Design', state.get('rq.selectedDesign') || '');
    });
  }

  // 代替デザインボタン
  const altBtn = container.querySelector('#btnAlternativeDesign');
  if (altBtn) {
    altBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      generateDesign(true);
    });
  }
}

function updateSummary(key, value) {
  const el = document.querySelector(`#sum${key}`);
  if (el) {
    el.textContent = value;
    el.classList.add('active');
  }
}

export function validateStep2() {
  return !!state.get('rq.selectedDesign');
}
