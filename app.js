// ===== Obálkový rozpočet – core =====
const KEY = 'envelopeBudget_v1';
const byId = s => document.getElementById(s);

// State
let state = load() || {
  monthKey: new Date().toISOString().slice(0,7), // "YYYY-MM"
  envelopes: [
    // {id:'e1', name:'Potraviny', budget:240, color:'#66bb6a'}
  ],
  transactions: [
    // {id:'t1', date:'2025-10-01', envelopeId:'e1', type:'expense'|'income', amount:12.50, note:'...'}
  ]
};

// ---- Utilities
const fmt = n => (Number(n)||0).toLocaleString('sk-SK',{minimumFractionDigits:2, maximumFractionDigits:2});
const uid = (p='id') => p + Math.random().toString(36).slice(2,9);
function save(){ localStorage.setItem(KEY, JSON.stringify(state)); renderAll(); }
function load(){ try{ return JSON.parse(localStorage.getItem(KEY)); }catch(_){ return null; } }
function monthOf(d){ return (d||new Date()).toISOString().slice(0,7); } // YYYY-MM

// ---- Tabs
document.querySelectorAll('.tabs button').forEach(b=>{
  b.addEventListener('click', ()=>{
    document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    document.querySelectorAll('.tab').forEach(x=>x.classList.add('hidden'));
    byId('tab-'+b.dataset.tab).classList.remove('hidden');
  });
});

// ---- Export / Import
byId('btnExport').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=`obalky_${state.monthKey}.json`; a.click();
  URL.revokeObjectURL(url);
});
byId('btnImport').addEventListener('click', ()=> byId('fileImport').click());
byId('fileImport').addEventListener('change', e=>{
  const f = e.target.files[0]; if(!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{ state = JSON.parse(reader.result); save(); alert('Naimportované ✅'); }
    catch(err){ alert('Chybný súbor: ' + err.message); }
  };
  reader.readAsText(f,'utf-8');
  e.target.value = '';
});

// ---- Summary
function renderSummary(){
  const month = state.monthKey;
  const envIds = new Set(state.envelopes.map(e=>e.id));
  const tx = state.transactions.filter(t=> monthOf(new Date(t.date)) === month && envIds.has(t.envelopeId));
  let spent=0, income=0;
  tx.forEach(t=> t.type==='expense' ? spent+=Number(t.amount)||0 : income+=Number(t.amount)||0);
  const budget = state.envelopes.reduce((s,e)=> s + (Number(e.budget)||0), 0);
  const left = budget - spent + income;

  byId('summary').innerHTML = `
    <span class="pill">Mesiac: <b>${month}</b></span>
    <span class="pill">Rozpočet: <b>${fmt(budget)} €</b></span>
    <span class="pill">Minuté: <b>${fmt(spent)} €</b></span>
    <span class="pill">Príjmy: <b>${fmt(income)} €</b></span>
    <span class="pill ${left>=0?'ok':'bad'}">Zostatok: <b>${fmt(left)} €</b></span>
  `;
}

// ---- Envelopes
function renderEnvelopes(){
  const wrap = byId('envelopesList');
  const month = state.monthKey;

  wrap.innerHTML = '';
  state.envelopes.forEach(env=>{
    // sum for this envelope
    let spent=0, inc=0;
    state.transactions.forEach(t=>{
      if(t.envelopeId===env.id && monthOf(new Date(t.date))===month){
        if(t.type==='expense') spent += Number(t.amount)||0;
        else inc += Number(t.amount)||0;
      }
    });
    const left = (Number(env.budget)||0) - spent + inc;
    const pct = Math.max(0, Math.min(100, ((spent - inc) / Math.max(1, env.budget))*100 ));

    const el = document.createElement('div');
    el.className = 'env';
    el.innerHTML = `
      <h3>
        <input class="envName" value="${env.name||''}" />
        <span>
          <input class="envBudget" type="number" step="0.01" value="${env.budget||0}" style="width:110px" />
          <button class="secondary del">Zmazať</button>
        </span>
      </h3>
      <div class="bar"><span style="width:${pct}%"></span></div>
      <div class="row" style="justify-content:space-between; margin-top:6px">
        <div>Rozpočet: <b>${fmt(env.budget||0)} €</b></div>
        <div>Minuté: <b>${fmt(spent)} €</b></div>
        <div>Príjmy: <b>${fmt(inc)} €</b></div>
        <div>Zostatok: <b>${fmt(left)} €</b></div>
      </div>
    `;
    // bindings
    el.querySelector('.envName').addEventListener('input', e=>{ env.name = e.target.value; save(); });
    el.querySelector('.envBudget').addEventListener('input', e=>{ env.budget = Number(e.target.value)||0; save(); });
    el.querySelector('.del').addEventListener('click', ()=>{ state.envelopes = state.envelopes.filter(x=>x.id!==env.id); save(); });
    wrap.appendChild(el);
  });

  byId('addEnvelope').onclick = ()=>{
    state.envelopes.push({id:uid('e'), name:'Nová obálka', budget:0});
    save();
  };

  byId('resetMonth').onclick = ()=>{
    state.monthKey = prompt('Nový mesiac (YYYY-MM):', state.monthKey) || state.monthKey;
    // neprenášame transakcie ani rozpočty (rozpočty ostanú)
    save();
  };
  byId('rolloverMonth').onclick = ()=>{
    // prenesie len rozpočty (ako sú), transakcie prirodzene filtrujeme podľa mesiaca
    state.monthKey = prompt('Nový mesiac (YYYY-MM):', state.monthKey) || state.monthKey;
    save();
  };
}

// ---- Transactions
function renderTransactions(){
  // fill envelope select
  const select = byId('txEnvelope');
  select.innerHTML = state.envelopes.map(e=> `<option value="${e.id}">${e.name}</option>`).join('');

  // form add
  byId('txForm').onsubmit = (e)=>{
    e.preventDefault();
    const date = byId('txDate').value || new Date().toISOString().slice(0,10);
    const envelopeId = byId('txEnvelope').value;
    const amount = Number(byId('txAmount').value)||0;
    const note = byId('txNote').value||'';
    const type = byId('txType').value;
    state.transactions.unshift({id:uid('t'), date, envelopeId, amount, note, type});
    byId('txForm').reset();
    save();
  };

  // list
  const month = state.monthKey;
  const list = byId('txList');
  const tx = state.transactions.filter(t=> monthOf(new Date(t.date))===month);
  list.innerHTML = tx.map(t=>{
    const env = state.envelopes.find(e=>e.id===t.envelopeId);
    return `
      <div class="tx">
        <div>${t.date}</div>
        <div>${env ? env.name : '—'}<div class="muted">${t.note||''}</div></div>
        <div class="amt ${t.type}">${t.type==='expense' ? '-' : '+'} ${fmt(t.amount)} €</div>
        <div><button data-id="${t.id}" class="secondary del">Zmazať</button></div>
      </div>
    `;
  }).join('');
  list.querySelectorAll('.del').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      state.transactions = state.transactions.filter(x=> x.id !== btn.dataset.id);
      save();
    });
  });
}

// ---- Reports (simple bar chart per envelope)
function renderReports(){
  const c = byId('chart');
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  const month = state.monthKey;

  // totals per envelope
  const labels = [];
  const values = [];
  state.envelopes.forEach(e=>{
    let spent=0, inc=0;
    state.transactions.forEach(t=>{
      if(t.envelopeId===e.id && monthOf(new Date(t.date))===month){
        if(t.type==='expense') spent+=Number(t.amount)||0; else inc+=Number(t.amount)||0;
      }
    });
    labels.push(e.name || '—');
    values.push(spent - inc);
  });

  // draw axes
  const M=40, W=c.width-2*M, H=c.height-2*M, X=M, Y=M;
  ctx.strokeStyle='#bbb'; ctx.lineWidth=1;
  ctx.strokeRect(X,Y,W,H);
  const max = Math.max(10, ...values);
  const barW = W/Math.max(1, values.length);
  values.forEach((v,i)=>{
    const h = (v/max)*H;
    ctx.fillStyle = '#c40000';
    ctx.fillRect(X+i*barW+8, Y+H-h, barW-16, h);
    ctx.fillStyle='#111';
    ctx.textAlign='center';
    ctx.fillText(labels[i], X+i*barW+barW/2, Y+H+14);
    ctx.fillText(fmt(v)+' €', X+i*barW+barW/2, Y+H-h-6);
  });

  byId('reportMonth').innerHTML = `<b>Mesiac:</b> ${month}`;
}

// ---- FAB quick add (opens Transactions tab & focuses form)
byId('fab').addEventListener('click', ()=>{
  document.querySelector('[data-tab="transactions"]').click();
  setTimeout(()=> byId('txAmount').focus(), 50);
});

// ---- Settings
byId('startMonth').value = state.monthKey;
byId('startMonth').addEventListener('change', e=>{
  state.monthKey = e.target.value || state.monthKey;
  save();
});
byId('clearAll').addEventListener('click', ()=>{
  if(confirm('Vymazať všetky dáta?')){ localStorage.removeItem(KEY); state = load() || {monthKey: monthOf(), envelopes:[], transactions:[]}; renderAll(); }
});

// ---- Render all
function renderAll(){
  renderSummary();
  renderEnvelopes();
  renderTransactions();
  renderReports();
}
renderAll();
