/* app.js */
(() => {
  const EUR = n => (Number(n||0)).toLocaleString('sk-SK',{minimumFractionDigits:0,maximumFractionDigits:0});
  const months = ["Január","Február","Marec","Apríl","Máj","Jún","Júl","August","September","Október","November","December"];
  const key = 'fin-tabs-v2';

  let state = JSON.parse(localStorage.getItem(key) || '{}');
  if(!state.meta){ state.meta = { carryFixed: true, carryFlagged: true }; }
  if(!state.months){ state.months = {}; }
  const now = new Date();
  const YEAR = now.getFullYear();

  const $ = sel => document.querySelector(sel);
  const monthsBar = $('#months');
  const monthName = $('#monthName');
  const tbody = $('#tbody');
  const fixne = $('#fixne');
  const target = $('#target');
  const carryFixed = $('#carryFixed');
  const carryFlagged = $('#carryFlagged');
  const sumIn = $('#sumIn');
  const sumOut = $('#sumOut');
  const sumProfit = $('#sumProfit');
  const calcLine = $('#calcLine');

  let curYear = YEAR, curMonth = now.getMonth();

  function mKey(y, m){ return `${y}-${String(m+1).padStart(2,'0')}`; }
  function ensureMonth(y, m){
    const k = mKey(y,m);
    if(!state.months[k]) state.months[k] = { fix:0, target:0, rows:[] };
    return state.months[k];
  }
  function save(){ localStorage.setItem(key, JSON.stringify(state)); }

  /* ===== UI init ===== */
  function renderMonths(){
    monthsBar.innerHTML = '';
    months.forEach((label, i)=>{
      const b = document.createElement('button');
      b.className = 'm-btn'+(i===curMonth?' active':'');
      b.textContent = label;
      b.onclick = ()=>{ document.querySelectorAll('.m-btn').forEach(el=>el.classList.remove('active')); b.classList.add('active'); openMonth(curYear,i); };
      monthsBar.appendChild(b);
    });
  }

  function openMonth(y, m){
    curYear = y; curMonth = m;
    monthName.textContent = months[m];
    const mObj = ensureMonth(y,m);
    const prevK = mKey(y, (m+11)%12);
    const prev = state.months[prevK];
    if(mObj.rows.length===0 && prev){
      if(state.meta.carryFixed && mObj.fix===0) mObj.fix = prev.fix||0;
      if(state.meta.carryFlagged && prev.rows?.length){
        const carryRows = prev.rows.filter(r=> (r.pozn||'').toLowerCase().includes('firma'));
        if(carryRows.length) mObj.rows = carryRows.map(r=> ({...r, in:0, out:r.out||0}));
      }
    }
    renderMonth();
  }

  function renderMonth(){
    const m = ensureMonth(curYear,curMonth);
    fixne.value = m.fix||0;
    target.value = m.target||0;
    carryFixed.checked = !!state.meta.carryFixed;
    carryFlagged.checked = !!state.meta.carryFlagged;

    tbody.innerHTML = '';
    (m.rows||[]).forEach((r, idx)=> addRow(r, idx));
    if(tbody.children.length === 0) addRow({});
    recalc();
  }

  /* ===== Row helpers ===== */
  function rowDataFromTR(tr){
    const tds = tr.querySelectorAll('td');
    return {
      name: tds[0].querySelector('input').value.trim(),
      in:   Number(tds[1].querySelector('input').value||0),
      out:  Number(tds[2].querySelector('input').value||0),
      pozn: tds[3].querySelector('input').value.trim(),
    };
  }
  function upsertAll(){
    const m = ensureMonth(curYear,curMonth);
    m.rows = Array.from(tbody.children).map(rowDataFromTR);
    save();
  }

  function addRow(r={}, atIndex=null){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" placeholder="Zákazník / projekt" value="${r.name||''}" enterkeyhint="next"></td>
      <td class="right"><input type="number" inputmode="numeric" min="0" step="1" value="${r.in||''}" enterkeyhint="next"></td>
      <td class="right"><input type="number" inputmode="numeric" min="0" step="1" value="${r.out||''}" enterkeyhint="next"></td>
      <td><input type="text" placeholder="Poznámka (napr. firma – prenášať)" value="${r.pozn||''}" enterkeyhint="done"></td>
      <td><button class="btn ghost del">🗑️</button></td>`;

    const [nameEl,inEl,outEl,poznEl] = [
      tr.children[0].firstElementChild,
      tr.children[1].firstElementChild,
      tr.children[2].firstElementChild,
      tr.children[3].firstElementChild,
    ];

    const onChange = ()=>{ upsertAll(); recalc(); };
    [nameEl,inEl,outEl,poznEl].forEach(el=> el.addEventListener('input', onChange));

    // 1) Desktop Enter
    poznEl.addEventListener('keydown', e=>{
      if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); addAfterIfNeeded(tr); }
    });
    // 2) Mobile – některé klávesnice pošlú \n do textu bez keydown
    const detectNewline = (e)=>{
      const val = e.target.value;
      if(val.includes('\n')){
        e.target.value = val.replace(/\n/g,''); // odstráň zalomenie
        addAfterIfNeeded(tr);
      }
    };
    poznEl.addEventListener('beforeinput', ev => { if(ev.inputType==='insertLineBreak'){ ev.preventDefault(); addAfterIfNeeded(tr); }});
    poznEl.addEventListener('input', detectNewline);

    // 3) Auto-add po odchode z posledného riadku, keď je niečo vyplnené
    poznEl.addEventListener('blur', ()=>{
      const isLast = tr === tbody.lastElementChild;
      const hasData = [nameEl,inEl,outEl,poznEl].some(el => (el.value||'').trim() !== '');
      if(isLast && hasData) addAfterIfNeeded(tr, {focus:false});
    });

    tr.querySelector('.del').onclick = ()=>{ tr.remove(); upsertAll(); recalc(); };

    if(atIndex===null) tbody.appendChild(tr); else tbody.insertBefore(tr, tbody.children[atIndex]);
    return tr;
  }

  function addAfterIfNeeded(tr, opts={focus:true}){
    const isLast = tr === tbody.lastElementChild;
    if(isLast){
      const newTr = addRow({});
      upsertAll(); recalc();
      if(opts.focus !== false){
        newTr.querySelector('td input[type="text"]').focus();
        newTr.scrollIntoView({behavior:'smooth',block:'center'});
      }
    }else{
      tr.nextElementSibling?.querySelector('td input[type="text"]')?.focus();
    }
  }

  /* ===== Recalc ===== */
  function recalc(){
    const m = ensureMonth(curYear,curMonth);
    const incomes = (m.rows||[]).reduce((s,r)=> s + Number(r.in||0), 0);
    const expenses = (m.rows||[]).reduce((s,r)=> s + Number(r.out||0), 0);
    const fixed = Number(m.fix||0);
    const targetVal = Number(m.target||0);

    const totalOut = expenses + fixed;
    const profit = incomes - totalOut;
    const missingToCosts = Math.max(0, totalOut - incomes);
    const missingToAll   = Math.max(0, totalOut + targetVal - incomes);

    sumIn.textContent = EUR(incomes);
    sumOut.textContent = EUR(totalOut);
    sumProfit.textContent = EUR(profit);
    const cls = profit >= 0 ? 'ok' : 'danger';
    sumProfit.parentElement.classList.remove('ok','danger'); sumProfit.parentElement.classList.add(cls);
    calcLine.innerHTML =
      `Fixné: <b>${EUR(fixed)} €</b> &nbsp;|&nbsp; ` +
      `Chýba do nákladov: <b>${EUR(missingToCosts)} €</b> &nbsp;|&nbsp; ` +
      `Chýba spolu (náklady + cieľ): <b>${EUR(missingToAll)} €</b> <small>(cieľ ${EUR(targetVal)} €)</small>`;
  }

  /* ===== Controls ===== */
  $('#addRow').onclick = ()=> {
    const tr = addRow({});
    tr.querySelector('td input[type="text"]').focus();
    upsertAll(); recalc();
  };
  $('#saveBtn').onclick = save;
  $('#printBtn').onclick = ()=> window.print();
  $('#clearBtn').onclick = ()=>{
    if(!confirm('Vyčistiť všetky riadky a sumy v aktuálnom mesiaci?')) return;
    const m = ensureMonth(curYear,curMonth);
    m.rows = []; m.fix = 0; m.target = 0;
    renderMonth(); save();
  };
  $('#exportBtn').onclick = ()=>{
    const blob = new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
    const a = Object.assign(document.createElement('a'),{ href:URL.createObjectURL(blob), download:`financie-${Date.now()}.json`});
    document.body.appendChild(a); a.click(); a.remove();
  };
  $('#exportXlsx')?.addEventListener('click', ()=>{
    const m = ensureMonth(curYear,curMonth);
    const incomes = (m.rows||[]).reduce((s,r)=> s + Number(r.in||0), 0);
    const expenses = (m.rows||[]).reduce((s,r)=> s + Number(r.out||0), 0);
    const totalOut = expenses + Number(m.fix||0);
    const profit = incomes - totalOut;

    const aoa = [
      ['Rok', curYear],
      ['Mesiac', months[curMonth]],
      ['Fixné náklady', m.fix||0],
      ['Cieľ zisku', m.target||0],
      [],
      ['Zákazník / Projekt','Príjem (€)','Výdavok (€)','Poznámka']
    ];
    (m.rows||[]).forEach(r=> aoa.push([r.name||'', Number(r.in||0), Number(r.out||0), r.pozn||'']));
    aoa.push([]); aoa.push(['Spolu príjem', incomes]); aoa.push(['Spolu výdavok (vrátane fixných)', totalOut]); aoa.push(['Zisk', profit]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{wch:30},{wch:14},{wch:16},{wch:30}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, months[curMonth]);
    XLSX.writeFile(wb, `Financie-${curYear}-${String(curMonth+1).padStart(2,'0')}.xlsx`);
  });

  [fixne,target].forEach(inp=> inp.addEventListener('input', ()=>{ 
    const m = ensureMonth(curYear,curMonth);
    if(inp===fixne) m.fix = Number(inp.value||0); else m.target = Number(inp.value||0);
    save(); recalc();
  }));
  carryFixed.onchange = ()=>{ state.meta.carryFixed = carryFixed.checked; save(); };
  carryFlagged.onchange = ()=>{ state.meta.carryFlagged = carryFlagged.checked; save(); };

  /* start */
  renderMonths();
  openMonth(curYear, curMonth);

  /* PWA SW */
  if('serviceWorker' in navigator){
    window.addEventListener('load', ()=> navigator.serviceWorker.register('sw.js').catch(()=>{}));
  }
})();
