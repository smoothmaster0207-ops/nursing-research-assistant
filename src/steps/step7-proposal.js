/**
 * step7-proposal.js — 研究計画書草案自動生成
 */

import { state } from '../state.js';
import { callAI } from '../ai-client.js';
import { PROMPTS } from '../prompts/index.js';

export function renderStep7(container) {
  const proposal = state.get('proposal');

  container.innerHTML = `
    <div class="fade-in">
      <h2 class="step-title">📝 Step 7：研究計画書草案</h2>
      <p class="step-description">
        これまでのステップで整理した内容を統合し、ガイドライン準拠の研究計画書草案を自動生成します。
      </p>

      <!-- Summary of all steps -->
      <div class="card" style="margin-bottom: var(--space-6);">
        <h3 class="section-title">🗂 これまでの入力内容</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
          ${renderInputSummary()}
        </div>
      </div>

      <div style="margin-bottom: var(--space-6);">
        <button class="btn btn-primary btn-lg" id="btnGenerate" style="width: 100%;">
          <span class="spinner hidden" id="generateSpinner"></span>
          📝 研究計画書草案を生成
        </button>
      </div>

      <div id="step7Results">
        ${proposal.draft ? renderProposal(proposal.draft) : ''}
      </div>
    </div>
  `;

  container.querySelector('#btnGenerate').addEventListener('click', generateProposal);
}

function renderInputSummary() {
  const seed = state.get('seed');
  const rq = state.get('rq');
  const guideline = state.get('guideline');
  const review = state.get('review');
  const data = state.get('data');
  const analysis = state.get('analysis');

  const refined = seed.refinedResult;
  return `
    <div>
      <p><strong>テーマ:</strong> ${refined ? refined.title.substring(0, 80) + '...' : '未整理'}</p>
      <p><strong>研究デザイン:</strong> ${rq.selectedDesign || '未選択'}</p>
      <p><strong>ガイドライン:</strong> ${guideline.selected || '未選択'}</p>
    </div>
    <div>
      <p><strong>骨子整理:</strong> ${refined ? '完了' : '未完了'}</p>
      <p><strong>文献レビュー:</strong> ${review.aiResult ? '実施済み' : '未実施'}</p>
      <p><strong>分析方法:</strong> ${analysis.aiResult?.primaryAnalysis?.method || '未提案'}</p>
    </div>
    `;
}

async function generateProposal() {
  const btn = document.querySelector('#btnGenerate');
  const spinner = document.querySelector('#generateSpinner');
  btn.disabled = true;
  spinner.classList.remove('hidden');

  // Gather all context
  const seed = state.get('seed');
  const rq = state.get('rq');
  const guideline = state.get('guideline');
  const review = state.get('review');
  const data = state.get('data');
  const analysis = state.get('analysis');

  const userMsg = `
以下の情報を統合して研究計画書草案を作成してください。

【研究テーマ】
${seed.refinedResult?.rq || seed.refinedResult?.title || seed.question || ''}

【研究デザイン】
${rq.selectedDesign || ''}

【研究の骨子】
ゴール: ${seed.refinedResult?.goal || '未整理'}
アプローチ: ${(seed.refinedResult?.approaches || []).map(a => a.name).join(', ')}

【準拠ガイドライン】
${guideline.selected || ''}

【文献レビュー概要】
${review.aiResult?.narrative || '未実施'}
研究ギャップ: ${(review.aiResult?.gaps || []).join('、')}

【データ収集計画】
データタイプ: ${(data.types || []).join(', ')}
サンプルサイズ: ${data.sampleSize || '未定'}
群分け: ${data.grouping || '未定'}

【分析方法】
主解析: ${analysis.aiResult?.primaryAnalysis?.method || '未提案'}
サンプルサイズ根拠: ${analysis.aiResult?.sampleSizeNote || ''}
  `.trim();

  try {
    const response = await callAI(PROMPTS.proposalDraft, userMsg, {
      module: 'proposalDraft',
      maxTokens: 4000,
    });
    state.set('proposal.draft', response);
    document.querySelector('#step7Results').innerHTML = renderProposal(response);
  } catch (error) {
    document.querySelector('#step7Results').innerHTML = `
      <div class="card" style="border-color: var(--color-danger);">
        <p style="color: var(--color-danger);">⚠️ エラー: ${error.message}</p>
      </div>
    `;
  } finally {
    btn.disabled = false;
    spinner.classList.add('hidden');
  }
}

function renderProposal(draft) {
  // Convert markdown-like formatting to HTML
  const htmlContent = draft
    .replace(/^# (.+)$/gm, '<h2 style="margin-top: var(--space-6); color: var(--color-primary-dark); border-bottom: 2px solid var(--color-primary-border); padding-bottom: var(--space-2);">$1</h2>')
    .replace(/^## (.+)$/gm, '<h3 style="margin-top: var(--space-5); color: var(--color-text);">$1</h3>')
    .replace(/^### (.+)$/gm, '<h4 style="margin-top: var(--space-4); color: var(--color-text-secondary);">$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  return `
    <div class="ai-response">
      <div class="ai-response-header">📝 研究計画書草案（自動生成）</div>
      <div class="ai-response-body">
        <div class="proposal-output" style="white-space: normal;">
          ${htmlContent}
        </div>
      </div>
    </div>

    <div class="export-actions">
      <button class="btn btn-success" id="btnCopy" onclick="
        navigator.clipboard.writeText(${JSON.stringify(draft).replace(/</g, '\\u003c')});
        this.textContent = '✅ コピーしました';
        setTimeout(() => this.textContent = '📋 テキストをコピー', 2000);
      ">
        📋 テキストをコピー
      </button>
      <button class="btn btn-outline" id="btnDownload" onclick="
        const blob = new Blob([${JSON.stringify(draft).replace(/</g, '\\u003c')}], {type:'text/plain;charset=utf-8'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = '研究計画書草案.txt';
        a.click();
      ">
        💾 テキストファイルとしてダウンロード
      </button>
    </div>
  `;
}

export function validateStep7() {
  return !!state.get('proposal.draft');
}
