/**
 * SISTEMA INTEGRADO DE RESERVA DE VUELOS - CANAIMA AIRLINES
 */

// --- 1. ESTADO GLOBAL Y CONFIGURACIÓN ---
const configAvion = {
    filasClub: [1, 2], 
    filasTurista: Array.from({ length: 20 }, (_, i) => i + 3), 
    asientosBloqueados: ["1A", "1C", "6A", "6F", "10A", "22A", "22B", "22C"],
    salidasEmergencia: ["1A", "1C", "1D", "1F", "10A", "10B", "10C", "10D", "10E", "10F"]
};

// Carga de persistencia: Asientos ocupados guardados en el navegador
let asientosOcupadosGlobal = JSON.parse(localStorage.getItem('asientosOcupados')) || [...configAvion.asientosBloqueados];

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
    cantidadBoletos: 0,
    pasajeros: [],
    restricciones: [],
    asientos: [],
    conteoCategorias: { adultos: 0, ninos: 0, infantes: 0, mayores: 0 }
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
<<<<<<< HEAD
=======
    "Valencia (VLN)": [1, 2, 3, 4, 5, 6],
>>>>>>> upstream/develop
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
    { nombre: "Barcelona", codigo: "BLA", pais: "Venezuela", tipo: "nacional",
      descripcion: "Puerta de entrada al oriente venezolano, con hermosas playas y el imponente complejo turístico El Morro.",
      imagen: "https://images.unsplash.com/photo-1590523277543-a94eba7c0c8c?w=400&h=250&fit=crop" },
    { nombre: "Barinas", codigo: "BNS", pais: "Venezuela", tipo: "nacional",
      descripcion: "Corazón de los llanos venezolanos, ideal para el turismo de naturaleza y la cultura llanera.",
      imagen: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=250&fit=crop" },
    { nombre: "Barquisimeto", codigo: "BRM", pais: "Venezuela", tipo: "nacional",
      descripcion: "Capital musical de Venezuela, conocida por su gente cálida, el crepúsculo más hermoso y su rica gastronomía.",
      imagen: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400&h=250&fit=crop" },
    { nombre: "Canaima", codigo: "CAJ", pais: "Venezuela", tipo: "nacional",
      descripcion: "Maravilla natural declarada Patrimonio de la Humanidad, hogar del Salto Ángel y los imponentes tepuyes.",
      imagen: "https://images.unsplash.com/photo-1585664811087-47f65abbad64?w=400&h=250&fit=crop" },
    { nombre: "Cumaná", codigo: "CUM", pais: "Venezuela", tipo: "nacional",
      descripcion: "Primera ciudad fundada en tierra firme de América, con un rico legado histórico y hermosas costas.",
      imagen: "https://images.unsplash.com/photo-1590523277543-a94eba7c0c8c?w=400&h=250&fit=crop" },
    { nombre: "El Vigía", codigo: "VIG", pais: "Venezuela", tipo: "nacional",
      descripcion: "Ciudad estratégica del sur del Lago de Maracaibo, puerta de entrada a los Andes venezolanos.",
      imagen: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=250&fit=crop" },
    { nombre: "La Fría", codigo: "LFR", pais: "Venezuela", tipo: "nacional",
      descripcion: "Población del estado Táchira con un clima tropical de montaña y cercanía a la frontera colombiana.",
      imagen: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400&h=250&fit=crop" },
    { nombre: "Las Piedras", codigo: "LSP", pais: "Venezuela", tipo: "nacional",
      descripcion: "Localidad de la península de Paraguaná, conocida por sus playas y su cercanía a las refinerías.",
      imagen: "https://images.unsplash.com/photo-1590523277543-a94eba7c0c8c?w=400&h=250&fit=crop" },
    { nombre: "Los Roques", codigo: "LRV", pais: "Venezuela", tipo: "nacional",
      descripcion: "Archipiélago paradisíaco de aguas cristalinas y playas de arena blanca, ideal para el buceo y la navegación.",
      imagen: "https://images.unsplash.com/photo-1540202404-a2f29016b523?w=400&h=250&fit=crop" },
    { nombre: "Maracaibo", codigo: "MAR", pais: "Venezuela", tipo: "nacional",
      descripcion: "Capital del estado Zulia, famosa por el Puente Rafael Urdaneta, el lago y su alegre gaita zuliana.",
      imagen: "https://images.unsplash.com/photo-1590523277543-a94eba7c0c8c?w=400&h=250&fit=crop" },
    { nombre: "Maturín", codigo: "MUN", pais: "Venezuela", tipo: "nacional",
      descripcion: "Capital del estado Monagas, centro neurálgico del oriente venezolano con gran actividad petrolera.",
      imagen: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=250&fit=crop" },
<<<<<<< HEAD
=======
    { nombre: "Valencia", codigo: "VLN", pais: "Venezuela", tipo: "nacional",
      descripcion: "Capital del estado Carabobo, ciudad industrial y cultural con una rica historia de batallas independentistas y vibrante vida urbana.",
      imagen: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400&h=250&fit=crop" },
>>>>>>> upstream/develop
    { nombre: "Caracas", codigo: "CCS", pais: "Venezuela", tipo: "nacional",
      descripcion: "Capital de Venezuela, vibrante metrópolis enclavada entre el Ávila y el mar Caribe, llena de cultura y diversidad.",
      imagen: "https://images.unsplash.com/photo-1534270804882-6b504792b727?w=400&h=250&fit=crop" },
    { nombre: "Bridgetown", codigo: "BGI", pais: "Barbados", tipo: "internacional",
      descripcion: "Capital de Barbados, con playas de ensueño, arquitectura colonial británica y un ambiente caribeño único.",
      imagen: "https://images.unsplash.com/photo-1540202404-a2f29016b523?w=400&h=250&fit=crop" },
    { nombre: "Cancún", codigo: "CUN", pais: "México", tipo: "internacional",
      descripcion: "Paraíso tropical en el Caribe mexicano, famoso por sus playas, ruinas mayas y vida nocturna.",
      imagen: "https://images.unsplash.com/photo-1510097467424-192d713fd8c8?w=400&h=250&fit=crop" },
    { nombre: "La Habana", codigo: "HAV", pais: "Cuba", tipo: "internacional",
      descripcion: "Ciudad llena de historia, colores y música, con su icónico malecón y autos clásicos.",
      imagen: "https://images.unsplash.com/photo-1590075891024-0da6f6f5a2cf?w=400&h=250&fit=crop" },
    { nombre: "Managua", codigo: "MGA", pais: "Nicaragua", tipo: "internacional",
      descripcion: "Capital nicaragüense a orillas del lago Xolotlán, con volcanes imponentes y una rica cultura.",
      imagen: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=250&fit=crop" },
    { nombre: "Santa Lucía", codigo: "NLU", pais: "México", tipo: "internacional",
      descripcion: "Moderna terminal aérea en el Estado de México que conecta con la capital y sus alrededores.",
      imagen: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=250&fit=crop" },
    { nombre: "Buenos Aires", codigo: "EZE", pais: "Argentina", tipo: "internacional",
      descripcion: "Elegante capital argentina, conocida por su arquitectura europea, el tango y su exquisita gastronomía.",
      imagen: "https://images.unsplash.com/photo-1589903308904-1010c2294adc?w=400&h=250&fit=crop" },
    { nombre: "Bogotá", codigo: "BOG", pais: "Colombia", tipo: "internacional",
      descripcion: "Capital colombiana a 2600 metros de altura, fusión de historia colonial y modernidad vibrante.",
      imagen: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400&h=250&fit=crop" },
    { nombre: "Madrid", codigo: "MAD", pais: "España", tipo: "internacional",
      descripcion: "Capital de España, ciudad cosmopolita con arte, cultura, tapas y una energía que nunca se detiene.",
      imagen: "https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=400&h=250&fit=crop" },
    { nombre: "Miami", codigo: "MIA", pais: "Estados Unidos", tipo: "internacional",
      descripcion: "Ciudad vibrante de Florida, famosa por sus playas, el arte decó y la fusión latina.",
      imagen: "https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?w=400&h=250&fit=crop" },
    { nombre: "Ciudad de Panamá", codigo: "PTY", pais: "Panamá", tipo: "internacional",
      descripcion: "Capital panameña que une dos océanos, con un moderno skyline y el histórico Casco Viejo.",
      imagen: "https://images.unsplash.com/photo-1590523277543-a94eba7c0c8c?w=400&h=250&fit=crop" }
];

<<<<<<< HEAD
function renderizarDestinos() {
    const grid = document.getElementById('grid-destinos');
    grid.innerHTML = infoDestinos.map(d => `
        <div class="destino-card" onclick="seleccionarDestino('${d.nombre} (${d.codigo})', '${d.pais}'); mostrarPaso(1)">
            <img class="destino-img" src="${d.imagen}" alt="${d.nombre}" loading="lazy">
            <div class="destino-body">
                <span class="destino-badge ${d.tipo}">${d.tipo}</span>
                <h3 class="destino-titulo">${d.nombre} <span class="destino-codigo">(${d.codigo})</span></h3>
                <span class="destino-pais">${d.pais}</span>
                <p class="destino-descripcion">${d.descripcion}</p>
            </div>
        </div>
    `).join('');
}

=======
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
            <div class="dst-thumb-label">${d.pais.toUpperCase()}</div>
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


>>>>>>> upstream/develop
function toggleCalendario(id) {
    const popup = document.getElementById(`cal-${id}`);
    if (!popup) return;
    const isOpen = popup.classList.contains('show');
    document.querySelectorAll('.calendario-popup').forEach(p => p.classList.remove('show'));
    if (!isOpen) {
        popup.classList.add('show');
        renderizarCalendario(id);
    }
}

function cerrarCalendarios() {
    document.querySelectorAll('.calendario-popup').forEach(p => p.classList.remove('show'));
}

function renderizarCalendario(id) {
    const popup = document.getElementById(`cal-${id}`);
    const input = document.getElementById(`fecha-${id}`);
    const destino = document.getElementById('destino-select').value;

    let mes = parseInt(popup.dataset.mes);
    let año = parseInt(popup.dataset.año);
    if (isNaN(mes) || isNaN(año)) {
        const hoy = new Date();
        mes = hoy.getMonth();
        año = hoy.getFullYear();
        popup.dataset.mes = mes;
        popup.dataset.año = año;
    }

    const primerDia = new Date(año, mes, 1).getDay();
    const diasEnMes = new Date(año, mes + 1, 0).getDate();
    const hoyStr = new Date().toISOString().split('T')[0];
    const diasDisponibles = destino ? horariosRutas[destino] : null;
    const fechaActualStr = input.value;

    const nombreMeses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

    let html = `
        <div class="cal-header">
            <button class="cal-nav" onclick="event.stopPropagation(); navegarMes('${id}', -1)">‹</button>
            <span class="cal-titulo">${nombreMeses[mes]} ${año}</span>
            <button class="cal-nav" onclick="event.stopPropagation(); navegarMes('${id}', 1)">›</button>
        </div>
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
                const esSeleccionado = diaStr === fechaActualStr;

                let clases = 'cal-dia';
                if (esPasado) {
                    clases += ' cal-dia-disabled';
                } else if (!tieneVuelo) {
                    clases += ' cal-dia-sin-vuelo';
                }
                if (esSeleccionado) clases += ' cal-dia-seleccionado';

                const esClickable = !esPasado && tieneVuelo;
                const onclick = esClickable ? `seleccionarDia('${id}','${diaStr}')` : '';

                html += `<td><button class="${clases}" onclick="event.stopPropagation(); ${onclick}" ${onclick ? '' : 'disabled'}>${dia}</button></td>`;
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
    let mes = parseInt(popup.dataset.mes) + delta;
    let año = parseInt(popup.dataset.año);
    if (mes < 0) { mes = 11; año--; }
    if (mes > 11) { mes = 0; año++; }
    popup.dataset.mes = mes;
    popup.dataset.año = año;
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
<<<<<<< HEAD
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById('seccion-itinerario').classList.add('hidden');
    document.getElementById('seccion-faq').classList.add('hidden');
    document.getElementById('seccion-destinos').classList.add('hidden');
=======
    const seccionDestinos = document.getElementById('seccion-destinos');
    // Ocultar secciones de navegación
    ['paso3','paso-restricciones','paso4','seccion-itinerario','seccion-faq','seccion-admin'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
>>>>>>> upstream/develop

    if (paso === 1) {
        if (heroVisual) heroVisual.classList.remove('hidden');
        document.getElementById('paso1').classList.remove('hidden');
<<<<<<< HEAD
    } else if (paso === 5) {
        if (heroVisual) heroVisual.classList.add('hidden');
=======
        // Mostrar y renderizar la sección destinos solo en inicio
        if (seccionDestinos) seccionDestinos.classList.remove('hidden');
        renderizarDestinos();
    } else if (paso === 5) {
        if (heroVisual) heroVisual.classList.add('hidden');
        if (seccionDestinos) seccionDestinos.classList.add('hidden');
>>>>>>> upstream/develop
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
<<<<<<< HEAD
    } else if (idSeccion === 'destinos') {
        renderizarDestinos();
        document.getElementById('seccion-destinos').classList.remove('hidden');
=======
        document.getElementById('seccion-itinerario').scrollIntoView({ behavior: 'smooth' });
>>>>>>> upstream/develop
    } else if (idSeccion === 'faq') {
        document.getElementById('seccion-faq').classList.remove('hidden');
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

    reserva.origen = origenInput;
    reserva.destino = destinoSelect;
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
                <input type="number" id="p-edad-${i}" min="0" placeholder="Edad" required>
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
        const edad = parseInt(document.getElementById(`p-edad-${i}`).value);
        if (!nombre || !cedula || isNaN(edad)) { alert("Complete todos los campos."); return; }
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
            <label>1. Edad del pasajero: <input type="number" id="r-edad-${i}" min="0" value="${p.edad || ''}" readonly style="width:60px;background:#f0f0f0;"></label>

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

    const asientosOcupados = JSON.parse(localStorage.getItem('asientosOcupados')) || [...configAvion.asientosBloqueados];
    const asientosRestringidos = obtenerAsientosBloqueadosPorRestricciones();
    const totalAsientos = 128;
    const disponibles = totalAsientos - new Set([...asientosOcupados, ...asientosRestringidos]).size;

    if (disponibles < reserva.cantidadBoletos) {
        alert("Lo sentimos, según las restricciones informadas no podemos garantizar asientos adecuados y seguros para todos los pasajeros. Por seguridad, no podemos procesar su reserva. Consulte con nuestra línea de atención al cliente para opciones personalizadas.");
        reserva.restricciones = [];
        mostrarPaso(1);
        return;
    }

    renderizarMapaAsientos();
    mostrarPaso(4);
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
    asientosOcupadosGlobal = JSON.parse(localStorage.getItem('asientosOcupados')) || [...configAvion.asientosBloqueados];
    const asientosRestringidos = obtenerAsientosBloqueadosPorRestricciones();
    const todosOcupados = [...asientosOcupadosGlobal, ...asientosRestringidos];
<<<<<<< HEAD
=======

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
>>>>>>> upstream/develop

    for (let f = 1; f <= 22; f++) {
        const esClub = configAvion.filasClub.includes(f);

        // Insertar separador de sección al cambiar de clase
        if (esClub && !seccionClubAbierta) {
            const sep = document.createElement('div');
            sep.className = 'seccion-label club';
            sep.innerHTML = '⭐ Clase Club — Filas 1–2';
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
<<<<<<< HEAD
            if (todosOcupados.includes(id)) {
                btn.className = 'asiento ocupado'; btn.disabled = true;
=======
            const esEmergencia = configAvion.salidasEmergencia.includes(id);
            const esBloqueadoPorRestriccion = bloquearEmergenciaExtra && esEmergencia;

            if (todosOcupados.includes(id)) {
                btn.className = `asiento ocupado${esClub ? ' asiento-club' : ''}`;
                btn.disabled = true;
                btn.title = 'Asiento ocupado';
            } else if (esBloqueadoPorRestriccion) {
                btn.className = `asiento emergencia-bloqueado${esClub ? ' asiento-club' : ''}`;
                btn.disabled = true;
                btn.title = 'No disponible: salida de emergencia (no apto para menores o pasajeros con necesidades especiales)';
>>>>>>> upstream/develop
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

<<<<<<< HEAD
    if (asientosRestringidos.length > 0) {
        const info = document.createElement('p');
        info.style.cssText = 'margin-top:12px;font-size:13px;color:#dc3545;';
        info.textContent = `⚠️ ${asientosRestringidos.length} asiento(s) bloqueado(s) por restricciones de pasajeros.`;
        contenedor.appendChild(info);
    }
=======
    // --- Cola del avión ---
    const tail = document.createElement('div');
    tail.className = 'avion-cola';
    contenedor.appendChild(tail);

    // --- Leyenda ---
    const leyenda = document.createElement('div');
    leyenda.className = 'leyenda-asientos';
    leyenda.innerHTML = `
        <div class="leyenda-item"><span class="leyenda-box disponible"></span> Disponible</div>
        <div class="leyenda-item"><span class="leyenda-box seleccionado"></span> Seleccionado</div>
        <div class="leyenda-item"><span class="leyenda-box ocupado"></span> Ocupado</div>
        <div class="leyenda-item"><span class="leyenda-box emergencia"></span> Salida emergencia</div>
        <div class="leyenda-item"><span class="leyenda-box emergencia-bloqueado"></span> Bloqueado</div>
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

    // --- Botón Finalizar ---
    const btnFinalizar = document.createElement('button');
    btnFinalizar.className = 'btn-primario';
    btnFinalizar.style.cssText = 'margin-top:20px;display:block;width:100%;max-width:320px;margin-left:auto;margin-right:auto;';
    btnFinalizar.textContent = 'Finalizar Reserva';
    btnFinalizar.onclick = finalizarReserva;
    contenedor.appendChild(btnFinalizar);
>>>>>>> upstream/develop
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

    // 1. Guardar en historial y actualizar puestos ocupados (JSON persistente)
    asientosOcupadosGlobal.push(...reserva.asientos);
    localStorage.setItem('asientosOcupados', JSON.stringify(asientosOcupadosGlobal));

    // 1b. Guardar reserva completa para el panel de administración
    const reservasGuardadas = JSON.parse(localStorage.getItem('reservasAdmin')) || [];
    const nuevaReserva = {
        id: 'RES-' + Date.now(),
        fecha: new Date().toISOString(),
        origen: reserva.origen,
        destino: reserva.destino,
        tipoViaje: reserva.tipoViaje,
        pasajeros: reserva.pasajeros.map((p, i) => ({
            nombre: p.nombre,
            cedula: p.cedula,
            edad: p.edad,
            asiento: reserva.asientos[i] || '-'
        })),
        asientos: [...reserva.asientos]
    };
    reservasGuardadas.push(nuevaReserva);
    localStorage.setItem('reservasAdmin', JSON.stringify(reservasGuardadas));

    // 2. Generar ventana de impresión
    const ventanaPrint = window.open('', '_blank');
    ventanaPrint.document.write(`
        <html>
        <head>
            <title>Ticket de Reserva - Canaima Airlines</title>
            <style>
                body { font-family: sans-serif; padding: 40px; }
                .ticket { border: 2px solid #444; padding: 20px; border-radius: 10px; max-width: 500px; margin: auto; }
                h1 { color: #0052cc; text-align: center; border-bottom: 2px solid #eee; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            </style>
        </head>
        <body>
            <div class="ticket">
                <h1>CANAIMA AIRLINES</h1>
                <p><b>Ruta:</b> ${reserva.origen} ✈️ ${reserva.destino}</p>
                <p><b>Tipo:</b> ${reserva.tipoViaje}</p>
                <table>
                    <thead><tr><th>Pasajero</th><th>ID</th><th>Asiento</th></tr></thead>
                    <tbody>
                        ${reserva.pasajeros.map((p, i) => `
                            <tr><td>${p.nombre}</td><td>${p.cedula}</td><td>${reserva.asientos[i]}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
                <p style="text-align:center">¡Gracias por preferirnos!</p>
            </div>
            <script>window.print();</script>
        </body>
        </html>
    `);
    ventanaPrint.document.close();

    alert("Reserva finalizada. Los asientos han sido actualizados.");
    location.reload(); 
}

function renderizarItinerario() {
    const contenedor = document.getElementById('tabla-vuelos');

    // Intentar leer vuelos sincronizados desde el panel admin
    const syncRaw = localStorage.getItem('itinerarioSync');
    let vuelos = baseDeDatosVuelos;
    if (syncRaw) {
        try { vuelos = JSON.parse(syncRaw); } catch(e) {}
    }

    const coloresEstado = {
        'A tiempo':   { color: '#166534', bg: '#dcfce7' },
        'Embarcando': { color: '#1e40af', bg: '#dbeafe' },
        'Retrasado':  { color: '#854d0e', bg: '#fef9c3' },
        'Cancelado':  { color: '#991b1b', bg: '#fee2e2' },
        'Aterrizado': { color: '#374151', bg: '#f3f4f6' },
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
        const esAdmin = !!v.origen; // los vuelos del admin tienen campo origen
        const origen = esAdmin ? v.origen : (v.origen || '—');
        const destino = esAdmin ? v.destino : (v.destino || '—');
        // Si la hora viene en formato 24h (admin) la convertimos; si ya es 12h la dejamos
        const hora = esAdmin
            ? formatearHora12Admin(v.salida)
            : (v.salida || '—');
        const fecha = esAdmin && v.fecha ? v.fecha : '—';
        const estado = v.estado || 'A tiempo';
        const col = coloresEstado[estado] || coloresEstado['A tiempo'];

        tabla += `
            <tr>
                <td><strong>${v.nro || v.id || '—'}</strong></td>
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

// Helper: convierte "15:00" → "03:00 PM" (para mostrar en itinerario, igual que admin)
function formatearHora12Admin(hora24) {
    if (!hora24 || !hora24.includes(':')) return hora24 || '—';
    let [h, m] = hora24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}`;
}

document.addEventListener('DOMContentLoaded', () => {
<<<<<<< HEAD
    inicializarCalendarios();
=======
    // Siempre arrancar en la vista inicial (hero + paso 1) al cargar/recargar
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('role') !== 'admin') {
        mostrarPaso(1);
    }

    inicializarCalendarios();
    // Renderizar destinos siempre visibles al cargar
    renderizarDestinos();
>>>>>>> upstream/develop
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
        // Ocultar todo y mostrar admin
        const heroVisual = document.getElementById('contenedor-reserva-visual');
        if (heroVisual) heroVisual.classList.add('hidden');
        document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
        
        document.getElementById('seccion-admin').classList.remove('hidden');
        actualizarPanelAdmin();
    }
}

function actualizarPanelAdmin() {
    const ocupados = JSON.parse(localStorage.getItem('asientosOcupados')) || [];
    document.getElementById('admin-asientos-total').innerText = ocupados.length;
    document.getElementById('admin-total-vuelos').innerText = baseDeDatosVuelos.length;
}

function resetearSistema() {
    if(confirm("¿Estás seguro de borrar todas las reservas actuales?")) {
        localStorage.removeItem('asientosOcupados');
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

// Ejecutar la verificación al cargar la página
window.addEventListener('load', verificarRuta);