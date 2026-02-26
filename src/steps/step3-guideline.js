/**
 * step3-guideline.js — ガイドライン選択ロジック
 */

import { state } from '../state.js';

const GUIDELINE_MAP = {
  '介入研究': { name: 'CONSORT', full: 'Consolidated Standards of Reporting Trials', desc: 'ランダム化比較試験(RCT)の報告基準' },
  '横断研究': { name: 'STROBE', full: 'Strengthening the Reporting of Observational Studies in Epidemiology', desc: '観察研究の報告基準' },
  '実態調査（記述研究/Descriptive Study）': { name: 'STROBE', full: 'Strengthening the Reporting of Observational Studies in Epidemiology', desc: '観察研究の報告基準' },
  '観察研究': { name: 'STROBE', full: 'Strengthening the Reporting of Observational Studies in Epidemiology', desc: '観察研究の報告基準' },
  'QI（質改善/Quality Improvement）': { name: 'SQUIRE 2.0', full: 'Standards for QUality Improvement Reporting Excellence', desc: '質改善研究の報告基準' },
  'QI（質改善）': { name: 'SQUIRE 2.0', full: 'Standards for QUality Improvement Reporting Excellence', desc: '質改善研究の報告基準' },
  '質的研究': { name: 'COREQ', full: 'Consolidated Criteria for Reporting Qualitative Research', desc: '質的研究の報告基準' },
  '探索的研究': { name: 'COREQ', full: 'Consolidated Criteria for Reporting Qualitative Research', desc: '質的研究の報告基準' },
  'スコーピングレビュー': { name: 'PRISMA-ScR', full: 'Preferred Reporting Items for Systematic reviews and Meta-Analyses extension for Scoping Reviews', desc: 'スコーピングレビューの報告基準' },
  'システマティックレビュー': { name: 'PRISMA 2020', full: 'Preferred Reporting Items for Systematic Reviews and Meta-Analyses', desc: 'システマティックレビュー・メタアナリシスの報告基準' },
  '混合研究法': { name: 'GRAMMS', full: 'Good Reporting of A Mixed Methods Study', desc: '混合研究法の報告基準' },
  '前後比較研究': { name: 'STROBE', full: 'Strengthening the Reporting of Observational Studies in Epidemiology', desc: '観察研究の報告基準' },
  '事例／実践報告': { name: 'CARE', full: 'CAse REport Guidelines', desc: '症例報告の報告基準' },
};

const CHECKLIST_ITEMS = {
  'CONSORT': [
    'タイトルに「ランダム化」を含む',
    '構造化された抄録',
    '科学的背景と根拠の説明',
    '具体的な目的・仮説',
    '試験デザインの記述',
    '適格基準の記述',
    'セッティングとデータ収集場所',
    '介入の詳細（再現可能な程度に）',
    '完全に定義されたアウトカム',
    'サンプルサイズの決定方法',
    'ランダム化の手順',
    '割付の隠蔽化',
    '盲検化の記述',
    '統計手法の記述',
    '参加者のフロー図',
    'ベースライン特性の表',
    '各群の結果（効果量と精度）',
    '有害事象の報告',
    '限界、一般化可能性、解釈',
    '試験登録番号',
  ],
  'STROBE': [
    '研究デザインの明示',
    'セッティング・期間・参加者',
    '変数の定義',
    'データソース・測定方法',
    'バイアスへの対処',
    'サンプルサイズの根拠',
    '統計手法の記述',
    '参加者の流れの記述',
    '記述的データの提示',
    '主要結果（粗結果と調整結果）',
    '主要所見の要約',
    '限界の考察',
    '一般化可能性',
    '資金源の開示',
  ],
  'SQUIRE 2.0': [
    'タイトルに質改善手法を明記',
    '背景と改善の必要性',
    '具体的な改善目標',
    '改善活動の文脈',
    '介入の理論的根拠',
    '倫理的側面の考慮',
    '改善方法のフレームワーク',
    '指標の定義',
    'プロセスとアウトカムの測定',
    '分析方法',
    '結果の記述（ランチャート等）',
    '考察と学びの共有',
  ],
  'COREQ': [
    '研究チームと反射性',
    '研究デザインの理論的枠組み',
    '参加者の選定方法',
    'セッティングの記述',
    'データ収集方法の詳細',
    'インタビューガイドの記述',
    'データの飽和',
    'データ分析方法',
    '信頼性と信用性の確保',
    '主要カテゴリまたはテーマ',
    '参加者の引用',
  ],
  'PRISMA-ScR': [
    'タイトルにスコーピングレビューを明記',
    'レビューの目的・RQ',
    '適格基準',
    '情報源とデータベース',
    '検索戦略',
    'スクリーニングプロセス',
    'データの抽出方法',
    '結果の要約',
    'エビデンスのマッピング',
  ],
  'PRISMA 2020': [
    '構造化された抄録',
    '登録番号・プロトコル',
    '適格基準',
    '情報源',
    '検索戦略',
    '研究の選択プロセス',
    'データ抽出プロセス',
    'バイアスリスク評価',
    'エビデンスの確実性',
    '結果の統合方法',
    'フロー図の提示',
  ],
  'GRAMMS': [
    '混合研究法の根拠',
    '研究デザインの記述',
    '量的・質的研究の各方法',
    '統合のタイミングと方法',
    '各要素の限界',
    '統合から得られた洞察',
  ],
  'CARE': [
    '患者情報・背景',
    '臨床所見',
    'タイムライン',
    '診断的評価',
    '治療介入',
    'フォローアップと転帰',
    '考察（学びのポイント）',
  ],
};

export function renderStep3(container) {
  const design = state.get('rq.selectedDesign') || '';
  const guideline = findGuideline(design);

  if (guideline) {
    state.set('guideline.selected', guideline.name);
  }

  const items = CHECKLIST_ITEMS[guideline?.name] || [];
  const checkedItems = state.get('guideline.checklist') || [];

  container.innerHTML = `
    <div class="fade-in">
      <h2 class="step-title">📑 Step 3：ガイドライン選択</h2>
      <p class="step-description">
        研究デザインに基づいて、準拠すべき報告ガイドラインを自動選択しました。
        チェックリストを確認し、計画に反映してください。
      </p>

      <!-- Guideline mapping table -->
      <div class="card" style="margin-bottom: var(--space-6);">
        <h3 class="section-title">📊 研究タイプとガイドライン対応表</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>研究タイプ</th>
              <th>準拠ガイドライン</th>
            </tr>
          </thead>
          <tbody>
            ${[
      ['介入研究', 'CONSORT'],
      ['観察研究', 'STROBE'],
      ['QI（質改善）', 'SQUIRE 2.0'],
      ['質的研究', 'COREQ'],
      ['スコーピングレビュー', 'PRISMA-ScR'],
      ['システマティックレビュー', 'PRISMA 2020'],
      ['混合研究法', 'GRAMMS'],
      ['事例／実践報告', 'CARE'],
    ].map(([type, gl]) => `
              <tr style="${guideline?.name === gl ? 'background: var(--color-primary-bg); font-weight: 600;' : ''}">
                <td>${type}</td>
                <td>${gl} ${guideline?.name === gl ? '<span class="tag tag-primary">選択中</span>' : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      ${guideline ? `
        <div class="guideline-card">
          <div class="guideline-card-header">
            <h3>${guideline.name}</h3>
            <p>${guideline.full}</p>
            <p style="margin-top: var(--space-2); font-size: var(--font-size-xs);">${guideline.desc}</p>
          </div>
          <div class="checklist" id="guidelineChecklist">
            <h4 style="padding: var(--space-3) 0; font-weight: 700;">チェックリスト</h4>
            ${items.map((item, i) => `
              <div class="checklist-item">
                <div class="checklist-check ${checkedItems.includes(i) ? 'checked' : ''}" data-index="${i}">
                  ${checkedItems.includes(i) ? '✓' : ''}
                </div>
                <span>${item}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : `
        <div class="card" style="text-align: center; padding: var(--space-12);">
          <p style="color: var(--color-text-muted);">研究デザインを選択してからこのステップに進んでください。</p>
        </div>
      `}
    </div>
  `;

  // Update summary
  if (guideline) {
    const sumGL = document.querySelector('#sumGuideline');
    if (sumGL) {
      sumGL.textContent = guideline.name;
      sumGL.classList.add('active');
    }
  }

  // Checklist interactions
  container.querySelectorAll('.checklist-check').forEach(checkEl => {
    checkEl.addEventListener('click', () => {
      const idx = parseInt(checkEl.dataset.index);
      let checked = state.get('guideline.checklist') || [];
      if (checked.includes(idx)) {
        checked = checked.filter(i => i !== idx);
        checkEl.classList.remove('checked');
        checkEl.textContent = '';
      } else {
        checked.push(idx);
        checkEl.classList.add('checked');
        checkEl.textContent = '✓';
      }
      state.set('guideline.checklist', checked);
    });
  });
}

function findGuideline(design) {
  if (!design) return null;
  // Try exact match first
  if (GUIDELINE_MAP[design]) return GUIDELINE_MAP[design];
  // Try partial match
  for (const [key, value] of Object.entries(GUIDELINE_MAP)) {
    if (design.includes(key) || key.includes(design)) return value;
  }
  // Default to STROBE for unrecognized designs
  return GUIDELINE_MAP['横断研究'];
}

export function validateStep3() {
  return !!state.get('guideline.selected');
}
