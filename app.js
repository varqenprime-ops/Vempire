// ── CONFIGURAÇÕES E CONSTANTES ──
const STORE_KEY_PREFIX = 'journey-tracker-pro-v2';
let STORE_KEY = STORE_KEY_PREFIX;
const L_BASE = 1014.02, L_C61_PERC = 0.50, L_NOTURNO_FIXO = 101.40, L_DIUTURNIDADE = 24.63;
const L_ADR_DIARIO = 7.50, L_OP_DIARIO = 3.25, L_CISTERNA = 125.00;

const TABELAS = { nacional: 1014.02, iberico: 1014.02, internacional: 1014.02 };
const C75_VALORES = { nacional: 0, iberico: 115.00, internacional: 135.00 };
const COMPLEMENTOS = { nacional: 0.02, iberico: 0.03, internacional: 0.05 };

let DB = {
    auth: false,
    config: { 
        tabela: 'nacional', base: L_BASE, diuValor: L_DIUTURNIDADE, 
        markers: [], kmEscaloes: [{ate: 1500, valor: 0.10}, {ate: 99999, valor: 0.20}] 
    },
    events: {}
};

// ── PERSISTÊNCIA ──
function loadUserDB(id) {
    STORE_KEY = `${STORE_KEY_PREFIX}_${id.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const saved = localStorage.getItem(STORE_KEY);
    if (saved) DB = JSON.parse(saved);
    else {
        // Tentar buscar da chave prefixo se for migração
        const old = localStorage.getItem(STORE_KEY_PREFIX);
        if (old) DB = JSON.parse(old);
    }
    // Garantir estrutura mínima
    DB.events = DB.events || {};
    DB.config = { ...DB.config, ...JSON.parse(saved || '{}').config };
}

const DB_SAVE = () => localStorage.setItem(STORE_KEY, JSON.stringify(DB));

// ── MOTOR DE CÁLCULO CCT 2026 (CORE) ──
function calcSalary(forcedDate = new Date()) {
    const cfg = DB.config;
    const legalBase = TABELAS[cfg.tabela] || L_BASE;
    const diuturnidades = (cfg.diuturnidades || 0) * (cfg.diuValor || L_DIUTURNIDADE);
    
    const percC = COMPLEMENTOS[cfg.tabela] || 0.02;
    const compPerc = legalBase * percC;
    const c75 = C75_VALORES[cfg.tabela] || 0;
    const c61 = (legalBase + diuturnidades + compPerc) * L_C61_PERC;
    
    const noturno = cfg.noturnoEnabled ? L_NOTURNO_FIXO : 0;
    const bruto = (cfg.base || legalBase) + diuturnidades + c61 + compPerc + c75 + noturno + (cfg.cisternaEnabled ? L_CISTERNA : 0) + (cfg.adrEnabled ? 22 * L_ADR_DIARIO : 0);

    // Subsídios
    const natalVal = (cfg.base + diuturnidades + compPerc);
    const feriasVal = natalVal + L_NOTURNO_FIXO + c61 + c75;
    
    let duoTotal = 0;
    if (cfg.duoEnabled) duoTotal = (natalVal + feriasVal) / 12;
    else if (forcedDate.getMonth() === (cfg.subNatalMonth || 11)) duoTotal += natalVal;
    else if (forcedDate.getMonth() === (cfg.subFeriasMonth || 6)) duoTotal += feriasVal;

    // Impostos Simp.
    let irsRate = bruto > 1600 ? 0.15 : bruto > 1200 ? 0.125 : bruto > 950 ? 0.08 : 0;
    irsRate = Math.max(0, irsRate - ((cfg.filhos || 0) * 0.01) - (cfg.civil === 'casado' ? 0.005 : 0));

    return {
        bruto, duoTotal, irsRate,
        ssTotal: (bruto + duoTotal) * 0.11,
        irsTotal: (bruto + duoTotal) * irsRate,
        liquidoTotal: (bruto + duoTotal) * 0.89 - ((bruto + duoTotal) * irsRate)
    };
}

// ── UI GLUE ──
function updateFixoUI() {
    const s = calcSalary();
    const fmt = (v) => (v || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    // Atualizar labels básicos se existirem
    const ids = {
        'lbl-fixo-liq': s.liquidoTotal,
        'lbl-bruto-total': s.bruto,
        'lbl-comp-diu': (DB.config.diuturnidades || 0) * (DB.config.diuValor || L_DIUTURNIDADE),
        'lbl-ss': s.ssTotal,
        'lbl-irs': s.irsTotal
    };

    for (const [id, val] of Object.entries(ids)) {
        const el = document.getElementById(id);
        if (el) el.innerText = '€ ' + fmt(val);
    }
}

function showApp() {
    document.getElementById('login-screen')?.classList.add('hidden');
    document.getElementById('app-screen')?.classList.remove('hidden');
    initApp();
    switchView('profile');
}

function switchView(v) {
    ['profile', 'calendar', 'report'].forEach(x => {
        document.getElementById('view-' + x)?.classList.add('hidden');
    });
    document.getElementById('view-' + v)?.classList.remove('hidden');
}

function doLogout() {
    DB.auth = false;
    DB_SAVE();
    location.reload();
}

// ── UI HELPERS ──
function initApp() {
    // Bind automático de inputs simples
    ['nome', 'matricula', 'civil', 'filhos', 'base', 'tabela', 'diuturnidades'].forEach(k => {
        const el = document.getElementById(`cfg-${k}`);
        if (!el) return;
        el.value = DB.config[k] || '';
        el.oninput = () => { 
            DB.config[k] = el.type === 'number' ? +el.value : el.value; 
            DB_SAVE(); updateFixoUI(); 
        };
    });

    // Checkboxes
    ['heavyVehicle', 'noturnoEnabled', 'adrEnabled', 'cisternaEnabled', 'duoEnabled', 'kmEnabled'].forEach(k => {
        const el = document.getElementById(`cfg-${k}`);
        if (!el) return;
        el.checked = !!DB.config[k];
        el.onchange = () => { DB.config[k] = el.checked; DB_SAVE(); updateFixoUI(); };
    });
    
    updateFixoUI();
}

// ── AUTH ──
document.getElementById('btn-login')?.addEventListener('click', () => {
    const id = document.getElementById('l-email')?.value.trim();
    if (!id) return alert('Insira um nome/email');
    loadUserDB(id);
    DB.auth = true;
    DB_SAVE();
    showApp();
});

// ── AUTO-RESTAURAR ──
(function() {
    const lastId = localStorage.getItem(STORE_KEY_PREFIX + '_last_id');
    if (lastId) {
        loadUserDB(lastId);
        if (DB.auth) showApp();
    }
})();

// ── EXPORTAÇÃO SIMPLIFICADA ──
function getShareText() {
    const s = calcSalary();
    return `*Relatório Journey Tracker*\nBruto: €${s.bruto.toFixed(2)}\nLíquido: €${s.liquidoTotal.toFixed(2)}`;
}

window.switchView = switchView;
window.doLogout = doLogout;
window.calcSalary = calcSalary;