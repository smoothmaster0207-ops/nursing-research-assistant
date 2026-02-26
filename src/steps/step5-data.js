/**
 * step5-data.js — 収集可能データの選択式入力
 */

import { state } from '../state.js';

const DATA_TYPES = [
    { id: 'attributes', label: '基本属性（年齢・性別など）', icon: '👤' },
    { id: 'vitals', label: 'バイタルサイン', icon: '💓' },
    { id: 'labs', label: '検査値', icon: '🧪' },
    { id: 'scales', label: 'スケール（HADS, BIなど）', icon: '📏' },
    { id: 'observation', label: '観察記録', icon: '👁' },
    { id: 'interview', label: 'インタビュー', icon: '🎤' },
    { id: 'questionnaire', label: 'アンケート（Likert尺度）', icon: '📋' },
    { id: 'intervention', label: '介入有無', icon: '💊' },
    { id: 'timeseries', label: '時系列データ', icon: '📈' },
    { id: 'existing_db', label: '既存データベース利用', icon: '🗄' },
];

const GROUPING_OPTIONS = [
    { value: 'none', label: 'なし（単群）' },
    { value: '2groups', label: '2群（介入群・対照群）' },
    { value: '3groups', label: '3群以上' },
    { value: 'prepost', label: '前後比較' },
];

export function renderStep5(container) {
    const data = state.get('data');

    container.innerHTML = `
    <div class="fade-in">
      <h2 class="step-title">📊 Step 5：収集可能データの選択</h2>
      <p class="step-description">
        実際に収集可能なデータの種類を選択してください。次のステップで最適な分析方法を提案します。
      </p>

      <!-- Data Types -->
      <div class="card" style="margin-bottom: var(--space-6);">
        <h3 class="section-title">📁 1. データタイプ</h3>
        <p class="hint" style="margin-bottom: var(--space-4);">収集予定のデータをすべて選択してください（複数選択可）</p>
        <div class="checkbox-group" id="dataTypeGroup">
          ${DATA_TYPES.map(dt => `
            <label class="checkbox-item ${(data.types || []).includes(dt.id) ? 'checked' : ''}">
              <input type="checkbox" value="${dt.id}" ${(data.types || []).includes(dt.id) ? 'checked' : ''} />
              <span>${dt.icon} ${dt.label}</span>
            </label>
          `).join('')}
        </div>
      </div>

      <!-- Sample Size -->
      <div class="card" style="margin-bottom: var(--space-6);">
        <h3 class="section-title">👥 2. サンプル数（予定）</h3>
        <div class="form-group">
          <div style="display: flex; align-items: center; gap: var(--space-4);">
            <input type="number" id="sampleSize" class="input" style="max-width: 200px;"
                   placeholder="例：100" min="1"
                   value="${data.sampleSize || ''}" />
            <span class="hint">名（件）</span>
          </div>
          <p class="hint" style="margin-top: var(--space-2);">
            概算で構いません。正確なサンプルサイズはStep 6で計算を支援します。
          </p>
        </div>
      </div>

      <!-- Grouping -->
      <div class="card" style="margin-bottom: var(--space-6);">
        <h3 class="section-title">⚖️ 3. 群分け</h3>
        <div class="radio-group" id="groupingGroup">
          ${GROUPING_OPTIONS.map(opt => `
            <label class="radio-item ${data.grouping === opt.value ? 'checked' : ''}">
              <input type="radio" name="grouping" value="${opt.value}" ${data.grouping === opt.value ? 'checked' : ''} />
              ${opt.label}
            </label>
          `).join('')}
        </div>
      </div>

      <!-- Summary preview -->
      <div class="card card-highlight" id="dataSummaryPreview">
        <h3 class="section-title">📋 データ収集計画の概要</h3>
        <div id="dataSummaryContent">${renderDataSummary(data)}</div>
      </div>
    </div>
  `;

    // Event listeners
    container.querySelectorAll('#dataTypeGroup input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
            const checked = Array.from(container.querySelectorAll('#dataTypeGroup input:checked')).map(i => i.value);
            state.set('data.types', checked);
            container.querySelectorAll('#dataTypeGroup .checkbox-item').forEach(item => {
                item.classList.toggle('checked', item.querySelector('input').checked);
            });
            updateDataSummary();
        });
    });

    container.querySelector('#sampleSize').addEventListener('input', (e) => {
        state.set('data.sampleSize', e.target.value);
        updateDataSummary();
    });

    container.querySelectorAll('input[name="grouping"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.set('data.grouping', e.target.value);
            container.querySelectorAll('#groupingGroup .radio-item').forEach(item => {
                item.classList.toggle('checked', item.querySelector('input').checked);
            });
            updateDataSummary();
        });
    });
}

function updateDataSummary() {
    const data = state.get('data');
    const content = document.querySelector('#dataSummaryContent');
    if (content) {
        content.innerHTML = renderDataSummary(data);
    }

    // Update summary panel
    const sumData = document.querySelector('#sumData');
    if (sumData) {
        const types = data.types || [];
        if (types.length > 0) {
            const labels = types.map(t => DATA_TYPES.find(dt => dt.id === t)?.label.split('（')[0] || t);
            sumData.textContent = labels.join('、');
            sumData.classList.add('active');
        }
    }
}

function renderDataSummary(data) {
    const types = (data.types || []).map(t => DATA_TYPES.find(dt => dt.id === t));
    const groupLabel = GROUPING_OPTIONS.find(o => o.value === data.grouping)?.label || '未選択';

    if (types.length === 0 && !data.sampleSize && !data.grouping) {
        return '<p style="color: var(--color-text-muted);">データを選択すると、ここに概要が表示されます。</p>';
    }

    return `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
      <div>
        <strong>データタイプ（${types.length}種類）</strong>
        <ul style="margin-top: var(--space-2); padding-left: var(--space-5);">
          ${types.map(t => `<li>${t?.icon || ''} ${t?.label || ''}</li>`).join('') || '<li style="color: var(--color-text-muted);">未選択</li>'}
        </ul>
      </div>
      <div>
        <p><strong>サンプル数:</strong> ${data.sampleSize || '未入力'}</p>
        <p style="margin-top: var(--space-2);"><strong>群分け:</strong> ${groupLabel}</p>
      </div>
    </div>
  `;
}

export function validateStep5() {
    const data = state.get('data');
    return (data.types || []).length > 0 && data.grouping;
}
