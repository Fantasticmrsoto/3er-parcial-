/**
 * SISTEMA INTEGRADO DE RESERVA DE VUELOS - CANAIMA AIRLINES
 */

// --- 1. ESTADO GLOBAL Y CONFIGURACIÓN ---
const configAvion = {
    filasClub: [1, 2],
    filasTurista: Array.from({ length: 20 }, (_, i) => i + 3),
    asientosBloqueados: [],
    salidasEmergencia: ["1A", "1C", "1D", "1F", "10A", "10B", "10C", "10D", "10E", "10F"]
};

/** Asientos reservados por código de vuelo (cada vuelo tiene su propio mapa). */
const STORAGE_ASIENTOS_POR_VUELO = 'asientosPorVuelo';

function normalizarIdVuelo(id) {
    return String(id || '').trim().toUpperCase();
}

function leerMapaAsientosPorVuelo() {
    try {
        const raw = localStorage.getItem(STORAGE_ASIENTOS_POR_VUELO);
        if (raw) {
            const obj = JSON.parse(raw);
            if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
        }
        const leg = localStorage.getItem('asientosOcupados');
        if (leg) {
            const arr = JSON.parse(leg);
            if (Array.isArray(arr)) {
                localStorage.removeItem('asientosOcupados');
            }
        }
    } catch (e) { /* ignore */ }
    return {};
}

function guardarMapaAsientosPorVuelo(map) {
    localStorage.setItem(STORAGE_ASIENTOS_POR_VUELO, JSON.stringify(map));
}

/** Asientos no disponibles para un vuelo: solo reservas persistidas de ese vuelo (sin bloqueo fijo de cabina). */
function obtenerAsientosOcupadosParaVuelo(idVuelo) {
    const id = normalizarIdVuelo(idVuelo);
    const map = leerMapaAsientosPorVuelo();
    const reservados = new Set(id && map[id] ? map[id] : []);
    return [...reservados];
}

function agregarAsientosOcupadosVuelo(idVuelo, asientosNuevos) {
    const id = normalizarIdVuelo(idVuelo);
    if (!id) return;
    const map = leerMapaAsientosPorVuelo();
    const set = new Set(map[id] || []);
    (asientosNuevos || []).forEach(a => {
        if (a) set.add(a);
    });
    map[id] = [...set];
    guardarMapaAsientosPorVuelo(map);
}

function liberarAsientosDeVuelo(idVuelo, lista) {
    const id = normalizarIdVuelo(idVuelo);
    if (!id || !lista || !lista.length) return;
    const map = leerMapaAsientosPorVuelo();
    const set = new Set(map[id] || []);
    lista.forEach(a => set.delete(a));
    map[id] = [...set];
    guardarMapaAsientosPorVuelo(map);
}

/** Libera asientos de una reserva (usa vueloNro; si falta, intenta en todos los vuelos por compatibilidad). */
function liberarAsientosReserva(reserva) {
    const asientos = reserva.asientos || [];
    if (!asientos.length) return;
    const vid = normalizarIdVuelo(reserva.vueloNro);
    if (vid) {
        liberarAsientosDeVuelo(vid, asientos);
        return;
    }
    const map = leerMapaAsientosPorVuelo();
    Object.keys(map).forEach(k => liberarAsientosDeVuelo(k, asientos));
}

function contarTotalAsientosReservados() {
    const map = leerMapaAsientosPorVuelo();
    return Object.values(map).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
}

/** Fecha local YYYY-MM-DD (evita desfase por toISOString UTC). */
function fechaLocalISO(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** Orden de asientos del mapa (coincide con renderizarMapaAsientos): Club AC|DF luego turista ABC|DEF. */
function generarOrdenAsientosAvion() {
    const orden = [];
    for (let f = 1; f <= 22; f++) {
        const esClub = configAvion.filasClub.includes(f);
        const letras = esClub ? ['A', 'C', 'D', 'F'] : ['A', 'B', 'C', 'D', 'E', 'F'];
        letras.forEach(l => orden.push(`${f}${l}`));
    }
    return orden;
}

/** Capacidad de venta del vuelo desde panel admin (1–128). Por defecto 128. */
function obtenerCapacidadVueloAdmin(idVuelo) {
    const id = normalizarIdVuelo(idVuelo);
    if (!id) return 128;
    try {
        const raw = localStorage.getItem('vuelosAdmin');
        if (!raw) return 128;
        const vuelos = JSON.parse(raw);
        if (!Array.isArray(vuelos)) return 128;
        const hit = vuelos.find(v => normalizarIdVuelo(v.id) === id);
        const c = hit != null ? parseInt(hit.capacidad, 10) : NaN;
        if (Number.isNaN(c) || c < 1) return 128;
        return Math.min(128, c);
    } catch (e) {
        return 128;
    }
}

/** Asientos físicos fuera de la capacidad configurada (no se venden en este vuelo). */
function obtenerSetAsientosFueraDeCapacidad(idVuelo) {
    const cap = obtenerCapacidadVueloAdmin(idVuelo);
    const orden = generarOrdenAsientosAvion();
    if (cap >= orden.length) return new Set();
    return new Set(orden.slice(cap));
}

function obtenerBloqueoEmergenciaPorPerfilPasajeros() {
    const hayPasajerosRestringidosEmergencia = reserva.restricciones && reserva.restricciones.some(r =>
        r.asistencia !== 'ninguna' || r.intelectual === 'si' || r.oxigeno !== 'no' || r.camilla === 'si' || r.otraCondicion === 'si'
    );
    const hayMenores = reserva.conteoCategorias && (reserva.conteoCategorias.ninos > 0 || reserva.conteoCategorias.infantes > 0);
    if (!hayPasajerosRestringidosEmergencia && !hayMenores) return [];
    return [...configAvion.salidasEmergencia];
}

function contarAsientosSeleccionablesVuelo(idVuelo) {
    const id = normalizarIdVuelo(idVuelo);
    if (!id) return 0;
    const permitidosOrden = generarOrdenAsientosAvion();
    const cap = obtenerCapacidadVueloAdmin(id);
    const vender = new Set(permitidosOrden.slice(0, Math.min(cap, permitidosOrden.length)));
    const ocupados = new Set(obtenerAsientosOcupadosParaVuelo(id));
    const restr = new Set(obtenerAsientosBloqueadosPorRestricciones());
    const emergExtra = new Set(obtenerBloqueoEmergenciaPorPerfilPasajeros());
    let n = 0;
    vender.forEach(s => {
        if (!ocupados.has(s) && !restr.has(s) && !emergExtra.has(s)) n++;
    });
    return n;
}

const METODOS_PAGO = [
    { id: 'zelle', etiqueta: 'Zelle', detalle: 'Transferencia Zelle (USD)' },
    { id: 'pago_movil', etiqueta: 'Pago Móvil', detalle: 'Pago Móvil (Bs.) — datos enviados por correo/SMS' },
    { id: 'binance', etiqueta: 'Binance Pay', detalle: 'Binance Pay / cripto según instrucciones' }
];

// Asientos por vuelo: ver STORAGE_ASIENTOS_POR_VUELO y funciones obtener/agregar/liberar

const baseDeDatosVuelos = [
    { nro: "AV102", destino: "España", salida: "08:00 AM", estado: "A tiempo" },
    { nro: "AV205", destino: "Venezuela", salida: "11:30 AM", estado: "Embarcando" },
    { nro: "AV309", destino: "Argentina", salida: "03:00 PM", estado: "A tiempo" },
    { nro: "AV412", destino: "Colombia", salida: "06:45 PM", estado: "Retrasado" }
];

let reserva = {
    tipoViaje: "Ida y vuelta",
    origen: "",
    destino: "",
    fechaIda: "",
    fechaVuelta: "",
    vueloItinerario: null,
    cantidadBoletos: 0,
    pasajeros: [],
    restricciones: [],
    asientos: [],
    conteoCategorias: { adultos: 0, ninos: 0, infantes: 0, mayores: 0 },
    metodoPago: ""
};

// Días disponibles por destino (0=Dom, 1=Lun, ..., 6=Sáb)
const horariosRutas = {
    "Barcelona (BLA)": [1, 2, 3, 4, 5, 6],
    "Barinas (BNS)": [1, 3, 5],
    "Barquisimeto (BRM)": [1, 2, 3, 4, 5, 6],
    "Canaima (CAJ)": [2, 4, 6],
    "Cumaná (CUM)": [1, 3, 5],
    "El Vigía (VIG)": [1, 4],
    "La Fría (LFR)": [3, 6],
    "Las Piedras (LSP)": [2, 5],
    "Los Roques (LRV)": [0, 1, 2, 3, 4, 5, 6],
    "Maracaibo (MAR)": [1, 2, 3, 4, 5, 6],
    "Maturín (MUN)": [1, 3, 5],
    "Valencia (VLN)": [1, 2, 3, 4, 5, 6],
    "Caracas (CCS)": [0, 1, 2, 3, 4, 5, 6],
    "Bridgetown (BGI)": [2, 5],
    "Cancún (CUN)": [1, 3, 6],
    "La Habana (HAV)": [3, 6],
    "Managua (MGA)": [2, 5],
    "Santa Lucía (NLU)": [1, 4],
    "Buenos Aires (EZE)": [1, 3, 5],
    "Bogotá (BOG)": [1, 2, 3, 4, 5, 6],
    "Madrid (MAD)": [1, 3, 5],
    "Miami (MIA)": [2, 4, 6],
    "Ciudad de Panamá (PTY)": [0, 1, 2, 3, 4, 5, 6]
};

const NOMBRE_DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const infoDestinos = [
    { nombre: "Miami", codigo: "MIA", pais: "Estados Unidos", tipo: "internacional",
      descripcion: "Ciudad vibrante de Florida, famosa por sus playas de arena blanca, el icónico Art Decó de South Beach y su vibrante fusión de cultura latina.",
      imagen: "playaa.webp" },
    { nombre: "Cancún", codigo: "CUN", pais: "México", tipo: "internacional",
      descripcion: "Paraíso tropical en el Caribe mexicano, con aguas turquesas, arrecifes de coral, ruinas mayas y una inigualable vida nocturna.",
      imagen: "cancun.jpeg" },
    { nombre: "Los Roques", codigo: "LRV", pais: "Venezuela", tipo: "nacional",
      descripcion: "Archipiélago paradisíaco de aguas cristalinas turquesas y playas de arena blanca, declarado Parque Nacional. Ideal para el buceo, snorkel y la navegación.",
      imagen: "playa.avif" },
    { nombre: "Canaima", codigo: "CAJ", pais: "Venezuela", tipo: "nacional",
      descripcion: "Maravilla natural declarada Patrimonio de la Humanidad por la UNESCO. Hogar del Salto Ángel, la cascada más alta del mundo, y los imponentes tepuyes.",
      imagen: "salto angel.jpeg" },
    { nombre: "Caracas", codigo: "CCS", pais: "Venezuela", tipo: "nacional",
      descripcion: "Capital de Venezuela, vibrante metrópolis enclavada entre el Ávila y el mar Caribe, llena de cultura y diversidad.",
      imagen: "ccs.webp" },
    { nombre: "Maracaibo", codigo: "MAR", pais: "Venezuela", tipo: "nacional",
      descripcion: "Capital del estado Zulia, famosa por el Puente Rafael Urdaneta, el lago y su alegre gaita zuliana.",
      imagen: "maracaibo.jpg" },
    { nombre: "Barcelona", codigo: "BLA", pais: "Venezuela", tipo: "nacional",
      descripcion: "Puerta de entrada al oriente venezolano, con hermosas playas y el imponente complejo turístico El Morro.",
      imagen: "barcelona.webp" },
    { nombre: "Valencia", codigo: "VLN", pais: "Venezuela", tipo: "nacional",
      descripcion: "Capital del estado Carabobo, ciudad industrial y cultural con una rica historia de batallas independentistas y vibrante vida urbana.",
      imagen: "vln.webp" },
    { nombre: "Barquisimeto", codigo: "BRM", pais: "Venezuela", tipo: "nacional",
      descripcion: "Capital musical de Venezuela, conocida por su gente cálida, el crepúsculo más hermoso y su rica gastronomía.",
      imagen: "barquisimeto.jpg" },
    { nombre: "Barinas", codigo: "BNS", pais: "Venezuela", tipo: "nacional",
      descripcion: "Corazón de los llanos venezolanos, ideal para el turismo de naturaleza, los hatos y la cultura llanera.",
      imagen: "barinas.jpg" },
    { nombre: "Cumaná", codigo: "CUM", pais: "Venezuela", tipo: "nacional",
      descripcion: "Primera ciudad fundada en tierra firme de América, con un rico legado histórico y hermosas costas.",
      imagen: "cumana.jpg" },
    { nombre: "El Vigía", codigo: "VIG", pais: "Venezuela", tipo: "nacional",
      descripcion: "Ciudad estratégica del sur del Lago de Maracaibo, puerta de entrada a los Andes venezolanos.",
      imagen: "elvigia.jpg" },
    { nombre: "La Fría", codigo: "LFR", pais: "Venezuela", tipo: "nacional",
      descripcion: "Población del estado Táchira con un clima tropical de montaña y cercanía a la frontera colombiana.",
      imagen: "lafria.jpg" },
    { nombre: "Las Piedras", codigo: "LSP", pais: "Venezuela", tipo: "nacional",
      descripcion: "Localidad de la península de Paraguaná, conocida por sus playas y el fascinante paisaje desértico.",
      imagen: "laspiedras.jpg" },
    { nombre: "Maturín", codigo: "MUN", pais: "Venezuela", tipo: "nacional",
      descripcion: "Capital del estado Monagas, centro neurálgico del oriente venezolano con gran actividad petrolera.",
      imagen: "maturin.jpg" },
    { nombre: "Madrid", codigo: "MAD", pais: "España", tipo: "internacional",
      descripcion: "Capital de España, ciudad cosmopolita con arte, cultura, tapas y una energía que nunca se detiene.",
      imagen: "madrid.jpeg" },
    { nombre: "Buenos Aires", codigo: "EZE", pais: "Argentina", tipo: "internacional",
      descripcion: "Elegante capital argentina, conocida por su arquitectura europea, el tango y su exquisita gastronomía.",
      imagen: "buenos aires.jpg" },
    { nombre: "Bogotá", codigo: "BOG", pais: "Colombia", tipo: "internacional",
      descripcion: "Capital colombiana a 2600 metros de altura, fusión de historia colonial y modernidad vibrante.",
      imagen: "bogota.webp" },
    { nombre: "La Habana", codigo: "HAV", pais: "Cuba", tipo: "internacional",
      descripcion: "Ciudad llena de historia, colores y música, con su icónico malecón y los famosos autos clásicos.",
      imagen: "la habana.webp" },
    { nombre: "Ciudad de Panamá", codigo: "PTY", pais: "Panamá", tipo: "internacional",
      descripcion: "Capital panameña que une dos océanos, con un moderno skyline y el histórico Casco Viejo.",
      imagen: "panama.webp" },
    { nombre: "Bridgetown", codigo: "BGI", pais: "Barbados", tipo: "internacional",
      descripcion: "Capital de Barbados, con playas de ensueño, arquitectura colonial británica y un ambiente caribeño único.",
      imagen: "bridgetown.jpg" },
    { nombre: "Managua", codigo: "MGA", pais: "Nicaragua", tipo: "internacional",
      descripcion: "Capital nicaragüense a orillas del lago Xolotlán, con volcanes imponentes y una rica cultura centroamericana.",
      imagen: "managua.jpg" },
    { nombre: "Santa Lucía", codigo: "NLU", pais: "México", tipo: "internacional",
      descripcion: "Moderna terminal aérea en el Estado de México que conecta con la capital y sus alrededores.",
      imagen: "santalucia.jpg" }
];

const CODIGOS_IATA_INTERNACIONAL = new Set(
    infoDestinos.filter(d => d.tipo === 'internacional').map(d => d.codigo)
);

function extraerCodigoIata(etiquetaCiudad) {
    const m = String(etiquetaCiudad || '').match(/\(([A-Z]{3})\)/);
    return m ? m[1] : '';
}

function rutaEsInternacional(origen, destino) {
    return CODIGOS_IATA_INTERNACIONAL.has(extraerCodigoIata(origen))
        || CODIGOS_IATA_INTERNACIONAL.has(extraerCodigoIata(destino));
}

/** Nacional con Los Roques o Canaima en origen o destino */
function rutaNacionalRoquesOCanaima(origen, destino) {
    if (rutaEsInternacional(origen, destino)) return false;
    const pts = [extraerCodigoIata(origen), extraerCodigoIata(destino)];
    return pts.includes('LRV') || pts.includes('CAJ');
}

function semillaPrecioRuta(origen, destino) {
    const s = (extraerCodigoIata(origen) + extraerCodigoIata(destino)) || 'DF';
    let n = 0;
    for (let i = 0; i < s.length; i++) n += s.charCodeAt(i);
    return n;
}

/**
 * Total USD por pasajero para todo el viaje (solo ida o ida y vuelta).
 * Club Económico siempre más barato que Clase Turista.
 * - Internacional ida y vuelta (turista): ~600–900 USD/persona
 * - Internacional solo ida: más barato que el equivalente ida y vuelta
 * - Nacional Los Roques / Canaima: turista ida y vuelta hasta 450 USD/persona
 * - Nacional resto: tarifas menores
 */
function totalUsdViajePorPersona(origen, destino, tipoViaje, claseCabina) {
    const intl = rutaEsInternacional(origen, destino);
    const idaYVuelta = tipoViaje === 'Ida y vuelta';
    const seed = semillaPrecioRuta(origen, destino);

    let turistaTotal;

    if (intl) {
        if (idaYVuelta) {
            turistaTotal = 600 + (seed % 301);
        } else {
            const refRt = 600 + (seed % 301);
            turistaTotal = Math.round(refRt * 0.54);
            turistaTotal = Math.max(290, Math.min(turistaTotal, 490));
        }
    } else if (rutaNacionalRoquesOCanaima(origen, destino)) {
        if (idaYVuelta) {
            turistaTotal = 310 + (seed % 141);
            if (turistaTotal > 450) turistaTotal = 450;
        } else {
            const topeRt = Math.min(450, 310 + (seed % 141));
            turistaTotal = Math.round(topeRt * 0.52);
            turistaTotal = Math.min(turistaTotal, 248);
        }
    } else {
        if (idaYVuelta) {
            turistaTotal = 165 + (seed % 121);
            if (turistaTotal > 340) turistaTotal = 340;
        } else {
            turistaTotal = Math.round((165 + (seed % 121)) * 0.52);
            turistaTotal = Math.min(turistaTotal, 185);
        }
    }

    const multClub = 0.78;
    const bruto = claseCabina === 'club' ? turistaTotal * multClub : turistaTotal;
    return Math.round(bruto * 100) / 100;
}

// --- ITINERARIO (misma fuente que la tabla pública y el botón Buscar) ---

function normalizarCiudadItinerario(str) {
    return String(str || '').replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
}

/** Versión de datos de itinerario generados: al cambiar, se vuelven a crear vuelos desde plantilla (localStorage). */
const CANAIMA_ITINERARIO_DATA_VERSION = '2026-05-16-v1';

function migrarPlantillaItinerarioSiNecesario() {
    try {
        const k = 'canaimaItinerarioDataVersion';
        if (localStorage.getItem(k) === CANAIMA_ITINERARIO_DATA_VERSION) return;
        localStorage.removeItem('vuelosAdmin');
        localStorage.removeItem('itinerarioSync');
        localStorage.removeItem('asientosPorVuelo');
        localStorage.removeItem('asientosOcupados');
        localStorage.setItem(k, CANAIMA_ITINERARIO_DATA_VERSION);
    } catch (e) { /* ignore */ }
}

/** Itinerario: desde el 16 de mayo (año actual) o desde hoy si ya pasó esa fecha. */
function primeraFechaItinerario() {
    const hoy = new Date();
    const may16 = new Date(hoy.getFullYear(), 4, 16);
    const hoySolo = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    return hoySolo < may16 ? may16 : hoySolo;
}

function fechaLocalDesdeDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Alinea una fecha candidata al calendario de reservas: primer día hacia adelante donde opera el destino. */
function siguienteFechaValidaParaDestino(destino, desde) {
    const diasPerm = horariosRutas[destino];
    const cur = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
    if (!diasPerm || diasPerm.length === 0) return cur;
    for (let k = 0; k < 800; k++) {
        if (diasPerm.includes(cur.getDay())) return cur;
        cur.setDate(cur.getDate() + 1);
    }
    return cur;
}

/** ~30 vuelos; fechas >= 16 de mayo (o hoy) y día de la semana coherente con horariosRutas del destino. */
function generarVuelosMesInicial() {
    const base = primeraFechaItinerario();
    const CCS = 'Caracas (CCS)';
    const rutas = [
        [CCS, 'Madrid (MAD)'], [CCS, 'Miami (MIA)'], [CCS, 'Bogotá (BOG)'], [CCS, 'Buenos Aires (EZE)'],
        [CCS, 'Ciudad de Panamá (PTY)'], [CCS, 'La Habana (HAV)'], [CCS, 'Cancún (CUN)'], [CCS, 'Managua (MGA)'],
        [CCS, 'Bridgetown (BGI)'], [CCS, 'Santa Lucía (NLU)'], [CCS, 'Maracaibo (MAR)'], [CCS, 'Valencia (VLN)'],
        ['Valencia (VLN)', 'Maracaibo (MAR)'], ['Maracaibo (MAR)', CCS], [CCS, 'Los Roques (LRV)'],
        [CCS, 'Canaima (CAJ)'], [CCS, 'Barquisimeto (BRM)'], [CCS, 'Maturín (MUN)'], ['Barcelona (BLA)', CCS],
        [CCS, 'Barinas (BNS)'], [CCS, 'Cumaná (CUM)'], [CCS, 'El Vigía (VIG)'], [CCS, 'La Fría (LFR)'],
        ['Las Piedras (LSP)', CCS], ['Maturín (MUN)', CCS], [CCS, 'Barcelona (BLA)'], [CCS, 'Las Piedras (LSP)'],
        ['Barinas (BNS)', CCS], ['El Vigía (VIG)', 'Maracaibo (MAR)'], ['La Fría (LFR)', CCS], ['Cumaná (CUM)', 'Valencia (VLN)'],
        ['Barquisimeto (BRM)', 'Miami (MIA)'], ['Los Roques (LRV)', CCS], ['Canaima (CAJ)', CCS],
        ['Bogotá (BOG)', CCS], [CCS, 'Cumaná (CUM)'], ['Valencia (VLN)', CCS]
    ];
    const horas = ['06:30', '08:15', '09:40', '11:00', '12:30', '14:15', '15:45', '17:00', '18:30', '20:00', '21:15'];
    const estadosCiclo = ['A tiempo', 'A tiempo', 'Embarcando', 'A tiempo', 'Retrasado', 'A tiempo', 'A tiempo', 'A tiempo'];
    const vuelos = [];
    let num = 501;
    for (let i = 0; i < 30; i++) {
        const [o, d] = rutas[i % rutas.length];
        const candidato = new Date(base.getFullYear(), base.getMonth(), base.getDate());
        candidato.setDate(candidato.getDate() + i);
        const fechaAjustada = siguienteFechaValidaParaDestino(d, candidato);
        const fecha = fechaLocalDesdeDate(fechaAjustada);
        vuelos.push({
            id: `AV${num}`,
            origen: o,
            destino: d,
            salida: horas[i % horas.length],
            fecha,
            estado: estadosCiclo[i % estadosCiclo.length],
            capacidad: 128
        });
        num++;
    }
    return vuelos;
}

function persistirVuelosInicialesSiVacios(listaAdmin) {
    if (!listaAdmin || !listaAdmin.length) return;
    try {
        const raw = localStorage.getItem('vuelosAdmin');
        if (raw) {
            const v = JSON.parse(raw);
            if (Array.isArray(v) && v.length > 0) return;
        }
    } catch (e) { /* continuar */ }
    const paraAdmin = listaAdmin.map(v => ({
        id: v.id,
        origen: v.origen,
        destino: v.destino,
        salida: v.salida,
        fecha: v.fecha,
        estado: v.estado,
        capacidad: v.capacidad || 128
    }));
    localStorage.setItem('vuelosAdmin', JSON.stringify(paraAdmin));
    const sync = listaAdmin.map(v => ({
        id: v.id,
        nro: v.id,
        origen: v.origen,
        destino: v.destino,
        salida: v.salida,
        fecha: v.fecha,
        estado: v.estado
    }));
    localStorage.setItem('itinerarioSync', JSON.stringify(sync));
}

/** Ajusta la fecha de un vuelo al calendario de reservas (mín. itinerario + día operativo del destino). */
function ajustarFechaVueloSegunDestino(v) {
    const out = { ...v };
    if (!out.destino || !out.fecha) return out;
    const partes = String(out.fecha).split('-');
    if (partes.length !== 3) return out;
    const y = parseInt(partes[0], 10);
    const mo = parseInt(partes[1], 10) - 1;
    const d = parseInt(partes[2], 10);
    if (Number.isNaN(y) || Number.isNaN(mo) || Number.isNaN(d)) return out;
    let cur = new Date(y, mo, d);
    const minD = primeraFechaItinerario();
    if (cur < minD) cur = new Date(minD.getFullYear(), minD.getMonth(), minD.getDate());
    if (horariosRutas[out.destino]) {
        const ajustada = siguienteFechaValidaParaDestino(out.destino, cur);
        out.fecha = fechaLocalDesdeDate(ajustada);
    }
    return out;
}

/** Escribe en localStorage fechas que cumplan horariosRutas y fecha mínima (admin e itinerario alineados). */
function sincronizarFechasVuelosEnStorage() {
    try {
        const raw = localStorage.getItem('vuelosAdmin');
        if (!raw) return;
        const list = JSON.parse(raw);
        if (!Array.isArray(list) || !list.length) return;
        let cambio = false;
        const next = list.map(v => {
            const adj = ajustarFechaVueloSegunDestino(v);
            if (adj.fecha !== v.fecha) cambio = true;
            return { ...v, fecha: adj.fecha };
        });
        if (cambio) {
            localStorage.setItem('vuelosAdmin', JSON.stringify(next));
            const itinerario = next.map(v => ({
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
    } catch (e) { /* ignore */ }
}

function obtenerVuelosItinerario() {
    const adminRaw = localStorage.getItem('vuelosAdmin');
    const syncRaw = localStorage.getItem('itinerarioSync');
    let vuelos;
    if (adminRaw) {
        try {
            const va = JSON.parse(adminRaw);
            if (Array.isArray(va) && va.length > 0 && va[0].origen) {
                vuelos = va.map(v => ({
                    id: v.id,
                    nro: v.id || v.nro,
                    origen: v.origen,
                    destino: v.destino,
                    salida: v.salida,
                    fecha: v.fecha,
                    estado: v.estado
                }));
            }
        } catch (e) { /* ignore */ }
    }
    if (!vuelos && syncRaw) {
        try {
            const sv = JSON.parse(syncRaw);
            if (Array.isArray(sv) && sv.length > 0 && sv[0].origen) vuelos = sv;
        } catch (e) { /* ignore */ }
    }
    if (!vuelos || !vuelos.length) {
        const gen = generarVuelosMesInicial();
        persistirVuelosInicialesSiVacios(gen);
        vuelos = gen.map(v => ({
            id: v.id,
            nro: v.id,
            origen: v.origen,
            destino: v.destino,
            salida: v.salida,
            fecha: v.fecha,
            estado: v.estado
        }));
    }
    return vuelos.map(v => ajustarFechaVueloSegunDestino(v));
}

function estadoVueloPermiteReserva(estado) {
    if (!estado) return true;
    return estado !== 'Cancelado' && estado !== 'Aterrizado';
}

/** Si hay fecha de ida, debe coincidir con la fecha del vuelo en itinerario */
function encontrarVueloItinerario(origenInput, destinoSelect, fechaIda) {
    const vuelos = obtenerVuelosItinerario();
    const oNorm = normalizarCiudadItinerario(origenInput);
    const dNorm = normalizarCiudadItinerario(destinoSelect);
    const candidatos = vuelos.filter(v =>
        estadoVueloPermiteReserva(v.estado) &&
        normalizarCiudadItinerario(v.origen) === oNorm &&
        normalizarCiudadItinerario(v.destino) === dNorm
    );
    if (!candidatos.length) return null;
    if (fechaIda) {
        const porFecha = candidatos.find(v => v.fecha === fechaIda);
        return porFecha || null;
    }
    return candidatos[0];
}

function datosCabinaPorAsiento(codigoAsiento) {
    const m = String(codigoAsiento || '').match(/^(\d+)/);
    const fila = m ? parseInt(m[1], 10) : 0;
    if (configAvion.filasClub.includes(fila)) {
        return { nombre: 'Club Económico', claseCabina: 'club' };
    }
    return { nombre: 'Clase Turista', claseCabina: 'turista' };
}

function fmtUsd(n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

// --- SHOWCASE DE DESTINOS ---
let dstActivo = 0;

function renderizarDestinos() {
    inicializarDstShowcase();
}

function inicializarDstShowcase() {
    const thumbsEl = document.getElementById('dst-thumbs');
    if (!thumbsEl) return;

    thumbsEl.innerHTML = infoDestinos.map((d, i) => `
        <div class="dst-thumb ${i === 0 ? 'active' : ''}" id="dstthumb-${i}" onclick="activarDst(${i})">
            <img src="${d.imagen}" alt="${d.nombre}" loading="lazy">
            <div class="dst-thumb-label">${d.nombre.toUpperCase()}</div>
        </div>
    `).join('');

    activarDstSilencioso(0);
}

function activarDstSilencioso(idx) {
    const d = infoDestinos[idx];
    const mainImg = document.getElementById('dst-main-img');
    const mainTitulo = document.getElementById('dst-main-titulo');
    const mainDesc = document.getElementById('dst-main-desc');

    if (!mainImg) return;

    mainImg.src = d.imagen;
    mainImg.alt = d.nombre;
    mainTitulo.textContent = `${d.nombre.toUpperCase()} - ${d.pais.toUpperCase()}`;
    mainDesc.textContent = d.descripcion;

    document.querySelectorAll('.dst-thumb').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
    });

    const thumbEl = document.getElementById(`dstthumb-${idx}`);
    if (thumbEl) thumbEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    dstActivo = idx;
}

function activarDst(idx) {
    const mainImg = document.getElementById('dst-main-img');
    if (mainImg) {
        mainImg.style.transition = 'opacity 0.35s';
        mainImg.style.opacity = '0';
        setTimeout(() => {
            activarDstSilencioso(idx);
            mainImg.style.opacity = '1';
        }, 300);
    } else {
        activarDstSilencioso(idx);
    }
}


function toggleCalendario(id) {
    const popup = document.getElementById(`cal-${id}`);
    if (!popup) return;
    const isOpen = popup.classList.contains('show');
    document.querySelectorAll('.calendario-popup').forEach(p => p.classList.remove('show'));
    if (!isOpen) {
        popup.classList.add('show');
        const input = document.getElementById(`fecha-${id}`);
        const val = (input && input.value || '').trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
            const [y, m] = val.split('-').map(Number);
            popup.dataset.mes = String(m - 1);
            popup.dataset.año = String(y);
        } else {
            delete popup.dataset.mes;
            delete popup.dataset.año;
        }
        renderizarCalendario(id);
    }
}

function cerrarCalendarios() {
    document.querySelectorAll('.calendario-popup').forEach(p => p.classList.remove('show'));
}

function calAplicarMesYAnio(id, ev) {
    if (ev) ev.stopPropagation();
    const popup = document.getElementById(`cal-${id}`);
    if (!popup) return;
    const sm = popup.querySelector('.cal-sel-mes');
    const sa = popup.querySelector('.cal-sel-anio');
    if (!sm || !sa) return;
    let mes = parseInt(sm.value, 10);
    let año = parseInt(sa.value, 10);
    const hoy = new Date();
    const minMes = hoy.getMonth();
    const minAño = hoy.getFullYear();
    if (año < minAño || (año === minAño && mes < minMes)) {
        mes = minMes;
        año = minAño;
        sm.value = String(mes);
        sa.value = String(año);
    }
    popup.dataset.mes = String(mes);
    popup.dataset.año = String(año);
    renderizarCalendario(id);
}

function renderizarCalendario(id) {
    const popup = document.getElementById(`cal-${id}`);
    const input = document.getElementById(`fecha-${id}`);
    const destino = document.getElementById('destino-select')?.value || '';
    const origen = document.getElementById('origen')?.value || '';
    const ciudadRegla = id === 'vuelta' ? origen : destino;

    let mes = parseInt(popup.dataset.mes, 10);
    let año = parseInt(popup.dataset.año, 10);
    if (isNaN(mes) || isNaN(año)) {
        const hoy = new Date();
        mes = hoy.getMonth();
        año = hoy.getFullYear();
        popup.dataset.mes = String(mes);
        popup.dataset.año = String(año);
    }

    const primerDia = new Date(año, mes, 1).getDay();
    const diasEnMes = new Date(año, mes + 1, 0).getDate();
    const hoyStr = fechaLocalISO();
    const diasDisponibles = ciudadRegla ? horariosRutas[ciudadRegla] : null;
    const fechaActualStr = input.value;
    const fechaIdaVal = (document.getElementById('fecha-ida')?.value || '').trim();

    const nombreMeses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

    const hoy = new Date();
    const minMes = hoy.getMonth();
    const minAño = hoy.getFullYear();
    const enPrimerMesPermitido = año === minAño && mes === minMes;
    const prevAttr = enPrimerMesPermitido
        ? ' disabled class="cal-nav cal-nav-disabled"'
        : ' class="cal-nav" onclick="event.stopPropagation(); navegarMes(\'' + id + '\', -1)"';

    let optsAnio = '';
    const yMax = minAño + 6;
    for (let yy = minAño; yy <= yMax; yy++) {
        optsAnio += `<option value="${yy}"${yy === año ? ' selected' : ''}>${yy}</option>`;
    }
    const optsMes = nombreMeses.map((nm, i) =>
        `<option value="${i}"${i === mes ? ' selected' : ''}>${nm}</option>`
    ).join('');

    let html = `
        <div class="cal-header cal-header-extended">
            <button type="button"${prevAttr} aria-label="Mes anterior">‹</button>
            <label class="cal-sel-label"><span class="cal-sel-caption">Mes</span>
                <select class="cal-sel-mes" title="Mes" aria-label="Seleccionar mes" onchange="calAplicarMesYAnio('${id}', event)">${optsMes}</select>
            </label>
            <label class="cal-sel-label"><span class="cal-sel-caption">Año</span>
                <select class="cal-sel-anio" title="Año" aria-label="Seleccionar año" onchange="calAplicarMesYAnio('${id}', event)">${optsAnio}</select>
            </label>
            <button type="button" class="cal-nav" onclick="event.stopPropagation(); navegarMes('${id}', 1)" aria-label="Mes siguiente">›</button>
        </div>
        <div class="cal-titulo-aux" aria-hidden="true">${nombreMeses[mes]} ${año}</div>
        <table class="cal-grid">
            <thead><tr><th>Do</th><th>Lu</th><th>Ma</th><th>Mi</th><th>Ju</th><th>Vi</th><th>Sá</th></tr></thead>
            <tbody>`;

    let dia = 1;
    for (let f = 0; f < 6; f++) {
        if (dia > diasEnMes) break;
        html += '<tr>';
        for (let c = 0; c < 7; c++) {
            if (f === 0 && c < primerDia) {
                html += '<td></td>';
            } else if (dia > diasEnMes) {
                html += '<td></td>';
            } else {
                const diaStr = `${año}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                const diaSemana = new Date(año, mes, dia).getDay();
                const esPasado = diaStr < hoyStr;
                const tieneVuelo = !diasDisponibles || diasDisponibles.includes(diaSemana);
                const esAntesIda = id === 'vuelta' && fechaIdaVal && diaStr < fechaIdaVal;
                const esSeleccionado = diaStr === fechaActualStr;

                let clases = 'cal-dia';
                if (esPasado) {
                    clases += ' cal-dia-disabled';
                } else if (!tieneVuelo) {
                    clases += ' cal-dia-sin-vuelo';
                } else if (esAntesIda) {
                    clases += ' cal-dia-sin-vuelo';
                }
                if (esSeleccionado) clases += ' cal-dia-seleccionado';

                const esClickable = !esPasado && tieneVuelo && !esAntesIda;
                const onclick = esClickable ? `seleccionarDia('${id}','${diaStr}')` : '';

                html += `<td><button type="button" class="${clases}" onclick="event.stopPropagation(); ${onclick}" ${onclick ? '' : 'disabled'}>${dia}</button></td>`;
                dia++;
            }
        }
        html += '</tr>';
    }

    html += `</tbody></table>`;

    if (diasDisponibles) {
        html += `<div class="cal-info">Días con vuelo: ${diasDisponibles.map(d => NOMBRE_DIAS[d]).join(", ")}</div>`;
    }

    popup.innerHTML = html;
}

function navegarMes(id, delta) {
    const popup = document.getElementById(`cal-${id}`);
    let mes = parseInt(popup.dataset.mes, 10) + delta;
    let año = parseInt(popup.dataset.año, 10);
    if (mes < 0) { mes = 11; año--; }
    if (mes > 11) { mes = 0; año++; }
    if (delta < 0) {
        const hoy = new Date();
        const minMes = hoy.getMonth();
        const minAño = hoy.getFullYear();
        if (año < minAño || (año === minAño && mes < minMes)) return;
    }
    popup.dataset.mes = String(mes);
    popup.dataset.año = String(año);
    renderizarCalendario(id);
}

function seleccionarDia(id, diaStr) {
    const input = document.getElementById(`fecha-${id}`);
    input.value = diaStr;
    if (id === 'ida') {
        const vueltaInput = document.getElementById('fecha-vuelta');
        if (vueltaInput && (!vueltaInput.value || vueltaInput.value < diaStr)) {
            vueltaInput.value = '';
        }
    }
    cerrarCalendarios();
}

function inicializarCalendarios() {
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.calendario-wrapper')) {
            cerrarCalendarios();
        }
    });
}

// --- 2. NAVEGACIÓN Y CONTROL VISUAL ---

function mostrarPaso(paso) {
    const heroVisual = document.getElementById('contenedor-reserva-visual');
    const seccionDestinos = document.getElementById('seccion-destinos');
    // Ocultar secciones de navegación
    ['paso3','paso-restricciones','paso4','seccion-itinerario','seccion-faq','seccion-admin'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    if (paso === 1) {
        if (heroVisual) heroVisual.classList.remove('hidden');
        document.getElementById('paso1').classList.remove('hidden');
        // Mostrar y renderizar la sección destinos solo en inicio
        if (seccionDestinos) seccionDestinos.classList.remove('hidden');
        renderizarDestinos();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (paso === 5) {
        if (heroVisual) heroVisual.classList.add('hidden');
        if (seccionDestinos) seccionDestinos.classList.add('hidden');
        document.getElementById('paso-restricciones').classList.remove('hidden');
    } else {
        if (heroVisual) heroVisual.classList.add('hidden');
        if (seccionDestinos) seccionDestinos.classList.add('hidden');
        const seccionObjetivo = document.getElementById(`paso${paso}`);
        if (seccionObjetivo) seccionObjetivo.classList.remove('hidden');
    }
}

function mostrarSeccion(idSeccion) {
    const heroVisual = document.getElementById('contenedor-reserva-visual');
    if (heroVisual) heroVisual.classList.add('hidden');
    // Ocultar secciones de navegación incluyendo destinos
    ['paso1','paso3','paso-restricciones','paso4','seccion-itinerario','seccion-faq','seccion-admin','seccion-destinos'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    if (idSeccion === 'itinerario') {
        renderizarItinerario();
        document.getElementById('seccion-itinerario').classList.remove('hidden');
        document.getElementById('seccion-itinerario').scrollIntoView({ behavior: 'smooth' });
    } else if (idSeccion === 'faq') {
        document.getElementById('seccion-faq').classList.remove('hidden');
    } else if (idSeccion === 'admin') {
        if (typeof adminEstaAutenticado === 'function' && adminEstaAutenticado()) {
            revelarPanelAdministracion();
        } else if (typeof abrirLoginAdmin === 'function') {
            abrirLoginAdmin();
        } else {
            revelarPanelAdministracion();
        }
    }
}

/** Muestra la sección de administración (tras login o si no hay módulo de auth). */
function revelarPanelAdministracion() {
    const heroVisual = document.getElementById('contenedor-reserva-visual');
    if (heroVisual) heroVisual.classList.add('hidden');
    ['paso1', 'paso3', 'paso-restricciones', 'paso4', 'seccion-itinerario', 'seccion-faq', 'seccion-destinos'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    const secAdmin = document.getElementById('seccion-admin');
    if (secAdmin) {
        secAdmin.classList.remove('hidden');
        if (typeof inicializarAdmin === 'function') inicializarAdmin();
        secAdmin.scrollIntoView({ behavior: 'smooth' });
    }
}

// --- 3. PASO 1: BÚSQUEDA Y LÍMITE DE 8 PASAJEROS ---

function toggleDropdown(event) {
    const panel = document.getElementById('selector-panel');
    if (event) event.stopPropagation();
    panel.classList.toggle('show');
}

function cambiarCant(id, cambio) {
    const input = document.getElementById(id);
    
    const adultos = parseInt(document.getElementById('cant-adultos').value) || 0;
    const ninos = parseInt(document.getElementById('cant-ninos').value) || 0;
    const infantes = parseInt(document.getElementById('cant-infantes').value) || 0;
    const mayores = parseInt(document.getElementById('cant-mayores').value) || 0;
    const totalActual = adultos + ninos + infantes + mayores;

    if (cambio > 0 && totalActual >= 8) {
        alert("⚠️ ADVERTENCIA: Solo puede registrar un máximo de 8 pasajeros.");
        return;
    }

    if (id === 'cant-ninos' && cambio > 0) {
        if (ninos >= 4) {
            alert("⚠️ Máximo 4 niños.");
            return;
        }
        if (ninos >= adultos * 2) {
            alert("⚠️ Máximo 2 niños por adulto.");
            return;
        }
    }

    if (id === 'cant-infantes' && cambio > 0) {
        if (infantes >= 4) {
            alert("⚠️ Máximo 4 infantes.");
            return;
        }
        if (infantes >= adultos) {
            alert("⚠️ La cantidad de infantes no puede superar la de adultos.");
            return;
        }
    }

    if (id === 'cant-mayores') {
        const adultInput = document.getElementById('cant-adultos');
        if (cambio > 0) {
            if (adultos <= 0) {
                alert("No hay adultos disponibles para convertir a mayor.");
                return;
            }
            adultInput.value = adultos - 1;
        } else if (cambio < 0) {
            adultInput.value = adultos + 1;
        }
    }

    let valor = parseInt(input.value) + cambio;
    if (valor < parseInt(input.min)) valor = parseInt(input.min);
    
    input.value = valor;
    actualizarResumen();
}

function actualizarResumen() {
    const adultos = parseInt(document.getElementById('cant-adultos').value) || 0;
    const ninos = parseInt(document.getElementById('cant-ninos').value) || 0;
    const infantes = parseInt(document.getElementById('cant-infantes').value) || 0;
    const mayores = parseInt(document.getElementById('cant-mayores').value) || 0;
    const total = adultos + ninos + infantes + mayores;
    const resumen = document.getElementById('resumen-pasajeros');
    
    resumen.innerText = (total === 1 && adultos === 1) ? "Adulto 1" : `${total} Pasajeros`;
}

function procesarBusqueda() {
    const origenInput = document.getElementById('origen').value;
    const destinoSelect = document.getElementById('destino-select').value;
    const adultos = parseInt(document.getElementById('cant-adultos').value) || 0;
    const ninos = parseInt(document.getElementById('cant-ninos').value) || 0;
    const infantes = parseInt(document.getElementById('cant-infantes').value) || 0;
    const mayores = parseInt(document.getElementById('cant-mayores').value) || 0;
    const total = adultos + ninos + infantes + mayores;

    if (total > 8) { 
        alert("⚠️ ADVERTENCIA: Solo puede registrar máximo 8 pasajeros."); 
        return; 
    }
    if (!destinoSelect || !origenInput) { alert("Complete origen y destino."); return; }
    if (origenInput === destinoSelect) { alert("⚠️ El origen y el destino no pueden ser la misma ciudad."); return; }
    if ((ninos > 0 || infantes > 0) && adultos === 0) { alert("Los menores requieren un adulto acompañante."); return; }
    if (total === 0) { alert("Seleccione al menos un pasajero."); return; }

    const fechaIda = (document.getElementById('fecha-ida')?.value || '').trim();
    const fechaVuelta = (document.getElementById('fecha-vuelta')?.value || '').trim();
    const esIdaYVuelta = document.getElementById('tipo-viaje').checked;

    if (!fechaIda) {
        alert("Seleccione la fecha de ida. La disponibilidad se verifica contra los vuelos registrados en el itinerario para esa fecha.");
        return;
    }

    const vueloItin = encontrarVueloItinerario(origenInput, destinoSelect, fechaIda);
    if (!vueloItin) {
        // Verificar si existe pero está cancelado
        const todosFiltrados = (() => {
            try {
                const raw = localStorage.getItem('vuelosAdmin');
                if (!raw) return null;
                const vuelos = JSON.parse(raw);
                const oNorm = normalizarCiudadItinerario(origenInput);
                const dNorm = normalizarCiudadItinerario(destinoSelect);
                return vuelos.find(v =>
                    normalizarCiudadItinerario(v.origen) === oNorm &&
                    normalizarCiudadItinerario(v.destino) === dNorm &&
                    v.fecha === fechaIda &&
                    !estadoVueloPermiteReserva(v.estado)
                );
            } catch(e) { return null; }
        })();
        if (todosFiltrados) {
            alert(`❌ El vuelo ${todosFiltrados.id || ''} de esta ruta en la fecha seleccionada está ${todosFiltrados.estado.toLowerCase()} y no acepta reservas. Por favor elige otra fecha.`);
        } else if (fechaIda) {
            alert("✈️ El vuelo no está disponible: no hay una salida en el itinerario para esa ruta en la fecha de ida elegida. Revise el itinerario o cambie la fecha.");
        } else {
            alert("✈️ El vuelo no está disponible: esa ruta no figura en el itinerario con estado operativo, o no hay coincidencia. Consulte Itinerario para rutas y fechas registradas.");
        }
        return;
    }
    if (esIdaYVuelta && !fechaVuelta) {
        alert("Seleccione la fecha de vuelta para viaje ida y vuelta.");
        return;
    }
    if (esIdaYVuelta && fechaVuelta && fechaVuelta < fechaIda) {
        alert("La fecha de vuelta no puede ser anterior a la fecha de ida.");
        return;
    }

    const idVueloBusq = normalizarIdVuelo(vueloItin.nro || vueloItin.id);
    const capBusq = obtenerCapacidadVueloAdmin(idVueloBusq);
    if (capBusq < total) {
        alert(`Este vuelo solo tiene ${capBusq} asiento(s) a la venta y usted indicó ${total} pasajero(s). Reduzca pasajeros o elija otro vuelo.`);
        return;
    }

    const mapAsientos = leerMapaAsientosPorVuelo();
    if (idVueloBusq && mapAsientos[idVueloBusq]) {
        delete mapAsientos[idVueloBusq];
        guardarMapaAsientosPorVuelo(mapAsientos);
    }

    reserva.origen = origenInput;
    reserva.destino = destinoSelect;
    reserva.fechaIda = fechaIda;
    reserva.fechaVuelta = esIdaYVuelta ? fechaVuelta : '';
    reserva.vueloItinerario = {
        nro: vueloItin.nro || vueloItin.id,
        salida: vueloItin.salida,
        fecha: vueloItin.fecha,
        estado: vueloItin.estado
    };
    reserva.metodoPago = '';
    reserva.cantidadBoletos = total;
    reserva.conteoCategorias = { adultos, ninos, infantes, mayores };
    reserva.restricciones = [];
    reserva.asientos = [];
    reserva.tipoViaje = document.getElementById('tipo-viaje').checked ? "Ida y vuelta" : "Solo ida";

    generarFormulariosPasajeros();
    mostrarPaso(3);
}

// --- 4. PASO 3: FORMULARIOS ---

function generarFormulariosPasajeros() {
    const contenedor = document.getElementById('contenedor-pasajeros');
    contenedor.innerHTML = ""; 
    for (let i = 1; i <= reserva.cantidadBoletos; i++) {
        contenedor.innerHTML += `
            <div class="card-pasajero">
                <h4>Pasajero ${i}</h4>
                <input type="text" placeholder="Nombre Completo" id="p-nombre-${i}" required>
                <input type="text" placeholder="Cédula/ID" id="p-cedula-${i}" required>
                <input type="number" id="p-edad-${i}" min="0" max="99" step="1" inputmode="numeric" placeholder="Edad (0–99)" required title="Edad entre 0 y 99 años">
                <div class="preguntas-rutinarias">
                    <label><input type="checkbox" id="p-silla-${i}"> Requiere asistencia especial</label>
                </div>
            </div>`;
    }
}

function confirmarPasajeros() {
    reserva.pasajeros = []; 
    for (let i = 1; i <= reserva.cantidadBoletos; i++) {
        const nombre = document.getElementById(`p-nombre-${i}`).value;
        const cedula = document.getElementById(`p-cedula-${i}`).value;
        const edad = parseInt(document.getElementById(`p-edad-${i}`).value, 10);
        if (!nombre || !cedula || isNaN(edad)) { alert("Complete todos los campos."); return; }
        if (edad < 0 || edad > 99) { alert(`Pasajero ${i}: la edad debe estar entre 0 y 99 años.`); return; }
        reserva.pasajeros.push({ nombre, cedula, edad, asistencia: document.getElementById(`p-silla-${i}`).checked });
    }
    generarFormulariosRestricciones();
    mostrarPaso(5);
}

// --- 4.5 PASO RESTRICCIONES ---

function generarFormulariosRestricciones() {
    const contenedor = document.getElementById('contenedor-restricciones');
    contenedor.innerHTML = "";
    for (let i = 1; i <= reserva.cantidadBoletos; i++) {
        const p = reserva.pasajeros[i - 1];
        contenedor.innerHTML += `
        <div class="card-restriccion">
            <h3>Pasajero ${i} — ${p.nombre}</h3>

            <h4>DATOS BÁSICOS</h4>
            <label>1. Edad del pasajero: <input type="number" id="r-edad-${i}" min="0" max="99" step="1" value="${p.edad != null ? p.edad : ''}" readonly style="width:60px;background:#f0f0f0;"></label>

            <div class="pregunta">2. ¿Viaja acompañado por un adulto responsable?</div>
            <div class="radio-group">
                <label><input type="radio" name="r-acompanado-${i}" value="si" checked> Sí</label>
                <label><input type="radio" name="r-acompanado-${i}" value="no"> No</label>
            </div>

            <h4>MOVILIDAD</h4>
            <div class="pregunta">3. ¿Necesita asistencia para desplazarse por el aeropuerto o para abordar el avión?</div>
            <div class="radio-group">
                <label><input type="radio" name="r-asistencia-${i}" value="ninguna" checked> No, puedo desplazarme sin ayuda</label>
                <label><input type="radio" name="r-asistencia-${i}" value="distancias"> Sí, necesito silla de ruedas solo para distancias largas (rampa/embarque)</label>
                <label><input type="radio" name="r-asistencia-${i}" value="escaleras"> Sí, necesito silla de ruedas y no puedo subir/bajar escaleras</label>
                <label><input type="radio" name="r-asistencia-${i}" value="completa"> Sí, necesito asistencia completa hasta mi asiento (inmovilidad total)</label>
            </div>

            <h4>CONDICIONES SENSORIALES O COGNITIVAS</h4>
            <div class="pregunta">4. ¿Tiene discapacidad visual o es ciego?</div>
            <div class="radio-group">
                <label><input type="radio" name="r-visual-${i}" value="no" checked onchange="togglePerroGuia(${i})"> No</label>
                <label><input type="radio" name="r-visual-${i}" value="reducida" onchange="togglePerroGuia(${i})"> Sí, tengo visión reducida</label>
                <label><input type="radio" name="r-visual-${i}" value="ciego" onchange="togglePerroGuia(${i})"> Sí, soy ciego</label>
            </div>

            <div class="condicional" id="r-perro-guia-wrapper-${i}">
                <div class="pregunta">5. ¿Viaja con perro guía o de asistencia?</div>
                <div class="radio-group">
                    <label><input type="radio" name="r-perro-guia-${i}" value="no" checked> No</label>
                    <label><input type="radio" name="r-perro-guia-${i}" value="si"> Sí</label>
                </div>
            </div>

            <div class="pregunta">6. ¿Tiene discapacidad auditiva o es sordo?</div>
            <div class="radio-group">
                <label><input type="radio" name="r-auditiva-${i}" value="no" checked> No</label>
                <label><input type="radio" name="r-auditiva-${i}" value="reducida"> Sí, tengo audición reducida</label>
                <label><input type="radio" name="r-auditiva-${i}" value="sordo"> Sí, soy sordo</label>
            </div>

            <div class="pregunta">7. ¿Necesita asistencia por una discapacidad intelectual o del desarrollo? (autismo, Alzheimer, síndrome de Down, etc.)</div>
            <div class="radio-group">
                <label><input type="radio" name="r-intelectual-${i}" value="no" checked> No</label>
                <label><input type="radio" name="r-intelectual-${i}" value="si"> Sí</label>
            </div>

            <h4>CONDICIONES MÉDICAS</h4>
            <div class="pregunta">8. ¿Requiere oxígeno medicinal durante el vuelo?</div>
            <div class="radio-group">
                <label><input type="radio" name="r-oxigeno-${i}" value="no" checked> No</label>
                <label><input type="radio" name="r-oxigeno-${i}" value="PPOC"> Sí, usaré concentrador portátil (PPOC)</label>
                <label><input type="radio" name="r-oxigeno-${i}" value="AOXY"> Sí, solicito oxígeno a bordo (AOXY)</label>
            </div>

            <div class="pregunta">9. ¿Viaja en camilla por razones médicas?</div>
            <div class="radio-group">
                <label><input type="radio" name="r-camilla-${i}" value="no" checked> No</label>
                <label><input type="radio" name="r-camilla-${i}" value="si"> Sí</label>
            </div>

            <div class="pregunta">10. ¿Tiene alguna otra condición médica que requiera asistencia especial?</div>
            <div class="radio-group">
                <label><input type="radio" name="r-otra-condicion-${i}" value="no" checked> No</label>
                <label><input type="radio" name="r-otra-condicion-${i}" value="si"> Sí</label>
            </div>
        </div>`;
    }
}

function togglePerroGuia(i) {
    const visual = document.querySelector(`input[name="r-visual-${i}"]:checked`);
    const wrapper = document.getElementById(`r-perro-guia-wrapper-${i}`);
    if (wrapper) {
        wrapper.classList.toggle('visible', visual && visual.value !== 'no');
    }
}

function confirmarRestricciones() {
    reserva.restricciones = [];
    for (let i = 1; i <= reserva.cantidadBoletos; i++) {
        const asistencia = document.querySelector(`input[name="r-asistencia-${i}"]:checked`);
        const visual = document.querySelector(`input[name="r-visual-${i}"]:checked`);
        const perroGuia = document.querySelector(`input[name="r-perro-guia-${i}"]:checked`);
        const intelectual = document.querySelector(`input[name="r-intelectual-${i}"]:checked`);
        const oxigeno = document.querySelector(`input[name="r-oxigeno-${i}"]:checked`);
        const camilla = document.querySelector(`input[name="r-camilla-${i}"]:checked`);
        const otraCondicion = document.querySelector(`input[name="r-otra-condicion-${i}"]:checked`);
        if (!asistencia) { alert(`Complete las restricciones del Pasajero ${i}.`); return; }
        reserva.restricciones.push({
            asistencia: asistencia.value,
            visual: visual ? visual.value : 'no',
            perroGuia: perroGuia ? perroGuia.value : 'no',
            intelectual: intelectual ? intelectual.value : 'no',
            oxigeno: oxigeno ? oxigeno.value : 'no',
            camilla: camilla ? camilla.value : 'no',
            otraCondicion: otraCondicion ? otraCondicion.value : 'no'
        });
    }

    const idVuelo = normalizarIdVuelo(reserva.vueloItinerario?.nro);
    const disponibles = contarAsientosSeleccionablesVuelo(idVuelo);
    const capV = obtenerCapacidadVueloAdmin(idVuelo);

    if (capV < reserva.cantidadBoletos) {
        alert(`La capacidad de venta de este vuelo es de ${capV} asiento(s), pero su reserva requiere ${reserva.cantidadBoletos} pasajero(s). Reduzca pasajeros o elija otro vuelo.`);
        reserva.restricciones = [];
        mostrarPaso(1);
        return;
    }

    if (disponibles < reserva.cantidadBoletos) {
        alert("Lo sentimos, según las restricciones informadas no podemos garantizar asientos adecuados y seguros para todos los pasajeros. Por seguridad, no podemos procesar su reserva. Consulte con nuestra línea de atención al cliente para opciones personalizadas.");
        reserva.restricciones = [];
        mostrarPaso(1);
        return;
    }

    renderizarMapaAsientos();
    mostrarPaso(4);
}

function verificarVueloNoCancelado(nro) {
    if (!nro) return true;
    try {
        const raw = localStorage.getItem('vuelosAdmin');
        if (!raw) return true;
        const vuelos = JSON.parse(raw);
        const vuelo = vuelos.find(v => normalizarIdVuelo(v.id || v.nro) === normalizarIdVuelo(nro));
        if (!vuelo) return true;
        return estadoVueloPermiteReserva(vuelo.estado);
    } catch (e) { return true; }
}

function obtenerAsientosBloqueadosPorRestricciones() {
    if (!reserva.restricciones || reserva.restricciones.length === 0) return [];
    const bloqueados = new Set();
    const todasFilas = Array.from({ length: 22 }, (_, i) => i + 1);
    const asientosEn = (filas, cols) => filas.flatMap(f => cols.map(c => `${f}${c}`));
    const todasLasCols = (f) => [1, 2].includes(f) ? ['A', 'C', 'D', 'F'] : ['A', 'B', 'C', 'D', 'E', 'F'];
    const todosLosAsientos = () => todasFilas.flatMap(f => asientosEn([f], todasLasCols(f)));
    const excepto = (permitidos) => todosLosAsientos().filter(s => !permitidos.includes(s));

    for (const r of reserva.restricciones) {
        if (r.asistencia === 'completa') {
            const permitidos = asientosEn([1, 2, 3], ['C', 'D']);
            excepto(permitidos).forEach(s => bloqueados.add(s));
        } else if (r.asistencia === 'escaleras') {
            const permitidos = asientosEn([1, 2, 3, 4, 5], ['C', 'D']);
            excepto(permitidos).forEach(s => bloqueados.add(s));
        }
        if (r.perroGuia === 'si' || r.intelectual === 'si' || r.otraCondicion === 'si') {
            asientosEn([10], todasLasCols(10)).forEach(s => bloqueados.add(s));
        }
        if (r.oxigeno === 'AOXY') {
            const permitidos = asientosEn([5, 6, 7, 8, 9, 10], todasLasCols(5));
            excepto(permitidos).forEach(s => bloqueados.add(s));
        }
        if (r.camilla === 'si') {
            const permitidos = asientosEn([21, 22], todasLasCols(21));
            excepto(permitidos).forEach(s => bloqueados.add(s));
        }
    }
    return [...bloqueados];
}

// --- 5. PASO 4: MAPA Y PERSISTENCIA JSON ---

function renderizarMapaAsientos() {
    const contenedor = document.getElementById('mapa-avion-container');
    contenedor.innerHTML = "";
    reserva.asientos = [];
    const idVuelo = normalizarIdVuelo(reserva.vueloItinerario?.nro);

    // Verificar en tiempo real que el vuelo no esté cancelado
    if (!verificarVueloNoCancelado(idVuelo)) {
        const aviso = document.createElement('div');
        aviso.style.cssText = 'text-align:center;padding:40px 20px;';
        aviso.innerHTML = `
            <div style="font-size:48px;margin-bottom:16px">🚫</div>
            <h3 style="color:#991b1b;font-size:20px;margin:0 0 10px">Vuelo Cancelado</h3>
            <p style="color:#64748b;font-size:14px;margin:0 0 24px">El vuelo <strong>${idVuelo}</strong> ha sido cancelado y no está disponible para reservas.</p>
            <button onclick="mostrarPaso(1)" style="background:#0052cc;color:white;border:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">← Volver al inicio</button>
        `;
        contenedor.appendChild(aviso);
        return;
    }

    const capMostrar = obtenerCapacidadVueloAdmin(idVuelo);
    const infoVuelo = document.createElement('p');
    infoVuelo.className = 'mapa-vuelo-info';
    infoVuelo.style.cssText = 'text-align:center;margin-bottom:14px;font-size:15px;color:#0d2d6e;font-weight:600;';
    infoVuelo.textContent = idVuelo
        ? `Vuelo ${idVuelo} — Asientos a la venta en este vuelo: ${capMostrar}. El resto del avión no está disponible.`
        : 'Selección de asientos';
    contenedor.appendChild(infoVuelo);

    const fueraCapacidad = obtenerSetAsientosFueraDeCapacidad(idVuelo);
    const asientosOcupadosGlobal = obtenerAsientosOcupadosParaVuelo(idVuelo);
    const asientosRestringidos = obtenerAsientosBloqueadosPorRestricciones();
    const todosOcupados = [...new Set([...asientosOcupadosGlobal, ...asientosRestringidos])];

    const hayPasajerosRestringidosEmergencia = reserva.restricciones && reserva.restricciones.some(r =>
        r.asistencia !== 'ninguna' || r.intelectual === 'si' || r.oxigeno !== 'no' || r.camilla === 'si' || r.otraCondicion === 'si'
    );
    const hayMenores = reserva.conteoCategorias && (reserva.conteoCategorias.ninos > 0 || reserva.conteoCategorias.infantes > 0);
    const bloquearEmergenciaExtra = hayPasajerosRestringidosEmergencia || hayMenores;

    // --- Cabina del avión (nariz) ---
    const nose = document.createElement('div');
    nose.className = 'avion-nariz';
    nose.innerHTML = `<svg viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M60 4 Q100 10 115 30 Q100 50 60 56 Q20 50 5 30 Q20 10 60 4Z" fill="#dce8ff" stroke="#0052cc" stroke-width="1.5"/>
        <text x="60" y="33" text-anchor="middle" font-size="10" fill="#0052cc" font-weight="700" font-family="sans-serif">✈</text>
    </svg>`;
    contenedor.appendChild(nose);

    // --- Cabecera de columnas ---
    const encabezado = document.createElement('div');
    encabezado.className = 'mapa-header-cols';
    encabezado.innerHTML = `
        <span class="col-label">#</span>
        <span class="col-label">A</span>
        <span class="col-label col-label-club-b">B</span>
        <span class="col-label">C</span>
        <span class="col-pasillo-label"></span>
        <span class="col-label">D</span>
        <span class="col-label col-label-club-e">E</span>
        <span class="col-label">F</span>
    `;
    contenedor.appendChild(encabezado);

    // --- Separador de clases ---
    let seccionClubAbierta = false;
    let seccionTuristaAbierta = false;

    for (let f = 1; f <= 22; f++) {
        const esClub = configAvion.filasClub.includes(f);

        // Insertar separador de sección al cambiar de clase
        if (esClub && !seccionClubAbierta) {
            const sep = document.createElement('div');
            sep.className = 'seccion-label club';
            sep.innerHTML = '⭐ Club Económico — Filas 1–2';
            contenedor.appendChild(sep);
            seccionClubAbierta = true;
        }
        if (!esClub && !seccionTuristaAbierta) {
            const sep = document.createElement('div');
            sep.className = 'seccion-label turista';
            sep.innerHTML = '💺 Clase Turista — Filas 3–22';
            contenedor.appendChild(sep);
            seccionTuristaAbierta = true;
        }

        const filaDiv = document.createElement('div');
        filaDiv.className = `fila${esClub ? ' fila-club' : ' fila-turista'}`;

        const esFilaEmergencia = (f === 1 || f === 10);
        if (esFilaEmergencia) {
            filaDiv.classList.add('fila-con-emergencia');
            const etiqueta = document.createElement('div');
            etiqueta.className = 'fila-emergencia-label';
            etiqueta.innerHTML = '🚨 Salida de emergencia';
            filaDiv.appendChild(etiqueta);
        }

        // Número de fila
        const numFila = document.createElement('span');
        numFila.className = 'fila-numero';
        numFila.textContent = f;
        filaDiv.appendChild(numFila);

        // Letras según clase: Club = A C | D F  /  Turista = A B C | D E F
        const letras = esClub
            ? ['A', 'C', 'pasillo', 'D', 'F']
            : ['A', 'B', 'C', 'pasillo', 'D', 'E', 'F'];

        // Para Club, añadir placeholder en posición B y E para alinear con Turista
        const letrasConPlaceholder = esClub
            ? ['A', '__', 'C', 'pasillo', 'D', '__', 'F']
            : ['A', 'B', 'C', 'pasillo', 'D', 'E', 'F'];

        letrasConPlaceholder.forEach(l => {
            if (l === 'pasillo') {
                const pasillo = document.createElement('div');
                pasillo.className = 'pasillo';
                filaDiv.appendChild(pasillo);
                return;
            }
            if (l === '__') {
                const placeholder = document.createElement('div');
                placeholder.className = 'asiento-placeholder';
                filaDiv.appendChild(placeholder);
                return;
            }

            const id = `${f}${l}`;
            const btn = document.createElement('button');
            btn.innerText = id;
            const esEmergencia = configAvion.salidasEmergencia.includes(id);
            const esBloqueadoPorRestriccion = bloquearEmergenciaExtra && esEmergencia;
            const esFueraCapacidad = fueraCapacidad.has(id);

            if (esFueraCapacidad) {
                btn.className = `asiento fuera-capacidad${esClub ? ' asiento-club' : ''}`;
                btn.disabled = true;
                btn.title = 'No disponible: fuera de la capacidad de venta de este vuelo';
            } else if (todosOcupados.includes(id)) {
                btn.className = `asiento ocupado${esClub ? ' asiento-club' : ''}`;
                btn.disabled = true;
                btn.title = 'Asiento ocupado';
            } else if (esBloqueadoPorRestriccion) {
                btn.className = `asiento emergencia-bloqueado${esClub ? ' asiento-club' : ''}`;
                btn.disabled = true;
                btn.title = 'No disponible: salida de emergencia (no apto para menores o pasajeros con necesidades especiales)';
            } else {
                let clases = `asiento disponible${esClub ? ' asiento-club' : ''}${esEmergencia ? ' emergencia' : ''}`;
                btn.className = clases;
                if (esEmergencia) btn.title = 'Asiento en salida de emergencia — solo para pasajeros adultos sin restricciones';
                btn.onclick = () => manejarSeleccionAsiento(id, btn);
            }
            filaDiv.appendChild(btn);
        });

        contenedor.appendChild(filaDiv);
    }

    // --- Cola del avión ---
    const tail = document.createElement('div');
    tail.className = 'avion-cola';
    contenedor.appendChild(tail);

    // --- Leyenda ---
    const leyenda = document.createElement('div');
    leyenda.className = 'leyenda-asientos';
    leyenda.innerHTML = `
        <div class="leyenda-item"><span class="leyenda-box disponible"></span> Disponible</div>
        <div class="leyenda-item"><span class="leyenda-box ocupado"></span> Ocupado</div>
        <div class="leyenda-item"><span class="leyenda-box seleccionado"></span> Tu Selección</div>
        <div class="leyenda-item"><span class="leyenda-box fuera-capacidad"></span> Fuera de capacidad</div>
        <div class="leyenda-item"><span class="leyenda-box emergencia"></span> Salida de emergencia</div>
        <div class="leyenda-item"><span class="leyenda-box emergencia-bloqueado"></span> Emergencia (restringido)</div>
    `;
    contenedor.appendChild(leyenda);

    // --- Contador de selección ---
    const contador = document.createElement('div');
    contador.id = 'contador-asientos';
    contador.className = 'contador-asientos';
    contador.textContent = `Seleccionados: 0 / ${reserva.cantidadBoletos}`;
    contenedor.appendChild(contador);

    if (asientosRestringidos.length > 0) {
        const info = document.createElement('p');
        info.style.cssText = 'margin-top:8px;font-size:13px;color:#dc3545;text-align:center;';
        info.textContent = `⚠️ ${asientosRestringidos.length} asiento(s) bloqueado(s) por restricciones de pasajeros.`;
        contenedor.appendChild(info);
    }

    const pagoWrap = document.createElement('div');
    pagoWrap.className = 'pago-metodo-wrap';
    pagoWrap.style.cssText = 'margin-top:24px;padding:18px;border:1px solid #b8d4f5;border-radius:12px;background:linear-gradient(180deg,#f0f7ff 0%,#fff 100%);max-width:440px;margin-left:auto;margin-right:auto;box-shadow:0 2px 8px rgba(0,82,204,0.08);';
    pagoWrap.innerHTML = `
        <h4 style="margin:0 0 6px;color:#0d2d6e;font-size:1.05rem;">Método de pago</h4>
        <p style="font-size:13px;color:#444;margin:0 0 14px;line-height:1.4;">El total del boleto (según cabina y tramos) podrá pagarse con una de estas opciones:</p>
        <div class="pago-opciones" style="display:flex;flex-direction:column;gap:10px;">
            ${METODOS_PAGO.map((m, idx) => `
                <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:8px 10px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;">
                    <input type="radio" name="metodo-pago-reserva" value="${m.id}" ${idx === 0 ? 'checked' : ''} style="margin-top:3px;">
                    <span style="font-size:14px;"><strong style="color:#0052cc;">${m.etiqueta}</strong><br><span style="color:#64748b;font-size:12px;">${m.detalle}</span></span>
                </label>
            `).join('')}
        </div>
        <p style="font-size:12px;color:#64748b;margin:12px 0 0;">En su ruta: <strong>Club Económico</strong> (más económico) ${fmtUsd(totalUsdViajePorPersona(reserva.origen, reserva.destino, reserva.tipoViaje, 'club'))} · <strong>Clase Turista</strong> ${fmtUsd(totalUsdViajePorPersona(reserva.origen, reserva.destino, reserva.tipoViaje, 'turista'))} <span style="display:block;margin-top:4px;">Total aprox. por persona según cabina (${reserva.tipoViaje === 'Ida y vuelta' ? 'ida y vuelta' : 'solo ida'}).</span></p>
    `;
    contenedor.appendChild(pagoWrap);

    // --- Botón Finalizar ---
    const btnFinalizar = document.createElement('button');
    btnFinalizar.className = 'btn-primario';
    btnFinalizar.style.cssText = 'margin-top:20px;display:block;width:100%;max-width:320px;margin-left:auto;margin-right:auto;';
    btnFinalizar.textContent = 'Finalizar Reserva';
    btnFinalizar.onclick = finalizarReserva;
    contenedor.appendChild(btnFinalizar);
}

function manejarSeleccionAsiento(id, elemento) {
    const indice = reserva.asientos.indexOf(id);
    if (indice > -1) {
        reserva.asientos.splice(indice, 1);
        elemento.classList.remove('seleccionado');
    } else if (reserva.asientos.length < reserva.cantidadBoletos) {
        reserva.asientos.push(id);
        elemento.classList.add('seleccionado');
    } else {
        const cont = document.getElementById('contador-asientos');
        if (cont) {
            cont.classList.add('contador-alerta');
            setTimeout(() => cont.classList.remove('contador-alerta'), 600);
        }
        return;
    }
    const cont = document.getElementById('contador-asientos');
    if (cont) cont.textContent = `Seleccionados: ${reserva.asientos.length} / ${reserva.cantidadBoletos}`;
}

// --- 6. CIERRE: GUARDAR Y PRINT ---

function finalizarReserva() {
    if (reserva.asientos.length < reserva.cantidadBoletos) {
        alert("Debe seleccionar todos los asientos."); return;
    }

    // Verificar en tiempo real que el vuelo no esté cancelado
    const nroVuelo = normalizarIdVuelo(reserva.vueloItinerario?.nro);
    if (!verificarVueloNoCancelado(nroVuelo)) {
        alert("❌ Este vuelo ha sido cancelado y no es posible completar la reserva. Por favor regrese al inicio y busque otra fecha o ruta disponible.");
        mostrarPaso(1);
        return;
    }

    const selPago = document.querySelector('input[name="metodo-pago-reserva"]:checked');
    if (!selPago) { alert("Seleccione un método de pago (Zelle, Pago Móvil o Binance)."); return; }
    reserva.metodoPago = selPago.value;
    const metodoEtiqueta = METODOS_PAGO.find(m => m.id === reserva.metodoPago)?.etiqueta || reserva.metodoPago;

    const tramos = reserva.tipoViaje === 'Ida y vuelta' ? 2 : 1;
    let totalUsd = 0;
    const detallePasajeros = reserva.pasajeros.map((p, i) => {
        const asiento = reserva.asientos[i] || '-';
        const cab = datosCabinaPorAsiento(asiento);
        const subtotal = totalUsdViajePorPersona(reserva.origen, reserva.destino, reserva.tipoViaje, cab.claseCabina);
        totalUsd += subtotal;
        return { nombre: p.nombre, cedula: p.cedula, edad: p.edad, asiento, clase: cab.nombre, subtotalUsd: subtotal };
    });

    const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const fmtFechaTicket = f => {
        if (!f) return '—';
        if (f.includes('/')) return esc(f);
        const p = f.split('-');
        return p.length === 3 ? esc(`${p[2]}/${p[1]}/${p[0]}`) : esc(f);
    };
    const vInfo = reserva.vueloItinerario || {};
    const horaFmt = formatearHora12Admin(vInfo.salida || '');
    const idV = normalizarIdVuelo(vInfo.nro);
    if (!idV) {
        alert('Error interno: no se identificó el vuelo. Vuelva a buscar su vuelo.');
        return;
    }
    const fueraCapFin = obtenerSetAsientosFueraDeCapacidad(idV);
    if (reserva.asientos.some(a => fueraCapFin.has(a))) {
        alert('Hay asientos inválidos para la capacidad de este vuelo. Vuelva a la selección de asientos.');
        return;
    }
    agregarAsientosOcupadosVuelo(idV, reserva.asientos);

    const reservasGuardadas = JSON.parse(localStorage.getItem('reservasAdmin')) || [];
    const nuevaReserva = {
        id: 'RES-' + Date.now(),
        fecha: new Date().toISOString(),
        origen: reserva.origen,
        destino: reserva.destino,
        tipoViaje: reserva.tipoViaje,
        fechaIda: reserva.fechaIda,
        fechaVuelta: reserva.fechaVuelta,
        vueloNro: idV,
        metodoPago: reserva.metodoPago,
        totalUsd,
        pasajeros: detallePasajeros.map(d => ({
            nombre: d.nombre,
            cedula: d.cedula,
            edad: d.edad,
            asiento: d.asiento,
            clase: d.clase,
            subtotalUsd: d.subtotalUsd
        })),
        asientos: [...reserva.asientos]
    };
    reservasGuardadas.push(nuevaReserva);
    localStorage.setItem('reservasAdmin', JSON.stringify(reservasGuardadas));

    const filasTabla = detallePasajeros.map(d => `
        <tr>
            <td>${esc(d.nombre)}</td>
            <td>${esc(d.cedula)}</td>
            <td>${esc(d.asiento)}</td>
            <td>${esc(d.clase)}</td>
            <td style="text-align:right;font-weight:600;">${fmtUsd(d.subtotalUsd)}</td>
        </tr>
    `).join('');

    const ventanaPrint = window.open('', '_blank');
    ventanaPrint.document.write(`
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Boleto — Canaima Airlines</title>
            <style>
                body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 24px; background: #e8eef5; margin: 0; }
                .ticket-wrap { max-width: 560px; margin: auto; }
                .ticket {
                    border: 1px solid #1e3a5f;
                    border-radius: 14px;
                    overflow: hidden;
                    background: #fff;
                    box-shadow: 0 12px 40px rgba(13,45,110,0.15);
                }
                .ticket-header {
                    background: linear-gradient(135deg, #0d2d6e 0%, #0052cc 50%, #1e6fd9 100%);
                    color: #fff;
                    padding: 20px 22px;
                    text-align: center;
                }
                .ticket-header h1 { margin: 0; font-size: 1.35rem; letter-spacing: 0.08em; }
                .ticket-header .sub { margin: 8px 0 0; font-size: 12px; opacity: 0.92; }
                .ticket-body { padding: 20px 22px; }
                .ruta-big { font-size: 1.1rem; font-weight: 700; color: #0d2d6e; text-align: center; margin-bottom: 6px; }
                .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; margin: 16px 0; }
                .meta-box { background: #f1f6fd; border-radius: 8px; padding: 10px 12px; border: 1px solid #dbeafe; }
                .meta-box b { display: block; color: #64748b; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
                table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 13px; }
                th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
                th { background: #f8fafc; color: #334155; font-size: 11px; text-transform: uppercase; }
                .total-bar {
                    margin-top: 14px; padding: 14px 16px;
                    background: linear-gradient(90deg, #0d2d6e, #0052cc);
                    color: #fff; border-radius: 10px;
                    display: flex; justify-content: space-between; align-items: center;
                }
                .pago-box { margin-top: 14px; padding: 12px 14px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; font-size: 14px; }
                .footer-note { text-align: center; font-size: 12px; color: #64748b; margin-top: 16px; }
            </style>
        </head>
        <body>
            <div class="ticket-wrap">
                <div class="ticket">
                    <div class="ticket-header">
                        <h1>CANAIMA AIRLINES</h1>
                        <div class="sub">Comprobante de reserva / boleto electrónico</div>
                    </div>
                    <div class="ticket-body">
                        <div class="ruta-big">${esc(reserva.origen)} → ${esc(reserva.destino)}</div>
                        <div class="meta-grid">
                            <div class="meta-box"><b>Vuelo</b>${esc(vInfo.nro || '—')}</div>
                            <div class="meta-box"><b>Tipo de viaje</b>${esc(reserva.tipoViaje)}</div>
                            <div class="meta-box"><b>Fecha salida (itinerario)</b>${fmtFechaTicket(vInfo.fecha)}</div>
                            <div class="meta-box"><b>Hora salida</b>${esc(horaFmt)}</div>
                            <div class="meta-box"><b>Fecha ida elegida</b>${fmtFechaTicket(reserva.fechaIda)}</div>
                            <div class="meta-box"><b>Fecha vuelta</b>${reserva.tipoViaje === 'Ida y vuelta' ? fmtFechaTicket(reserva.fechaVuelta) : '—'}</div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Pasajero</th>
                                    <th>ID</th>
                                    <th>Asiento</th>
                                    <th>Cabina</th>
                                    <th>Tarifa total (${esc(reserva.tipoViaje)})</th>
                                </tr>
                            </thead>
                            <tbody>${filasTabla}</tbody>
                        </table>
                        <div class="total-bar">
                            <span>Total a pagar (${tramos} tramo${tramos > 1 ? 's' : ''} · todos los pasajeros)</span>
                            <span style="font-size:1.25rem;font-weight:800;">${fmtUsd(totalUsd)}</span>
                        </div>
                        <div class="pago-box">
                            <strong>Método de pago seleccionado:</strong> ${esc(metodoEtiqueta)}<br>
                            <span style="font-size:12px;color:#92400e;">Presente este comprobante o confirme el pago según las instrucciones que recibirá por el canal elegido.</span>
                        </div>
                        <p class="footer-note">Gracias por volar con Canaima Airlines · Código de reserva: ${esc(nuevaReserva.id)}</p>
                    </div>
                </div>
            </div>
            <script>window.print();<\/script>
        </body>
        </html>
    `);
    ventanaPrint.document.close();

    alert("Reserva finalizada. Los asientos han sido actualizados.");
    location.reload();
}

function renderizarItinerario() {
    const contenedor = document.getElementById('tabla-vuelos');
    const raw = obtenerVuelosItinerario();
    const vuelos = raw.map(v => ({
        nro: v.nro || v.id,
        origen: v.origen,
        destino: v.destino,
        salida: v.salida,
        fecha: v.fecha,
        estado: v.estado
    }));

    const coloresEstado = {
        'A tiempo':   { color: '#166534', bg: '#dcfce7' },
        'Embarcando': { color: '#1e40af', bg: '#dbeafe' },
        'Retrasado':  { color: '#854d0e', bg: '#fef9c3' },
        'Cancelado':  { color: '#991b1b', bg: '#fee2e2' },
        'Aterrizado': { color: '#374151', bg: '#f3f4f6' },
    };

    // Formatear fecha de YYYY-MM-DD a DD/MM/YYYY
    const fmtFecha = f => {
        if (!f || f === '—') return '—';
        if (f.includes('/')) return f; // ya formateada
        const [y, m, d] = f.split('-');
        return `${d}/${m}/${y}`;
    };

    let tabla = `
        <table>
            <thead>
                <tr>
                    <th>Vuelo</th>
                    <th>Origen</th>
                    <th>Destino</th>
                    <th>Hora Salida</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>`;

    vuelos.forEach(v => {
        const origen  = v.origen  || '—';
        const destino = v.destino || '—';
        const hora    = formatearHora12Admin(v.salida);
        const fecha   = fmtFecha(v.fecha);
        const estado  = v.estado  || 'A tiempo';
        const col     = coloresEstado[estado] || coloresEstado['A tiempo'];
        const id      = v.nro || v.id || '—';

        tabla += `
            <tr>
                <td><strong style="
                    display:inline-block;
                    background:#0d2d6e; color:#fff;
                    padding:3px 10px; border-radius:20px;
                    font-size:13px; letter-spacing:.3px;
                ">${id}</strong></td>
                <td>${origen}</td>
                <td>${destino}</td>
                <td>${hora}</td>
                <td>${fecha}</td>
                <td>
                    <span style="
                        display:inline-flex; align-items:center; gap:6px;
                        background:${col.bg}; color:${col.color};
                        font-size:12px; font-weight:700;
                        padding:4px 10px; border-radius:20px;
                    ">
                        <span style="width:7px;height:7px;border-radius:50%;background:${col.color};display:inline-block;"></span>
                        ${estado}
                    </span>
                </td>
            </tr>`;
    });

    contenedor.innerHTML = tabla + `</tbody></table>`;
}

// Helper: convierte "15:00" → "3:00 PM". También acepta "08:00 AM" (ya formateado).
function formatearHora12Admin(hora) {
    if (!hora) return '—';
    // Si ya viene con AM/PM, devolverla limpia
    if (/AM|PM/i.test(hora)) {
        return hora.replace(/(\d+):(\d+)\s*(AM|PM)/i, (_, h, m, ap) =>
            `${parseInt(h)}:${m} ${ap.toUpperCase()}`);
    }
    if (!hora.includes(':')) return hora;
    let [h, m] = hora.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return hora;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2,'0')} ${ampm}`;
}

document.addEventListener('DOMContentLoaded', () => {
    migrarPlantillaItinerarioSiNecesario();
    sincronizarFechasVuelosEnStorage();
    // Siempre arrancar en la vista inicial (hero + paso 1) al cargar/recargar
    mostrarPaso(1);

    inicializarCalendarios();
    // Renderizar destinos siempre visibles al cargar
    renderizarDestinos();
    const toggleViaje = document.getElementById('tipo-viaje');
    if (toggleViaje) {
        toggleViaje.addEventListener('change', function() {
            document.getElementById('label-tipo-viaje').innerText = this.checked ? "Ida y vuelta" : "Solo ida";
        });
    }
    // Cerrar modal con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrarModal();
    });
    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('dropdown-pasajeros');
        const panel = document.getElementById('selector-panel');
        if (panel && dropdown && !dropdown.contains(e.target)) panel.classList.remove('show');
    });
});

// --- 7. MÓDULO DE ADMINISTRACIÓN ---

function verificarRuta() {
    const urlParams = new URLSearchParams(window.location.search);
    const rol = urlParams.get('role');

    if (rol === 'admin') {
        const heroVisual = document.getElementById('contenedor-reserva-visual');
        if (heroVisual) heroVisual.classList.add('hidden');
        document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));

        if (typeof adminEstaAutenticado === 'function' && adminEstaAutenticado()) {
            revelarPanelAdministracion();
        } else if (typeof abrirLoginAdmin === 'function') {
            abrirLoginAdmin();
        } else {
            revelarPanelAdministracion();
        }
    }
}

function actualizarPanelAdmin() {
    const total = typeof contarTotalAsientosReservados === 'function' ? contarTotalAsientosReservados() : 0;
    const elAs = document.getElementById('admin-asientos-total');
    const elV = document.getElementById('admin-total-vuelos');
    if (elAs) elAs.innerText = total;
    if (elV) elV.innerText = baseDeDatosVuelos.length;
}

function resetearSistema() {
    if(confirm("¿Estás seguro de borrar todas las reservas actuales?")) {
        localStorage.removeItem(STORAGE_ASIENTOS_POR_VUELO);
        localStorage.removeItem('asientosOcupados');
        localStorage.removeItem('reservasAdmin');
        alert("Sistema reseteado.");
        window.location.href = window.location.pathname; // Redirigir al inicio
    }
}

// --- 8. MÓDULO DE MODAL DE DESTINOS ---

let modalModo = 'origen'; // 'origen' o 'destino'

function abrirModalDestino(modo) {
    modalModo = modo;
    const modal = document.getElementById('modal-destino');
    const titulo = document.getElementById('modal-titulo');
    const subtitulo = document.getElementById('modal-subtitulo');
    document.getElementById('modal-buscador').value = '';
    filtrarDestinos();

    if (modo === 'origen') {
        titulo.textContent = 'Selecciona tu origen';
        subtitulo.textContent = 'Elige la ciudad de partida';
    } else {
        titulo.textContent = 'Selecciona tu destino';
        subtitulo.textContent = 'Elige hacia dónde quieres volar';
    }

    modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('modal-buscador').focus(), 100);
}

function cerrarModal() {
    document.getElementById('modal-destino').classList.add('hidden');
}

function cerrarModalSiOverlay(event) {
    if (event.target === document.getElementById('modal-destino')) {
        cerrarModal();
    }
}

function seleccionarDestino(valor, pais) {
    if (modalModo === 'origen') {
        const destinoActual = document.getElementById('destino-select').value;
        if (destinoActual && destinoActual === valor) {
            alert("⚠️ El origen no puede ser igual al destino. Por favor elige otra ciudad.");
            return;
        }
        document.getElementById('origen').value = valor;
    } else {
        const origenActual = document.getElementById('origen').value;
        if (origenActual && origenActual === valor) {
            alert("⚠️ El destino no puede ser igual al origen. Por favor elige otra ciudad.");
            return;
        }
        document.getElementById('destino-select').value = valor;
    }
    cerrarModal();
}

function filtrarDestinos() {
    const q = document.getElementById('modal-buscador').value.toLowerCase();
    document.querySelectorAll('.dest-item').forEach(item => {
        const texto = item.dataset.valor.toLowerCase() + item.dataset.pais.toLowerCase();
        item.classList.toggle('oculto', q.length > 0 && !texto.includes(q));
    });
}

// --- 9. MÓDULO WEB CHECK-IN ---

function abrirModalWebCheckin() {
    document.getElementById('checkin-codigo').value = '';
    document.getElementById('checkin-nombre').value = '';
    const msg = document.getElementById('checkin-mensaje');
    msg.classList.add('hidden');
    msg.className = 'checkin-mensaje hidden';
    document.getElementById('modal-webcheckin').classList.remove('hidden');
}

function cerrarModalWebCheckin() {
    document.getElementById('modal-webcheckin').classList.add('hidden');
}

function cerrarModalWebCheckinSiOverlay(event) {
    if (event.target === document.getElementById('modal-webcheckin')) {
        cerrarModalWebCheckin();
    }
}

function procesarWebCheckin(accion) {
    const codigo = document.getElementById('checkin-codigo').value.trim();
    const nombre = document.getElementById('checkin-nombre').value.trim();
    const msg = document.getElementById('checkin-mensaje');

    if (!codigo || !nombre) {
        mostrarMsgCheckin('Por favor ingresa el código de reserva y tu nombre.', 'error');
        return;
    }

    const reservas = JSON.parse(localStorage.getItem('reservasAdmin')) || [];
    const idx = reservas.findIndex(r => r.id === codigo);

    if (idx === -1) {
        mostrarMsgCheckin('No se encontró una reserva con ese código.', 'error');
        return;
    }

    const reserva = reservas[idx];

    // Verificar que el nombre coincida con algún pasajero
    const pasajero = reserva.pasajeros.find(p =>
        p.nombre.toLowerCase().trim() === nombre.toLowerCase().trim()
    );

    if (!pasajero) {
        mostrarMsgCheckin('El nombre no coincide con ningún pasajero de esta reserva.', 'error');
        return;
    }

    if (accion === 'confirmar') {
        if (reserva.checkin === 'cancelado') {
            mostrarMsgCheckin('❌ Esta reserva ya fue cancelada y los asientos fueron liberados. No es posible confirmar el check-in.', 'error');
            return;
        }
        if (reserva.checkin === 'confirmado') {
            mostrarMsgCheckin('✓ Tu check-in ya estaba confirmado. ¡Buen viaje!', 'exito');
            return;
        }
        reserva.checkin = 'confirmado';
        reserva.checkinFecha = new Date().toISOString();
        reservas[idx] = reserva;
        localStorage.setItem('reservasAdmin', JSON.stringify(reservas));
        mostrarMsgCheckin('✓ Check-In confirmado exitosamente. ¡Buen viaje!', 'exito');
    } else if (accion === 'cancelar') {
        if (reserva.checkin === 'cancelado') {
            mostrarMsgCheckin('Esta reserva ya fue cancelada anteriormente.', 'error');
            return;
        }
        if (!confirm('¿Estás seguro de cancelar la reserva? Los asientos serán liberados y esta acción no se puede deshacer.')) return;
        liberarAsientosReserva(reserva);

        reserva.checkin = 'cancelado';
        reserva.cancelacionFecha = new Date().toISOString();
        reservas[idx] = reserva;
        localStorage.setItem('reservasAdmin', JSON.stringify(reservas));
        mostrarMsgCheckin('✓ Reserva cancelada exitosamente. Los asientos han sido liberados.', 'exito');
    }
}

function mostrarMsgCheckin(texto, tipo) {
    const msg = document.getElementById('checkin-mensaje');
    msg.textContent = texto;
    msg.className = 'checkin-mensaje ' + tipo;
}

// --- FAQ ACORDEÓN ---
function toggleFaq(btn) {
    const item = btn.closest('.faq-item');
    const respuesta = item.querySelector('.faq-respuesta');
    const isAbierta = btn.classList.contains('abierta');

    // Cerrar todas las abiertas en la misma categoría
    const categoria = btn.closest('.faq-categoria');
    categoria.querySelectorAll('.faq-pregunta.abierta').forEach(b => {
        b.classList.remove('abierta');
        b.closest('.faq-item').querySelector('.faq-respuesta').classList.remove('visible');
    });

    if (!isAbierta) {
        btn.classList.add('abierta');
        respuesta.classList.add('visible');
    }
}

// Ejecutar la verificación al cargar la página
window.addEventListener('load', verificarRuta);




