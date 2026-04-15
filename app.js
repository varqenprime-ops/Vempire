<!-- 1. COPIA TUDO ISTO PARA O index.html (SUBSTITUI TUDO) -->
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <title>Vwheel PRO</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link rel="stylesheet" href="style.css?v=3.0">
</head>
<body>
    <div id="loading-screen" style="position:fixed; top:0; left:0; width:100%; height:100%; background:radial-gradient(circle at top left, #1e1b4b, #0b0e14); z-index:99999; display:flex; flex-direction:column; align-items:center; justify-content:center;">
        <div style="color:#fff; font-weight:800; font-size:2.5rem; letter-spacing:-1px; text-align:center; font-family:'Outfit';">Vwheel<br /><span style="color:#3b82f6; font-size:1rem; letter-spacing:4px; display:block;">PRO</span></div>
        <div style="width:40px; height:40px; border:4px solid rgba(255,255,255,0.1); border-top:4px solid #3b82f6; border-radius:50%; animation:spin 1s linear infinite; margin-top:20px;"></div>
    </div>

    <!-- Interface da App (Estará escondida até o Login) -->
    <div id="app-screen" class="hidden">
        <div class="main-content-wrapper">
            <div class="app-container">
                <header class="topbar">
                    <div class="header-title">Vwheel PRO</div>
                </header>
                <!-- Calendário será injetado aqui pelo app.js -->
                <div id="view-calendar">
                    <div id="cal-grid" class="cal-grid"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modais Essenciais -->
    <div id="day-modal" class="hidden" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px;">
        <div style="background:#1a1d24; width:100%; max-width:400px; padding:30px; border-radius:30px; border:1px solid rgba(255,255,255,0.1);">
            <h3 id="modal-date-label" style="color:#fff; margin-bottom:20px;">Editar Dia</h3>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px;">
                <input type="number" id="day-km-start" placeholder="KM Início" style="background:#0b0e14; border:1px solid #333; color:#fff; padding:12px; border-radius:10px;">
                <input type="number" id="day-km-end" placeholder="KM Fim" style="background:#0b0e14; border:1px solid #333; color:#fff; padding:12px; border-radius:10px;">
            </div>
            <button id="btn-save-day" style="width:100%; padding:15px; background:#3b82f6; color:#fff; border:none; border-radius:15px; font-weight:800;">GRAVAR DIA</button>
            <button onclick="document.getElementById('day-modal').classList.add('hidden')" style="width:100%; margin-top:10px; background:none; color:#666; border:none;">Cancelar</button>
        </div>
    </div>

    <style>
        .hidden { display:none !important; }
        .cal-grid { display:grid; grid-template-columns: repeat(7, 1fr); gap:5px; padding:10px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>

    <script type="module" src="app.js?v=3.0"></script>
</body>
</html>
