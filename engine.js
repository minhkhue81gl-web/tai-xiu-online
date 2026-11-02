/* TXA V21: historical analysis & chronological validation. No guarantees of prediction. */
(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TXAEngine = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  'use strict';
  const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
  const mean = a => a.length ? a.reduce((s,v) => s+v,0)/a.length : .5;
  const recent = (a,n) => a.slice(-Math.min(n,a.length));
  const sideName = v => v===1 ? 'TÀI' : v===0 ? 'XỈU' : 'TRUNG LẬP';
  function entropy(a) { if (!a.length) return 1; const p=mean(a); return p===0||p===1?0:-(p*Math.log2(p)+(1-p)*Math.log2(1-p)); }
  function autocorr(a) { if(a.length<4)return 0;const m=mean(a);let num=0,den=0;for(let i=1;i<a.length;i++)num+=(a[i]-m)*(a[i-1]-m);for(const x of a)den+=(x-m)**2;return den?num/den:0; }
  function runInfo(a) { if(!a.length)return {current:0,max:0,side:null};let max=1,c=1;for(let i=1;i<a.length;i++){c=a[i]===a[i-1]?c+1:1;max=Math.max(max,c)}let cur=1;for(let i=a.length-1;i>0&&a[i]===a[i-1];i--)cur++;return{current:cur,max,side:a.at(-1)}; }
  function runsZ(a) { const n1=a.filter(Boolean).length,n0=a.length-n1;if(n1===0||n0===0||a.length<4)return 0;let r=1;for(let i=1;i<a.length;i++)if(a[i]!==a[i-1])r++;const mu=1+2*n1*n0/(n1+n0);const vari=2*n1*n0*(2*n1*n0-n1-n0)/(((n1+n0)**2)*(n1+n0-1));return vari>0?(r-mu)/Math.sqrt(vari):0; }
  function markov(a,order=1) { if(a.length<order+3)return .5;const key=a.slice(-order).join('');let t=0,n=0;for(let i=order;i<a.length;i++){if(a.slice(i-order,i).join('')===key){t+=a[i];n++}}return n?t/n:.5; }
  function patternScore(a) { for(const l of [2,3,4]){if(a.length<l*2+2)continue;const pat=a.slice(-l).join('');let t=0,n=0;for(let i=l;i<a.length;i++){if(a.slice(i-l,i).join('')===pat){t+=a[i];n++}}if(n>=2)return t/n}return .5; }
  function alternation(a) { const r=recent(a,8);if(r.length<4)return .5;let alt=0;for(let i=1;i<r.length;i++)if(r[i]!==r[i-1])alt++;const rate=alt/(r.length-1);return rate>.7?1-r.at(-1):rate<.3?r.at(-1):.5; }
  function runModel(a) { const r=runInfo(a);if(!a.length)return .5;if(r.current>=4)return 1-r.side;if(r.current===2||r.current===3)return r.side;return .5; }
  function bayes(a) { const r=recent(a,30);return (r.reduce((s,v)=>s+v,0)+1)/(r.length+2); }
  function windowBlend(a) { return .5*mean(recent(a,5))+.3*mean(recent(a,10))+.2*mean(recent(a,20)); }
  function changePoint(a) { if(a.length<12)return 0;const mid=Math.floor(a.length/2);return Math.abs(mean(a.slice(0,mid))-mean(a.slice(mid))); }
  function trend(a) { const r=recent(a,20);if(r.length<6)return .5;let sx=0,sy=0,sxy=0,sxx=0;for(let i=0;i<r.length;i++){sx+=i;sy+=r[i];sxy+=i*r[i];sxx+=i*i}const n=r.length,b=(n*sxy-sx*sy)/(n*sxx-sx*sx||1);return clamp(.5+b*2,0,1); }
  function contrarian(a) { return clamp(1-mean(recent(a,10)),0,1); }
  function momentum(a) { const r=recent(a,6);if(!r.length)return .5;return .65*mean(r)+.35*(r.at(-1)??.5); }
  function noiseGate(a,p) { return .5+(p-.5)*(1.15-entropy(recent(a,30))*.45); }
  function models(a) {
    const defs = [
      ['Tần suất 20',mean(recent(a,20)),'Tỷ lệ Tài trong 20 ván'],
      ['Bayesian',bayes(a),'Làm mượt bằng prior Beta(1,1)'],
      ['Markov bậc 1',markov(a,1),'Chuyển trạng thái sau 1 ván'],
      ['Markov bậc 2',markov(a,2),'Chuyển trạng thái sau 2 ván'],
      ['Mẫu lặp',patternScore(a),'Tìm mẫu lặp 2–4 bước'],
      ['Đa khung',windowBlend(a),'Cửa sổ 5, 10, 20'],
      ['Bệt',runModel(a),'Chuỗi liên tiếp'],
      ['Đảo nhịp',alternation(a),'Mức luân phiên'],
      ['Xu hướng',trend(a),'Độ dốc chuỗi gần'],
      ['Động lượng',momentum(a),'Trọng số dữ liệu gần'],
      ['Phản xu hướng',contrarian(a),'Đối trọng phân bố lệch'],
      ['Entropy gate',noiseGate(a,windowBlend(a)),'Giảm biên độ khi nhiễu']
    ];
    return defs.map(([name,p,desc]) => ({name,p:clamp(p,0,1),desc,side:p>.545?1:p<.455?0:null,confidence:Math.abs(p-.5)*200}));
  }
  function forecast(history) {
    const ms=models(history);
    const weighted=ms.reduce((s,m)=>s+(m.p-.5)*(.5+m.confidence/100),0);
    const denom=ms.reduce((s,m)=>s+(.5+m.confidence/100),0);
    const p=clamp(.5+weighted/denom,.05,.95);
    const taiVotes=ms.filter(m=>m.side===1).length;
    const xiuVotes=ms.filter(m=>m.side===0).length;
    const maxVotes=Math.max(taiVotes,xiuVotes);
    const stab=clamp(Math.round((1-entropy(recent(history,30))*.45-Math.min(changePoint(history),.5)*.4)*100),0,100);
    const decision=history.length>=8 && Math.abs(p-.5)>=.055 && maxVotes>=5 ? (p>.5?1:0) : null;
    const strength=decision===null?'Chưa đủ':Math.abs(p-.5)>=.18?'Mạnh':Math.abs(p-.5)>=.1?'Trung bình':'Nhẹ';
    return {models:ms,p,decision,taiVotes,xiuVotes,maxVotes,stab,strength};
  }
  function wilson(wins,n,z=1.959963984540054) {
    if(!n)return {lower:0,upper:1};
    const p=wins/n,d=1+z*z/n,c=(p+z*z/(2*n))/d;
    const half=z*Math.sqrt((p*(1-p)+z*z/(4*n))/n)/d;
    return {lower:Math.max(0,c-half),upper:Math.min(1,c+half)};
  }
  function addOutcome(t,correct) { t.signals++; if(correct)t.correct++; }
  function stats(t) { const rate=t.signals?t.correct/t.signals:null;return {...t,rate,ci:wilson(t.correct,t.signals)}; }
  function validateChronological(history,minHistory=30) {
    const summary={signals:0,correct:0};
    const perModel=models([]).map(m=>({name:m.name,signals:0,correct:0}));
    const last=[];
    for(let i=Math.max(8,minHistory);i<history.length;i++) {
      // Forecast only from previous outcomes: index i is never included in the input.
      const f=forecast(history.slice(0,i));
      const actual=history[i];
      if(f.decision!==null){ addOutcome(summary,f.decision===actual); last.push({round:i+1,pred:f.decision,actual,correct:f.decision===actual}); if(last.length>24)last.shift(); }
      f.models.forEach((m,j)=>{if(m.side!==null)addOutcome(perModel[j],m.side===actual);});
    }
    return {total:Math.max(0,history.length-Math.max(8,minHistory)),overall:stats(summary),perModel:perModel.map(stats),last};
  }
  function summarizeLive(records) {
    const t={signals:0,correct:0};
    for(const r of records){ if((r.pred===0||r.pred===1)&&(r.actual===0||r.actual===1))addOutcome(t,r.pred===r.actual); }
    return stats(t);
  }
  function checksum(a) {let h=2166136261;for(const v of a){h^=v+48;h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,'0').toUpperCase();}
  function descriptive(a){ const ri=runInfo(a);return {tai:a.filter(Boolean).length,xiu:a.filter(v=>v===0).length,run:ri,entropy:entropy(recent(a,30)),autocorr:autocorr(recent(a,30)),runsZ:runsZ(a),changePoint:changePoint(a),nearTai:mean(recent(a,20)),checksum:checksum(a)};}
  return {mean,recent,sideName,models,forecast,validateChronological,summarizeLive,wilson,descriptive,entropy,windowBlend};
});
