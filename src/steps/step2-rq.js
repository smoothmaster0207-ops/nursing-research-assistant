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
        整理された骨子に基づき、熟練研究者がFINER基準に準拠した10項目の研究デザインを提案します。
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
              🤖 具体的な研究デザインを10案提案してもらう
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
アプローチ例: ${refinedResult.approaches.map(a => a.name).join(', ')}
  `.trim();

  try {
    const response = await callAI(PROMPTS.designSelection, userMsg, { module: 'designSelection' });
    let parsed;
    try {
      const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = { proposals: [{ design: '解析結果', reason: response, rating: 2 }] };
    }
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

function renderProposals(data, selectedDesign) {
  const proposals = data.proposals || [];
  return `
    <div class="ai-response">
      <div class="ai-response-header">🤖 熟練研究者による研究デザイン提案（10案）</div>
      <div class="ai-response-body">
        <p class="mb-4">最新の知見と研究の意義に基づき、FINER基準に準拠した以下の10案を提案します。</p>
        <div class="proposal-cards expert-view">
          ${proposals.map((p, i) => `
            <div class="proposal-card ${selectedDesign === p.design ? 'selected' : ''}" data-design="${p.design}" data-index="${i}">
              <div class="proposal-header">
                <span class="badge ${i === 0 ? 'recommended' : 'alternative'}">${i === 0 ? '★ 最優先推奨' : '候補案'}</span>
                <div class="stars">${'★'.repeat(p.rating || 2)}${'☆'.repeat(3 - (p.rating || 2))}</div>
              </div>
              
              <h3 class="proposal-title">${p.design}</h3>
              
              <div class="proposal-section">
                <h4>🔭 研究のビジョン</h4>
                <p>${p.vision || p.reason}</p>
              </div>

              <div class="finer-table-container">
                <table class="finer-table">
                  <thead>
                    <tr>
                      <th>F</th>
                      <th>I</th>
                      <th>N</th>
                      <th>E</th>
                      <th>R</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td title="Feasible: ${p.finer?.f || ''}">${p.finer?.f ? '◯' : '-'}</td>
                      <td title="Interesting: ${p.finer?.i || ''}">${p.finer?.i ? '◯' : '-'}</td>
                      <td title="Novel: ${p.finer?.n || ''}">${p.finer?.n ? '◯' : '-'}</td>
                      <td title="Ethical: ${p.finer?.e || ''}">${p.finer?.e ? '◯' : '-'}</td>
                      <td title="Relevant: ${p.finer?.r || ''}">${p.finer?.r ? '◯' : '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div class="proposal-section mt-2">
                <h4>📝 推奨理由</h4>
                <p class="small text-muted">${p.reason}</p>
              </div>
              
              <div class="select-hint">クリックして選択</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
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
