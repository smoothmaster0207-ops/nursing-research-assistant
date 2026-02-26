/**
 * step4-review.js — 文献レビュー支援
 */

import { state } from '../state.js';
import { callAI } from '../ai-client.js';
import { PROMPTS } from '../prompts/index.js';

export function renderStep4(container) {
  const review = state.get('review');

  container.innerHTML = `
    <div class="fade-in">
      <h2 class="step-title">📚 Step 4：研究背景と意義の構築</h2>
      <p class="step-description">
        先行研究の整理から研究の必要性、独自性までを論理的に構築します。
      </p>

      <div class="card" style="margin-bottom: var(--space-6);">
        <div class="form-group">
          <label for="reviewKeywords">キーワード・関連テーマ</label>
          <input type="text" id="reviewKeywords" class="input"
                 placeholder="例：退院支援 高齢者 再入院 家族の負担"
                 value="${review.keywords || ''}" />
          <p class="hint">これまでの検討内容に基づき、特に重視したいキーワードを入力してください。</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
          <div class="form-group">
            <label for="reviewLang">文献の対象範囲</label>
            <select id="reviewLang" class="select">
              <option value="ja+en" ${review.language === 'ja+en' ? 'selected' : ''}>国内・国際の両方</option>
              <option value="en" ${review.language === 'en' ? 'selected' : ''}>国際（英語）のみ</option>
              <option value="ja" ${review.language === 'ja' ? 'selected' : ''}>国内（日本語）のみ</option>
            </select>
          </div>

          <div class="form-group">
            <label for="reviewContext">重視する視点</label>
            <select id="reviewContext" class="select">
              <option value="academic" ${review.context === 'academic' ? 'selected' : ''}>学術的・論理的整合性</option>
              <option value="clinical" ${review.context === 'clinical' ? 'selected' : ''}>臨床上の喫緊の課題</option>
              <option value="ethical" ${review.context === 'ethical' ? 'selected' : ''}>倫理・人権の観点</option>
            </select>
          </div>
        </div>

        <button class="btn btn-primary btn-lg" id="btnReview">
          <span class="spinner hidden" id="reviewSpinner"></span>
          🖋 背景・意義の論理構成を生成
        </button>
      </div>

      <div id="step4Results">
        ${review.aiResult ? renderReviewResults(review.aiResult) : ''}
      </div>
    </div>
  `;

  // Event listeners
  const keywordsInput = container.querySelector('#reviewKeywords');
  const langSelect = container.querySelector('#reviewLang');
  const contextSelect = container.querySelector('#reviewContext');

  keywordsInput.addEventListener('input', () => state.set('review.keywords', keywordsInput.value));
  langSelect.addEventListener('change', () => state.set('review.language', langSelect.value));
  contextSelect?.addEventListener('change', () => state.set('review.context', contextSelect.value));

  container.querySelector('#btnReview').addEventListener('click', runReview);
}

async function runReview() {
  const btn = document.querySelector('#btnReview');
  const spinner = document.querySelector('#reviewSpinner');
  btn.disabled = true;
  spinner.classList.remove('hidden');

  const review = state.get('review');
  const refined = state.get('seed.refinedResult');
  const theme = refined?.title || '';
  const rqText = refined?.goal || '';
  const purpose = refined?.goal || '';
  const design = state.get('rq.selectedDesign') || '';

  const userMsg = `
研究テーマ: ${theme}
リサーチクエスチョン: ${rqText}
研究の目的: ${purpose}
研究デザイン: ${design}
重視するキーワード: ${review.keywords}
対象範囲: ${review.language}
重視する視点: ${review.context || '特定なし'}
  `.trim();

  try {
    const response = await callAI(PROMPTS.literatureReview, userMsg, { module: 'literatureReview' });
    let parsed;
    try {
      const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = { narrative: response, matrix: '解析中...', citationList: '出典確認中' };
    }
    state.set('review.aiResult', parsed);
    document.querySelector('#step4Results').innerHTML = renderReviewResults(parsed);

    const sumLit = document.querySelector('#sumLiterature');
    if (sumLit) {
      sumLit.textContent = '背景構築済み';
      sumLit.classList.add('active');
    }
  } catch (error) {
    document.querySelector('#step4Results').innerHTML = `
      <div class="card" style="border-color: var(--color-danger);">
        <p style="color: var(--color-danger);">⚠️ エラー: ${error.message}</p>
      </div>
    `;
  } finally {
    btn.disabled = false;
    spinner.classList.add('hidden');
  }
}

function renderReviewResults(data) {
  return `
    <div class="ai-response">
      <div class="ai-response-header">📖 研究の背景と意義（草案）</div>
      <div class="ai-response-body">
        
        <div class="academic-text">
          ${data.narrative.replace(/\n/g, '<br>')}
        </div>

        ${data.matrix ? `
          <div class="mt-6 p-4 rounded-lg bg-gray-50 border border-border">
            <h4>📊 先行研究・知見の整理</h4>
            <div class="small text-muted">${data.matrix}</div>
          </div>
        ` : ''}

        ${data.citationList ? `
          <div class="mt-6 citation-box">
            <h4>📚 引用文献リスト（APA 7th準拠）</h4>
            <div class="small monospace">${data.citationList.replace(/\n/g, '<br>')}</div>
          </div>
        ` : ''}

      </div>
    </div>
  `;
}

export function validateStep4() {
  return !!state.get('review.aiResult');
}
