

        // ── MULTI-PERFIL: chave dinâmica por email ──

        const STORE_KEY_PREFIX = 'journey-tracker-pro-v2';

        let STORE_KEY = STORE_KEY_PREFIX;

        function getStoreKey(id) {

            return STORE_KEY_PREFIX + '_' + id.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');

        }

        // LEGAIS (Constantes CCT 2026 - Portugal)

        const L_BASE = 1014.02;

        const L_C61_PERC = 0.50; // Ajustado para 50% (Cl\u00E1usula 74.\u00AA)

        const L_NOTURNO_FIXO = 101.40;

        const L_DIUTURNIDADE = 24.63;

        const L_CISTERNA = 125.00;

        const L_ADR_DIARIO = 7.50;

        const L_OP_DIARIO = 3.25;

        // Cl\u00E1usula 75.\u00AA - Tir de Acordo com o Servi\u00E7o

        const C75_VALORES = {

            nacional: 0,

            iberico: 115.00,

            internacional: 135.00

        };

        const MARKERS = [
            { id: 'trabalho', label: 'Trabalho / Estrada', color: '#22c55e', value: 0 },
            { id: 'fds_fora', label: 'FDS Fora', color: '#3b82f6', value: 0 },
            { id: 'adr', label: 'ADR (Dia)', color: '#f97316', value: L_ADR_DIARIO },
            { id: 'op', label: 'Opera\u00E7\u00F5es (Dia)', color: '#a855f7', value: L_OP_DIARIO },
            { id: 'ferias', label: 'F\u00E9rias / Folga', color: '#eab308', value: 0 }
        ];

        const COMPLEMENTOS = {

            nacional: 0.02,

            iberico: 0.03,

            internacional: 0.05

        };

        const COMPLEMENTOS_PESADOS = {

            nacional: 0.02,

            iberico: 0.03,

            internacional: 0.05

        };

        const EMOJIS = ['🚀', '☕', '🛌', '🔧', '💰', '❌'];

        const TABELAS = {

            nacional: { base: 1014.02 },

            iberico: { base: 1014.02 },

            internacional: { base: 1014.02 }

        };

        let defaultDB = {

            auth: false,

            config: {

                nome: '', matricula: '', civil: 'solteiro', filhos: 0,

                tabela: 'nacional',

                adrEnabled: true,

                adrMensal: 176.88,

                duoEnabled: false,

                noturnoEnabled: true,

                heavyVehicle: false,

                diuturnidades: 0,

                diuValor: 24.63,        // Valor unit\u00E1rio por diuturnidade

                complementoFixo: 0,     // Complemento fixo (Cisterna)

                base: 1014.02,

                theme: 'dark',

                emojiIcons: ['🚀', '☕', '🛌', '🔧', '💰', '❌'],

                kmEscaloes: [

                    { id: 1, ate: 1500, valor: 0.10 },

                    { id: 2, ate: 99999, valor: 0.20 }

                ]

            },

            events: {}

        };

        // Persist\u00EAncia de Dados

        let DB = JSON.parse(JSON.stringify(defaultDB));

        function loadUserDB(id) {
            if (!id) return;
            const userStoreKey = getStoreKey(id);
            let saved = localStorage.getItem(userStoreKey);

            // Migração: se não existir chave com email, tenta a chave antiga global
            if (!saved) {
                const old = localStorage.getItem(STORE_KEY_PREFIX);
                if (old) {
                    localStorage.setItem(userStoreKey, old);
                    saved = old;
                }
            }

            if (saved) {
                try {
                    DB = JSON.parse(saved);
                } catch (e) {
                    DB = JSON.parse(JSON.stringify(defaultDB));
                }
            } else {
                DB = JSON.parse(JSON.stringify(defaultDB));
            }

            if (!DB.events) DB.events = {};
            if (!DB.config) DB.config = { ...defaultDB.config };
            if (!DB.config.markers) {
                DB.config.markers = JSON.parse(JSON.stringify(MARKERS));
            }

            // Migration: Strip emojis from existing marker labels as per user request
            if (DB.config.markers) {
                DB.config.markers.forEach(m => {
                    if (m.label) {
                        m.label = m.label.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDFFF]|[\u2011-\u27BF]/g, '').trim();
                    }
                });
            }

            // Defaults and missing fields
            if (!DB.config.emojis) DB.config.emojis = EMOJIS.map(e => ({ icon: e, value: 0 }));
            if (DB.config.tabela === undefined) DB.config.tabela = 'nacional';
            if (DB.config.adrEnabled === undefined) DB.config.adrEnabled = false;
            if (DB.config.adrDias === undefined) DB.config.adrDias = 22;
            if (DB.config.diuEnabled === undefined) DB.config.diuEnabled = false;
            if (DB.config.diuValor === undefined) DB.config.diuValor = 24.63;
            if (DB.config.cisternaEnabled === undefined) DB.config.cisternaEnabled = false;
            if (DB.config.complementoFixo === undefined) DB.config.complementoFixo = 0;
            if (DB.config.base === undefined) DB.config.base = TABELAS.nacional.base;

            if (DB.config.kmEnabled === undefined) DB.config.kmEnabled = true;

            if (!DB.config.kmEscaloes) DB.config.kmEscaloes = [

                { id: Date.now(), ate: 1500, valor: 0.10 },

                { id: Date.now() + 1, ate: 99999, valor: 0.20 }

            ];


            // Migration Fix v18
            try {
                const isMangled = (s) => s && (s.includes('\u0192') || s.includes('\u00F8') || s.includes('\u00AD') || s.includes('­'));
                if (DB.config.emojiIcons) {
                    let changed = false;
                    DB.config.emojiIcons = DB.config.emojiIcons.map(i => {
                        if (isMangled(i)) { changed = true; return '\ud83d\ude80'; }
                        return i;
                    });
                    if (changed) DB_SAVE();
                }
            } catch(e) { console.error("Migration failed", e); }
        }

        let pdfPieInstance = null;

        let pdfBarInstance = null;

        let uiPieInstance = null;

        let uiBarInstance = null;

        function DB_SAVE() {

            // Guardar config E eventos no localStorage

            localStorage.setItem(STORE_KEY, JSON.stringify(DB));

        }

        // ════════════════════════════════════════════════════

        // MOTOR DE CÁLCULO CCT 2026 — FONTE ÚNICA DE VERDADE

        // ════════════════════════════════════════════════════

        function calcSalary(forcedDate) {

            const workingDate = forcedDate || curDate;

            // ── Vari\u00E1veis de Entrada ──

            const base = DB.config.base || L_BASE;

            // The legal base from the table is what C61 is calculated on, NOT the user overridden base

            const legalBaseForC61 = DB.config.tabela ? TABELAS[DB.config.tabela].base : L_BASE;

            const diuValor = DB.config.diuValor ?? L_DIUTURNIDADE;

            const nDiu = DB.config.diuturnidades || 0;

            const noturnoOn = !!DB.config.noturnoEnabled;

            const adrOn = !!DB.config.adrEnabled;

            const cisternaOn = !!DB.config.cisternaEnabled;

            const duoOn = !!DB.config.duoEnabled;

            // ── Passo 1: O Fixo ──

            const diuturnidades = nDiu * diuValor;

            // ── Passo 2: Cl\u00E1usulas ──

            // C61 incide sobre (Base Legal + Diuturnidades)

            const percC = (DB.config.heavyVehicle ? COMPLEMENTOS_PESADOS : COMPLEMENTOS)[DB.config.tabela] || 0.02;

            const compPerc = legalBaseForC61 * percC;

            const c75 = C75_VALORES[DB.config.tabela] || 0; // Cl\u00E1usula 75 Ib\u00E9rica/Internacional

            // C61 incide sobre (Base Legal + Diuturnidades + Complementos)

            const c61 = (legalBaseForC61 + diuturnidades + compPerc) * L_C61_PERC;

            const noturno = noturnoOn ? L_NOTURNO_FIXO : 0;

            const cisterna = cisternaOn ? L_CISTERNA : 0;

            const adr = adrOn ? (22 * L_ADR_DIARIO) : 0;

            const operacoes = 0; // Calculado no calend\u00E1rio

            // ── Bruto Mensal (Gaveta 1 — base para escal\u00E3o IRS) ──

            const bruto = base + diuturnidades + c61 + compPerc + c75 + noturno + cisterna + adr + operacoes;

            // ── Passo 3 & 4: Duod\u00E9cimos (Gaveta 2) ou Subs\u00EDdios Integrais ──

            // Natal mant\u00E9m a f\u00F3rmula original (Base + Diuturnidades + Complemento)

            // F\u00E9rias inclui todas as cl\u00E1usulas: Base + Diuturnidades + Complemento + Noturno (10%) + C61 (50%) + C75

            const natalVal = (base + diuturnidades + compPerc);

            const feriasVal = natalVal + L_NOTURNO_FIXO + c61 + c75;

            let duoNatal = 0;

            let duoFerias = 0;

            if (duoOn) {

                duoNatal = natalVal / 12;

                duoFerias = feriasVal / 12;

            } else {

                const currentMonth = workingDate.getMonth();

                const subNatalM = DB.config.subNatalMonth ?? 11;

                const subFeriasM = DB.config.subFeriasMonth ?? 6;

                if (currentMonth === subNatalM) duoNatal = natalVal;

                if (currentMonth === subFeriasM) duoFerias = feriasVal;

            }

            const duoTotal = duoNatal + duoFerias;

            // ── IRS 2026: taxa sobre Bruto (Gaveta 1), aplicada às duas gavetas de forma aut\u00F3noma ──

            let irsRate = 0;

            if (bruto <= 950) irsRate = 0;

            else if (bruto <= 1200) irsRate = 0.08;

            else if (bruto <= 1600) irsRate = 0.125;

            else irsRate = 0.15;

            const filhos = DB.config.filhos || 0;

            irsRate = Math.max(0, irsRate - (filhos * 0.01));

            if (DB.config.civil === 'casado') irsRate = Math.max(0, irsRate - 0.005);

            const irsSalario = bruto * irsRate;

            const irsDuo = duoTotal * irsRate;   // mesma taxa, gaveta aut\u00F3noma

            const irsTotal = irsSalario + irsDuo;

            // ── SS (11%) sobre TUDO ──

            const ssTotal = (bruto + duoTotal) * 0.11;

            // ── L\u00EDquidos ──

            const liquido = bruto - (bruto * 0.11) - irsSalario;

            const liquidoDuo = duoTotal - (duoTotal * 0.11) - irsDuo;

            const totalDesc = ssTotal + irsTotal;

            const totalAbono = bruto + duoTotal;

            const liquidoTotal = totalAbono - totalDesc;

            return {

                // abonos

                base, diuturnidades, c61, compPerc, c75, noturno, adr, cisterna,

                duoNatal, duoFerias, duoTotal,

                bruto, totalAbono,

                // descontos

                ssTotal, irsSalario, irsDuo, irsTotal, totalDesc,

                // l\u00EDquidos

                irsRate, liquido, liquidoDuo, liquidoTotal

            };

        }

        // ── Compatibilidade com chamadas existentes ──

        function getTotalBruto(d) { return calcSalary(d).bruto; }

        function getDuodecimos(d) { const s = calcSalary(d); return { natal: s.duoNatal, ferias: s.duoFerias, total: s.duoTotal }; }

        function getIRSRate(d) { return calcSalary(d).irsRate; }

        function getIRS(d) { const s = calcSalary(d); return s.irsTotal; }

        function getSS(d) { return calcSalary(d).ssTotal; }

        function getFixoLiquido(d) { const s = calcSalary(d); return { salLiquido: s.liquido, duoLiquido: s.liquidoDuo, total: s.liquidoTotal }; }

        // ── LAW RESETS

        function resetToLaw(key) {

            if (key === 'base') {

                DB.config.base = L_BASE;

                const el = document.getElementById('cfg-base');

                if (el) el.value = L_BASE;

            } else if (key === 'diuValor') {

                DB.config.diuValor = L_DIUTURNIDADE;

                const el = document.getElementById('cfg-diuValor');

                if (el) el.value = L_DIUTURNIDADE;

            }

            DB_SAVE();

            updateFixoUI();

        }

        function updateLawWarnings() {

            const rsBase = document.getElementById('rs-base');

            if (rsBase) rsBase.classList.toggle('hidden', Math.abs((DB.config.base || L_BASE) - L_BASE) < 0.01);

            const rsDiu = document.getElementById('rs-diu-valor');

            if (rsDiu) rsDiu.classList.toggle('hidden', Math.abs((DB.config.diuValor || L_DIUTURNIDADE) - L_DIUTURNIDADE) < 0.01);

        }

        // ── AUTH ──

        function isProfileComplete() {

            return DB.config.nome && DB.config.matricula && DB.config.civil;

        }

        function showApp() {

            document.getElementById('login-screen').classList.add('hidden');

            document.getElementById('app-screen').classList.remove('hidden');

            initApp();

            if (!isProfileComplete()) {

                document.getElementById('onboarding-overlay').classList.remove('hidden');

            } else {

                navTo('profile');

                buildCalendar();

            }

        }

        function doLogout() {

            DB.auth = false;

            DB_SAVE();

            location.reload();

        }

        document.getElementById('btn-login').addEventListener('click', () => {

            const id = document.getElementById('l-email').value.trim();

            const pass = document.getElementById('l-password').value;

            if (!id || pass.length < 4) return alert('Preenche o nome/email e uma senha com pelo menos 4 caracteres.');

            localStorage.setItem(STORE_KEY_PREFIX + '_last_id', id);

            loadUserDB(id);

            DB.auth = true;

            DB_SAVE();

            showApp();

        });

        const btnSaveOnb = document.getElementById('btn-save-onboarding');

        if (btnSaveOnb) {

            btnSaveOnb.onclick = () => {

                const nome = document.getElementById('onb-nome').value.trim();

                const matricula = document.getElementById('onb-matricula').value.trim();

                const civil = document.getElementById('onb-civil').value;

                const filhos = +document.getElementById('onb-filhos').value || 0;

                const errEl = document.getElementById('onb-error');

                if (!nome || !matricula) {

                    if (errEl) errEl.style.display = 'block';

                    if (!nome) document.getElementById('onb-nome').style.boxShadow = '0 0 0 2px #ff5555';

                    if (!matricula) document.getElementById('onb-matricula').style.boxShadow = '0 0 0 2px #ff5555';

                    return;

                }

                

                if (errEl) errEl.style.display = 'none';

                document.getElementById('onb-nome').style.boxShadow = 'none';

                document.getElementById('onb-matricula').style.boxShadow = 'none';

                DB.config.nome = nome;

                DB.config.matricula = matricula;

                DB.config.civil = civil;

                DB.config.filhos = filhos;

                DB.config.base = L_BASE;

                DB.config.diuValor = L_DIUTURNIDADE;

                DB.config.diuturnidades = 0;

                DB.config.tabela = 'nacional';

                DB.config.heavyVehicle = false;

                DB.config.noturnoEnabled = true;

                DB.config.adrEnabled = false;

                DB.config.cisternaEnabled = false;

                DB.config.duoEnabled = false;

                DB_SAVE();

                document.getElementById('onboarding-overlay').classList.add('hidden');

                initApp();

                navTo('profile');

                buildCalendar();

            };

        }

        // ── NAVIGATION ──

        const views = ['calendar', 'profile', 'report'];

        

        function switchView(v, updateSidebar = true) {

            console.log('SWITCHVIEW V4.1:', v);

            const views = ['profile', 'calendar', 'report'];

            views.forEach(x => {

                const el = document.getElementById('view-' + x);

                if (el) el.classList.add('hidden');

            });

            const target = document.getElementById('view-' + v);

            if (target) target.classList.remove('hidden');

            if (updateSidebar) {

                const ids = {

                    'profile': 'side-nav-profile',

                    'calendar': 'side-nav-calendar',

                    'report': 'side-nav-report'

                };

                document.querySelectorAll('.nav-item-new').forEach(item => {

                    item.classList.remove('active');

                });

                const targetId = ids[v];

                const targetItem = document.getElementById(targetId);

                if (targetItem) {

                    targetItem.classList.add('active');

                    console.log('Highlight set on:', targetId);

                }

            }

            // Close sidebar on mobile after clicking an item

            if (window.innerWidth <= 768) {

                const sidebar = document.querySelector('.sidebar');

                if (sidebar) sidebar.classList.remove('show');

                const backdrop = document.getElementById('sidebar-backdrop');

                if (backdrop) backdrop.classList.add('hidden');

            }

            window.scrollTo(0, 0);

            if (v === 'report') renderReportUI();

            if (v === 'calendar') buildCalendar();

        }

        function toggleSidebar() {

            const sidebar = document.querySelector('.sidebar');

            const backdrop = document.getElementById('sidebar-backdrop');

            if (sidebar) {

                const isShowing = sidebar.classList.toggle('show');

                if (backdrop) {

                    if (isShowing) backdrop.classList.remove('hidden');

                    else backdrop.classList.add('hidden');

                }

            }

        }

        // Keep navTo for compatibility if referenced elsewhere, but point to switchView

        function navTo(v) { switchView(v); }

        let currentRptView = 'month';

        document.getElementById('btn-view-month').onclick = () => {

            currentRptView = 'month';

            document.getElementById('btn-view-month').classList.add('active');

            document.getElementById('btn-view-year').classList.remove('active');

            document.getElementById('rpt-monthly-view').classList.remove('hidden');

            document.getElementById('rpt-annual-view').classList.add('hidden');

            renderReportUI();

        };

        document.getElementById('btn-view-year').onclick = () => {

            currentRptView = 'year';

            document.getElementById('btn-view-year').classList.add('active');

            document.getElementById('btn-view-month').classList.remove('active');

            document.getElementById('rpt-annual-view').classList.remove('hidden');

            document.getElementById('rpt-monthly-view').classList.add('hidden');

            renderReportUI();

        };

        let curDate = new Date();

        function initApp() {

            if (!DB.config) DB.config = { ...defaultDB.config };

            // Bind config inputs

            ['nome', 'matricula', 'civil', 'filhos', 'base', 'tabela'].forEach(k => {

                let el = document.getElementById('cfg-' + k);

                if (!el) return;

                let val = DB.config[k] ?? defaultDB.config[k];

                if (el.type === 'number') el.value = val;

                else el.value = val || '';

                el.oninput = () => {

                    DB.config[k] = el.type === 'number' ? +el.value : el.value;

                    DB_SAVE();

                    updateFixoUI();

                    renderEngine();

                    refreshHeader();

                };

            });

            refreshHeader();

            const heavyCheck = document.getElementById('cfg-heavy-vehicle');

            if (heavyCheck) {

                heavyCheck.checked = !!DB.config.heavyVehicle;

                heavyCheck.onchange = () => { DB.config.heavyVehicle = heavyCheck.checked; DB_SAVE(); updateFixoUI(); };

            }

            const diutInput = document.getElementById('cfg-diuturnidades');

            if (diutInput) {

                diutInput.value = DB.config.diuturnidades || 0;

                diutInput.oninput = () => { DB.config.diuturnidades = +diutInput.value; DB_SAVE(); updateFixoUI(); };

            }

            // Valor unit\u00E1rio de Diuturnidade

            const diuValorInput = document.getElementById('cfg-diuValor');

            if (diuValorInput) {

                diuValorInput.value = DB.config.diuValor ?? L_DIUTURNIDADE;

                diuValorInput.oninput = () => {

                    DB.config.diuValor = +(diuValorInput.value) || L_DIUTURNIDADE;

                    DB_SAVE(); updateFixoUI();

                };

            }

            const noturnoCheck = document.getElementById('cfg-noturno-enabled');

            if (noturnoCheck) {

                noturnoCheck.checked = !!DB.config.noturnoEnabled;

                noturnoCheck.onchange = () => { DB.config.noturnoEnabled = noturnoCheck.checked; DB_SAVE(); updateFixoUI(); };

            }

            const kmCheck = document.getElementById('cfg-km-enabled');

            if (kmCheck) {

                kmCheck.checked = !!DB.config.kmEnabled;

                kmCheck.onchange = () => {

                    DB.config.kmEnabled = kmCheck.checked;

                    const ktb = document.getElementById('km-tier-block');

                    if (ktb) ktb.classList.toggle('hidden', !kmCheck.checked);

                    DB_SAVE(); renderEngine();

                };

                const ktb = document.getElementById('km-tier-block');

                if (ktb) ktb.classList.toggle('hidden', !kmCheck.checked);

            }

            const duoCheck = document.getElementById('cfg-duo-enabled');

            if (duoCheck) {

                duoCheck.checked = !!DB.config.duoEnabled;

                const smBlock = document.getElementById('sub-months-block');

                if (smBlock) smBlock.classList.toggle('hidden', duoCheck.checked);

                duoCheck.onchange = () => {

                    DB.config.duoEnabled = duoCheck.checked;

                    if (smBlock) smBlock.classList.toggle('hidden', duoCheck.checked);

                    DB_SAVE(); updateFixoUI();

                };

            }

            ['subNatalMonth', 'subFeriasMonth'].forEach(k => {

                let el = document.getElementById('cfg-' + k);

                if (!el) return;

                el.value = DB.config[k] ?? (k === 'subNatalMonth' ? 11 : 6);

                el.onchange = () => {

                    DB.config[k] = parseInt(el.value);

                    DB_SAVE(); updateFixoUI();

                };

            });

            const adrCheck = document.getElementById('cfg-adr-enabled');

            if (adrCheck) {

                adrCheck.checked = !!DB.config.adrEnabled;

                adrCheck.onchange = () => { DB.config.adrEnabled = adrCheck.checked; DB_SAVE(); updateFixoUI(); buildCalendar(); renderEngine(); };

            }

            const cisternaCheck = document.getElementById('cfg-cisterna-enabled');

            if (cisternaCheck) {

                cisternaCheck.checked = !!DB.config.cisternaEnabled;

                cisternaCheck.onchange = () => { DB.config.cisternaEnabled = cisternaCheck.checked; DB_SAVE(); updateFixoUI(); renderEngine(); };

            }

            const nightCheck = document.getElementById('cfg-noturno-enabled');

            if (nightCheck) {

                nightCheck.checked = !!DB.config.noturnoEnabled;

                nightCheck.onchange = () => { DB.config.noturnoEnabled = nightCheck.checked; DB_SAVE(); updateFixoUI(); renderEngine(); };

            }

            const compCheck = document.getElementById('cfg-comp-enabled');

            if (compCheck) {

                compCheck.checked = !!DB.config.compEnabled;

                compCheck.onchange = () => { DB.config.compEnabled = compCheck.checked; DB_SAVE(); renderEngine(); };

            }

            const diuCheck = document.getElementById('cfg-diu-enabled');

            if (diuCheck) {

                diuCheck.checked = !!DB.config.diuEnabled;

                const dBlock = document.getElementById('diu-block');

                if (dBlock) dBlock.classList.toggle('hidden', !diuCheck.checked);

                diuCheck.onchange = () => {

                    DB.config.diuEnabled = diuCheck.checked;

                    if (dBlock) dBlock.classList.toggle('hidden', !diuCheck.checked);

                    DB_SAVE(); updateFixoUI();

                };

            }

            document.getElementById('mo-prev').onclick = () => { curDate.setMonth(curDate.getMonth() - 1); buildCalendar(); updateFixoUI(); };

            document.getElementById('mo-next').onclick = () => { curDate.setMonth(curDate.getMonth() + 1); buildCalendar(); updateFixoUI(); };

            buildCalendar();

            renderMgmtTables();

            renderEmojiConfig();

            updateFixoUI();

            updateLawWarnings();

            applyTheme();

        }

        // ── MGMT TABLES V4 ──

        function MARKERS_LIST() { return DB.config.markers || MARKERS; }

        function calculateNightHours(startStr, endStr) {

            if (!startStr || !endStr) return 0;

            const [sH, sM] = startStr.split(':').map(Number);

            const [eH, eM] = endStr.split(':').map(Number);

            let startMin = sH * 60 + sM;

            let endMin = eH * 60 + eM;

            if (endMin <= startMin) endMin += 24 * 60; // Crosses midnight

            function getOverlap(s1, e1, s2, e2) {

                return Math.max(0, Math.min(e1, e2) - Math.max(s1, s2));

            }

            let totalMin = 0;

            totalMin += getOverlap(startMin, endMin, 0, 7 * 60);         // 00h-07h

            totalMin += getOverlap(startMin, endMin, 20 * 60, 24 * 60); // 20h-24h

            totalMin += getOverlap(startMin, endMin, 24 * 60, 31 * 60); // 24h-31h

            return totalMin / 60;

        }

        let selectedSlot = -1;

        const PALETTE = ['\ud83c\udfe0', '\ud83d\udce6', '\ud83d\udd27', '\u2622\ufe0f', '\ud83d\udcbc', '\ud83d\ude9a', '\ud83d\ude9b', '\ud83c\udfd6\ufe0f', '\ud83d\ude80', '\u2615', '\ud83d\udecf\ufe0f', '\ud83d\udcb0', '\u274c', '\ud83c\udfec'];

        function renderEmojiConfig() {

            const slotContainer = document.getElementById('emoji-slots-grid');

            const paletteContainer = document.getElementById('emoji-palette');

            const paletteLabel = document.getElementById('emoji-palette-label');

            if (!slotContainer || !paletteContainer) return;

            if (!DB.config.emojiIcons) DB.config.emojiIcons = ['🚀', '☕', '🛌', '🔧', '💰', '❌'];

            // Render Slots

            slotContainer.innerHTML = '';

            DB.config.emojiIcons.forEach((icon, idx) => {

                const div = document.createElement('div');

                div.className = `emoji-item ${selectedSlot === idx ? 'selected' : ''}`;

                div.style.fontSize = '1.4rem';

                div.innerText = icon;

                div.onclick = () => {

                    // Toggle selection logic: clicking the already selected slot hides the palette

                    selectedSlot = selectedSlot === idx ? -1 : idx;

                    renderEmojiConfig();

                };

                slotContainer.appendChild(div);

            });

            // Render Palette

            paletteContainer.innerHTML = '';

            PALETTE.forEach(emoji => {

                const span = document.createElement('span');

                span.style.cursor = 'pointer';

                span.style.padding = '4px';

                span.innerText = emoji;

                span.onclick = () => {

                    if (selectedSlot !== -1) {

                        DB.config.emojiIcons[selectedSlot] = emoji;

                        DB_SAVE();

                        selectedSlot = -1; // hide palette after selection

                        renderEmojiConfig();

                    }

                };

                paletteContainer.appendChild(span);

            });

            // Handle visibility

            if (selectedSlot === -1) {

                paletteContainer.style.display = 'none';

                paletteContainer.classList.add('hidden');

                if (paletteLabel) paletteLabel.classList.add('hidden');

            } else {

                paletteContainer.style.display = 'flex';

                paletteContainer.classList.remove('hidden');

                if (paletteLabel) paletteLabel.classList.remove('hidden');

            }

        }

        function hueToHex(h) {
            let s = 80, l = 50; // Saturação e Brilho fixos para cores vivas
            l /= 100;
            const a = s * Math.min(l, 1 - l) / 100;
            const f = n => {
                const k = (n + h / 30) % 12;
                const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
                return Math.round(255 * color).toString(16).padStart(2, '0');
            };
            return `#${f(0)}${f(8)}${f(4)}`;
        }

        function hexToHue(hex) {
            // Conversão simples aproximada para colocar o slider na posição certa
            let r = parseInt(hex.slice(1, 3), 16) / 255;
            let g = parseInt(hex.slice(3, 5), 16) / 255;
            let b = parseInt(hex.slice(5, 7), 16) / 255;
            let max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h, d = max - min;
            if (d === 0) h = 0;
            else if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            return Math.round(h * 60);
        }

        function renderMgmtTables() {

            const bMarkers = document.getElementById('body-markers');

            if (bMarkers) {

                bMarkers.innerHTML = '';

                (DB.config.markers || []).forEach((m, idx) => {
                    const tr = document.createElement('tr');
                    const currentHue = hexToHue(m.color || '#6366f1');
                    tr.innerHTML = `
                        <td><input type="text" class="mgmt-input" value="${m.label}" onchange="updateRow('markers', ${idx}, 'label', this.value)"></td>
                        <td>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div id="preview-color-${idx}" class="color-swatch" style="background:${m.color};"></div>
                                <input type="range" class="spectrum-bar" min="0" max="360" value="${currentHue}" 
                                    oninput="const hex=hueToHex(this.value); document.getElementById('preview-color-${idx}').style.background=hex; updateRow('markers', ${idx}, 'color', hex)">
                            </div>
                        </td>
                        <td><input type="number" class="mgmt-input" value="${m.value || 0}" onchange="updateRow('markers', ${idx}, 'value', +this.value)"></td>
                        <td><span class="btn-del-row" onclick="delRow('markers', ${idx})">\u00D7</span></td>
                    `;
                    bMarkers.appendChild(tr);
                });

            }

            const bKm = document.getElementById('body-km-escaloes');

            if (bKm) {

                bKm.innerHTML = '';

                (DB.config.kmEscaloes || []).forEach((e, idx) => {

                    const tr = document.createElement('tr');

                    tr.innerHTML = `

                        <td><input type="number" class="mgmt-input" value="${e.ate}" onchange="updateKmRow(${idx}, 'ate', +this.value)"></td>

                        <td><input type="number" class="mgmt-input" value="${e.valor}" step="0.01" onchange="updateKmRow(${idx}, 'valor', +this.value)"></td>

                        <td><span class="btn-del-row" onclick="delKmEscalao(${idx})">\u00D7</span></td>

                    `;

                    bKm.appendChild(tr);

                });

            }

        }

        function updateKmRow(idx, key, val) {

            if (!DB.config.kmEscaloes || !DB.config.kmEscaloes[idx]) return;

            DB.config.kmEscaloes[idx][key] = val;

            DB_SAVE(); renderEngine();

        }

        function addKmEscalao() {

            if (!DB.config.kmEscaloes) DB.config.kmEscaloes = [];

            DB.config.kmEscaloes.push({ id: Date.now(), ate: 2000, valor: 0.15 });

            DB_SAVE(); renderMgmtTables(); renderEngine();

        }

        function delKmEscalao(idx) {

            DB.config.kmEscaloes.splice(idx, 1);

            DB_SAVE(); renderMgmtTables(); renderEngine();

        }

        function updateRow(type, idx, key, val) {

            if (!DB.config[type] || !DB.config[type][idx]) return;

            DB.config[type][idx][key] = val;

            DB_SAVE(); renderEngine();

        }

        function delRow(type, idx) {

            if (!DB.config[type] || !confirm("Remover este item?")) return;

            DB.config[type].splice(idx, 1);

            DB_SAVE(); renderMgmtTables(); buildCalendar();

        }

        function addCustomMarker() {

            if (!DB.config.markers) DB.config.markers = [...MARKERS];

            DB.config.markers.push({ id: 'custom-' + Date.now(), label: 'Novo', color: '#cccccc', value: 0 });

            DB_SAVE(); renderMgmtTables();

        }

        function toggleKMUI() {

            const block = document.getElementById('km-tier-block');

            if (block) block.classList.toggle('hidden', !DB.config.kmEnabled);

        }

        function updateFixoUI() {

            // ── Recalculate all components ──

            let base = DB.config.base || L_BASE;

            let legalBaseForC61 = DB.config.tabela ? TABELAS[DB.config.tabela].base : L_BASE;

            let diuValor = DB.config.diuValor !== undefined ? DB.config.diuValor : L_DIUTURNIDADE;

            let diutVal = (DB.config.diuturnidades || 0) * diuValor;

            let c61 = (legalBaseForC61 + diutVal) * L_C61_PERC;

            let noturno = DB.config.noturnoEnabled ? L_NOTURNO_FIXO : 0;

            let percC = (DB.config.heavyVehicle ? COMPLEMENTOS_PESADOS[DB.config.tabela] : COMPLEMENTOS[DB.config.tabela]) || 0.02;

            let complementoPerc = legalBaseForC61 * percC;

            let adrM = DB.config.adrEnabled ? (22 * L_ADR_DIARIO) : 0;

            let cisternaM = DB.config.cisternaEnabled ? L_CISTERNA : 0;

            let bruto = getTotalBruto();

            let duo = getDuodecimos();

            let rate = getIRSRate();

            let liquido = getFixoLiquido();

            const fmt = (v) => v.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            const set = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };

            // ── Componentes do Bruto ──

            set('lbl-comp-diu', '\u20AC ' + fmt(diutVal));

            set('lbl-comp-c61', '\u20AC ' + fmt(c61));

            set('lbl-comp-c75', '\u20AC ' + fmt(calcSalary().c75));

            set('lbl-comp-perc', '\u20AC ' + fmt(complementoPerc));

            if (DB.config.noturnoEnabled) {

                set('lbl-comp-noturno', '\u20AC ' + fmt(noturno));

            } else {

                set('lbl-comp-noturno', 'Modo Real (Vari\u00E1vel)');

            }

            set('lbl-comp-adr', '\u20AC ' + fmt(adrM));

            set('lbl-comp-cisterna', '\u20AC ' + fmt(cisternaM));

            // Duod\u00E9cimos Brutos

            // SUBSÍDIOS (Duod\u00E9cimos ou Integrais)

            const isDuoOn = !!DB.config.duoEnabled;

            const s = calcSalary();

            const duoBrutoBlock = document.getElementById('duo-bruto-block');

            if (duoBrutoBlock) {

                const hasSub = isDuoOn || (s.duoNatal > 0 || s.duoFerias > 0);

                duoBrutoBlock.classList.toggle('hidden', !hasSub);

            }

            const subTitle = document.getElementById('sub-title-label');

            if (subTitle) subTitle.innerText = isDuoOn ? "🎁🏖️ Duod\u00E9cimos / M\u00EAs" : "🎁🏖️ Subs\u00EDdios Integrais";

            const subDescTitle = document.getElementById('sub-desc-title-label');

            if (subDescTitle) subDescTitle.innerText = isDuoOn ? "Descontos dos Duod\u00E9cimos" : "Descontos dos Subs\u00EDdios";

            set('lbl-duo-natal', '\u20AC ' + fmt(s.duoNatal));

            set('lbl-duo-ferias', '\u20AC ' + fmt(s.duoFerias));

            // Bruto Total Mensal

            let totalBrutoDisplay = s.totalAbono;

            set('lbl-bruto-total', '\u20AC ' + fmt(totalBrutoDisplay));

            // Show/hide rows that are zero

            const adrRow2 = document.getElementById('lbl-adr-row');

            if (adrRow2) adrRow2.classList.toggle('hidden', adrM === 0);

            const cisternaRow = document.getElementById('lbl-cisterna-row');

            if (cisternaRow) cisternaRow.classList.toggle('hidden', cisternaM === 0);

            const c75Row = document.getElementById('lbl-c75-row');

            if (c75Row) c75Row.classList.toggle('hidden', s.c75 === 0);

            // ── Descontos ──

            set('lbl-ss', '- \u20AC ' + fmt(bruto * 0.11));

            set('lbl-irs-rate', (rate * 100).toFixed(1));

            set('lbl-irs', '- \u20AC ' + fmt(bruto * rate));

            // Descontos Subs\u00EDdios

            const duoDescBlock = document.getElementById('duo-desc-block');

            if (duoDescBlock) {

                const hasSubDesc = isDuoOn || s.duoTotal > 0;

                duoDescBlock.classList.toggle('hidden', !hasSubDesc);

            }

            if (isDuoOn || s.duoTotal > 0) {

                set('lbl-duo-ss', '- \u20AC ' + fmt(s.duoTotal * 0.11));

                set('lbl-duo-irs', '- \u20AC ' + fmt(s.duoTotal * rate));

            }

            // ── L\u00EDquido ──

            set('lbl-fixo-liq', '\u20AC ' + fmt(liquido.total));

            const hdrF = document.getElementById('hdr-fixo');

            if (hdrF) hdrF.innerText = '\u20AC ' + fmt(liquido.total);

            renderEngine();

            updateLawWarnings();

            refreshHeader();

        }

        function refreshHeader() {

            const hName = document.getElementById('hdr-driver-name');

            const hPlate = document.getElementById('hdr-truck-plate');

            const hBanner = document.getElementById('top-banner-info');

            

            const name = DB.config.nome || "Motorista";

            const plate = DB.config.matricula || "Matr\u00EDcula n\u00E3o definida";

            

            if (hName) hName.innerText = name;

            if (hPlate) hPlate.innerText = plate;

            if (hBanner) hBanner.innerText = `Motorista: ${name} — Matr\u00EDcula: ${plate}`;

        }

        function getDBMonthKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }

        // ── DAY MODAL ──

        let activeDay = null;

        let selectedMarkers = [];

        let selectedEmojiObjs = [];

        function updateKMTotal() {

            const startEl = document.getElementById('m-km-start');

            const endEl = document.getElementById('m-km-end');

            const totalEl = document.getElementById('m-km-total-input');

            if (!startEl || !endEl || !totalEl) return;

            let s = +startEl.value || 0;

            let e = +endEl.value || 0;

            if (s > 0 || e > 0) {

                totalEl.value = Math.max(0, e - s);

            }

        }

        const mKMS = document.getElementById('m-km-start');

        if (mKMS) mKMS.addEventListener('input', updateKMTotal);

        const mKME = document.getElementById('m-km-end');

        if (mKME) mKME.addEventListener('input', updateKMTotal);

        function openDayModal(d) {

            activeDay = d;

            const mKey = getDBMonthKey(curDate);

            let dayData = DB.events[mKey]?.[d] || { markers: [], kmTotal: 0, extra: 0, emojis: [], shiftStart: '', shiftEnd: '' };

            selectedMarkers = dayData.markers || [];

            selectedEmojiObjs = dayData.emojis || [];

            const mTitle = document.getElementById('modal-title');

            if (mTitle) mTitle.innerText = `Dia ${d} de ${new Intl.DateTimeFormat('pt-PT', { month: 'long' }).format(curDate)}`;

            // Nightmare REAL vs FIXED

            const mNightB = document.getElementById('m-night-block');

            if (mNightB) mNightB.classList.toggle('hidden', !!DB.config.noturnoEnabled);

            const inputS = document.getElementById('m-night-start');

            const inputE = document.getElementById('m-night-end');

            if (inputS) inputS.value = dayData.shiftStart || '';

            if (inputE) inputE.value = dayData.shiftEnd || '';

            const mKMB = document.getElementById('m-km-block');

            if (mKMB) mKMB.classList.toggle('hidden', !DB.config.kmEnabled);

            const mKMT = document.getElementById('m-km-total-input');

            if (mKMT) mKMT.value = dayData.kmTotal || '';

            // Limpar auxiliares para n\u00E3o herdar do dia anterior

            const mKMS = document.getElementById('m-km-start');

            if (mKMS) mKMS.value = '';

            const mKME = document.getElementById('m-km-end');

            if (mKME) mKME.value = '';

            renderMarkersInModal();

            renderEmojiGrid();

            renderEmojiInputs();

            document.getElementById('modal-select').classList.remove('hidden');

        }

        // clearDayData removed - F5 handles global reset now

        function renderMarkersInModal() {

            const list = document.getElementById('modal-marker-list');

            if (!list) return;

            list.innerHTML = '';

            MARKERS_LIST().forEach(m => {

                const div = document.createElement('div');

                div.className = `marker-opt ${selectedMarkers.includes(m.id) ? 'selected' : ''}`;

                div.innerHTML = `<div class="m-dot" style="background-color: ${m.color};"></div><div class="m-lab">${m.label}</div>`;

                div.addEventListener('click', () => {

                    if (selectedMarkers.includes(m.id)) {

                        selectedMarkers = selectedMarkers.filter(x => x !== m.id);

                        div.classList.remove('selected');

                    } else {

                        selectedMarkers.push(m.id);

                        div.classList.add('selected');

                    }

                });

                list.appendChild(div);

            });

        }

        function renderEmojiGrid() {

            const eGrid = document.getElementById('emoji-grid');

            if (!eGrid) return;

            eGrid.innerHTML = '';

            const icons = DB.config.emojiIcons || ['🚀', '☕', '🛌', '🔧', '💰', '❌'];

            icons.forEach(e => {

                const isSel = (selectedEmojiObjs || []).some(x => x.icon === e);

                const span = document.createElement('div');

                span.className = `emoji-item ${isSel ? 'selected' : ''}`;

                span.innerText = e;

                span.onclick = () => {

                    if (selectedEmojiObjs.some(x => x.icon === e)) {

                        selectedEmojiObjs = selectedEmojiObjs.filter(x => x.icon !== e);

                    } else {

                        selectedEmojiObjs.push({ icon: e, value: 0, note: '' });

                    }

                    renderEmojiGrid();

                    renderEmojiInputs();

                };

                eGrid.appendChild(span);

            });

        }

        function renderEmojiInputs() {

            const list = document.getElementById('m-emoji-values-list');

            if (!list) return;

            list.innerHTML = '';

            (selectedEmojiObjs || []).forEach((obj, idx) => {

                const div = document.createElement('div');

                div.className = 'card';

                div.style.padding = '12px';

                div.style.margin = '0 0 10px 0';

                div.style.borderRadius = '16px';

                div.style.boxShadow = 'none';

                div.style.border = '1px solid var(--border)';

                div.innerHTML = `

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">

                        <span style="font-size: 1.4rem;">${obj.icon}</span>

                        <span style="color:var(--red); font-weight:bold; cursor:pointer;" onclick="removeEmoji(${idx})">Remover \u00D7</span>

                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 2fr; gap:8px;">

                        <input type="number" value="${obj.value}" placeholder="Valor \u20AC" class="mgmt-input" oninput="selectedEmojiObjs[${idx}].value = +this.value">

                        <input type="text" value="${obj.note || ''}" placeholder="Nota (opcional)" class="mgmt-input" oninput="selectedEmojiObjs[${idx}].note = this.value">

                    </div>

                `;

                list.appendChild(div);

            });

        }

        function removeEmoji(idx) {

            selectedEmojiObjs.splice(idx, 1);

            renderEmojiGrid();

            renderEmojiInputs();

        }

        document.getElementById('btn-save-day').addEventListener('click', () => {

            const mKey = getDBMonthKey(curDate);

            if (!DB.events[mKey]) DB.events[mKey] = {};

            let km = +document.getElementById('m-km-total-input').value || 0;

            let sStart = document.getElementById('m-night-start')?.value || '';

            let sEnd = document.getElementById('m-night-end')?.value || '';

            if (selectedMarkers.length === 0 && km === 0 && selectedEmojiObjs.length === 0 && !sStart && !sEnd) {

                delete DB.events[mKey][activeDay];

            } else {

                DB.events[mKey][activeDay] = {

                    markers: selectedMarkers,

                    kmTotal: km,

                    emojis: selectedEmojiObjs,

                    shiftStart: sStart,

                    shiftEnd: sEnd

                };

            }

            DB_SAVE(); closeModal(); buildCalendar();

        });

        function closeModal() { document.getElementById('modal-select').classList.add('hidden'); }

        

        function openSettingsModal() {

            document.getElementById('modal-settings').classList.remove('hidden');

        }

        

        function closeSettingsModal() {

            document.getElementById('modal-settings').classList.add('hidden');

            // Force refresh of UI components to reflect changes in Civil Status / Children

            updateFixoUI();

            renderEngine();

        }

        function setTheme(t) {

            DB.config.theme = t;

            DB_SAVE();

            applyTheme();

            

            // Re-render charts for theme consistency (font colors etc)

            if (typeof renderUICharts === 'function') renderUICharts();

        }

        function applyTheme() {

            const isLight = DB.config.theme === 'light';

            document.body.classList.toggle('light-mode', isLight);

            

            const btnLight = document.getElementById('btn-theme-light');

            const btnDark = document.getElementById('btn-theme-dark');

            

            if (btnLight) btnLight.classList.toggle('active', isLight);

            if (btnDark) btnDark.classList.toggle('active', !isLight);

        }

        // ── RENDER CALENDAR ──

        function buildCalendar() {

            const moLabel = document.getElementById('mo-label');

            if (moLabel) moLabel.innerText = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(curDate);

            const grid = document.getElementById('cal-grid');

            if (!grid) return;

            grid.innerHTML = '';

            const mKey = getDBMonthKey(curDate);

            const events = DB.events[mKey] || {};

            const year = curDate.getFullYear(), month = curDate.getMonth();

            const firstDay = new Date(year, month, 1).getDay();

            const diasNoMes = new Date(year, month + 1, 0).getDate();

            for (let i = 0; i < firstDay; i++) {

                let empty = document.createElement('div'); empty.className = 'day empty'; grid.appendChild(empty);

            }

            for (let d = 1; d <= diasNoMes; d++) {

                let btn = document.createElement('div');

                btn.className = 'day';

                let evt = events[d];

                if (evt) {

                    if (evt.emojis && evt.emojis.length > 0) {

                        const icons = evt.emojis.map(x => (typeof x === 'string' ? x : x.icon)).slice(0, 2).join('');

                        btn.innerHTML += `<div class="day-emoji">${icons}</div>`;

                    }

                    // Render Marker Dots

                    if (evt.markers && evt.markers.length > 0) {

                        const dotsContainer = document.createElement('div');

                        dotsContainer.className = 'day-multi-dots';

                        evt.markers.forEach(mid => {

                            const m = MARKERS_LIST().find(x => x.id === mid);

                            if (m) {

                                dotsContainer.innerHTML += `<div class="dot" style="background: ${m.color}"></div>`;

                            }

                        });

                        btn.appendChild(dotsContainer);

                        // Main color (first marker)

                        const firstM = MARKERS_LIST().find(x => x.id === evt.markers[0]);

                        if (firstM) {

                            btn.style.backgroundColor = firstM.color + '22';

                        }

                    }

                }

                btn.innerHTML += `<div class="day-num">${d}</div>`;

                btn.addEventListener('click', () => openDayModal(d));

                grid.appendChild(btn);

            }

            renderEngine();

        }

        // ── ENGINE (O RETIFICADOR FISCAL 2026) ──

        function computeMonthEngine(forcedDate) {

            let workingDate = forcedDate || curDate;

            const mKey = getDBMonthKey(workingDate);

            const evts = DB.events[mKey] || {};

            let totalKM = 0;

            let totalAjudasManuais = 0;

            let totalExtras = 0;

            let totalNightHoursMonth = 0;

            let weekData = [0, 0, 0, 0, 0];

            let weekKMCount = [0, 0, 0, 0, 0];

            for (let d = 1; d <= 31; d++) {

                let evt = evts[d];

                if (!evt) continue;

                let weekIdx = Math.floor(d / 7); if (weekIdx > 4) weekIdx = 4;

                // 1. Somat\u00F3rio de Ajudas Manuais (Marcadores/Pinturas)

                let dailyAjudas = 0;

                if (evt.markers && evt.markers.length > 0) {

                    evt.markers.forEach(mid => {

                        const m = MARKERS_LIST().find(x => x.id === mid);

                        if (m && m.value) dailyAjudas += m.value;

                    });

                }

                totalAjudasManuais += dailyAjudas;

                weekData[weekIdx] += dailyAjudas;

                // 2. Somat\u00F3rio de Extras (Emojis/Ganhos Individuais)

                if (evt.emojis && evt.emojis.length > 0) {

                    evt.emojis.forEach(e => {

                        if (typeof e === 'object') totalExtras += (e.value || 0);

                    });

                }

                // 3. Contagem de KM

                const km = (evt.kmTotal || 0);

                totalKM += km;

                weekKMCount[weekIdx] += km;

                // 4. B\u00F3nus Noturno Real (Cl\u00E1usula 51.\u00AA - 25%)

                if (!DB.config.noturnoEnabled && evt.shiftStart && evt.shiftEnd) {

                    totalNightHoursMonth += calculateNightHours(evt.shiftStart, evt.shiftEnd);

                }

            }

            const base = DB.config.base || L_BASE;

            const nightBonusReal = totalNightHoursMonth * (base / 173.33) * 0.25;

            // Ganhos KM (L_KM_LIMIT = 1500, L_KM_R1 = 0.10, L_KM_R2 = 0.20)

            const L_KM_LIMIT_FIN = 1500;

            const L_KM_R1_FIN = 0.10;

            const L_KM_R2_FIN = 0.20;

            let totalKmGains = 0;

            if (DB.config.kmEnabled) {

                if (totalKM <= L_KM_LIMIT_FIN) {

                    totalKmGains = totalKM * L_KM_R1_FIN;

                } else {

                    totalKmGains = (L_KM_LIMIT_FIN * L_KM_R1_FIN) + ((totalKM - L_KM_LIMIT_FIN) * L_KM_R2_FIN);

                }

            }

            // GAVETA 1: Sal\u00E1rio Mensal

            let brutoBase = getTotalBruto(workingDate);

            let bruto = brutoBase + nightBonusReal; // Adiciona b\u00F3nus noturno real se for o caso

            let rate = getIRSRate(workingDate);

            let ss1 = bruto * 0.11;

            let irs1 = bruto * rate;

            let salLiquido = bruto - ss1 - irs1;

            // GAVETA 2: Duod\u00E9cimos

            let duo = getDuodecimos(workingDate);

            let ss2 = duo.total * 0.11;

            let irs2 = duo.total * rate;

            let duoLiquido = duo.total - ss2 - irs2;

            // Final: Sal\u00E1rio + Duod\u00E9cimos + Isentos (Ajudas + KM + Extras)

            let finalLiquidoReceber = salLiquido + duoLiquido + totalAjudasManuais + totalKmGains + totalExtras;

            return {

                totalKM, totalAjudasManuais, totalExtras, totalKmGains,

                finalLiquidoReceber,

                salLiquido, duoLiquido, fixoLiquido: salLiquido, // compat

                bruto, duo,

                impostosRetidos: ss1 + ss2 + irs1 + irs2,

                weekData, weekKM: weekKMCount

            };

        }

        function renderEngine() {

            let res = computeMonthEngine();

            let ft = document.getElementById('ft-total-num');

            if (ft) ft.innerText = res.finalLiquidoReceber.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        }

        function renderReportUI() {

            const fmt = (v) => `\u20AC ${v.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            if (currentRptView === 'month') {

                let res = computeMonthEngine();

                const s = calcSalary();

                const rB = document.getElementById('rpt-bruto');

                if (rB) rB.innerText = fmt(res.bruto);

                const rF = document.getElementById('rpt-fixo');

                if (rF) rF.innerText = fmt(res.salLiquido);

                const rA = document.getElementById('rpt-ajudas');

                if (rA) rA.innerText = fmt(res.totalAjudasManuais);

                const rE = document.getElementById('rpt-extras');

                if (rE) rE.innerText = fmt(res.totalExtras);

                const rFinal = document.getElementById('rpt-final');

                if (rFinal) rFinal.innerText = fmt(res.finalLiquidoReceber);

                const rKMVal = document.getElementById('rpt-km-val');

                if (rKMVal) rKMVal.innerText = fmt(res.totalKmGains);

                // Duod\u00E9cimos row (show if enabled OR if there is an integral subsidy payment this month)

                const rDuoRow = document.getElementById('rpt-duo-row');

                const rDuoVal = document.getElementById('rpt-duo-val');

                if (rDuoRow) {

                    const hasSub = DB.config.duoEnabled || res.duoLiquido > 0;

                    rDuoRow.classList.toggle('hidden', !hasSub);

                }

                if (rDuoVal) rDuoVal.innerText = fmt(res.duoLiquido);

                // Render UI Charts

                renderUICharts(s.liquido, res.totalAjudasManuais + res.totalKmGains, res.impostosRetidos, res.totalExtras + s.liquidoDuo, res.weekData, ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Resto'], res.weekKM);

            } else {

                renderAnnualReport();

            }

        }

                function computeYearEngine() {
            const year = curDate.getFullYear();
            const currentMonth = curDate.getMonth();
            let res = {
                totalKM: 0, bruto: 0, salLiquido: 0, duoLiquido: 0,
                totalAjudasManuais: 0, totalKmGains: 0, totalExtras: 0,
                finalLiquidoReceber: 0, impostosRetidos: 0,
                monthlyGains: Array(12).fill(0),
                monthlyKM: Array(12).fill(0)
            };

            for (let m = 0; m <= currentMonth; m++) {
                let tempDate = new Date(year, m, 1);
                let mRes = computeMonthEngine(tempDate);
                res.totalKM += (mRes.totalKM || 0);
                res.bruto += (mRes.bruto || 0);
                res.salLiquido += (mRes.salLiquido || 0);
                res.duoLiquido += (mRes.duoLiquido || 0);
                res.totalAjudasManuais += (mRes.totalAjudasManuais || 0);
                res.totalKmGains += (mRes.totalKmGains || 0);
                res.totalExtras += (mRes.totalExtras || 0);
                res.finalLiquidoReceber += (mRes.finalLiquidoReceber || 0);
                res.impostosRetidos += (mRes.impostosRetidos || 0);
                res.monthlyGains[m] = mRes.finalLiquidoReceber;
                res.monthlyKM[m] = mRes.totalKM;
            }
            res.fixoLiquido = res.salLiquido + res.duoLiquido;
            res.totalAjudasGeral = res.totalAjudasManuais + res.totalKmGains;
            return res;
        }

        function renderAnnualReport() {

            const year = curDate.getFullYear();
            const res = computeYearEngine();

            document.getElementById('rpt-year-lbl').innerText = year;

            document.getElementById('rpt-year-km').innerText = res.totalKM.toLocaleString('pt-PT') + ' km';

            document.getElementById('rpt-year-bruto').innerText = `\u20AC ${res.bruto.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;

            const rFixo = document.getElementById('rpt-year-fixo');
            if (rFixo) rFixo.innerText = `\u20AC ${res.fixoLiquido.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;

            const rAjudas = document.getElementById('rpt-year-ajudas');
            if (rAjudas) rAjudas.innerText = `\u20AC ${res.totalAjudasGeral.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;

            document.getElementById('rpt-year-extras').innerText = `\u20AC ${res.totalExtras.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;

            document.getElementById('rpt-year-final').innerText = `\u20AC ${res.finalLiquidoReceber.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;

            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

            renderUICharts(res.salLiquido + res.duoLiquido, res.totalAjudasGeral, res.impostosRetidos, res.totalExtras, res.monthlyGains, monthNames, res.monthlyKM);

        }

        function renderUICharts(fixoVal, ajudasVal, taxVal, extraVal, barData, barLabels, kmData) {

            // Render UI Charts

            if (uiPieInstance) uiPieInstance.destroy();

            const ctxP = document.getElementById('uiPieChart')?.getContext('2d');

            if (ctxP) {

                uiPieInstance = new Chart(ctxP, {

                    type: 'doughnut',

                    data: {

                        labels: ['Fixo', 'Ajudas', 'SS+IRS', 'Extras'],

                        datasets: [{

                            data: [fixoVal, ajudasVal, taxVal, extraVal],

                            backgroundColor: ['#3b82f6', '#22c55e', '#ef4444', '#eab308'],

                            borderWidth: 0

                        }]

                    },

                    options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#858f88' } } } }

                });

            }

            if (uiBarInstance) uiBarInstance.destroy();

            const ctxB = document.getElementById('uiBarChart')?.getContext('2d');

            if (ctxB) {

                uiBarInstance = new Chart(ctxB, {

                    type: 'bar',

                    data: {

                        labels: barLabels,

                        datasets: [

                            {

                                label: 'Ganhos (\u20AC)',

                                data: barData,

                                backgroundColor: '#3b82f6',

                                borderRadius: 6

                            }

                        ]

                    },

                    options: {

                        maintainAspectRatio: false,

                        scales: {

                            y: {

                                ticks: { color: '#858f88' },

                                grid: { color: '#2a3642' }

                            },

                            x: { ticks: { color: '#858f88' }, grid: { display: false } }

                        },

                        plugins: { legend: { display: false } }

                    }

                });

            }

        }

        // ── EXPORTING / SHARE ──

        function fillPDFContainer(res) {

            document.getElementById('pdf-nome').innerText = DB.config.nome || 'N\u00E3o Definido';

            document.getElementById('pdf-matricula').innerText = DB.config.matricula || 'N/A';

            document.getElementById('pdf-month-lbl').innerText = `Relat\u00F3rio de ${new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(curDate)}`;

            document.getElementById('pdf-impostos').innerText = `\u20AC ${res.impostosRetidos.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;

            document.getElementById('pdf-ajudas').innerText = `\u20AC ${(res.totalAjudasManuais + res.totalKmGains).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;

            document.getElementById('pdf-ajudas-rule').innerText = `(Pinturas + KM)`;

            document.getElementById('pdf-final').innerText = `\u20AC ${res.finalLiquidoReceber.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;

            // Populate Table (Split into two columns)

            const mKey = getDBMonthKey(curDate);

            const evts = DB.events[mKey] || {};

            const tbodyLeft = document.querySelector('#pdf-table-left tbody');

            const tbodyRight = document.querySelector('#pdf-table-right tbody');

            if (tbodyLeft && tbodyRight) {

                tbodyLeft.innerHTML = '';

                tbodyRight.innerHTML = '';

                for (let d = 1; d <= 31; d++) {

                    let evt = evts[d];

                    let km = 0;

                    let extra = 0;

                    let lbl = '-';

                    if (evt) {

                        let markersLabels = (evt.markers || []).map(mid => {

                            const m = MARKERS_LIST().find(x => x.id === mid);

                            return m ? m.label : '';

                        }).filter(x => x).join(', ');

                        let emojisIcons = (evt.emojis || []).map(x => {

                            if (typeof x === 'string') return x;

                            return x.icon + (x.note ? ` (${x.note})` : '');

                        }).join(' ');

                        let emojiNote = emojisIcons ? ` ${emojisIcons}` : '';

                        lbl = (markersLabels + emojiNote).trim() || '-';

                        km = evt.kmTotal || 0;

                        extra = evt.extra || 0;

                        if (evt.emojis && evt.emojis.length > 0) {

                            evt.emojis.forEach(e => {

                                if (typeof e === 'object') extra += (e.value || 0);

                            });

                        }

                    }

                    // Leave empty days as just the day number to fill the calendar gracefully

                    let rowHtml = `<tr>

                        <td><b>${d}</b></td>

                        <td style="color: ${lbl === '-' ? '#4a5568' : '#e2e8f0'}">${lbl}</td>

                        <td style="text-align: right;">${km > 0 ? km : '-'}</td>

                        <td style="text-align: right; color: ${extra > 0 ? '#eab308' : '#858f88'}">${extra > 0 ? '\u20AC ' + extra.toFixed(2) : '-'}</td>

                    </tr>`;

                    if (d <= 16) {

                        tbodyLeft.innerHTML += rowHtml;

                    } else {

                        tbodyRight.innerHTML += rowHtml;

                    }

                }

            }

            // Draw Charts

            if (pdfPieInstance) pdfPieInstance.destroy();

            let cP = document.getElementById('pdfPieChart');

            if (cP) {

                let ctxP = cP.getContext('2d');

                pdfPieInstance = new Chart(ctxP, {

                    type: 'doughnut',

                    data: {

                        labels: ['L\u00EDquido Fixo', 'Total Ajudas', 'SS+IRS', 'Outros'],

                        datasets: [{

                            data: [res.fixoLiquido, res.totalAjudasManuais, res.impostosRetidos, res.totalExtras],

                            backgroundColor: ['#3b82f6', '#22c55e', '#ef4444', '#eab308'],

                            borderWidth: 0

                        }]

                    },

                    options: {

                        animation: false,

                        cutout: '60%',

                        plugins: {

                            legend: { position: 'bottom', labels: { color: '#ffffff', font: { size: 11, family: 'Outfit' }, padding: 15 } },

                            title: { display: true, text: 'Balan\u00E7o Geral (\u20AC)', color: '#858f88', font: { size: 14, family: 'Outfit' } }

                        }

                    }

                });

            }

            if (pdfBarInstance) pdfBarInstance.destroy();

            let cB = document.getElementById('pdfBarChart');

            if (cB) {

                let ctxB = cB.getContext('2d');

                pdfBarInstance = new Chart(ctxB, {

                    type: 'bar',

                    data: {

                        labels: ['Sem. 1', 'Sem. 2', 'Sem. 3', 'Sem. 4', 'Resto'],

                        datasets: [{

                            label: 'Ganhos Vari\u00E1veis (\u20AC)',

                            data: res.weekData,

                            backgroundColor: '#3b82f6',

                            borderRadius: 6

                        }]

                    },

                    options: {

                        animation: false,

                        scales: {

                            y: { ticks: { color: '#858f88' }, grid: { color: '#2a3642' } },

                            x: { ticks: { color: '#858f88' }, grid: { display: false } }

                        },

                        plugins: {

                            legend: { display: false },

                            title: { display: true, text: 'Produ\u00E7\u00E3o por Semana', color: '#858f88', font: { size: 14, family: 'Outfit' } }

                        }

                    }

                });

            }

        }

        document.getElementById('btn-export-csv').addEventListener('click', () => {

            let res = computeMonthEngine();

            const mKey = getDBMonthKey(curDate);

            const evts = DB.events[mKey] || {};

            const monthName = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(curDate);

            let csvRows = [];

            // Header Info

            csvRows.push(`Relat\u00F3rio Journey Tracker - ${monthName}`);

            csvRows.push(`Motorista:;${DB.config.nome || 'N\u00E3o Definido'}`);

            csvRows.push(`Matr\u00EDcula:;${DB.config.matricula || 'N/A'}`);

            csvRows.push('');

            // Daily Table Header

            csvRows.push('Dia;Estado / Marcadores;KM;Outros (\u20AC)');

            for (let d = 1; d <= 31; d++) {

                let evt = evts[d];

                let km = 0, extra = 0, lbl = '-';

                if (evt) {

                    let markersLabels = (evt.markers || []).map(mid => {

                        const m = MARKERS_LIST().find(x => x.id === mid);

                        return m ? m.label : '';

                    }).filter(x => x).join(', ');

                    let emojisIcons = (evt.emojis || []).map(x => {

                        if (typeof x === 'string') return x;

                        return x.icon + (x.note ? ` (${x.note})` : '');

                    }).join(' ');

                    let emojiNote = emojisIcons ? ` ${emojisIcons}` : '';

                    lbl = (markersLabels + emojiNote).trim() || '-';

                    km = evt.kmTotal || 0;

                    extra = evt.extra || 0;

                    if (evt.emojis && evt.emojis.length > 0) {

                        evt.emojis.forEach(e => {

                            if (typeof e === 'object') extra += (e.value || 0);

                        });

                    }

                }

                csvRows.push(`${d};"${lbl.replace(/"/g, '""')}";${km};${extra.toFixed(2).replace('.', ',')}`);

            }

            csvRows.push('');

            csvRows.push('RESUMO FINANCEIRO (CCT 2026)');

            csvRows.push(`Vencimento Bruto:;${res.bruto.toFixed(2).replace('.', ',')} \u20AC`);

            csvRows.push(`L\u00EDquido Fixo:;${res.fixoLiquido.toFixed(2).replace('.', ',')} \u20AC`);

            csvRows.push(`Total Ajudas (Manuais):;${res.totalAjudasManuais.toFixed(2).replace('.', ',')} \u20AC`);

            csvRows.push(`Total Outros:;${res.totalExtras.toFixed(2).replace('.', ',')} \u20AC`);

            csvRows.push(`Reten\u00E7\u00F5es (IRS + SS):;${res.impostosRetidos.toFixed(2).replace('.', ',')} \u20AC`);

            csvRows.push('');

            csvRows.push(`TOTAL DO MÊS A RECEBER:;${res.finalLiquidoReceber.toFixed(2).replace('.', ',')} \u20AC`);

            // Create and download CSV file with UTF-8 BOM for Excel compatibility

            let csvString = "\ufeff" + csvRows.join('\r\n');

            let blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

            let link = document.createElement("a");

            let url = URL.createObjectURL(blob);

            link.setAttribute("href", url);

            link.setAttribute("download", `Relatorio_${mKey}.csv`);

            link.style.visibility = 'hidden';

            document.body.appendChild(link);

            link.click();

            document.body.removeChild(link);

        });

        function getShareText(res, type) {
            const y = curDate.getFullYear();
            const mFull = new Intl.DateTimeFormat('pt-PT', { month: 'long' }).format(curDate);
            const title = type === 'year' 
                ? `*Relat\u00f3rio ANUAL Journey Tracker - ${y}*`
                : `*Relat\u00f3rio Journey Tracker - ${mFull} ${y}*`;

            return `${title}\n` +
                `Matr\u00edcula: ${DB.config.matricula || '-'}\n` +
                `Motorista: ${DB.config.nome || '-'}\n\n` +
                `*Bruto:* \u20ac ${res.bruto.toFixed(2)}\n` +
                `*L\u00edquido:* \u20ac ${res.fixoLiquido.toFixed(2)}\n` +
                `*Ajudas:* \u20ac ${(res.totalAjudasManuais + (res.totalKmGains || 0)).toFixed(2)}\n` +
                `*Outros:* \u20ac ${res.totalExtras.toFixed(2)}\n\n` +
                `*TOTAL A RECEBER:* \u20ac ${res.finalLiquidoReceber.toFixed(2)}\n\n` +
                `_Gerado por Journey Tracker 2026_`;
        }

        document.getElementById('btn-export-wa').onclick = () => {
            const res = currentRptView === 'year' ? computeYearEngine() : computeMonthEngine();
            const text = encodeURIComponent(getShareText(res, currentRptView));
            window.open(`https://wa.me/?text=${text}`, '_blank');
        };

        document.getElementById('btn-export-mail').onclick = () => {
            const res = currentRptView === 'year' ? computeYearEngine() : computeMonthEngine();
            const text = encodeURIComponent(getShareText(res, currentRptView));
            const subject = currentRptView === 'year' ? 'Relat\u00F3rio Anual' : 'Relat\u00F3rio Mensal';
            window.location.href = `mailto:?subject=${subject}&body=${text}`;
        };

        // ── AUTO-RESTAURAR SESSÃO ──

        (function() {

            const lastId = localStorage.getItem(STORE_KEY_PREFIX + '_last_id');

            if (lastId) {

                const emailInput = document.getElementById('l-email');

                if (emailInput) emailInput.value = lastId;

                loadUserDB(lastId);

                if (DB.auth) { showApp(); return; }

            }

            // Sem sess\u00E3o: mostrar login

        })();

        function toggleSidebar() {

            document.querySelector('.sidebar').classList.toggle('show');

        }

    

