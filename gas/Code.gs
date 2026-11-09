// Stocks BIOTOX — publicado automaticamente via GitHub Actions
/**
 * Stocks BIOTOX — reagentes e consumíveis, app web sobre Google Sheets
 * Colar este ficheiro em Code.gs no Apps Script da folha "Reagentes BIOTOX - base de dados".
 */

// ► Muda este código antes de partilhar a app. É o que o pessoal do laboratório escreve para entrar.
const CODIGO_LAB = '__CODIGO_LAB__'; // preenchido pela publicação automática a partir dos secrets do GitHub
// ► Código só para consulta (alunos, visitas). Quem entra com este vê tudo mas não pode mudar nada.
const CODIGO_CONSULTA = '__CODIGO_CONSULTA__';

const FOLHA_ID = '1yQNe80m0bnYRcio_OtUPTEKDEDcBHNcWZlIfXXhtxuU';
const FICHEIROS_INICIAIS = [
  '1iGAIs-9IhO3RsvTm5P2ulOKwXE70kMSR', // reagentes-inicial.csv.gz (armários castanho e branco)
  '12pf-M5xstDD-AH3ZaHiDFSEUrWAbAS1_'  // reagentes-armario-liquidos.csv.gz (armário de líquidos, fotos de 28/10/2026)
];
const PASTA_BASE_ID = '1GAaMlhSHYWpI2VZOyUP_GRHZbaD7Ti3k'; // pasta Lab Stock, onde está a folha
const PASTA_ENCOMENDAS = 'Encomendas exportadas';
const PASTA_FDS = 'https://drive.google.com/drive/folders/13xoPjlcIVnzW-kV_TgXIcVLvi5wt7zeJ';

const COLS = [
  ['code', 'Código'], ['name', 'Nome'], ['cas', 'CAS'], ['brand', 'Marca'], ['ref', 'Ref. fornecedor'],
  ['qty', 'Quantidade'], ['hazard', 'Classe de perigo'], ['group', 'Grupo'], ['cab', 'Armário'],
  ['shelf', 'Prateleira'], ['cur', 'Local anterior'], ['moved', 'Arrumado'], ['old', 'Código antigo'],
  ['opened', 'Data de abertura'], ['obs', 'Observações'], ['action', 'Acção recomendada'],
  ['status', 'Estado'], ['photo', 'Foto'], ['sds', 'FDS (link)'], ['updatedAt', 'Actualizado em'],
  ['updatedBy', 'Actualizado por']
];
const KEYS = COLS.map(c => c[0]);
const GRUPOS = { G1: [1, 199], G2: [200, 399], G3: [400, 449], G4: [450, 474], G5: [475, 499], G6: [500, 549],
  G7: [550, 649], G8: [650, 679], G9: [700, 799], G10: [900, 909], G0: [950, 999] };

/* ---------- Instalação (correr UMA vez no editor) ---------- */
function configurar() {
  const ss = SpreadsheetApp.openById(FOLHA_ID);
  let sh = ss.getSheetByName('Reagentes');
  if (!sh) sh = ss.getSheets()[0].setName('Reagentes');
  if (sh.getLastRow() > 1) throw new Error('A folha Reagentes já tem dados. Não fiz nada para não apagar alterações.');

  let rows = [];
  FICHEIROS_INICIAIS.forEach((id, i) => {
    const blob = DriveApp.getFileById(id).getBlob().setContentType('application/x-gzip');
    const r = Utilities.parseCsv(Utilities.ungzip(blob).getDataAsString('UTF-8'));
    rows = rows.concat(i === 0 ? r : r.filter(x => x[0] && x[0] !== 'Código'));
  });
  const width = COLS.length;
  const data = rows.map(r => { const x = r.slice(0, width); while (x.length < width) x.push(''); return x; });

  sh.clear();
  sh.getRange(1, 1, data.length + 200, width).setNumberFormat('@'); // tudo como texto
  sh.getRange(1, 1, data.length, width).setValues(data);
  sh.getRange(1, 1, 1, width).setFontWeight('bold').setBackground('#0d5c6e').setFontColor('#ffffff');
  sh.setFrozenRows(1); sh.setFrozenColumns(2);
  sh.autoResizeColumns(1, 2);

  let h = ss.getSheetByName('Historico');
  if (!h) h = ss.insertSheet('Historico');
  h.clear();
  h.getRange(1, 1, 1, 4).setValues([['Data', 'Código', 'Alteração', 'Quem']])
    .setFontWeight('bold').setBackground('#0d5c6e').setFontColor('#ffffff');
  h.setFrozenRows(1);

  const extra = ss.getSheets().filter(s => s.getName() !== 'Reagentes' && s.getName() !== 'Historico');
  extra.forEach(s => ss.deleteSheet(s));
  Logger.log('Pronto. ' + (data.length - 1) + ' frascos carregados.');
}

/* ---------- App web ---------- */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Stocks BIOTOX')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // ALLOWALL deixa a app abrir dentro da versão instalável
}

function papel_(pin) {
  const p = String(pin || '').trim();
  if (p === CODIGO_LAB) return 'editar';
  if (CODIGO_CONSULTA && p === CODIGO_CONSULTA) return 'consulta';
  throw new Error('CODIGO_ERRADO');
}
function verificar_(pin) {
  if (papel_(pin) !== 'editar') throw new Error('SO_CONSULTA');
}

function folhas_() {
  const ss = SpreadsheetApp.openById(FOLHA_ID);
  return { r: ss.getSheetByName('Reagentes'), h: ss.getSheetByName('Historico') };
}

function texto_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Europe/Lisbon', 'dd/MM/yyyy');
  return v === null || v === undefined ? '' : String(v);
}

function lerTudo_() {
  const { r, h } = folhas_();
  const vals = r.getDataRange().getValues();
  const head = vals[0].map(String);
  const idx = KEYS.map(k => head.indexOf(COLS.find(c => c[0] === k)[1]));
  const items = [];
  for (let i = 1; i < vals.length; i++) {
    const row = vals[i];
    if (!row[idx[0]]) continue;
    const o = {};
    KEYS.forEach((k, j) => { o[k] = idx[j] >= 0 ? texto_(row[idx[j]]) : ''; });
    o.moved = o.moved === 'SIM';
    items.push(o);
  }
  const hv = h.getLastRow() > 1 ? h.getRange(2, 1, h.getLastRow() - 1, 4).getValues() : [];
  const hist = hv.slice(-300).reverse().map(x => ({
    at: x[0] instanceof Date ? x[0].getTime() : Date.parse(x[0]) || 0, code: String(x[1]), txt: String(x[2]), by: String(x[3])
  }));
  return { items, hist, pasta: PASTA_FDS, cons: lerConsumiveis_(), defs: lerDefinicoes_() };
}

function getData(pin) {
  const papel = papel_(pin);
  const d = lerTudo_();
  d.papel = papel;
  return d;
}

function linhaDe_(sheet, code) {
  const codes = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1).getValues();
  for (let i = 0; i < codes.length; i++) if (String(codes[i][0]) === code) return i + 2;
  return -1;
}

function registar_(h, code, txt, quem) {
  h.appendRow([new Date(), code, txt, quem || 'Alguém do laboratório']);
}

const EDITAVEIS = ['name', 'cas', 'brand', 'ref', 'cab', 'shelf', 'qty', 'status', 'opened', 'hazard', 'obs', 'sds', 'moved', 'cur'];

function saveItem(pin, code, patch, txt, quem) {
  verificar_(pin);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const { r, h } = folhas_();
    const row = linhaDe_(r, code);
    if (row < 0) throw new Error('Não encontrei o frasco ' + code);
    const head = r.getRange(1, 1, 1, r.getLastColumn()).getValues()[0].map(String);
    const set = (k, v) => {
      const col = head.indexOf(COLS.find(c => c[0] === k)[1]) + 1;
      if (col > 0) r.getRange(row, col).setNumberFormat('@').setValue(v);
    };
    Object.keys(patch || {}).forEach(k => {
      if (EDITAVEIS.indexOf(k) < 0) return;
      let v = patch[k];
      if (k === 'moved') v = v ? 'SIM' : 'NÃO';
      set(k, String(v === null || v === undefined ? '' : v).slice(0, 2000));
    });
    set('updatedAt', Utilities.formatDate(new Date(), 'Europe/Lisbon', 'dd/MM/yyyy HH:mm'));
    set('updatedBy', quem || '');
    registar_(h, code, txt, quem);
  } finally { lock.releaseLock(); }
  const d = lerTudo_(); d.papel = 'editar';
  return d;
}

function addItem(pin, doc, quem) {
  verificar_(pin);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  let code;
  try {
    const { r, h } = folhas_();
    const g = GRUPOS[doc.group] ? doc.group : 'G0';
    const [a, b] = GRUPOS[g];
    const codes = r.getRange(2, 1, Math.max(r.getLastRow() - 1, 1), 1).getValues().map(x => String(x[0]));
    let m = a - 1;
    codes.forEach(c => { const n = parseInt(c.slice(4), 10); if (n >= a && n <= b && n > m) m = n; });
    if (m + 1 > b) throw new Error('O bloco de códigos do grupo ' + g + ' está cheio.');
    code = 'BTX-' + ('000' + (m + 1)).slice(-4);
    const o = Object.assign({}, doc, {
      code, group: g, moved: 'SIM', status: 'Em stock', action: '', photo: '', old: '',
      cur: doc.cab + '-' + doc.shelf, updatedAt: Utilities.formatDate(new Date(), 'Europe/Lisbon', 'dd/MM/yyyy HH:mm'), updatedBy: quem || ''
    });
    const head = r.getRange(1, 1, 1, r.getLastColumn()).getValues()[0].map(String);
    const line = head.map(hd => { const c = COLS.find(x => x[1] === hd); return c ? String(o[c[0]] || '').slice(0, 2000) : ''; });
    const nr = r.getLastRow() + 1;
    r.getRange(nr, 1, 1, line.length).setNumberFormat('@').setValues([line]);
    registar_(h, code, 'Novo frasco registado em ' + doc.cab + (doc.shelf && doc.shelf !== '—' ? ' · ' + doc.shelf : ''), quem);
  } finally { lock.releaseLock(); }
  const d = lerTudo_(); d.papel = 'editar';
  return { code, data: d };
}

/* ---------- Juntar o armário de líquidos a uma folha já carregada (correr UMA vez) ---------- */
function importarArmarioLiquidos() {
  const sh = SpreadsheetApp.openById(FOLHA_ID).getSheetByName('Reagentes');
  const existentes = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues().map(x => String(x[0]));
  const blob = DriveApp.getFileById('12pf-M5xstDD-AH3ZaHiDFSEUrWAbAS1_').getBlob().setContentType('application/x-gzip');
  const novos = Utilities.parseCsv(Utilities.ungzip(blob).getDataAsString('UTF-8'))
    .filter(r => r[0] && existentes.indexOf(r[0]) < 0)
    .map(r => { const x = r.slice(0, COLS.length); while (x.length < COLS.length) x.push(''); return x; });
  if (!novos.length) { Logger.log('Nada a juntar, os frascos do armário de líquidos já lá estão.'); return; }
  const r0 = sh.getLastRow() + 1;
  sh.getRange(r0, 1, novos.length, COLS.length).setNumberFormat('@').setValues(novos);
  Logger.log('Pronto. Juntei ' + novos.length + ' frascos. Total agora ' + (sh.getLastRow() - 1) + '.');
}


/* ================= CONSUMÍVEIS ================= */
const CONS_COLS = [['id', 'ID'], ['name', 'Artigo'], ['cab', 'Armário'], ['shelf', 'Prateleira'], ['size', 'Tamanho'],
  ['qty', 'Quantidade'], ['min', 'Mínimo'], ['obs', 'Notas'], ['updatedAt', 'Actualizado em'], ['updatedBy', 'Actualizado por'], ['type', 'Tipo'], ['photo', 'Foto']];
const CONS_KEYS = CONS_COLS.map(c => c[0]);
// Stock do armário do corredor, da folha "Biotox - Armário Stock" (actualizada a 21/05/2026). O mínimo começa em 1 para todos.
const CONS_INICIAL = [["CON-001", "Caixas de petri 60 mm", "Armário Stock Corredor", "5ª prateleira", "10 uni.", "25", "1", "", "21/05/2026", "", "Placas de Petri"], ["CON-002", "Cuvettes", "Armário Stock Corredor", "3ª prateleira", "100 uni.", "6", "1", "", "21/05/2026", "", "Cuvettes"], ["CON-003", "Luvas latex (Eurotex)", "Armário Stock Corredor", "1ª prateleira", "S", "7", "1", "", "21/05/2026", "", "Luvas"], ["CON-004", "Luvas latex (LLG)", "Armário Stock Corredor", "1ª prateleira", "L", "10", "1", "", "21/05/2026", "", "Luvas"], ["CON-005", "Luvas latex (LLG)", "Armário Stock Corredor", "1ª prateleira", "M", "10", "1", "", "21/05/2026", "", "Luvas"], ["CON-006", "Luvas nitrilo azul (Euromedis)", "Armário Stock Corredor", "1ª prateleira", "L", "6", "1", "", "21/05/2026", "", "Luvas"], ["CON-007", "Luvas nitrilo azul (LLG)", "Armário Stock Corredor", "1ª prateleira", "M", "7", "1", "", "21/05/2026", "", "Luvas"], ["CON-008", "Luvas nitrilo azul (Unigloves)", "Armário Stock Corredor", "1ª prateleira", "S", "2", "1", "", "21/05/2026", "", "Luvas"], ["CON-009", "Luvas nitrilo roxas (Vasco)", "Armário Stock Corredor", "1ª prateleira", "L", "2", "1", "", "21/05/2026", "", "Luvas"], ["CON-010", "Microplacas brancas", "Armário Stock Corredor", "4ª prateleira", "", "50", "1", "", "21/05/2026", "", "Microplacas"], ["CON-011", "Microplacas UV", "Armário Stock Corredor", "2ª prateleira", "", "5", "1", "", "21/05/2026", "", "Microplacas"], ["CON-012", "Microplas non-binding (EROD)", "Armário Stock Corredor", "2ª prateleira", "10 uni.", "2", "1", "", "21/05/2026", "", "Microplacas"], ["CON-013", "Pontas 1 mL azuis (automáticas)", "Armário Stock Corredor", "4ª prateleira", "1000 uni.", "3", "1", "", "21/05/2026", "", "Pontas de pipeta"], ["CON-014", "Pontas 1 mL azuis (não-automáticas)", "Armário Stock Corredor", "4ª prateleira", "1000 uni.", "8", "1", "", "21/05/2026", "", "Pontas de pipeta"], ["CON-015", "Pontas 1-5 mL (automáticas) (Brand)", "Armário Stock Corredor", "2ª prateleira", "200 uni.", "0", "1", "saco aberto com menos de 100 pontas no laboratório", "21/05/2026", "", "Pontas de pipeta"], ["CON-016", "Pontas 1-5 mL (não-automáticas)", "Armário Stock Corredor", "2ª prateleira", "250 uni.", "3", "1", "", "21/05/2026", "", "Pontas de pipeta"], ["CON-017", "Pontas 1-5 mL (não-automáticas) (Eppendorf)", "Armário Stock Corredor", "1ª prateleira", "100 uni.", "7", "1", "", "21/05/2026", "", "Pontas de pipeta"], ["CON-018", "Pontas 20 µL brancas (automáticas)", "Armário Stock Corredor", "4ª prateleira", "1000 uni.", "4", "1", "", "21/05/2026", "", "Pontas de pipeta"], ["CON-019", "Pontas 200 µL amarelas (automáticas)", "Armário Stock Corredor", "2ª prateleira", "1000 uni.", "11", "1", "", "21/05/2026", "", "Pontas de pipeta"], ["CON-020", "Pontas 200 µL amarelas (não-automáticas)", "Armário Stock Corredor", "4ª prateleira", "1000 uni.", "1", "1", "", "21/05/2026", "", "Pontas de pipeta"], ["CON-021", "Pontas 200 µL brancas (automáticas)", "Armário Stock Corredor", "2ª prateleira", "1000 uni.", "4", "1", "", "21/05/2026", "", "Pontas de pipeta"], ["CON-022", "Pontas brancas multicanal (250 µL)", "Armário Stock Corredor", "2ª prateleira", "", "500", "1", "aproximadamente", "21/05/2026", "", "Pontas de pipeta"], ["CON-023", "Pontas brancas multicanal (300 µL)", "Armário Stock Corredor", "2ª prateleira", "1000 uni.", "2", "1", "", "21/05/2026", "", "Pontas de pipeta"], ["CON-024", "Tubos 0,2 mL", "Armário Stock Corredor", "5ª prateleira", "1000 uni.", "5", "1", "", "21/05/2026", "", "Tubos"], ["CON-025", "Tubos 0,2 mL", "Armário Stock Corredor", "5ª prateleira", "500 uni.", "1", "1", "", "21/05/2026", "", "Tubos"], ["CON-026", "Tubos 0,5 mL", "Armário Stock Corredor", "5ª prateleira", "1000 uni.", "9", "1", "", "21/05/2026", "", "Tubos"], ["CON-027", "Tubos 1,5 mL", "Armário Stock Corredor", "3ª prateleira", "500 uni.", "11", "1", "", "21/05/2026", "", "Tubos"], ["CON-028", "Tubos 1,5 mL", "Armário Stock Corredor", "3ª prateleira", "1000 uni.", "1", "1", "", "21/05/2026", "", "Tubos"], ["CON-029", "Tubos 2 mL", "Armário Stock Corredor", "4ª prateleira", "1000 uni.", "3", "1", "", "21/05/2026", "", "Tubos"], ["CON-030", "Tubos com rosca 2 mL", "Armário Stock Corredor", "5ª prateleira", "500 uni.", "1", "1", "", "21/05/2026", "", "Tubos"], ["CON-031", "Tubos criogénicos fundo redondo 2 mL", "Armário Stock Corredor", "5ª prateleira", "50 uni.", "14", "1", "", "21/05/2026", "", "Tubos"]];

/* Correr UMA vez no editor para criar o separador Consumiveis */
function importarConsumiveis() {
  const ss = SpreadsheetApp.openById(FOLHA_ID);
  let sh = ss.getSheetByName('Consumiveis');
  if (!sh) sh = ss.insertSheet('Consumiveis');
  if (sh.getLastRow() > 1) { Logger.log('O separador Consumiveis já tem dados. Não mexi em nada.'); return; }
  const data = [CONS_COLS.map(c => c[1])].concat(CONS_INICIAL);
  sh.getRange(1, 1, data.length + 300, CONS_COLS.length).setNumberFormat('@');
  sh.getRange(1, 1, data.length, CONS_COLS.length).setValues(data);
  sh.getRange(1, 1, 1, CONS_COLS.length).setFontWeight('bold').setBackground('#0d5c6e').setFontColor('#ffffff');
  sh.setFrozenRows(1); sh.autoResizeColumns(1, 2);
  Logger.log('Pronto. ' + CONS_INICIAL.length + ' consumíveis carregados.');
}

function consFolha_() { return SpreadsheetApp.openById(FOLHA_ID).getSheetByName('Consumiveis'); }

function lerConsumiveis_() {
  const sh = consFolha_();
  if (!sh || sh.getLastRow() < 2) return [];
  const vals = sh.getDataRange().getValues();
  const head = vals[0].map(String);
  const idx = CONS_KEYS.map(k => head.indexOf(CONS_COLS.find(c => c[0] === k)[1]));
  const out = [];
  for (let i = 1; i < vals.length; i++) {
    const row = vals[i];
    if (!row[idx[0]]) continue;
    const o = {};
    CONS_KEYS.forEach((k, j) => { o[k] = idx[j] >= 0 ? texto_(row[idx[j]]) : ''; });
    if (!o.type) o.type = tipoConsumivel_(o.name);
    o.qty = parseFloat(String(o.qty).replace(',', '.')) || 0;
    o.min = o.min === '' ? null : (parseFloat(String(o.min).replace(',', '.')) || 0);
    out.push(o);
  }
  return out;
}

function consSet_(sh, row, k, v) {
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const col = head.indexOf(CONS_COLS.find(c => c[0] === k)[1]) + 1;
  if (col > 0) sh.getRange(row, col).setNumberFormat('@').setValue(String(v === null || v === undefined ? '' : v).slice(0, 2000));
}

function consResposta_() { const d = lerTudo_(); d.papel = 'editar'; return d; }

function ajustarConsumivel(pin, id, delta, quem) {
  verificar_(pin);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = consFolha_(); const row = linhaDe_(sh, id);
    if (row < 0) throw new Error('Não encontrei o artigo ' + id);
    const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    const qcol = head.indexOf('Quantidade') + 1;
    const atual = parseFloat(String(sh.getRange(row, qcol).getValue()).replace(',', '.')) || 0;
    const novo = Math.max(0, atual + Number(delta || 0));
    consSet_(sh, row, 'qty', novo);
    consSet_(sh, row, 'updatedAt', Utilities.formatDate(new Date(), 'Europe/Lisbon', 'dd/MM/yyyy HH:mm'));
    consSet_(sh, row, 'updatedBy', quem || '');
    registar_(folhas_().h, id, (delta < 0 ? 'Retirada de ' + (-delta) : 'Reposição de ' + delta) + ' (fica ' + novo + ')', quem);
  } finally { lock.releaseLock(); }
  return consResposta_();
}

const CONS_EDITAVEIS = ['type', 'name', 'cab', 'shelf', 'size', 'qty', 'min', 'obs'];
function guardarConsumivel(pin, id, patch, txt, quem) {
  verificar_(pin);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = consFolha_(); const row = linhaDe_(sh, id);
    if (row < 0) throw new Error('Não encontrei o artigo ' + id);
    Object.keys(patch || {}).forEach(k => { if (CONS_EDITAVEIS.indexOf(k) >= 0) consSet_(sh, row, k, patch[k]); });
    consSet_(sh, row, 'updatedAt', Utilities.formatDate(new Date(), 'Europe/Lisbon', 'dd/MM/yyyy HH:mm'));
    consSet_(sh, row, 'updatedBy', quem || '');
    registar_(folhas_().h, id, txt, quem);
  } finally { lock.releaseLock(); }
  return consResposta_();
}

function novoConsumivel(pin, doc, quem) {
  verificar_(pin);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  let id;
  try {
    const sh = consFolha_();
    if (!sh) throw new Error('Falta correr a função importarConsumiveis no editor do Apps Script.');
    const ids = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(x => String(x[0])) : [];
    let m = 0; ids.forEach(c => { const n = parseInt(c.slice(4), 10); if (n > m) m = n; });
    id = 'CON-' + ('00' + (m + 1)).slice(-3);
    const o = Object.assign({}, doc, { id, updatedAt: Utilities.formatDate(new Date(), 'Europe/Lisbon', 'dd/MM/yyyy HH:mm'), updatedBy: quem || '' });
    const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    const line = head.map(hd => { const c = CONS_COLS.find(x => x[1] === hd); return c ? String(o[c[0]] === undefined || o[c[0]] === null ? '' : o[c[0]]).slice(0, 2000) : ''; });
    sh.getRange(sh.getLastRow() + 1, 1, 1, line.length).setNumberFormat('@').setValues([line]);
    registar_(folhas_().h, id, 'Novo consumível registado (' + (doc.qty || 0) + ')', quem);
  } finally { lock.releaseLock(); }
  return { id, data: consResposta_() };
}


/* Tipo de cada consumível, usado quando o tipo está vazio */
function tipoConsumivel_(nome) {
  const t = String(nome || '').toLowerCase();
  if (t.indexOf('luva') >= 0) return 'Luvas';
  if (t.indexOf('ponta') >= 0) return 'Pontas de pipeta';
  if (t.indexOf('tubo') >= 0) return 'Tubos';
  if (t.indexOf('microplac') >= 0 || t.indexOf('microplas') >= 0) return 'Microplacas';
  if (t.indexOf('petri') >= 0) return 'Placas de Petri';
  if (t.indexOf('cuvet') >= 0) return 'Cuvettes';
  return 'Outros';
}

/* Correr UMA vez: junta a coluna Tipo ao separador Consumiveis e classifica os artigos que ainda não têm tipo */
function classificarConsumiveis() {
  const sh = consFolha_();
  if (!sh) throw new Error('Não existe o separador Consumiveis. Corre primeiro importarConsumiveis.');
  let head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  let col = head.indexOf('Tipo') + 1;
  if (col === 0) {
    col = sh.getLastColumn() + 1;
    sh.getRange(1, col).setValue('Tipo').setFontWeight('bold').setBackground('#0d5c6e').setFontColor('#ffffff');
  }
  const ncol = head.indexOf('Artigo') + 1;
  const n = sh.getLastRow() - 1;
  if (n < 1) return;
  const nomes = sh.getRange(2, ncol, n, 1).getValues();
  const tipos = sh.getRange(2, col, n, 1).getValues();
  let feitos = 0;
  const novos = tipos.map((t, i) => { if (String(t[0]).trim()) return [t[0]]; feitos++; return [tipoConsumivel_(nomes[i][0])]; });
  sh.getRange(2, col, n, 1).setNumberFormat('@').setValues(novos);
  Logger.log('Pronto. Classifiquei ' + feitos + ' consumíveis.');
}


/* ================= DEFINIÇÕES ================= */
function defFolha_() {
  const ss = SpreadsheetApp.openById(FOLHA_ID);
  let sh = ss.getSheetByName('Definicoes');
  if (!sh) {
    sh = ss.insertSheet('Definicoes');
    sh.getRange(1, 1, 1, 2).setValues([['Chave', 'Valor']]).setFontWeight('bold').setBackground('#0d5c6e').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}
function lerDefinicoes_() {
  const ss = SpreadsheetApp.openById(FOLHA_ID);
  const sh = ss.getSheetByName('Definicoes');
  const out = { minDefault: 1, mins: {} };
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(r => {
    const k = String(r[0]), v = parseFloat(String(r[1]).replace(',', '.'));
    if (isNaN(v)) return;
    if (k === 'minDefault') out.minDefault = v;
    else if (k.indexOf('min:') === 0) out.mins[k.slice(4)] = v;
  });
  return out;
}
/* defs = { minDefault: n, mins: { 'Luvas': 5, ... } }; aplicar = true muda o mínimo de todos os artigos desses tipos */
function guardarDefinicoes(pin, defs, aplicar, quem) {
  verificar_(pin);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = defFolha_();
    const rows = [['minDefault', String(Number(defs.minDefault) || 0)]];
    Object.keys(defs.mins || {}).forEach(t => { const v = defs.mins[t]; if (v !== '' && v !== null && !isNaN(Number(v))) rows.push(['min:' + t, String(Number(v))]); });
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 2).clearContent();
    sh.getRange(2, 1, rows.length, 2).setNumberFormat('@').setValues(rows);
    let mudados = 0;
    if (aplicar) {
      const cs = consFolha_();
      if (cs && cs.getLastRow() > 1) {
        const head = cs.getRange(1, 1, 1, cs.getLastColumn()).getValues()[0].map(String);
        const tcol = head.indexOf('Tipo'), ncol = head.indexOf('Artigo'), mcol = head.indexOf('Mínimo');
        const n = cs.getLastRow() - 1;
        const vals = cs.getRange(2, 1, n, cs.getLastColumn()).getValues();
        const mins = vals.map(r => {
          const t = (tcol >= 0 && String(r[tcol]).trim()) || tipoConsumivel_(r[ncol]);
          const v = defs.mins && defs.mins[t] !== undefined && defs.mins[t] !== '' ? Number(defs.mins[t]) : null;
          if (v === null || isNaN(v)) return [r[mcol]];
          if (String(r[mcol]) !== String(v)) mudados++;
          return [String(v)];
        });
        if (mcol >= 0) cs.getRange(2, mcol + 1, n, 1).setNumberFormat('@').setValues(mins);
      }
    }
    registar_(folhas_().h, 'DEF', 'Definições alteradas' + (aplicar ? ' (' + mudados + ' mínimos actualizados)' : ''), quem);
  } finally { lock.releaseLock(); }
  return consResposta_();
}

/* ================= ENCOMENDAS E ARQUIVO ================= */
function pastaEncomendas_() {
  const base = DriveApp.getFolderById(PASTA_BASE_ID);
  const it = base.getFoldersByName(PASTA_ENCOMENDAS);
  return it.hasNext() ? it.next() : base.createFolder(PASTA_ENCOMENDAS);
}
/* Qualquer código válido (edição ou consulta) pode exportar uma encomenda */
function exportarEncomenda(pin, base64, meta, quem) {
  papel_(pin);
  const b64 = String(base64 || '').replace(/^data:image\/png;base64,/, '');
  if (!b64 || b64.length > 15000000) throw new Error('Imagem inválida.');
  const agora = new Date();
  const nome = 'Encomenda BIOTOX ' + Utilities.formatDate(agora, 'Europe/Lisbon', 'yyyy-MM-dd HH.mm') + (quem ? ' - ' + String(quem).slice(0, 40) : '') + '.png';
  const blob = Utilities.newBlob(Utilities.base64Decode(b64), 'image/png', nome);
  const f = pastaEncomendas_().createFile(blob);
  f.setDescription(JSON.stringify({ by: String(quem || '').slice(0, 60), n: Number(meta && meta.n) || 0 }));
  registar_(folhas_().h, 'ENC', 'Encomenda exportada (' + ((meta && meta.n) || 0) + ' artigos)', quem);
  return { id: f.getId(), name: nome, url: f.getUrl() };
}
function listarArquivo(pin) {
  papel_(pin);
  const files = pastaEncomendas_().getFiles();
  const out = [];
  while (files.hasNext()) {
    const f = files.next();
    if (f.getMimeType() !== 'image/png') continue;
    let meta = {}; try { meta = JSON.parse(f.getDescription() || '{}'); } catch (e) { }
    out.push({ id: f.getId(), name: f.getName(), at: f.getDateCreated().getTime(), by: meta.by || '', n: meta.n || 0, url: f.getUrl(), size: f.getSize() });
  }
  out.sort((a, b) => b.at - a.at);
  return { files: out, folder: pastaEncomendas_().getUrl() };
}
function ficheiroArquivo_(id) {
  const f = DriveApp.getFileById(id);
  const pasta = pastaEncomendas_().getId();
  const pais = f.getParents();
  while (pais.hasNext()) if (pais.next().getId() === pasta) return f;
  throw new Error('Este ficheiro não pertence ao arquivo de encomendas.');
}
function verArquivo(pin, id) {
  papel_(pin);
  const f = ficheiroArquivo_(id);
  return 'data:image/png;base64,' + Utilities.base64Encode(f.getBlob().getBytes());
}
/* Só quem tem o código de edição pode apagar (vai para o lixo do Drive, recuperável durante 30 dias) */
function apagarArquivo(pin, id, quem) {
  verificar_(pin);
  const f = ficheiroArquivo_(id);
  const nome = f.getName();
  f.setTrashed(true);
  registar_(folhas_().h, 'ENC', 'Exportação apagada: ' + nome, quem);
  return listarArquivo(pin);
}


/* ================= FOTOGRAFIAS ================= */
// Ficam em Lab Stock › Fotografias › Reagentes / Consumíveis. Na folha, a coluna Foto guarda os IDs do Drive separados por vírgulas.
const PASTA_FOTOS = 'Fotografias';
const LINK_PUBLICO_ = f => { try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { } };

function subpasta_(pai, nome) {
  const it = pai.getFoldersByName(nome);
  return it.hasNext() ? it.next() : pai.createFolder(nome);
}
function pastaFotos_(nome) {
  const raiz = subpasta_(DriveApp.getFolderById(PASTA_BASE_ID), PASTA_FOTOS);
  const p = subpasta_(raiz, nome);
  return p;
}
function idsFoto_(v) {
  return String(v || '').split(/[,\s]+/).filter(x => /^[\w-]{20,}$/.test(x));
}
function folhaFoto_(kind) {
  if (kind === 'r') return { sh: folhas_().r, pasta: 'Reagentes' };
  if (kind === 'c') { const sh = consFolha_(); if (!sh) throw new Error('Falta o separador Consumiveis.'); return { sh, pasta: 'Consumíveis' }; }
  throw new Error('Tipo de artigo desconhecido.');
}
function colFoto_(sh) {
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  let c = head.indexOf('Foto') + 1;
  if (!c) {
    c = sh.getLastColumn() + 1;
    sh.getRange(1, c).setValue('Foto').setFontWeight('bold').setBackground('#0d5c6e').setFontColor('#ffffff');
    sh.getRange(2, c, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('@');
  }
  return c;
}
function blobFoto_(base64, nome) {
  const m = String(base64 || '').match(/^data:(image\/[\w.+-]+);base64,(.*)$/);
  const b64 = m ? m[2] : String(base64 || '');
  if (!b64 || b64.length > 20000000) throw new Error('Imagem inválida ou demasiado grande.');
  const tipo = m ? m[1] : 'image/jpeg';
  return Utilities.newBlob(Utilities.base64Decode(b64), tipo, nome);
}
function nomeFicheiro_(id, nome) {
  const limpo = String(nome || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  return id + (limpo ? ' - ' + limpo : '') + ' ' + Utilities.formatDate(new Date(), 'Europe/Lisbon', 'yyyy-MM-dd HH.mm.ss') + '.jpg';
}

/* Junta uma fotografia (ficheiro ou câmara) a um reagente ('r') ou consumível ('c'). Só editores. */
function adicionarFoto(pin, kind, id, base64, quem) {
  verificar_(pin);
  const { sh, pasta } = folhaFoto_(kind);
  let row = linhaDe_(sh, id);
  if (row < 0) throw new Error('Não encontrei ' + id);
  const nomeItem = String(sh.getRange(row, 2).getValue());
  const f = pastaFotos_(pasta).createFile(blobFoto_(base64, nomeFicheiro_(id, nomeItem)));
  LINK_PUBLICO_(f);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  let ids;
  try {
    row = linhaDe_(sh, id);
    if (row < 0) { f.setTrashed(true); throw new Error('Não encontrei ' + id); }
    const c = colFoto_(sh);
    ids = idsFoto_(sh.getRange(row, c).getValue()).concat(f.getId());
    sh.getRange(row, c).setNumberFormat('@').setValue(ids.join(','));
    registar_(folhas_().h, id, 'Fotografia adicionada', quem);
  } finally { lock.releaseLock(); }
  return { id, photo: ids.join(',') };
}

/* Tira uma fotografia do artigo e manda o ficheiro para o lixo do Drive (recuperável 30 dias). Só editores. */
function removerFoto(pin, kind, id, fileId, quem) {
  verificar_(pin);
  const { sh, pasta } = folhaFoto_(kind);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  let ids;
  try {
    const row = linhaDe_(sh, id);
    if (row < 0) throw new Error('Não encontrei ' + id);
    const c = colFoto_(sh);
    ids = idsFoto_(sh.getRange(row, c).getValue()).filter(x => x !== fileId);
    sh.getRange(row, c).setNumberFormat('@').setValue(ids.join(','));
    registar_(folhas_().h, id, 'Fotografia removida', quem);
  } finally { lock.releaseLock(); }
  try {
    const f = DriveApp.getFileById(fileId), alvo = pastaFotos_(pasta).getId(), pais = f.getParents();
    while (pais.hasNext()) if (pais.next().getId() === alvo) { f.setTrashed(true); break; }
  } catch (e) { }
  return { id, photo: ids.join(',') };
}

/* Importação inicial: as fotografias dos frascos tiradas no inventário (a coluna Foto ainda tem o nome do ficheiro).
   Recebe um lote [{nome, base64}] e troca, em todos os frascos com esse nome, o nome pelo ID da fotografia no Drive. */
function importarFotosIniciais(pin, lote) {
  verificar_(pin);
  const { sh } = folhaFoto_('r');
  const pasta = pastaFotos_('Reagentes');
  const c = colFoto_(sh);
  const n = sh.getLastRow() - 1;
  if (n < 1) return { feitos: [] };
  const codes = sh.getRange(2, 1, n, 1).getValues().map(x => String(x[0]));
  const nomes = sh.getRange(2, 2, n, 1).getValues().map(x => String(x[0]));
  const criados = [];
  const atuais = sh.getRange(2, c, n, 1).getValues().map(x => String(x[0]).trim());
  (lote || []).slice(0, 12).forEach(o => {
    const linhas = atuais.map((v, i) => v === o.nome ? i : -1).filter(i => i >= 0);
    if (!linhas.length) return;
    const lista = linhas.map(i => codes[i]).join(' ');
    const f = pasta.createFile(blobFoto_(o.base64, lista + ' - ' + nomes[linhas[0]].replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 50) + '.jpg'));
    f.setDescription('Fotografia do inventário: ' + o.nome);
    LINK_PUBLICO_(f);
    criados.push({ nome: o.nome, id: f.getId() });
  });
  const feitos = [];
  if (criados.length) {
    const lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      const rg = sh.getRange(2, c, n, 1);
      const vals = rg.getValues();
      criados.forEach(cr => {
        let usado = false;
        vals.forEach((v, i) => {
          if (String(v[0]).trim() === cr.nome) { v[0] = cr.id; usado = true; feitos.push({ code: codes[i], photo: cr.id }); }
        });
        if (!usado) DriveApp.getFileById(cr.id).setTrashed(true);
      });
      rg.setNumberFormat('@').setValues(vals);
    } finally { lock.releaseLock(); }
  }
  return { feitos };
}
