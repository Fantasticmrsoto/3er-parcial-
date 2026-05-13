/**
 * PANEL DE ADMINISTRACIÓN — CANAIMA AIRLINES
 * admin.js
 *
 * Acceso: index.html?role=admin
 *
 * Módulos:
 *   1. Estado global y persistencia
 *   2. Inicialización del panel
 *   3. Pestaña: Vuelos (registro + edición de estado)
 *   4. Pestaña: Clientes (pasajeros de todas las reservas)
 *   5. Pestaña: Estadísticas
 *   6. Utilidades y helpers
 */

// ─────────────────────────────────────────────
// 1. ESTADO GLOBAL
// ─────────────────────────────────────────────

const ESTADOS_VUELO = ['A tiempo', 'Embarcando', 'Retrasado', 'Cancelado', 'Aterrizado'];
const ESTADO_COLORES = {
    'A tiempo':   { bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
    'Embarcando': { bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
    'Retrasado':  { bg: '#fef9c3', color: '#854d0e', dot: '#eab308' },
    'Cancelado':  { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
    'Aterrizado': { bg: '#f3f4f6', color: '#374151', dot: '#6b7280' },
};

const DESTINOS_DISPONIBLES = [
    "Barcelona (BLA)", "Barinas (BNS)", "Barquisimeto (BRM)", "Canaima (CAJ)",
    "Cumaná (CUM)", "El Vigía (VIG)", "La Fría (LFR)", "Las Piedras (LSP)",
    "Los Roques (LRV)", "Maracaibo (MAR)", "Maturín (MUN)", "Valencia (VLN)",
    "Caracas (CCS)", "Bridgetown (BGI)", "Cancún (CUN)", "La Habana (HAV)",
    "Managua (MGA)", "Santa Lucía (NLU)", "Buenos Aires (EZE)", "Bogotá (BOG)",
    "Madrid (MAD)", "Miami (MIA)", "Ciudad de Panamá (PTY)"
];

// ─────────────────────────────────────────────
// PERSISTENCIA
// ─────────────────────────────────────────────

function cargarVuelos() {
    return JSON.parse(localStorage.getItem('vuelosAdmin')) || [
        { id: 'AV102', origen: 'Caracas (CCS)', destino: 'Madrid (MAD)', salida: '08:00', fecha: hoyISO(), estado: 'A tiempo', capacidad: 128 },
        { id: 'AV205', origen: 'Caracas (CCS)', destino: 'Maracaibo (MAR)', salida: '11:30', fecha: hoyISO(), estado: 'Embarcando', capacidad: 128 },
        { id: 'AV309', origen: 'Caracas (CCS)', destino: 'Buenos Aires (EZE)', salida: '15:00', fecha: hoyISO(), estado: 'A tiempo', capacidad: 128 },
        { id: 'AV412', origen: 'Caracas (CCS)', destino: 'Bogotá (BOG)', salida: '18:45', fecha: hoyISO(), estado: 'Retrasado', capacidad: 128 },
    ];
}

function guardarVuelos(vuelos) {
    localStorage.setItem('vuelosAdmin', JSON.stringify(vuelos));
    // Sync con el itinerario del sistema principal — mantener origen y destino completos
    const itinerario = vuelos.map(v => ({
        id: v.id,
        nro: v.id,
        origen: v.origen,
        destino: v.destino,
        salida: v.salida,
        fecha: v.fecha,
        estado: v.estado
    }));
    localStorage.setItem('itinerarioSync', JSON.stringify(itinerario));
}

function cargarReservas() {
    return JSON.parse(localStorage.getItem('reservasAdmin')) || [];
}

function cargarAsientosOcupados() {
    return JSON.parse(localStorage.getItem('asientosOcupados')) || [];
}

// ─────────────────────────────────────────────
// 2. INICIALIZACIÓN
// ─────────────────────────────────────────────

function inicializarAdmin() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('role') !== 'admin') return;

    // Ocultar todo el contenido principal
    const hero = document.getElementById('contenedor-reserva-visual');
    if (hero) hero.classList.add('hidden');
    document.querySelectorAll('#app section').forEach(s => s.classList.add('hidden'));

    const seccionAdmin = document.getElementById('seccion-admin');
    if (!seccionAdmin) return;

    seccionAdmin.classList.remove('hidden');
    seccionAdmin.innerHTML = construirLayoutAdmin();

    activarPestana('vuelos');
}

function construirLayoutAdmin() {
    return `
    <div class="adm-shell">

        <!-- Sidebar -->
        <aside class="adm-sidebar">
            <div class="adm-brand">
                <div class="adm-brand-icon">✈</div>
                <div>
                    <div class="adm-brand-name">Canaima</div>
                    <div class="adm-brand-sub">Panel Admin</div>
                </div>
            </div>
            <nav class="adm-nav">
                <button class="adm-nav-btn active" id="tab-btn-vuelos" onclick="activarPestana('vuelos')">
                    <span class="adm-nav-icon">🛫</span> Vuelos
                </button>
                <button class="adm-nav-btn" id="tab-btn-clientes" onclick="activarPestana('clientes')">
                    <span class="adm-nav-icon">👥</span> Clientes
                </button>
                <button class="adm-nav-btn" id="tab-btn-stats" onclick="activarPestana('stats')">
                    <span class="adm-nav-icon">📊</span> Estadísticas
                </button>
            </nav>
            <div class="adm-sidebar-footer">
                <button class="adm-btn-danger" onclick="confirmarReset()">🗑 Resetear datos</button>
                <a href="${window.location.pathname}" class="adm-btn-ghost">← Volver al sitio</a>
            </div>
        </aside>

        <!-- Main content -->
        <main class="adm-main">
            <div id="adm-tab-vuelos" class="adm-tab"></div>
            <div id="adm-tab-clientes" class="adm-tab hidden"></div>
            <div id="adm-tab-stats" class="adm-tab hidden"></div>
        </main>

    </div>

    <!-- Modal vuelo -->
    <div id="adm-modal-overlay" class="adm-modal-overlay hidden" onclick="cerrarModalVuelo(event)">
        <div class="adm-modal" id="adm-modal">
            <div class="adm-modal-header">
                <h3 id="adm-modal-titulo">Nuevo Vuelo</h3>
                <button class="adm-modal-close" onclick="cerrarModalVuelo()">✕</button>
            </div>
            <div class="adm-modal-body" id="adm-modal-body"></div>
        </div>
    </div>
    `;
}

// ─────────────────────────────────────────────
// PESTAÑAS
// ─────────────────────────────────────────────

function activarPestana(tab) {
    ['vuelos', 'clientes', 'stats'].forEach(t => {
        document.getElementById(`adm-tab-${t}`)?.classList.add('hidden');
        document.getElementById(`tab-btn-${t}`)?.classList.remove('active');
    });
    document.getElementById(`adm-tab-${tab}`)?.classList.remove('hidden');
    document.getElementById(`tab-btn-${tab}`)?.classList.add('active');

    if (tab === 'vuelos')   renderTabVuelos();
    if (tab === 'clientes') renderTabClientes();
    if (tab === 'stats')    renderTabStats();
}

// ─────────────────────────────────────────────
// 3. PESTAÑA: VUELOS
// ─────────────────────────────────────────────

function renderTabVuelos() {
    const vuelos = cargarVuelos();
    const container = document.getElementById('adm-tab-vuelos');

    container.innerHTML = `
        <div class="adm-tab-header">
            <div>
                <h2 class="adm-tab-titulo">Gestión de Vuelos</h2>
                <p class="adm-tab-sub">${vuelos.length} vuelo(s) registrado(s)</p>
            </div>
            <button class="adm-btn-primary" onclick="abrirModalNuevoVuelo()">+ Nuevo vuelo</button>
        </div>

        <div class="adm-search-bar">
            <span>🔍</span>
            <input type="text" id="buscador-vuelos" placeholder="Buscar por N° vuelo, destino u origen..."
                   oninput="filtrarTablaVuelos()" class="adm-input-search">
        </div>

        <div class="adm-table-wrap">
            <table class="adm-table" id="tabla-vuelos-admin">
                <thead>
                    <tr>
                        <th>N° Vuelo</th>
                        <th>Origen</th>
                        <th>Destino</th>
                        <th>Fecha</th>
                        <th>Hora</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="tbody-vuelos">
                    ${vuelos.map(v => filaVuelo(v)).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function filaVuelo(v) {
    const cfg = ESTADO_COLORES[v.estado] || ESTADO_COLORES['A tiempo'];
    return `
    <tr id="fila-vuelo-${v.id}" data-busqueda="${v.id.toLowerCase()} ${v.origen.toLowerCase()} ${v.destino.toLowerCase()}">
        <td><span class="adm-badge-id">${v.id}</span></td>
        <td>${v.origen}</td>
        <td>${v.destino}</td>
        <td>${formatearFecha(v.fecha)}</td>
        <td>${formatearHora12(v.salida)}</td>
        <td>
            <span class="adm-estado-badge" style="background:${cfg.bg};color:${cfg.color}">
                <span class="adm-estado-dot" style="background:${cfg.dot}"></span>
                ${v.estado}
            </span>
        </td>
        <td class="adm-acciones">
            <button class="adm-btn-icon adm-btn-edit" title="Editar" onclick="abrirModalEditarVuelo('${v.id}')">✏️</button>
            <button class="adm-btn-icon adm-btn-delete" title="Eliminar" onclick="eliminarVuelo('${v.id}')">🗑</button>
        </td>
    </tr>`;
}

function filtrarTablaVuelos() {
    const q = document.getElementById('buscador-vuelos')?.value.toLowerCase() || '';
    document.querySelectorAll('#tbody-vuelos tr').forEach(row => {
        const texto = row.dataset.busqueda || '';
        row.style.display = (!q || texto.includes(q)) ? '' : 'none';
    });
}

// ── Modal: Nuevo vuelo ──

function abrirModalNuevoVuelo() {
    document.getElementById('adm-modal-titulo').textContent = 'Registrar Nuevo Vuelo';
    document.getElementById('adm-modal-body').innerHTML = formVuelo(null);
    document.getElementById('adm-modal-overlay').classList.remove('hidden');
}

function abrirModalEditarVuelo(id) {
    const vuelos = cargarVuelos();
    const vuelo = vuelos.find(v => v.id === id);
    if (!vuelo) return;
    document.getElementById('adm-modal-titulo').textContent = `Editar Vuelo ${id}`;
    document.getElementById('adm-modal-body').innerHTML = formVuelo(vuelo);
    document.getElementById('adm-modal-overlay').classList.remove('hidden');
}

function formVuelo(v) {
    const esNuevo = !v;
    const optsEstado = ESTADOS_VUELO.map(e =>
        `<option value="${e}" ${v && v.estado === e ? 'selected' : ''}>${e}</option>`
    ).join('');
    const optsDestino = DESTINOS_DISPONIBLES.map(d =>
        `<option value="${d}" ${v && v.destino === d ? 'selected' : ''}>${d}</option>`
    ).join('');
    const optsOrigen = DESTINOS_DISPONIBLES.map(d =>
        `<option value="${d}" ${v && v.origen === d ? 'selected' : ''}>${d}</option>`
    ).join('');

    return `
    <div class="adm-form">
        <div class="adm-form-row">
            <div class="adm-form-group">
                <label>N° de Vuelo</label>
                <input type="text" id="fm-id" class="adm-input"
                    placeholder="Ej: AV501"
                    value="${v ? v.id : ''}"
                    ${!esNuevo ? 'readonly style="background:#f1f5f9"' : ''}>
            </div>
            <div class="adm-form-group">
                <label>Estado</label>
                <select id="fm-estado" class="adm-input">${optsEstado}</select>
            </div>
        </div>
        <div class="adm-form-row">
            <div class="adm-form-group">
                <label>Origen</label>
                <select id="fm-origen" class="adm-input">${optsOrigen}</select>
            </div>
            <div class="adm-form-group">
                <label>Destino</label>
                <select id="fm-destino" class="adm-input">${optsDestino}</select>
            </div>
        </div>
        <div class="adm-form-row">
            <div class="adm-form-group">
                <label>Fecha</label>
                <input type="date" id="fm-fecha" class="adm-input" value="${v ? v.fecha : hoyISO()}">
            </div>
            <div class="adm-form-group">
                <label>Hora de salida</label>
                <input type="time" id="fm-salida" class="adm-input" value="${v ? v.salida : '08:00'}">
            </div>
        </div>
        <div class="adm-form-row">
            <div class="adm-form-group">
                <label>Capacidad (asientos)</label>
                <input type="number" id="fm-capacidad" class="adm-input" min="1" max="400"
                    value="${v ? v.capacidad : 128}">
            </div>
        </div>
        <p id="fm-error" class="adm-form-error hidden"></p>
        <div class="adm-form-actions">
            <button class="adm-btn-ghost" onclick="cerrarModalVuelo()">Cancelar</button>
            <button class="adm-btn-primary" onclick="guardarFormVuelo(${esNuevo ? 'true' : `false,'${v.id}'`})">
                ${esNuevo ? '✈ Registrar vuelo' : '💾 Guardar cambios'}
            </button>
        </div>
    </div>`;
}

function guardarFormVuelo(esNuevo, idOriginal) {
    const id       = document.getElementById('fm-id')?.value.trim().toUpperCase();
    const estado   = document.getElementById('fm-estado')?.value;
    const origen   = document.getElementById('fm-origen')?.value;
    const destino  = document.getElementById('fm-destino')?.value;
    const fecha    = document.getElementById('fm-fecha')?.value;
    const salida   = document.getElementById('fm-salida')?.value;
    const cap      = parseInt(document.getElementById('fm-capacidad')?.value) || 128;
    const errEl    = document.getElementById('fm-error');

    const mostrarError = (msg) => {
        errEl.textContent = msg;
        errEl.classList.remove('hidden');
    };

    if (!id || !estado || !origen || !destino || !fecha || !salida) {
        return mostrarError('⚠️ Completa todos los campos.');
    }
    if (origen === destino) {
        return mostrarError('⚠️ El origen y el destino no pueden ser iguales.');
    }
    if (!/^[A-Z]{1,3}\d{1,4}$/.test(id)) {
        return mostrarError('⚠️ Formato de vuelo inválido. Ej: AV501');
    }

    const vuelos = cargarVuelos();

    if (esNuevo) {
        if (vuelos.find(v => v.id === id)) {
            return mostrarError(`⚠️ Ya existe un vuelo con el código ${id}.`);
        }
        vuelos.push({ id, origen, destino, salida, fecha, estado, capacidad: cap });
    } else {
        const idx = vuelos.findIndex(v => v.id === idOriginal);
        if (idx === -1) return mostrarError('⚠️ Vuelo no encontrado.');
        vuelos[idx] = { id: idOriginal, origen, destino, salida, fecha, estado, capacidad: cap };
    }

    guardarVuelos(vuelos);
    cerrarModalVuelo();
    renderTabVuelos();
    mostrarToast(esNuevo ? `Vuelo ${id} registrado ✓` : `Vuelo ${idOriginal} actualizado ✓`);
}

function eliminarVuelo(id) {
    if (!confirm(`¿Eliminar el vuelo ${id}? Esta acción no se puede deshacer.`)) return;
    const vuelos = cargarVuelos().filter(v => v.id !== id);
    guardarVuelos(vuelos);
    renderTabVuelos();
    mostrarToast(`Vuelo ${id} eliminado`);
}

function cerrarModalVuelo(e) {
    if (e && e.target !== document.getElementById('adm-modal-overlay')) return;
    document.getElementById('adm-modal-overlay')?.classList.add('hidden');
}

// ─────────────────────────────────────────────
// 4. PESTAÑA: CLIENTES
// ─────────────────────────────────────────────

function renderTabClientes() {
    const reservas = cargarReservas();

    // Aplanar todos los pasajeros de todas las reservas
    const clientes = [];
    reservas.forEach(r => {
        (r.pasajeros || []).forEach(p => {
            clientes.push({
                nombre: p.nombre,
                cedula: p.cedula,
                edad: p.edad,
                asiento: p.asiento,
                origen: r.origen,
                destino: r.destino,
                fecha: r.fecha ? r.fecha.split('T')[0] : '—',
                reservaId: r.id
            });
        });
    });

    const container = document.getElementById('adm-tab-clientes');

    if (clientes.length === 0) {
        container.innerHTML = `
            <div class="adm-tab-header">
                <div>
                    <h2 class="adm-tab-titulo">Lista de Clientes</h2>
                    <p class="adm-tab-sub">Pasajeros registrados en el sistema</p>
                </div>
            </div>
            <div class="adm-empty-state">
                <div class="adm-empty-icon">👥</div>
                <h3>Sin clientes registrados</h3>
                <p>Aún no se han completado reservas. Los pasajeros aparecerán aquí una vez que finalicen su proceso de reserva.</p>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div class="adm-tab-header">
            <div>
                <h2 class="adm-tab-titulo">Lista de Clientes</h2>
                <p class="adm-tab-sub">${clientes.length} pasajero(s) registrado(s) en ${reservas.length} reserva(s)</p>
            </div>
            <button class="adm-btn-secondary" onclick="exportarClientesCSV()">⬇ Exportar CSV</button>
        </div>

        <div class="adm-search-bar">
            <span>🔍</span>
            <input type="text" id="buscador-clientes" placeholder="Buscar por nombre, cédula o destino..."
                   oninput="filtrarTablaClientes()" class="adm-input-search">
        </div>

        <div class="adm-table-wrap">
            <table class="adm-table" id="tabla-clientes">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Cédula / ID</th>
                        <th>Edad</th>
                        <th>Asiento</th>
                        <th>Ruta</th>
                        <th>Fecha reserva</th>
                        <th>ID Reserva</th>
                    </tr>
                </thead>
                <tbody id="tbody-clientes">
                    ${clientes.map(c => `
                    <tr data-busqueda="${c.nombre.toLowerCase()} ${c.cedula.toLowerCase()} ${c.destino.toLowerCase()} ${c.origen.toLowerCase()}">
                        <td><strong>${c.nombre}</strong></td>
                        <td><code>${c.cedula}</code></td>
                        <td>${c.edad ?? '—'}</td>
                        <td><span class="adm-badge-asiento">${c.asiento}</span></td>
                        <td>${c.origen} <span style="color:#0052cc">→</span> ${c.destino}</td>
                        <td>${formatearFecha(c.fecha)}</td>
                        <td><span class="adm-badge-res">${c.reservaId}</span></td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
}

function filtrarTablaClientes() {
    const q = document.getElementById('buscador-clientes')?.value.toLowerCase() || '';
    document.querySelectorAll('#tbody-clientes tr').forEach(row => {
        const texto = row.dataset.busqueda || '';
        row.style.display = (!q || texto.includes(q)) ? '' : 'none';
    });
}

function exportarClientesCSV() {
    const reservas = cargarReservas();
    const filas = [['Nombre', 'Cédula', 'Edad', 'Asiento', 'Origen', 'Destino', 'Fecha', 'ID Reserva']];
    reservas.forEach(r => {
        (r.pasajeros || []).forEach(p => {
            filas.push([p.nombre, p.cedula, p.edad ?? '', p.asiento, r.origen, r.destino, (r.fecha || '').split('T')[0], r.id]);
        });
    });
    const csv = filas.map(f => f.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'clientes_canaima.csv';
    a.click(); URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────
// 5. PESTAÑA: ESTADÍSTICAS
// ─────────────────────────────────────────────

function renderTabStats() {
    const vuelos   = cargarVuelos();
    const reservas = cargarReservas();
    const ocupados = cargarAsientosOcupados();

    const totalPasajeros = reservas.reduce((s, r) => s + (r.pasajeros?.length || 0), 0);
    const porcOcupacion  = Math.round((ocupados.length / 128) * 100);

    // Conteo de vuelos por estado
    const porEstado = {};
    ESTADOS_VUELO.forEach(e => porEstado[e] = 0);
    vuelos.forEach(v => { if (porEstado[v.estado] !== undefined) porEstado[v.estado]++; });

    // Destinos más reservados
    const contDest = {};
    reservas.forEach(r => {
        contDest[r.destino] = (contDest[r.destino] || 0) + 1;
    });
    const topDest = Object.entries(contDest).sort((a,b) => b[1]-a[1]).slice(0, 5);

    const container = document.getElementById('adm-tab-stats');
    container.innerHTML = `
        <div class="adm-tab-header">
            <div>
                <h2 class="adm-tab-titulo">Estadísticas del Sistema</h2>
                <p class="adm-tab-sub">Resumen operacional de Canaima Airlines</p>
            </div>
        </div>

        <div class="adm-stats-grid">
            <div class="adm-stat-card" style="border-top:3px solid #0052cc">
                <div class="adm-stat-icon">🛫</div>
                <div class="adm-stat-val">${vuelos.length}</div>
                <div class="adm-stat-lbl">Vuelos registrados</div>
            </div>
            <div class="adm-stat-card" style="border-top:3px solid #22c55e">
                <div class="adm-stat-icon">👥</div>
                <div class="adm-stat-val">${totalPasajeros}</div>
                <div class="adm-stat-lbl">Pasajeros totales</div>
            </div>
            <div class="adm-stat-card" style="border-top:3px solid #f97316">
                <div class="adm-stat-icon">💺</div>
                <div class="adm-stat-val">${ocupados.length}</div>
                <div class="adm-stat-lbl">Asientos ocupados</div>
            </div>
            <div class="adm-stat-card" style="border-top:3px solid #8b5cf6">
                <div class="adm-stat-icon">📋</div>
                <div class="adm-stat-val">${reservas.length}</div>
                <div class="adm-stat-lbl">Reservas completadas</div>
            </div>
        </div>

        <div class="adm-stats-row">
            <!-- Vuelos por estado -->
            <div class="adm-stats-panel">
                <h3 class="adm-stats-panel-titulo">Vuelos por estado</h3>
                <div class="adm-estado-list">
                    ${ESTADOS_VUELO.map(e => {
                        const cfg = ESTADO_COLORES[e];
                        const cant = porEstado[e] || 0;
                        const pct = vuelos.length ? Math.round((cant / vuelos.length) * 100) : 0;
                        return `
                        <div class="adm-estado-row">
                            <span class="adm-estado-badge" style="background:${cfg.bg};color:${cfg.color}">
                                <span class="adm-estado-dot" style="background:${cfg.dot}"></span>${e}
                            </span>
                            <div class="adm-bar-track">
                                <div class="adm-bar-fill" style="width:${pct}%;background:${cfg.dot}"></div>
                            </div>
                            <span class="adm-cant">${cant}</span>
                        </div>`;
                    }).join('')}
                </div>
            </div>

            <!-- Ocupación general -->
            <div class="adm-stats-panel">
                <h3 class="adm-stats-panel-titulo">Ocupación de la aeronave</h3>
                <div class="adm-donut-wrap">
                    <svg viewBox="0 0 120 120" class="adm-donut">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" stroke-width="14"/>
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#0052cc" stroke-width="14"
                            stroke-dasharray="${3.14159*100*porcOcupacion/100} ${3.14159*100*(1-porcOcupacion/100)}"
                            stroke-dashoffset="${3.14159*25}" stroke-linecap="round"/>
                        <text x="60" y="58" text-anchor="middle" font-size="20" font-weight="800" fill="#172b4d">${porcOcupacion}%</text>
                        <text x="60" y="73" text-anchor="middle" font-size="9" fill="#8fa8d4">ocupados</text>
                    </svg>
                </div>
                <p class="adm-donut-sub">${ocupados.length} de 128 asientos ocupados</p>
            </div>

            <!-- Top destinos -->
            <div class="adm-stats-panel">
                <h3 class="adm-stats-panel-titulo">Destinos más reservados</h3>
                ${topDest.length === 0
                    ? '<p style="color:#8fa8d4;font-size:13px;margin-top:12px">Sin datos de reservas aún.</p>'
                    : topDest.map(([dest, cnt], i) => `
                        <div class="adm-top-dest">
                            <span class="adm-top-num">${i+1}</span>
                            <span class="adm-top-nombre">${dest}</span>
                            <span class="adm-top-cnt">${cnt} reserva${cnt!==1?'s':''}</span>
                        </div>`).join('')
                }
            </div>
        </div>
    `;
}

// ─────────────────────────────────────────────
// 6. UTILIDADES
// ─────────────────────────────────────────────

function hoyISO() {
    return new Date().toISOString().split('T')[0];
}

function formatearFecha(iso) {
    if (!iso || iso === '—') return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

function formatearHora12(h24) {
    if (!h24) return '—';
    const [hStr, mStr] = h24.split(':');
    let h = parseInt(hStr);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${mStr} ${ampm}`;
}

function mostrarToast(msg) {
    let toast = document.getElementById('adm-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'adm-toast';
        toast.className = 'adm-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 3000);
}

function confirmarReset() {
    if (!confirm('¿Eliminar TODOS los datos del sistema? (vuelos, reservas, asientos)\nEsta acción es irreversible.')) return;
    ['asientosOcupados', 'reservasAdmin', 'vuelosAdmin', 'itinerarioSync'].forEach(k => localStorage.removeItem(k));
    mostrarToast('Sistema reseteado ✓');
    activarPestana('vuelos');
}

// ─────────────────────────────────────────────
// ESTILOS INYECTADOS (CSS-in-JS para el panel)
// ─────────────────────────────────────────────

(function inyectarEstilosAdmin() {
    if (document.getElementById('adm-styles')) return;
    const style = document.createElement('style');
    style.id = 'adm-styles';
    style.textContent = `
/* Shell */
.adm-shell {
    display: flex;
    min-height: calc(100vh - 70px);
    background: #f0f4fb;
    font-family: 'Segoe UI', system-ui, sans-serif;
    text-align: left;
}

/* Sidebar */
.adm-sidebar {
    width: 220px;
    min-width: 220px;
    background: #111827;
    display: flex;
    flex-direction: column;
    padding: 24px 0 20px;
    gap: 0;
    position: sticky;
    top: 0;
    height: calc(100vh - 70px);
    overflow-y: auto;
}
.adm-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 20px 24px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    margin-bottom: 12px;
}
.adm-brand-icon {
    width: 38px; height: 38px;
    background: #0052cc;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; color: white;
}
.adm-brand-name { font-size: 16px; font-weight: 800; color: white; line-height: 1; }
.adm-brand-sub  { font-size: 10px; color: #5b9cf6; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }

.adm-nav { display: flex; flex-direction: column; gap: 4px; padding: 0 12px; flex: 1; }
.adm-nav-btn {
    display: flex; align-items: center; gap: 10px;
    background: none; border: none;
    color: rgba(255,255,255,0.6); font-size: 14px; font-weight: 600;
    padding: 10px 14px; border-radius: 8px; cursor: pointer;
    transition: background 0.15s, color 0.15s; text-align: left;
}
.adm-nav-btn:hover { background: rgba(255,255,255,0.07); color: white; }
.adm-nav-btn.active { background: #0052cc; color: white; }
.adm-nav-icon { font-size: 16px; }

.adm-sidebar-footer {
    padding: 16px 12px 0;
    border-top: 1px solid rgba(255,255,255,0.08);
    display: flex; flex-direction: column; gap: 8px;
}

/* Main */
.adm-main { flex: 1; padding: 32px 36px; overflow-y: auto; }
.adm-tab { width: 100%; }
.adm-tab.hidden { display: none; }

/* Tab header */
.adm-tab-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
}
.adm-tab-titulo { margin: 0; font-size: 22px; font-weight: 800; color: #172b4d; }
.adm-tab-sub    { margin: 4px 0 0; font-size: 13px; color: #8fa8d4; }

/* Search bar */
.adm-search-bar {
    display: flex; align-items: center; gap: 10px;
    background: white; border: 1px solid #dce8ff; border-radius: 10px;
    padding: 10px 16px; margin-bottom: 16px;
    box-shadow: 0 1px 4px rgba(0,50,150,0.06);
    font-size: 14px; color: #8fa8d4;
}
.adm-input-search {
    flex: 1; border: none; outline: none; font-size: 14px; color: #333; font-family: inherit;
    background: transparent;
}

/* Table */
.adm-table-wrap { overflow-x: auto; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,50,150,0.07); }
.adm-table {
    width: 100%; border-collapse: collapse;
    background: white; font-size: 13px; border-radius: 12px; overflow: hidden;
}
.adm-table thead tr { background: #f8faff; }
.adm-table th {
    padding: 12px 16px; text-align: left;
    font-size: 11px; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.6px; color: #8fa8d4; border-bottom: 2px solid #e8effd;
    white-space: nowrap;
}
.adm-table td {
    padding: 13px 16px; border-bottom: 1px solid #f0f5ff;
    vertical-align: middle; color: #2d3748;
}
.adm-table tbody tr:last-child td { border-bottom: none; }
.adm-table tbody tr:hover { background: #f8fbff; }

/* Badges */
.adm-badge-id {
    background: #172b4d; color: white;
    font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px;
    letter-spacing: 0.5px;
}
.adm-badge-asiento {
    background: #e6f0ff; color: #0052cc;
    font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 6px;
}
.adm-badge-res {
    background: #f0fdf4; color: #166534;
    font-size: 11px; padding: 2px 8px; border-radius: 20px;
    border: 1px solid #bbf7d0; white-space: nowrap;
}

/* Estado badge */
.adm-estado-badge {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 12px; font-weight: 700;
    padding: 4px 10px; border-radius: 20px; white-space: nowrap;
}
.adm-estado-dot {
    width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
}

/* Acciones */
.adm-acciones { display: flex; gap: 6px; }
.adm-btn-icon {
    width: 32px; height: 32px; border-radius: 8px; border: none;
    cursor: pointer; font-size: 15px; display: flex; align-items: center; justify-content: center;
    transition: background 0.15s;
}
.adm-btn-edit   { background: #eff6ff; } .adm-btn-edit:hover   { background: #dbeafe; }
.adm-btn-delete { background: #fef2f2; } .adm-btn-delete:hover { background: #fee2e2; }

/* Buttons */
.adm-btn-primary {
    background: #0052cc; color: white; border: none;
    padding: 10px 20px; border-radius: 9px; font-size: 13px; font-weight: 700;
    cursor: pointer; transition: background 0.15s; white-space: nowrap;
}
.adm-btn-primary:hover { background: #0747a6; }
.adm-btn-secondary {
    background: white; color: #0052cc; border: 2px solid #0052cc;
    padding: 8px 18px; border-radius: 9px; font-size: 13px; font-weight: 700;
    cursor: pointer; transition: all 0.15s;
}
.adm-btn-secondary:hover { background: #e6f0ff; }
.adm-btn-ghost {
    background: none; border: 1px solid rgba(255,255,255,0.2);
    color: rgba(255,255,255,0.6); font-size: 12px; font-weight: 600;
    padding: 8px 12px; border-radius: 8px; cursor: pointer;
    text-decoration: none; display: block; text-align: center;
    transition: background 0.15s;
}
.adm-btn-ghost:hover { background: rgba(255,255,255,0.07); color: white; }
.adm-btn-danger {
    background: rgba(239,68,68,0.12); color: #ef4444; border: 1px solid rgba(239,68,68,0.3);
    font-size: 12px; font-weight: 700; padding: 8px 12px; border-radius: 8px;
    cursor: pointer; transition: background 0.15s;
}
.adm-btn-danger:hover { background: rgba(239,68,68,0.22); }

/* Modal */
.adm-modal-overlay {
    position: fixed; inset: 0;
    background: rgba(10,20,50,0.6); backdrop-filter: blur(4px);
    z-index: 9999; display: flex; align-items: center; justify-content: center;
}
.adm-modal-overlay.hidden { display: none; }
.adm-modal {
    background: white; border-radius: 16px; width: 92%; max-width: 560px;
    box-shadow: 0 20px 60px rgba(0,40,120,0.25); overflow: hidden;
    animation: admModalIn 0.25s cubic-bezier(0.16,1,0.3,1);
}
@keyframes admModalIn {
    from { transform: translateY(24px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
}
.adm-modal-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 20px 24px; background: linear-gradient(135deg,#0052cc,#0747a6);
}
.adm-modal-header h3 { margin: 0; color: white; font-size: 17px; font-weight: 800; }
.adm-modal-close {
    width: 32px; height: 32px; border-radius: 50%; border: none;
    background: rgba(255,255,255,0.15); color: white; font-size: 14px;
    cursor: pointer; transition: background 0.15s; display: flex; align-items: center; justify-content: center;
}
.adm-modal-close:hover { background: rgba(255,255,255,0.28); }
.adm-modal-body { padding: 24px; }

/* Form */
.adm-form { display: flex; flex-direction: column; gap: 16px; }
.adm-form-row { display: flex; gap: 14px; flex-wrap: wrap; }
.adm-form-group { flex: 1; min-width: 160px; display: flex; flex-direction: column; gap: 5px; }
.adm-form-group label { font-size: 12px; font-weight: 700; color: #5f7a9e; text-transform: uppercase; letter-spacing: 0.5px; }
.adm-input {
    width: 100%; box-sizing: border-box;
    padding: 9px 12px; border: 1.5px solid #dce8ff; border-radius: 8px;
    font-size: 13px; color: #172b4d; outline: none; font-family: inherit;
    transition: border-color 0.15s;
}
.adm-input:focus { border-color: #0052cc; box-shadow: 0 0 0 3px rgba(0,82,204,0.1); }
.adm-form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; }
.adm-form-error { color: #dc2626; font-size: 12px; margin: 0; padding: 8px 12px; background: #fef2f2; border-radius: 6px; }

/* Stats */
.adm-stats-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 16px; margin-bottom: 28px;
}
.adm-stat-card {
    background: white; border-radius: 12px; padding: 20px;
    box-shadow: 0 2px 8px rgba(0,50,150,0.06); text-align: left;
}
.adm-stat-icon { font-size: 22px; margin-bottom: 8px; }
.adm-stat-val  { font-size: 32px; font-weight: 900; color: #172b4d; line-height: 1; }
.adm-stat-lbl  { font-size: 12px; color: #8fa8d4; font-weight: 600; margin-top: 4px; }

.adm-stats-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
@media (max-width: 900px) { .adm-stats-row { grid-template-columns: 1fr; } }
.adm-stats-panel {
    background: white; border-radius: 12px; padding: 20px;
    box-shadow: 0 2px 8px rgba(0,50,150,0.06);
}
.adm-stats-panel-titulo { font-size: 13px; font-weight: 800; color: #172b4d; margin: 0 0 14px; text-transform: uppercase; letter-spacing: 0.5px; }

.adm-estado-list { display: flex; flex-direction: column; gap: 10px; }
.adm-estado-row  { display: flex; align-items: center; gap: 10px; }
.adm-bar-track   { flex: 1; height: 6px; background: #f0f4fb; border-radius: 99px; overflow: hidden; }
.adm-bar-fill    { height: 100%; border-radius: 99px; transition: width 0.4s; }
.adm-cant        { font-size: 12px; font-weight: 700; color: #8fa8d4; min-width: 16px; text-align: right; }

.adm-donut-wrap { display: flex; justify-content: center; margin: 10px 0 6px; }
.adm-donut { width: 120px; height: 120px; transform: rotate(-90deg); }
.adm-donut-sub  { text-align: center; font-size: 12px; color: #8fa8d4; margin: 0; }

.adm-top-dest {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 0; border-bottom: 1px solid #f0f5ff; font-size: 13px;
}
.adm-top-dest:last-child { border-bottom: none; }
.adm-top-num  { width: 22px; height: 22px; background: #172b4d; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; flex-shrink: 0; }
.adm-top-nombre { flex: 1; color: #2d3748; font-weight: 600; }
.adm-top-cnt  { font-size: 11px; color: #8fa8d4; font-weight: 700; }

/* Empty state */
.adm-empty-state {
    text-align: center; padding: 60px 20px;
    background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,50,150,0.06);
}
.adm-empty-icon { font-size: 48px; margin-bottom: 16px; }
.adm-empty-state h3 { margin: 0 0 8px; color: #172b4d; }
.adm-empty-state p  { color: #8fa8d4; font-size: 14px; max-width: 360px; margin: 0 auto; line-height: 1.6; }

/* Toast */
.adm-toast {
    position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%) translateY(10px);
    background: #172b4d; color: white; font-size: 13px; font-weight: 600;
    padding: 12px 24px; border-radius: 30px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.25);
    opacity: 0; transition: opacity 0.25s, transform 0.25s; pointer-events: none; z-index: 99999;
}
.adm-toast.visible { opacity: 1; transform: translateX(-50%) translateY(0); }
    `;
    document.head.appendChild(style);
})();

// ─────────────────────────────────────────────
// SYNC: Itinerario principal ↔ Vuelos admin
// ─────────────────────────────────────────────
// Al cargar la página, si hay datos de admin, sincroniza el
// baseDeDatosVuelos del sistema principal con los registros admin.
window.addEventListener('load', () => {
    const syncData = localStorage.getItem('itinerarioSync');
    if (syncData && typeof baseDeDatosVuelos !== 'undefined') {
        try {
            const datos = JSON.parse(syncData);
            baseDeDatosVuelos.length = 0;
            datos.forEach(v => baseDeDatosVuelos.push(v));
        } catch(e) {}
    }
    inicializarAdmin();
});