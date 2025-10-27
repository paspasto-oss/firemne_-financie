// ===== Firemné financie – PWA =====
const STORAGE_KEY = 'finPWA_v1';

// ---------- Helpers ----------
const $ = s => document.querySelector(s);
const fmt = n => (Number(n)||0).toLocaleString('sk-SK',{minimumFractionDigits:2, maximumFractionDigits:2});
const uid = (p='id') => p + Math.random().toString(36).slice(2,9);
const today = () => new Date().toISOString().slice(0,10);
const monthOf = d => (d||new Date()).toISOString().slice(0,7);

// ---------- State ----------
let state = load() || {
  fix: [ /* {id, name, amount, note} */ ],
  months: {} // 'YYYY-MM': { rows:[{id,date,desc,income,expense,profit,note,isFixed}] , appliedFix:true/false }
};
let curMonth = monthOf();

function load(){ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)); }catch(e){ return null; } }
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); renderAll(); }

// ---------- Fixné výdavky ----------
function renderFix(){
  const tbody = $('#fixBody');
  tbody.innerHTML = '';
  let sum = 0;
  state.fix.forEach(item=>{
    sum += Number(item.amount)||0;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" value="${item.name||''}" /></td>
      <td><input type="number" step="0.01" value="${item.amount||0}" /></td>
      <td><input type="text" value="${item.note||''}" /></td>
      <td><button class="secondary del">Zmazať</button></td>
    `;
    const [nameEl, amountEl, noteEl] = tr.querySelectorAll('input');
    nameEl.addEventListener('input', e=>{ item.name=e.target.value; save(); });
    amountEl.addEventListener('input', e=>{ item.amount=Number(e.target.value)||0; save(); });
    noteEl.addEventListener('input', e=>{ item.note=e.target.value; save(); });
    tr.querySelector('.del').addEventListener('click', ()=>{ state.fix = state.fix.filter(x=>x!==item); save(); });
    tbody.appendChild(tr);
  });
  $('#fixSum').textContent = fmt(sum);
}
$('#addFix').addEventListener('click', ()=>{ state.fix.push({id:uid('f'), name:'', amount:0, note:''}); save(); });

// vložiť fixné do mesiaca
$('#pushFix').addEventListener('click', ()=>{
  ensureMonth(curMonth);
  const m = state.months[curMonth];
  const clones = state.fix.map(f=>({
    id: uid('r'),
    date: `${curMonth}-01`,
    desc: f.name,
    income: 0,
    expense: Number(f.amount)||0,
    profit: -(Number(f.amount)||0),
    note: f.note||'',
    isFixed: true
  }));
  // odstráň staré fix klony a vlož nové na začiatok
  m.rows = m.rows.filter(r=>!r.isFixed);
  m.rows = [...clones, ...m.rows];
  m.appliedFix = true;
  save();
});

// ---------- Mesačná tabuľka ----------
function ensureMonth(key){
  if(!state.months[key]){
    state.months[key] = { rows:[], appliedFix:false };
  }
  // ak ešte neboli fixné prenesené do daného mesiaca, urob to automaticky
  if(!state.months[key].appliedFix && state.fix.length){
    const clones = state.fix.map(f=>({
      id: uid('r'),
      date: `${key}-01`,
      desc: f.name,
      income: 0,
      expense: Number(f.amount)||0,
      profit: -(Number(f.amount)||0),
      note: f.note||'',
      isFixed: true
    }));
    state.months[key].rows = [...clones, ...state.months[key].rows];
    state.months[key].appliedFix = true;
    // nevolám save() – ušetríme 1 render, uloží sa na renderi
  }
}

function renderMonth(){
  ensureMonth(curMonth);
  const m = state.months[curMonth];

  $('#sheetTitle').textContent = `Prehľad za mesiac: ${curMonth}`;
  $('#infoAutoFix').textContent = m.appliedFix ? 'Fixné výdavky vložené' : '';

  const tbody = $('#sheetBody');
  tbody.innerHTML = '';
  m.rows.forEach(row=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="date" value="${row.date||today()}" /></td>
      <td><input type="text" value="${row.desc||''}" /></td>
      <td><input type="number" step="0.01" value="${row.income||0}" /></td>
      <td><input type="number" step="0.01" value="${row.expense||0}" /></td>
      <td class="${(row.income-row.expense)>=0?'good':'bad'} prof">${fmt((row.income||0)-(row.expense||0))}</td>
      <td><input type="text" value="${row.note||''}" /></td>
      <td>
        ${row.isFixed?'<span class="muted">fix</span>':'<button class="secondary del">Zmazať</button>'}
      </td>
    `;
    const [d,desc,i,e,n] = [ tr.querySelector('input[type="date"]'),
                             tr.querySelector('input[type="text"]'),
                             tr.querySelectorAll('input[type="number"]')[0],
                             tr.querySelectorAll('input[type="number"]')[1],
                             tr.querySelectorAll('input[type="text"]')[1] ];
    d.addEventListener('input', ev=>{ row.date = ev.target.value; save(); });
    desc.addEventListener('input', ev=>{ row.desc = ev.target.value; save(); });
    i.addEventListener('input', ev=>{ row.income = Number(ev.target.value)||0; row.profit = row.income-row.expense; tr.querySelector('.prof').textContent = fmt(row.profit); tr.querySelector('.prof').className='prof '+(row.profit>=0?'good':'bad'); save(); });
    e.addEventListener('input', ev=>{ row.expense = Number(ev.target.value)||0; row.profit = row.income-row.expense; tr.querySelector('.prof').textContent = fmt(row.profit); tr.querySelector('.prof').className='prof '+(row.profit>=0?'good':'bad'); save(); });
    n.addEventListener('input', ev=>{ row.note = ev.target.value; save(); });
    const del = tr.querySelector('.del');
    if(del) del.addEventListener('click', ()=>{ m.rows = m.rows.filter(x=>x!==row); save(); });
    tbody.appendChild(tr);
  });

  // sumy
  const inc = m.rows.reduce((s,r)=> s+(Number(r.income)||0),0);
  const exp = m.rows.reduce((s,r)=> s+(Number(r.expense)||0),0);
  $('#sumInc').textContent = fmt(inc);
  $('#sumExp').textContent = fmt(exp);
  $('#sumProf').textContent = fmt(inc-exp);
}

// Pridať riadok
$('#addRow').addEventListener('click', ()=>{
  ensureMonth(curMonth);
  state.months[curMonth].rows.push({
    id: uid('r'), date: today(), desc:'', income:0, expense:0, profit:0, note:'', isFixed:false
  });
  save();
});
$('#fab').addEventListener('click', ()=> $('#addRow').click());

// Čistiť mesiac
$('#clearMonth').addEventListener('click', ()=>{
  if(!confirm('Vyčistiť všetky riadky (vrátane fixných) pre tento mesiac?')) return;
  ensureMonth(curMonth);
  state.months[curMonth].rows = [];
  state.months[curMonth].appliedFix = false;
  save();
});

// Export / Import
$('#btnExport').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `financie_${curMonth}.json`; a.click();
  URL.revokeObjectURL(url);
});
$('#btnImport').addEventListener('click', ()=> $('#fileImport').click());
$('#fileImport').addEventListener('change', e=>{
  const f = e.target.files[0]; if(!f) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try { state = JSON.parse(reader.result); save(); alert('Import hotový ✅'); }
    catch(err){ alert('Chybný súbor: '+err.message); }
  };
  reader.readAsText(f,'utf-8');
  e.target.value='';
});

// Mesiace (prepínač)
const monthInput = $('#monthPick');
monthInput.value = curMonth;
$('#prevM').addEventListener('click', ()=>{ shiftMonth(-1); });
$('#nextM').addEventListener('click', ()=>{ shiftMonth(+1); });
monthInput.addEventListener('change', e=>{ curMonth = e.target.value || curMonth; renderAll(); });

function shiftMonth(delta){
  const [y,m] = monthInput.value.split('-').map(n=>+n);
  const d = new Date(y, m-1+delta, 1);
  curMonth = d.toISOString().slice(0,7);
  monthInput.value = curMonth;
  renderAll();
}

// Tlač
$('#btnPrint').addEventListener('click', ()=> window.print());

// ---------- Render ----------
function renderAll(){
  renderFix();
  renderMonth();
  // uložiť, ak ensureMonth pridalo fixné
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
renderAll();
