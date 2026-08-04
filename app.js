const KEY = 'txa-v20-history';
let history = safeReadHistory();

const $ = (id) => document.getElementById(id);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const sideName = (value) => value === 1 ? 'TÀI' : value === 0 ? 'XỈU' : 'TRUNG LẬP';
const sideClass = (value) => value === 1 ? 'tai' : value === 0 ? 'xiu' : 'neutral';
const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0.5;
const recent = (values, count) => values.slice(-Math.min(count, values.length));

function safeReadHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((value) => value === 0 || value === 1) : [];
  } catch {
    return [];
  }
}

function entropy(values) {
  if (!values.length) return 1;
  const probability = mean(values);
  if (probability === 0 || probability === 1) return 0;
  return -(probability * Math.log2(probability) + (1 - probability) * Math.log2(1 - probability));
}

function autocorr(values) {
  if (values.length < 4) return 0;
  const average = mean(values);
  let numerator = 0;
  let denominator = 0;
  for (let index = 1; index < values.length; index += 1) {
    numerator += (values[index] - average) * (values[index - 1] - average);
  }
  for (const value of values) denominator += (value - average) ** 2;
  return denominator ? numerator / denominator : 0;
}

function runInfo(values) {
  if (!values.length) return { current: 0, max: 0, side: null };
  let max = 1;
  let current = 1;
  for (let index = 1; index < values.length; index += 1) {
    current = values[index] === values[index - 1] ? current + 1 : 1;
    max = Math.max(max, current);
  }
  let tail = 1;
  for (let index = values.length - 1; index > 0 && values[index] === values[index - 1]; index -= 1) tail += 1;
  return { current: tail, max, side: values.at(-1) };
}

function runsZ(values) {
  const n1 = values.filter(Boolean).length;
  const n0 = values.length - n1;
  if (n1 === 0 || n0 === 0 || values.length < 4) return 0;
  let runs = 1;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] !== values[index - 1]) runs += 1;
  }
  const expected = 1 + (2 * n1 * n0) / (n1 + n0);
  const variance = (2 * n1 * n0 * (2 * n1 * n0 - n1 - n0)) / (((n1 + n0) ** 2) * (n1 + n0 - 1));
  return variance > 0 ? (runs - expected) / Math.sqrt(variance) : 0;
}

function markov(values, order = 1) {
  if (values.length < order + 3) return 0.5;
  const key = values.slice(-order).join('');
  let tai = 0;
  let count = 0;
  for (let index = order; index < values.length; index += 1) {
    if (values.slice(index - order, index).join('') === key) {
      tai += values[index];
      count += 1;
    }
  }
  return count ? tai / count : 0.5;
}

function patternScore(values) {
  for (const length of [2, 3, 4]) {
    if (values.length < length * 2 + 2) continue;
    const pattern = values.slice(-length).join('');
    let tai = 0;
    let count = 0;
    for (let index = length; index < values.length; index += 1) {
      if (values.slice(index - length, index).join('') === pattern) {
        tai += values[index];
        count += 1;
      }
    }
    if (count >= 2) return tai / count;
  }
  return 0.5;
}

function alternation(values) {
  const window = recent(values, 8);
  if (window.length < 4) return 0.5;
  let changes = 0;
  for (let index = 1; index < window.length; index += 1) {
    if (window[index] !== window[index - 1]) changes += 1;
  }
  const rate = changes / (window.length - 1);
  return rate > 0.7 ? 1 - window.at(-1) : rate < 0.3 ? window.at(-1) : 0.5;
}

function runModel(values) {
  const run = runInfo(values);
  if (!values.length) return 0.5;
  if (run.current >= 4) return 1 - run.side;
  if (run.current === 2 || run.current === 3) return run.side;
  return 0.5;
}

function bayes(values) {
  const window = recent(values, 30);
  return (window.reduce((sum, value) => sum + value, 0) + 1) / (window.length + 2);
}

function windowBlend(values) {
  return 0.5 * mean(recent(values, 5)) + 0.3 * mean(recent(values, 10)) + 0.2 * mean(recent(values, 20));
}

function changePoint(values) {
  if (values.length < 12) return 0;
  const midpoint = Math.floor(values.length / 2);
  return Math.abs(mean(values.slice(0, midpoint)) - mean(values.slice(midpoint)));
}

function trend(values) {
  const window = recent(values, 20);
  if (window.length < 6) return 0.5;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let index = 0; index < window.length; index += 1) {
    sumX += index;
    sumY += window[index];
    sumXY += index * window[index];
    sumXX += index * index;
  }
  const count = window.length;
  const slope = (count * sumXY - sumX * sumY) / (count * sumXX - sumX * sumX || 1);
  return clamp(0.5 + slope * 2, 0, 1);
}

function contrarian(values) {
  return clamp(1 - mean(recent(values, 10)), 0, 1);
}

function momentum(values) {
  const window = recent(values, 6);
  if (!window.length) return 0.5;
  return 0.65 * mean(window) + 0.35 * (window.at(-1) ?? 0.5);
}

function noiseGate(values, probability) {
  const value = entropy(recent(values, 30));
  return 0.5 + (probability - 0.5) * (1.15 - value * 0.45);
}

function models(values) {
  const definitions = [
    ['Tần suất 20', mean(recent(values, 20)), 'Tỷ lệ Tài trong cửa sổ 20 ván'],
    ['Bayesian', bayes(values), 'Làm mượt xác suất bằng prior Beta(1,1)'],
    ['Markov bậc 1', markov(values, 1), 'Chuyển trạng thái theo 1 ván gần nhất'],
    ['Markov bậc 2', markov(values, 2), 'Chuyển trạng thái theo 2 ván gần nhất'],
    ['Mẫu lặp', patternScore(values), 'Tìm mẫu 2–4 bước đã xuất hiện'],
    ['Đa khung', windowBlend(values), 'Kết hợp cửa sổ 5, 10 và 20'],
    ['Bệt', runModel(values), 'Đánh giá độ dài chuỗi liên tiếp'],
    ['Đảo nhịp', alternation(values), 'Đánh giá mức luân phiên Tài/Xỉu'],
    ['Xu hướng', trend(values), 'Độ dốc của chuỗi gần đây'],
    ['Động lượng', momentum(values), 'Ưu tiên dữ liệu gần nhất'],
    ['Phản xu hướng', contrarian(values), 'Đối trọng khi phân bố lệch mạnh'],
    ['Entropy gate', noiseGate(values, windowBlend(values)), 'Giảm biên độ khi dữ liệu nhiễu cao']
  ];

  return definitions.map(([name, probability, description]) => ({
    name,
    probability: clamp(probability, 0, 1),
    description,
    side: probability > 0.545 ? 1 : probability < 0.455 ? 0 : null,
    confidence: Math.abs(probability - 0.5) * 200
  }));
}

function checksum(values) {
  let hash = 2166136261;
  for (const value of values) {
    hash ^= value + 48;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

function analyze() {
  const modelList = models(history);
  const usable = history.length >= 8;
  const weighted = modelList.reduce((sum, model) => sum + (model.probability - 0.5) * (0.5 + model.confidence / 100), 0);
  const denominator = modelList.reduce((sum, model) => sum + (0.5 + model.confidence / 100), 0);
  const probability = clamp(0.5 + weighted / denominator, 0.05, 0.95);
  const taiVotes = modelList.filter((model) => model.side === 1).length;
  const xiuVotes = modelList.filter((model) => model.side === 0).length;
  const maxVotes = Math.max(taiVotes, xiuVotes);
  const stability = clamp(Math.round((1 - entropy(recent(history, 30)) * 0.45 - Math.min(changePoint(history), 0.5) * 0.4) * 100), 0, 100);

  let decision = null;
  if (usable && Math.abs(probability - 0.5) >= 0.055 && maxVotes >= 5) decision = probability > 0.5 ? 1 : 0;

  const deviation = Math.abs(probability - 0.5);
  const confidence = decision === null ? 'CHƯA ĐỦ DỮ LIỆU' : deviation >= 0.18 ? 'CAO' : deviation >= 0.1 ? 'TRUNG BÌNH' : 'THẤP';
  render(modelList, { probability, taiVotes, xiuVotes, maxVotes, stability, decision, confidence });
}

function render(modelList, result) {
  const score = Math.round(result.probability * 100);
  $('decision').textContent = result.decision === null ? 'CHƯA RÕ' : sideName(result.decision);
  $('decision').className = `decision ${sideClass(result.decision)}`;
  $('confidenceText').textContent = result.confidence;
  $('score').textContent = String(score);
  $('signalMarker').style.left = `${score}%`;
  $('consensus').textContent = `${result.maxVotes}/12`;
  $('stability').textContent = `${history.length ? result.stability : 0}%`;

  const trendValue = trend(history);
  $('trendIcon').textContent = history.length < 6 ? '—' : trendValue > 0.56 ? '↗' : trendValue < 0.44 ? '↘' : '→';
  $('trendIcon').setAttribute('aria-label', history.length < 6 ? 'Chưa đủ dữ liệu' : trendValue > 0.56 ? 'Tăng' : trendValue < 0.44 ? 'Giảm' : 'Đi ngang');

  $('countBadge').textContent = `${history.length} ván`;
  const visibleHistory = recent(history, 20);
  $('history').innerHTML = visibleHistory.length
    ? visibleHistory.map((value, index) => `<span class="chip ${value ? 'tai' : 'xiu'}" title="Ván ${history.length - visibleHistory.length + index + 1}: ${sideName(value)}">${value ? 'T' : 'X'}</span>`).join('')
    : '<p class="empty-history">Chưa có dữ liệu</p>';

  $('warning').textContent = history.length < 8
    ? 'Chỉ phân tích dữ liệu lịch sử. Cần thêm dữ liệu để đánh giá tín hiệu.'
    : 'Chỉ phân tích dữ liệu lịch sử. Không bảo đảm kết quả của ván tiếp theo.';

  $('taiCount').textContent = String(history.filter(Boolean).length);
  $('xiuCount').textContent = String(history.filter((value) => !value).length);
  const run = runInfo(history);
  $('currentRun').textContent = run.side === null ? '—' : `${sideName(run.side)} ×${run.current}`;
  $('maxRun').textContent = history.length ? String(run.max) : '—';
  $('entropy').textContent = history.length ? entropy(recent(history, 30)).toFixed(3) : '—';
  $('autocorr').textContent = history.length ? autocorr(recent(history, 30)).toFixed(3) : '—';

  const window = recent(history, 20);
  const taiPercent = window.length ? Math.round(mean(window) * 100) : 50;
  const xiuPercent = 100 - taiPercent;
  $('taiPct').textContent = `${taiPercent}%`;
  $('xiuPct').textContent = `${xiuPercent}%`;
  $('taiBar').style.width = `${taiPercent}%`;
  $('xiuBar').style.width = `${xiuPercent}%`;
  $('windowLabel').textContent = `${window.length} ván`;

  $('models').innerHTML = modelList.map((model) => `
    <article class="model">
      <div class="model-head">
        <h4>${model.name}</h4>
        <span class="vote ${sideClass(model.side)}">${sideName(model.side)}</span>
      </div>
      <small>${model.description} · Điểm Tài ${Math.round(model.probability * 100)}%</small>
    </article>
  `).join('');

  $('runsZ').textContent = history.length ? runsZ(history).toFixed(2) : '—';
  const point = changePoint(history);
  $('changePoint').textContent = history.length < 12 ? '—' : point.toFixed(3);
  $('noise').textContent = history.length < 6 ? '—' : entropy(recent(history, 30)) > 0.92 ? 'Cao' : entropy(recent(history, 30)) > 0.75 ? 'Trung bình' : 'Thấp';
  $('sampleQuality').textContent = history.length >= 50 ? 'Tốt' : history.length >= 20 ? 'Khá' : history.length >= 8 ? 'Cơ bản' : 'Thiếu';
  $('checksum').textContent = checksum(history);

  $('undo').disabled = history.length === 0;
  $('clear').disabled = history.length === 0;
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(history));
  analyze();
}

function setPanel(open) {
  $('settingsPanel').hidden = !open;
  $('settingsBackdrop').hidden = !open;
  document.body.classList.toggle('modal-open', open);
  if (open) {
    $('closeSettings').focus();
  } else {
    $('openSettings').focus();
  }
}

function setConfirm(open) {
  $('confirmModal').hidden = !open;
  document.body.classList.toggle('modal-open', open);
  if (open) $('cancelClear').focus();
}

function download(name, text, type = 'text/plain') {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type }));
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 500);
}

$('addTai').addEventListener('click', () => { history.push(1); save(); });
$('addXiu').addEventListener('click', () => { history.push(0); save(); });
$('undo').addEventListener('click', () => { history.pop(); save(); });
$('clear').addEventListener('click', () => { if (history.length) setConfirm(true); });
$('cancelClear').addEventListener('click', () => setConfirm(false));
$('confirmClear').addEventListener('click', () => { history = []; save(); setConfirm(false); });

$('openSettings').addEventListener('click', () => setPanel(true));
$('closeSettings').addEventListener('click', () => setPanel(false));
$('settingsBackdrop').addEventListener('click', () => setPanel(false));

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!$('confirmModal').hidden) setConfirm(false);
  else if (!$('settingsPanel').hidden) setPanel(false);
});

$('exportCsv').addEventListener('click', () => {
  download('txa-v20-history.csv', `van,ket_qua\n${history.map((value, index) => `${index + 1},${sideName(value)}`).join('\n')}`, 'text/csv;charset=utf-8');
});

$('exportJson').addEventListener('click', () => {
  download('txa-v20-backup.json', JSON.stringify({ version: 'V20 Focus', exportedAt: new Date().toISOString(), history }, null, 2), 'application/json');
});

$('audit').addEventListener('click', () => {
  const rows = models(history).map((model) => `${model.name},${model.probability.toFixed(4)},${sideName(model.side)},${model.confidence.toFixed(1)}`);
  download('txa-v20-audit.csv', `model,p_tai,vote,confidence\n${rows.join('\n')}`, 'text/csv;charset=utf-8');
});

$('importJson').addEventListener('change', async (event) => {
  try {
    const file = event.target.files?.[0];
    if (!file) return;
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.history) || data.history.some((value) => value !== 0 && value !== 1)) throw new Error('invalid');
    history = data.history;
    save();
  } catch {
    alert('Tệp JSON không hợp lệ.');
  } finally {
    event.target.value = '';
  }
});

$('runMonte').addEventListener('click', () => {
  const probability = windowBlend(history);
  let tai = 0;
  for (let index = 0; index < 10000; index += 1) if (Math.random() < probability) tai += 1;
  $('mcTai').textContent = `${(tai / 100).toFixed(1)}%`;
  $('mcXiu').textContent = `${((10000 - tai) / 100).toFixed(1)}%`;
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

analyze();
