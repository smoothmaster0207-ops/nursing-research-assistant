/**
 * step2-rq.js — デザイン案 (Research Design Proposals)
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

  container.innerHTML = `
    <div class="fade-in">
      <h2 class="step-title">📋 Step 2：デザイン案提案</h2>
      <p class="step-description">
        整理された骨子に基づき、熟練研究者がFINER基準に準拠した3つの研究デザインを提案します。
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
        ${rq.aiResults ? renderProposals(rq.aiResults, rq.selectedDesign) : `
          <div style="text-align: center; padding: var(--space-8);">
            <button class="btn btn-primary btn-lg" id="btnGenerateDesigns">
              <span class="spinner hidden" id="designSpinner"></span>
              🤖 研究デザインを3案提案してもらう
            </button>
          </div>
        `}
      </div>
    </div>
  `;

  const btnGenerate = container.querySelector('#btnGenerateDesigns');
  if (btnGenerate) {
    btnGenerate.addEventListener('click', generateDesigns);
  } else if (rq.aiResults) {
    attachProposalListeners(container);
  }
}

async function generateDesigns() {
  const btn = document.querySelector('#btnGenerateDesigns');
  const spinner = document.querySelector('#designSpinner');
  if (btn) btn.disabled = true;
  if (spinner) spinner.classList.remove('hidden');

  const refinedResult = state.get('seed.refinedResult');
  const userMsg = `
整理されたテーマ: ${refinedResult.title}
対象: ${refinedResult.target}
ゴール: ${refinedResult.goal}
アプローチ例: ${(refinedResult.approaches || []).map(a => a.name).join(', ')}
  `.trim();

  try {
    const response = await callAI(PROMPTS.designSelection, userMsg, { module: 'designSelection' });
    const parsed = parseAIResponse(response);
    state.set('rq.aiResults', parsed);
    const area = document.querySelector('#designProposalArea');
    if (area) {
      area.innerHTML = renderProposals(parsed, null);
      attachProposalListeners(area);
    }
  } catch (error) {
    const area = document.querySelector('#designProposalArea');
    if (area) {
      area.innerHTML = `
        <div class="card" style="border-color: var(--color-danger); background: var(--color-danger-bg);">
          <p style="color: var(--color-danger);">⚠️ エラーが発生しました: ${error.message}</p>
        </div>
      `;
    }
  } finally {
    if (btn) btn.disabled = false;
    if (spinner) spinner.classList.add('hidden');
  }
}

/**
 * AIレスポンスからJSONをパースする（複数のフォーマットに対応）
 */
function parseAIResponse(response) {
  // Step 1: マークダウンのコードブロック（```json ... ```）を除去
  let jsonStr = response;

  // ```json\n...\n``` パターン
  const codeBlockMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1];
  }

  // Step 2: JSONとしてパースを試行
  try {
    const parsed = JSON.parse(jsonStr.trim());
    // proposals配列があるか確認
    if (parsed.proposals && Array.isArray(parsed.proposals)) {
      return parsed;
    }
    // 配列が直接返された場合
    if (Array.isArray(parsed)) {
      return { proposals: parsed };
    }
    // 単一のオブジェクトの場合
    return { proposals: [parsed] };
  } catch (e) {
    console.warn('JSON parse failed, trying to extract JSON from response:', e);
  }

  // Step 3: レスポンス内からJSON部分を抽出
  const jsonMatch = response.match(/\{[\s\S]*"proposals"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.warn('Extracted JSON parse also failed:', e);
    }
  }

  // Step 4: フォールバック — テキストとして表示
  return {
    proposals: [{
      design: 'AIからの提案',
      vision: response.substring(0, 500),
      finer: {},
      rating: 2,
      reason: '（JSONの解析に失敗したため、テキストとして表示しています。再度お試しください。）'
    }]
  };
}

function renderProposals(data, selectedDesign) {
  const proposals = data.proposals || [];
  const count = proposals.length;
  return `
    <div class="ai-response">
      <div class="ai-response-header">🤖 熟練研究者による研究デザイン提案（${count}案）</div>
      <div class="ai-response-body">
        <p class="mb-4">最新の知見と研究の意義に基づき、FINER基準に準拠した以下の${count}案を提案します。気になるデザインをクリックして選択してください。</p>
        <div class="proposal-cards expert-view">
          ${proposals.map((p, i) => renderOneProposal(p, i, selectedDesign)).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderOneProposal(p, i, selectedDesign) {
  const badgeClass = i === 0 ? 'recommended' : 'alternative';
  const badgeText = i === 0 ? '★ 最優先推奨' : `候補案 ${i + 1}`;
  const stars = '★'.repeat(p.rating || 2) + '☆'.repeat(3 - (p.rating || 2));

  // FINERの詳細テキストを生成
  const finerRows = renderFinerDetails(p.finer);

  return `
    <div class="proposal-card ${selectedDesign === p.design ? 'selected' : ''}" data-design="${escapeHtml(p.design)}" data-index="${i}">
      <div class="proposal-header">
        <span class="badge ${badgeClass}">${badgeText}</span>
        <div class="stars">${stars}</div>
      </div>
      
      <h3 class="proposal-title">${escapeHtml(p.design)}</h3>
      
      ${p.vision ? `
        <div class="proposal-section">
          <h4>🔭 研究のビジョン</h4>
          <p>${escapeHtml(p.vision)}</p>
        </div>
      ` : ''}

      ${finerRows}
      
      <div class="proposal-section mt-2">
        <h4>📝 推奨理由</h4>
        <p class="small text-muted">${escapeHtml(p.reason || '')}</p>
      </div>
      
      <div class="select-hint">クリックして選択</div>
    </div>
  `;
}

function renderFinerDetails(finer) {
  if (!finer || Object.keys(finer).length === 0) {
    return '';
  }

  const labels = {
    f: { name: 'Feasible', icon: '✅', label: '実現可能性' },
    i: { name: 'Interesting', icon: '💡', label: '面白さ' },
    n: { name: 'Novel', icon: '🆕', label: '新規性' },
    e: { name: 'Ethical', icon: '🛡️', label: '倫理性' },
    r: { name: 'Relevant', icon: '🎯', label: '関連性' },
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

function attachProposalListeners(container) {
  container.querySelectorAll('.proposal-card').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.proposal-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const design = card.dataset.design;
      state.set('rq.selectedDesign', design);
      updateSummary('Design', design);
    });
  });
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
