/* TXA V21 application: local, offline, no API and no automated wagering. */
'use strict';
const E=window.TXAEngine;
const R=window.TXARisk;
const $=id=>document.getElementById(id);
const STORAGE='txa-v21-state';
const LEGACY='txa-v20-history';
const MODE='txa-v21-mode';
const MAX_HISTORY=3000;
const fmt=v=>`${Math.round(v).toLocaleString('vi-VN')}đ`;
const signed=v=>(v>0?'+':'')+fmt(v);
const pct=p=>p===null?'—':(p*100).toFixed(1)+'%';
const range=t=>t.signals?`${pct(t.ci.lower)} – ${pct(t.ci.upper)}`:'—';
const nameSide=v=>E.sideName(v);
const sideClass=v=>v===1?'tai':v===0?'xiu':'neutral';
function readJSON(key) {try {return JSON.parse(localStorage.getItem(key));}catch{return null;}}
function cleanHistory(v){return Array.isArray(v)&&v.length<=MAX_HISTORY&&v.every(x=>x===0||x===1)?v.slice():null;}
function cleanLive(v,h){
  if(!Array.isArray(v))return [];
  return v.filter(r=>r&&Number.isInteger(r.index)&&r.index>=0&&r.index<h.length&&(r.pred===null||r.pred===0||r.pred===1)&&(r.actual===0||r.actual===1)&&r.actual===h[r.index]).slice(-MAX_HISTORY).map(r=>({index:r.index,pred:r.pred,actual:r.actual,at:String(r.at||'')}));
}
function cleanLog(v){
  if(!v||typeof v!=='object'||typeof v.day!=='string'||v.initial!==R.DEFAULTS.initial||!Array.isArray(v.sessions)||v.sessions.length>10)return null;
  for(const s of v.sessions){
    if(!s||typeof s.startedAt!=='string'||(s.closedAt!==null&&typeof s.closedAt!=='string')||!Array.isArray(s.cycles)||s.cycles.length>200||s.cycles.some(c=>!c||!['win','loss'].includes(c.outcome)||typeof c.at!=='string'))return null;
  }
  return JSON.parse(JSON.stringify(v));
}
const saved=readJSON(STORAGE);
let outcomes=cleanHistory(saved?.history)||cleanHistory(readJSON(LEGACY))||[];
let liveRecords=cleanLive(saved?.liveRecords,outcomes);
let paper=cleanLog(saved?.paper)||R.newLog();
let backtest=null;
function save(){
  try{localStorage.setItem(STORAGE,JSON.stringify({version:'V21',history:outcomes,liveRecords,paper}));}
  catch(e){alert('Không lưu được trên thiết bị: '+e.message);}
}
function download(filename,content,type='text/plain;charset=utf-8'){
  const url=URL.createObjectURL(new Blob(['\ufeff',content],{type}));
  const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function displayHistory(){
  const recent=outcomes.slice(-150),offset=outcomes.length-recent.length;
  $('history').innerHTML=recent.map((v,i)=>`<span class="chip ${sideClass(v)}" title="Ván ${offset+i+1}">${v?'T':'X'}</span>`).join('');
  $('countBadge').textContent=`${outcomes.length} ván`;
}
function renderAnalysis(){
  const f=E.forecast(outcomes),d=E.descriptive(outcomes);
  const live=E.summarizeLive(liveRecords);
  const proved=live.signals>=100&&live.ci.lower>.5;
  const show=f.decision!==null&&proved;
  $('decision').textContent=show?nameSide(f.decision):f.decision===null?'CHƯA RÕ':'CHƯA ĐỦ BẰNG CHỨNG';
  $('decision').className='decision '+sideClass(show?f.decision:null);
  $('rawSignal').textContent=f.decision===null?'12 mô hình chưa đồng thuận đủ để đưa ra nhận định.':`Mức nghiêng lịch sử: ${nameSide(f.decision)}. ${proved?'Có tín hiệu kiểm chứng, nhưng không bảo đảm ván kế.':'Đây là nhận định THỬ NGHIỆM; chưa đủ xác thực thực tế.'}`;
  $('strength').textContent=f.strength;
  $('consensus').textContent=`${f.maxVotes}/12`;
  $('score').textContent=`${Math.round(f.p*100)}/100`;
  $('stability').textContent=`${f.stab}%`;
  $('warning').textContent='Điểm mô hình KHÔNG phải xác suất thắng. Không dùng chuỗi cược gấp đôi để suy luận có lợi thế hoặc bảo đảm lợi nhuận.';
  $('taiCount').textContent=d.tai;$('xiuCount').textContent=d.xiu;
  $('currentRun').textContent=d.run.side===null?'—':`${nameSide(d.run.side)} ×${d.run.current}`;
  $('maxRun').textContent=d.run.max||'—';
  $('entropy').textContent=outcomes.length?d.entropy.toFixed(3):'—';
  $('autocorr').textContent=outcomes.length?d.autocorr.toFixed(3):'—';
  const w=E.recent(outcomes,20),tp=w.length?Math.round(E.mean(w)*100):50;
  $('taiPct').textContent=`${tp}%`;$('xiuPct').textContent=`${100-tp}%`;
  $('taiBar').style.width=`${tp}%`;$('xiuBar').style.width=`${100-tp}%`;
  $('windowLabel').textContent=`${w.length} ván`;
  $('models').innerHTML=f.models.map(m=>`<article class="model"><div class="model-head"><h3>${m.name}</h3><span class="vote ${sideClass(m.side)}">${nameSide(m.side)}</span></div><small>${m.desc}<br>Điểm mô hình Tài: ${Math.round(m.p*100)} /100</small></article>`).join('');
  $('runsZ').textContent=outcomes.length?d.runsZ.toFixed(2):'—';
  $('changePoint').textContent=outcomes.length<12?'—':d.changePoint.toFixed(3);
  $('noise').textContent=outcomes.length<6?'—':d.entropy>.92?'Cao':d.entropy>.75?'Trung bình':'Thấp';
  $('sampleQuality').textContent=outcomes.length>=100?'Đủ để kiểm tra sơ bộ':outcomes.length>=30?'Ít':outcomes.length>=8?'Rất ít':'Thiếu';
  $('checksum').textContent=d.checksum;
  displayHistory();
}
function renderValidation(){
  backtest=E.validateChronological(outcomes,30);
  const b=backtest.overall,live=E.summarizeLive(liveRecords);
  $('oosTotal').textContent=backtest.total.toLocaleString('vi-VN');
  $('oosSignals').textContent=b.signals.toLocaleString('vi-VN');
  $('oosHit').textContent=b.signals?`${b.correct}/${b.signals} (${pct(b.rate)})`:'—';
  $('oosCI').textContent=range(b);
  $('liveSignals').textContent=live.signals.toLocaleString('vi-VN');
  $('liveAccuracy').textContent=live.signals?`${live.correct}/${live.signals} (${pct(live.rate)})`:'—';
  $('liveCI').textContent=range(live);
  $('backtestStatus').textContent=live.signals>=100?'Đã đủ 100 tín hiệu':'Chưa đủ 100 tín hiệu trực tiếp';
  const el=$('validationMsg');el.className='notice';
  if(outcomes.length<31){el.textContent='Cần ít nhất 31 kết quả lịch sử để có một dự đoán kiểm thử (30 ván trước + 1 kết quả).';}
  else if(live.signals<100){el.textContent=`Chỉ mới có ${live.signals}/100 tín hiệu trực tiếp. Tỷ lệ đúng trên lịch sử (${pct(b.rate)}) chưa đủ để xác nhận hiệu quả ngoài thực tế.`;}
  else if(live.ci.lower>.5){el.classList.add('good');el.textContent=`Tín hiệu trực tiếp có tỷ lệ đúng ${pct(live.rate)}; cận dưới Wilson 95% ${pct(live.ci.lower)} > 50%. Chỉ là bằng chứng thống kê sơ bộ, có thể bị sai lệch chọn mẫu và chưa chứng minh tính bền vững.`;}
  else{el.classList.add('bad');el.textContent=`Đã có ${live.signals} tín hiệu trực tiếp, nhưng cận dưới Wilson 95% là ${pct(live.ci.lower)}, chưa vượt 50%. Không có cơ sở khẳng định lợi thế khi trả thưởng 1:1.`;}
  $('modelTable').innerHTML=backtest.perModel.map(m=>`<tr><td>${m.name}</td><td>${m.signals}</td><td>${pct(m.rate)}</td><td>${range(m)}</td></tr>`).join('');
  $('liveHistory').innerHTML=liveRecords.slice(-25).reverse().map(r=>`<tr><td>${r.index+1}</td><td>${r.pred===null?'Không phát':nameSide(r.pred)}</td><td>${nameSide(r.actual)}</td><td>${r.pred===null?'—':r.pred===r.actual?'Đúng':'Sai'}</td></tr>`).join('')||'<tr><td colspan="4">Chưa có dự đoán được ghi nhận trực tiếp.</td></tr>';
}
function addOutcome(side){
  if(outcomes.length>=MAX_HISTORY){alert(`Đã đạt giới hạn ${MAX_HISTORY} ván. Xuất bản sao trước khi xóa lịch sử.`);return;}
  const pred=E.forecast(outcomes);
  const index=outcomes.length;
  outcomes.push(side);
  if(index>=8)liveRecords.push({index,pred:pred.decision,actual:side,at:new Date().toISOString()});
  save();renderValidation();renderAnalysis();
}
$('addTai').onclick=()=>addOutcome(1);
$('addXiu').onclick=()=>addOutcome(0);
$('undo').onclick=()=>{if(!outcomes.length)return;const index=outcomes.length-1;outcomes.pop();liveRecords=liveRecords.filter(r=>r.index!==index);save();renderValidation();renderAnalysis();};
$('clear').onclick=()=>{if(confirm('Xóa toàn bộ lịch sử Tài/Xỉu và nhật ký kiểm chứng trực tiếp? Dashboard vốn ảo sẽ được giữ.')){outcomes=[];liveRecords=[];save();renderValidation();renderAnalysis();}};
function reasonName(reason){return ({'daily-target':'Đạt +30k ngày','session-target':'Đạt +15k phiên','five-loss-cycles':'Thua 5 chu kỳ','insufficient-capital':'Thiếu vốn cho chuỗi','manual':'Đóng thủ công'})[reason]||'Đang mở';}
function renderTracker(){
  const s=R.summary(paper);const total=paper.sessions.length;const last=s.active||paper.sessions.at(-1);
  $('trackDay').textContent=paper.day;
  $('virtualBank').textContent=fmt(s.bankroll);
  $('virtualProfit').textContent=signed(s.pnl);
  $('virtualProfit').className=s.pnl>0?'positive':s.pnl<0?'negative':'';
  $('sessCount').textContent=`${s.sessionCount}/10`;
  $('sessPnl').textContent=s.active?signed(s.sessionBalance):'—';
  $('cycleWins').textContent=s.active?s.active.cycles.filter(c=>c.outcome==='win').length:'0';
  $('cycleLosses').textContent=`${s.failed}/5`;
  $('goalProgress').style.width=Math.max(0,Math.min(100,s.pnl/R.DEFAULTS.dailyTarget*100))+'%';
  const oldDay=paper.day!==R.localDay();
  const status=$('riskStatus');status.className='notice';
  if(oldDay){status.textContent=`Nhật ký thuộc ngày ${paper.day}. Bấm “Ngày mới / Đặt lại” để tạo ngày hôm nay. Dữ liệu phiên cũ không bị xóa tự động.`;}
  else if(s.active){status.textContent=`Phiên ${total} đang mở: lãi/lỗ ${signed(s.sessionBalance)}, thua ${s.failed}/5 chu kỳ. Ghi nhận thủ công sau khi KẾT THÚC chuỗi 1–2–4–8–16.`;}
  else if(s.blocked){status.textContent=s.blocked;if(s.blocked.includes('không đủ'))status.classList.add('bad');}
  else if(total){status.textContent=`Phiên gần nhất: ${reasonName(last.reason)}. Có thể mở phiên tiếp theo nếu đủ điều kiện.`;}
  else{status.textContent='Chưa bắt đầu phiên. Đây là vốn ảo dùng để kiểm tra cách quản lý rủi ro.';}
  const canUse=!oldDay;
  $('startSession').disabled=!canUse||!s.canStart;
  $('winCycle').disabled=!canUse||!s.canRecord;
  $('lossCycle').disabled=!canUse||!s.canRecord;
  $('endSession').disabled=!canUse||!s.active;
  if(!oldDay&&!s.active&&s.nextAt>Date.now()){
    $('breakTime').textContent=`Nghỉ 30 phút: có thể bắt đầu phiên mới sau ${new Date(s.nextAt).toLocaleString('vi-VN')}. Thời gian nghỉ không làm tăng xác suất thắng.`;
  }else $('breakTime').textContent='Mỗi phiên chốt +15k hoặc đóng sau 5 chu kỳ thua hết. Dừng ngày khi lãi ròng +30k, tối đa 10 phiên, nghỉ giữa các phiên 30 phút.';
  $('sessionArchive').innerHTML=paper.sessions.slice().reverse().map((p,j)=>{
    const no=paper.sessions.length-j,profit=R.sessionPnl(p);
    return `<div class="archive-row"><div><strong>Phiên ${no}</strong><br><small>${new Date(p.startedAt).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})} • ${reasonName(p.reason)}</small></div><div class="${profit>0?'positive':profit<0?'negative':''}"><strong>${signed(profit)}</strong><br><small>${p.cycles.length} chu kỳ</small></div></div>`;
  }).join('')||'<p class="muted">Chưa có phiên nào.</p>';
}
function riskAction(fn){try{fn();save();renderTracker();}catch(e){alert(e.message);renderTracker();}}
$('startSession').onclick=()=>riskAction(()=>R.start(paper));
$('winCycle').onclick=()=>riskAction(()=>R.record(paper,'win'));
$('lossCycle').onclick=()=>riskAction(()=>R.record(paper,'loss'));
$('endSession').onclick=()=>riskAction(()=>R.close(paper));
$('resetDay').onclick=()=>{if(confirm('Bắt đầu nhật ký vốn ảo mới tại 200.000đ? Nhật ký vốn ngày cũ sẽ bị thay thế. Hãy sao lưu JSON nếu muốn giữ lại.')){paper=R.newLog();save();renderTracker();}};
$('simulate').onclick=()=>{
  const p=Number($('roundOdds').value);
  const sim=R.simulate(p,10000);
  $('simGoal').textContent=pct(sim.hitRate);
  $('simLoss').textContent=pct(sim.negativeRate);
  $('simInsufficient').textContent=pct(sim.insufficientRate);
  $('simAvg').textContent=signed(sim.mean);
  $('simAvg').className=sim.mean<0?'negative':'positive';
  $('simSpread').textContent=`Sau ${sim.runs.toLocaleString('vi-VN')} ngày giả định: phân vị 5% = ${signed(sim.p05)}, trung vị = ${signed(sim.p50)}, phân vị 95% = ${signed(sim.p95)}. Đây là kết quả mô phỏng, không phải xác suất đo được của TXA.`;
};
$('runMonte').onclick=()=>{const p=E.windowBlend(outcomes);let t=0;for(let i=0;i<10000;i++)if(Math.random()<p)t++;$('mcTai').textContent=pct(t/10000);$('mcXiu').textContent=pct((10000-t)/10000);};
$('exportCsv').onclick=()=>download('txa-v21-history.csv','van,ket_qua\n'+outcomes.map((v,i)=>`${i+1},${nameSide(v)}`).join('\n'),'text/csv;charset=utf-8');
$('exportJson').onclick=()=>download('txa-v21-backup.json',JSON.stringify({version:'V21',exportedAt:new Date().toISOString(),history:outcomes,liveRecords,paper},null,2),'application/json');
$('audit').onclick=()=>{
  const b=backtest||E.validateChronological(outcomes);
  const quote=s=>'"'+String(s).replaceAll('"','""')+'"';
  const rows=[['model','signals','correct','hit_rate','wilson95_lower','wilson95_upper'],['TXA ensemble',b.overall.signals,b.overall.correct,b.overall.rate??'',b.overall.ci.lower,b.overall.ci.upper],...b.perModel.map(m=>[m.name,m.signals,m.correct,m.rate??'',m.ci.lower,m.ci.upper])];
  const live=E.summarizeLive(liveRecords);
  rows.push(['LIVE ensemble',live.signals,live.correct,live.rate??'',live.ci.lower,live.ci.upper]);
  download('txa-v21-validation-audit.csv',rows.map(r=>r.map(quote).join(',')).join('\n'),'text/csv;charset=utf-8');
};
$('importJson').onchange=async ev=>{
  const file=ev.target.files[0];if(!file)return;
  try{
    const json=JSON.parse(await file.text());
    const imported=cleanHistory(json.history);
    if(!imported)throw new Error(`Tệp không có dữ liệu hợp lệ (chỉ 0/1, tối đa ${MAX_HISTORY} ván).`);
    if(!confirm('Khôi phục dữ liệu từ tệp? Lịch sử hiện có sẽ bị thay thế.'))return;
    outcomes=imported;
    liveRecords=json.version==='V21'?cleanLive(json.liveRecords,imported):[];
    const log=cleanLog(json.paper);
    if(log)paper=log;
    save();renderValidation();renderAnalysis();renderTracker();
  }catch(e){alert('Lỗi khi nhập JSON: '+e.message);}
  finally{ev.target.value='';}
};
$('uiMode').value=localStorage.getItem(MODE)||localStorage.getItem('txa-v20-mode')||'standard';
function applyMode(){document.body.className='mode-'+$('uiMode').value;try{localStorage.setItem(MODE,$('uiMode').value);}catch{}}
$('uiMode').onchange=applyMode;applyMode();
renderValidation();renderAnalysis();renderTracker();
$('simulate').click();
setInterval(()=>{const s=R.summary(paper);if(!s.active&&s.nextAt>Date.now()||paper.day!==R.localDay())renderTracker();},20000);
if('serviceWorker' in navigator && location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
