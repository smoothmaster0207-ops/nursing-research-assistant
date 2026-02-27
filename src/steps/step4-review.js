/**
 * step4-review.js — 文献レビュー支援
 */

import { state } from '../state.js';
import { callAI } from '../ai-client.js';
import { PROMPTS } from '../prompts/index.js';
import { CHECKLIST_ITEMS } from './step3-guideline.js';

function getChecklistItems(guidelineName) {
  return CHECKLIST_ITEMS[guidelineName] || [];
}

export function renderStep4(container) {
  const review = state.get('review');

  container.innerHTML = `
    <div class="fade-in">
      <h2 class="step-title">📚 Step 4：研究背景と意義の構築</h2>
      <p class="step-description">
        先行研究の整理から研究の必要性、独自性までを論理的に構築します。
      </p>

      <div class="card" style="margin-bottom: var(--space-6);">
        <div style="margin-bottom: var(--space-6); padding-bottom: var(--space-4); border-bottom: 1px dashed var(--color-border);">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--space-3);">
            <div>
              <h3 style="font-size: 1rem; margin-bottom: var(--space-1);">💡 検索キーワード・式の自動提案</h3>
              <p class="hint">これまでの入力内容から、文献検索に最適なキーワードと検索式をAIが提案します。</p>
            </div>
            <button class="btn btn-secondary btn-sm" id="btnSuggestQueries">
              <span class="spinner hidden" id="suggestSpinner"></span>
              🤖 AIに提案してもらう
            </button>
          </div>
          
          <div id="suggestedQueriesArea" style="display: none; background: var(--color-primary-bg); padding: var(--space-4); border-radius: var(--radius-sm); border: 1px solid var(--color-primary-border);">
            <!-- 提案結果がここに表示される -->
          </div>
        </div>

        <div class="form-group">
          <label for="reviewKeywords">キーワード・関連テーマ <span style="font-size: 0.8rem; font-weight: normal; color: var(--color-text-muted);">（上記で提案されたものをコピーするか、手入力してください）</span></label>
          <input type="text" id="reviewKeywords" class="input"
                 placeholder="例：退院支援 高齢者 再入院"
                 value="${review.keywords || ''}" />
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

  const btnSuggest = container.querySelector('#btnSuggestQueries');
  if (btnSuggest) {
    btnSuggest.addEventListener('click', suggestQueries);
  }

  // 既に提案データがあれば表示を復元
  if (review.suggestedQueries) {
    renderSuggestedQueries(review.suggestedQueries);
  }
}

async function suggestQueries() {
  const btn = document.querySelector('#btnSuggestQueries');
  const spinner = document.querySelector('#suggestSpinner');
  const area = document.querySelector('#suggestedQueriesArea');

  if (!btn || !spinner || !area) return;

  btn.disabled = true;
  spinner.classList.remove('hidden');
  area.style.display = 'block';
  area.innerHTML = '<p class="text-muted" style="text-align: center; padding: var(--space-4);">AIが最適な検索式を考案中です...</p>';

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
  `.trim();

  try {
    const response = await callAI(PROMPTS.searchQuerySuggestion, userMsg, { module: 'searchQuerySuggestion' });
    let parsed;
    try {
      const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse search queries:', e);
      throw new Error('AIからの応答を正しく解析できませんでした。');
    }

    // stateに保存
    state.set('review.suggestedQueries', parsed);

    // UIを更新
    renderSuggestedQueries(parsed);

    // キーワード入力欄が空なら、日本語キーワードを自動反映
    const keywordsInput = document.querySelector('#reviewKeywords');
    if (keywordsInput && !keywordsInput.value.trim() && parsed.keywordsJa) {
      const newKeywords = parsed.keywordsJa.join(' ');
      keywordsInput.value = newKeywords;
      state.set('review.keywords', newKeywords);
    }

  } catch (error) {
    area.innerHTML = `
      <p style="color: var(--color-danger); margin-bottom: 0;">⚠️ エラー: ${error.message}</p>
    `;
  } finally {
    btn.disabled = false;
    spinner.classList.add('hidden');
  }
}

function renderSuggestedQueries(data) {
  const area = document.querySelector('#suggestedQueriesArea');
  if (!area) return;

  area.style.display = 'block';
  area.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
      <!-- 日本語 -->
      <div style="background: var(--color-surface); padding: var(--space-3); border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
        <h4 style="font-size: 0.9rem; margin-bottom: var(--space-2); color: var(--color-primary-dark);">🇯🇵 医中誌Web用（日本語）</h4>
        <div style="margin-bottom: var(--space-2);">
          <span style="font-size: 0.8rem; color: var(--color-text-muted);">推奨キーワード:</span><br>
          <span style="font-size: 0.9rem; font-weight: 500;">${(data.keywordsJa || []).join(', ')}</span>
        </div>
        <div>
          <span style="font-size: 0.8rem; color: var(--color-text-muted);">検索式（コピーして使えます）:</span>
          <textarea readonly class="input" style="font-family: monospace; font-size: 0.8rem; padding: var(--space-2); min-height: 60px; background: var(--color-bg); margin-top: var(--space-1); resize: none;" onclick="this.select()">${data.queryJa || ''}</textarea>
        </div>
      </div>
      
      <!-- 英語 -->
      <div style="background: var(--color-surface); padding: var(--space-3); border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
        <h4 style="font-size: 0.9rem; margin-bottom: var(--space-2); color: var(--color-primary-dark);">🌍 PubMed用（英語）</h4>
        <div style="margin-bottom: var(--space-2);">
          <span style="font-size: 0.8rem; color: var(--color-text-muted);">推奨キーワード:</span><br>
          <span style="font-size: 0.9rem; font-weight: 500;">${(data.keywordsEn || []).join(', ')}</span>
        </div>
        <div>
          <span style="font-size: 0.8rem; color: var(--color-text-muted);">検索式（コピーして使えます）:</span>
          <textarea readonly class="input" style="font-family: monospace; font-size: 0.8rem; padding: var(--space-2); min-height: 60px; background: var(--color-bg); margin-top: var(--space-1); resize: none;" onclick="this.select()">${data.queryEn || ''}</textarea>
        </div>
      </div>
    </div>
  `;
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
  const guidelineName = state.get('guideline.selected') || '';

  // チェックリストのメモ情報を収集
  const notes = state.get('guideline.notes') || {};
  const guidelineItems = getChecklistItems(guidelineName);
  let checklistSummary = '';
  if (guidelineItems.length > 0) {
    const filled = [];
    const unfilled = [];
    guidelineItems.forEach((item, i) => {
      const note = notes[i];
      if (note && note.trim()) {
        filled.push(`✓ ${item}: ${note.trim()}`);
      } else {
        unfilled.push(`□ ${item}`);
      }
    });
    if (filled.length > 0) {
      checklistSummary += `\n検討済みの項目:\n${filled.join('\n')}`;
    }
    if (unfilled.length > 0) {
      checklistSummary += `\n未検討の項目（文献レビューで補完が必要）:\n${unfilled.join('\n')}`;
    }
  }

  const userMsg = `
研究テーマ: ${theme}
リサーチクエスチョン: ${rqText}
研究の目的: ${purpose}
研究デザイン: ${design}
準拠ガイドライン: ${guidelineName}
重視するキーワード: ${review.keywords}
対象範囲: ${review.language}
重視する視点: ${review.context || '特定なし'}
${checklistSummary}
  `.trim();

  try {
    const response = await callAI(PROMPTS.literatureReview, userMsg, { module: 'literatureReview' });
    let parsed;
    try {
      const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = { structure: response };
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
  // 既存データ（全文やmatrix）の後方互換性も持たせる
  const content = data.structure || data.narrative || '';
  return `
    <div class="ai-response">
      <div class="ai-response-header">📖 背景と意義の論理構成案（設計図）</div>
      <div class="ai-response-body">
        <p class="text-muted" style="margin-bottom: var(--space-4); font-size: 0.9rem;">
          以下は検索した文献を使ってどのような順番で背景を記述するべきかの「構成案」です。これを参考に実際の文献を検索し、ご自身で文章を肉付けしてください。
        </p>
        <div class="academic-text" style="line-height: 1.8;">
          ${content.replace(/\n/g, '<br>')}
        </div>
      </div>
    </div>
  `;
}

export function validateStep4() {
  return !!state.get('review.aiResult');
}
