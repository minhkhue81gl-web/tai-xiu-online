/* TXA V21: paper-money risk tracking and simulation. No betting connections. */
(function(root, factory) {
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.TXARisk=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const DEFAULTS=Object.freeze({initial:200000,steps:[1000,2000,4000,8000,16000],sessionTarget:15000,dailyTarget:30000,maxFailedCycles:5,maxSessions:10,breakMinutes:30});
  const sum=a=>a.reduce((x,y)=>x+y,0);
  const fullCycleLoss=cfg=>sum(cfg.steps);
  const cycleProfit=cfg=>cfg.steps[0]; // Doubling + payout 1:1 -> +1 base unit on any win.
  const localDay=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  function newLog(cfg=DEFAULTS,day=localDay()){return {day,initial:cfg.initial,sessions:[]};}
  function sessionPnl(s,cfg=DEFAULTS){return sum(s.cycles.map(c=>c.outcome==='win'?cycleProfit(cfg):-fullCycleLoss(cfg)));}
  function summary(log,cfg=DEFAULTS,now=Date.now()) {
    const sessions=log.sessions||[];const pnl=sum(sessions.map(s=>sessionPnl(s,cfg)));
    const current=sessions.length?sessions.at(-1):null;
    const active=current&&!current.closedAt?current:null;
    const closedLast=current&&current.closedAt?current:null;
    const nextAt=closedLast?new Date(closedLast.closedAt).getTime()+cfg.breakMinutes*60*1000:0;
    const bankroll=log.initial+pnl;
    const sessionBalance=active?sessionPnl(active,cfg):0;
    const failed=active?active.cycles.filter(c=>c.outcome==='loss').length:0;
    let blocked='';
    if(pnl>=cfg.dailyTarget)blocked='Đã đạt mục tiêu lãi ròng trong ngày.';
    else if(bankroll<fullCycleLoss(cfg))blocked='Vốn không đủ cho một chuỗi gỡ hoàn chỉnh.';
    else if(sessions.length>=cfg.maxSessions&&!active)blocked='Đã đạt giới hạn số phiên trong ngày.';
    else if(!active&&nextAt>now)blocked='Chưa hết thời gian nghỉ giữa hai phiên.';
    return {pnl,bankroll,active,sessionBalance,failed,sessionCount:sessions.length,nextAt,blocked,canStart:!active&&!blocked,canRecord:!!active&&!blocked};
  }
  function start(log,cfg=DEFAULTS,now=new Date()) {
    const s=summary(log,cfg,now.getTime());
    if(!s.canStart)throw new Error(s.blocked || 'Phiên hiện tại chưa kết thúc.');
    log.sessions.push({startedAt:now.toISOString(),closedAt:null,reason:null,cycles:[]});
    return summary(log,cfg,now.getTime());
  }
  function record(log,outcome,cfg=DEFAULTS,now=new Date()) {
    if(outcome!=='win'&&outcome!=='loss')throw new Error('Kết quả chu kỳ không hợp lệ.');
    const s=summary(log,cfg,now.getTime());
    if(!s.canRecord)throw new Error(s.blocked||'Hãy bắt đầu phiên trước.');
    const active=s.active;
    active.cycles.push({outcome,at:now.toISOString()});
    const next=summary(log,cfg,now.getTime());
    const lossCount=active.cycles.filter(c=>c.outcome==='loss').length;
    const profit=sessionPnl(active,cfg);
    if(next.pnl>=cfg.dailyTarget){active.reason='daily-target';active.closedAt=now.toISOString();}
    else if(profit>=cfg.sessionTarget){active.reason='session-target';active.closedAt=now.toISOString();}
    else if(lossCount>=cfg.maxFailedCycles){active.reason='five-loss-cycles';active.closedAt=now.toISOString();}
    else if(next.bankroll<fullCycleLoss(cfg)){active.reason='insufficient-capital';active.closedAt=now.toISOString();}
    return summary(log,cfg,now.getTime());
  }
  function close(log,cfg=DEFAULTS,now=new Date()) {
    const s=summary(log,cfg,now.getTime());
    if(!s.active)throw new Error('Không có phiên đang mở.');
    s.active.reason='manual';s.active.closedAt=now.toISOString();
    return summary(log,cfg,now.getTime());
  }
  function simulateOne(pRound,cfg=DEFAULTS,random=Math.random) {
    const qFail=Math.pow(1-pRound,cfg.steps.length);
    let bankroll=cfg.initial,closedSessions=0,cycleCount=0,failedCycles=0;
    while(closedSessions<cfg.maxSessions && bankroll>=fullCycleLoss(cfg) && bankroll-cfg.initial<cfg.dailyTarget){
      let sessPnl=0,lossCount=0;
      // Max cycles per session is bounded by the session target + max loss cycles.
      while(sessPnl<cfg.sessionTarget && lossCount<cfg.maxFailedCycles && bankroll>=fullCycleLoss(cfg) && bankroll-cfg.initial<cfg.dailyTarget){
        const loses=random()<qFail;
        if(loses){bankroll-=fullCycleLoss(cfg);sessPnl-=fullCycleLoss(cfg);lossCount++;failedCycles++;}
        else {bankroll+=cycleProfit(cfg);sessPnl+=cycleProfit(cfg);}
        cycleCount++;
      }
      closedSessions++;
    }
    return {profit:bankroll-cfg.initial,bankroll,hitTarget:bankroll-cfg.initial>=cfg.dailyTarget,insufficient:bankroll<fullCycleLoss(cfg),closedSessions,cycleCount,failedCycles};
  }
  function simulate(pRound,runs=10000,cfg=DEFAULTS,seed=20261101){
    if(!Number.isFinite(pRound)||pRound<0||pRound>1)throw Error('Xác suất phải từ 0 đến 1.');
    if(!Number.isInteger(runs)||runs<1||runs>100000)throw Error('Số lần mô phỏng không hợp lệ.');
    // Deterministic seeded generator: reproducible tests and comparable scenarios.
    let s=seed>>>0;
    const rng=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
    let hits=0,negatives=0,insufficient=0,total=0,cycleTotal=0;
    const profits=[];
    for(let i=0;i<runs;i++){
      const r=simulateOne(pRound,cfg,rng);
      if(r.hitTarget)hits++;if(r.profit<0)negatives++;if(r.insufficient)insufficient++;
      profits.push(r.profit);total+=r.profit;cycleTotal+=r.cycleCount;
    }
    profits.sort((a,b)=>a-b);
    const pct=k=>profits[Math.floor((runs-1)*k)];
    return {runs,roundWin:pRound,cycleWin:1-Math.pow(1-pRound,cfg.steps.length),hitRate:hits/runs,negativeRate:negatives/runs,insufficientRate:insufficient/runs,mean:total/runs,meanCycles:cycleTotal/runs,p05:pct(.05),p50:pct(.5),p95:pct(.95)};
  }
  return {DEFAULTS,localDay,newLog,summary,start,record,close,sessionPnl,fullCycleLoss,simulateOne,simulate};
});
