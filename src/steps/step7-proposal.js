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

  // 既存の結果がある場合、ボタンのイベントリスナーを設定
  if (proposal.draft) {
    attachExportListeners(proposal.draft);
  }
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
      <p><strong>テーマ:</strong> ${refined ? (refined.theme || refined.rq || refined.title || '未整理').substring(0, 80) : '未整理'}</p>
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
${seed.refinedResult?.theme || seed.refinedResult?.title || ''}

【リサーチクエスチョン】
${seed.refinedResult?.rq || seed.question || ''}

【研究デザイン】
${rq.selectedDesign || ''}

【研究の骨子】
対象: ${seed.refinedResult?.target || '未整理'}
ゴール: ${seed.refinedResult?.goal || '未整理'}
アプローチ: ${(seed.refinedResult?.approaches || []).map(a => `${a.name}: ${a.description}`).join('\n')}

【準拠ガイドライン】
${guideline.selected || ''}

【文献レビュー概要（論理構成案）】
${review.aiResult?.structure || '未実施'}

【データ収集計画】
データタイプ: ${(data.types || []).join(', ')}
サンプルサイズ: ${data.sampleSize || '未定'}
群分け: ${data.grouping || '未定'}

【分析方法】
主解析: ${analysis.aiResult?.primaryAnalysis?.method || '未提案'}
理由: ${analysis.aiResult?.primaryAnalysis?.reason || ''}
副解析: ${(analysis.aiResult?.secondaryAnalyses || []).map(s => s.method).join(', ')}
効果量: ${analysis.aiResult?.effectSize || ''}
多変量解析: ${analysis.aiResult?.multivariateNeeded ? analysis.aiResult?.multivariateMethod : '不要'}
サンプルサイズ根拠: ${analysis.aiResult?.sampleSizeNote || ''}
  `.trim();

  try {
    const response = await callAI(PROMPTS.proposalDraft, userMsg, {
      module: 'proposalDraft',
      maxTokens: 8000,
    });
    state.set('proposal.draft', response);
    document.querySelector('#step7Results').innerHTML = renderProposal(response);
    attachExportListeners(response);
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

    <div class="export-actions" style="display: flex; gap: var(--space-3); flex-wrap: wrap; margin-top: var(--space-4);">
      <button class="btn btn-success" id="btnCopyProposal">
        📋 テキストをコピー
      </button>
      <button class="btn btn-primary" id="btnDownloadWord">
        📄 Word形式でダウンロード
      </button>
      <button class="btn btn-outline" id="btnDownloadPDF">
        📑 PDF形式でダウンロード
      </button>
    </div>
  `;
}

function attachExportListeners(draft) {
  // コピー
  const btnCopy = document.querySelector('#btnCopyProposal');
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      navigator.clipboard.writeText(draft).then(() => {
        btnCopy.textContent = '✅ コピーしました';
        setTimeout(() => { btnCopy.textContent = '📋 テキストをコピー'; }, 2000);
      }).catch(() => {
        // Fallback for clipboard API failure
        const ta = document.createElement('textarea');
        ta.value = draft;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        btnCopy.textContent = '✅ コピーしました';
        setTimeout(() => { btnCopy.textContent = '📋 テキストをコピー'; }, 2000);
      });
    });
  }

  // Word形式ダウンロード（.doc形式のHTML）
  const btnWord = document.querySelector('#btnDownloadWord');
  if (btnWord) {
    btnWord.addEventListener('click', () => {
      downloadAsWord(draft);
    });
  }

  // PDF形式ダウンロード（ブラウザ印刷）
  const btnPDF = document.querySelector('#btnDownloadPDF');
  if (btnPDF) {
    btnPDF.addEventListener('click', () => {
      downloadAsPDF(draft);
    });
  }
}

function downloadAsWord(draft) {
  // Markdown → HTML変換
  const htmlBody = draft
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  const wordContent = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'ＭＳ 明朝', 'Yu Mincho', serif;
      font-size: 10.5pt;
      line-height: 1.8;
      margin: 2cm 2.5cm;
    }
    h1 {
      font-size: 16pt;
      text-align: center;
      margin-bottom: 24pt;
      border-bottom: none;
    }
    h2 {
      font-size: 13pt;
      margin-top: 18pt;
      margin-bottom: 6pt;
      border-bottom: 1px solid #333;
      padding-bottom: 3pt;
    }
    h3 {
      font-size: 11pt;
      margin-top: 12pt;
      margin-bottom: 4pt;
    }
    p {
      text-indent: 1em;
      margin: 0 0 6pt 0;
    }
    li {
      margin-left: 2em;
      margin-bottom: 3pt;
    }
  </style>
</head>
<body>
  ${htmlBody}
</body>
</html>`;

  const blob = new Blob(['\ufeff' + wordContent], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const theme = (state.get('seed')?.refinedResult?.theme || state.get('seed')?.refinedResult?.rq || '研究計画書').substring(0, 30);
  a.href = url;
  a.download = `研究計画書草案_${theme}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadAsPDF(draft) {
  // 印刷用ウィンドウを生成してPDF出力
  const htmlBody = draft
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>研究計画書草案</title>
  <style>
    @page {
      size: A4;
      margin: 2cm 2.5cm;
    }
    body {
      font-family: 'Hiragino Mincho ProN', 'Yu Mincho', 'ＭＳ 明朝', serif;
      font-size: 10.5pt;
      line-height: 1.8;
      color: #000;
    }
    h1 {
      font-size: 16pt;
      text-align: center;
      margin-bottom: 24pt;
    }
    h2 {
      font-size: 13pt;
      margin-top: 18pt;
      margin-bottom: 6pt;
      border-bottom: 1px solid #333;
      padding-bottom: 3pt;
    }
    h3 {
      font-size: 11pt;
      margin-top: 12pt;
      margin-bottom: 4pt;
    }
    p {
      text-indent: 1em;
      margin: 0 0 6pt 0;
    }
    li {
      margin-left: 2em;
      margin-bottom: 3pt;
    }
  </style>
</head>
<body>
  ${htmlBody}
</body>
</html>`);
  printWindow.document.close();
  // 少し待ってから印刷ダイアログを表示
  setTimeout(() => {
    printWindow.print();
  }, 500);
}

export function validateStep7() {
  return !!state.get('proposal.draft');
}
