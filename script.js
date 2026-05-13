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
    asientos: [],
    conteoCategorias: { adultos: 0, ninos: 0, infantes: 0, mayores: 0 }
};

// --- 2. NAVEGACIÓN Y CONTROL VISUAL ---

function mostrarPaso(paso) {
    const heroVisual = document.getElementById('contenedor-reserva-visual');
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById('seccion-itinerario').classList.add('hidden');
    document.getElementById('seccion-faq').classList.add('hidden');

    if (paso === 1) {
        if (heroVisual) heroVisual.classList.remove('hidden');
        document.getElementById('paso1').classList.remove('hidden');
    } else {
        if (heroVisual) heroVisual.classList.add('hidden');
        const seccionObjetivo = document.getElementById(`paso${paso}`);
        if (seccionObjetivo) seccionObjetivo.classList.remove('hidden');
    }
}

function mostrarSeccion(idSeccion) {
    const heroVisual = document.getElementById('contenedor-reserva-visual');
    if (heroVisual) heroVisual.classList.add('hidden');
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));

    if (idSeccion === 'itinerario') {
        renderizarItinerario();
        document.getElementById('seccion-itinerario').classList.remove('hidden');
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
    if ((ninos > 0 || infantes > 0) && adultos === 0) { alert("Los menores requieren un adulto acompañante."); return; }
    if (total === 0) { alert("Seleccione al menos un pasajero."); return; }

    reserva.origen = origenInput;
    reserva.destino = destinoSelect;
    reserva.cantidadBoletos = total;
    reserva.conteoCategorias = { adultos, ninos, infantes, mayores };
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
    renderizarMapaAsientos();
    mostrarPaso(4);
}

// --- 5. PASO 4: MAPA Y PERSISTENCIA JSON ---

function renderizarMapaAsientos() {
    const contenedor = document.getElementById('mapa-avion-container');
    contenedor.innerHTML = "";
    // Sincronizar asientos ocupados desde la "base de datos" local
    asientosOcupadosGlobal = JSON.parse(localStorage.getItem('asientosOcupados')) || [...configAvion.asientosBloqueados];

    for (let f = 1; f <= 22; f++) {
        const filaDiv = document.createElement('div');
        filaDiv.className = 'fila';
        const letras = configAvion.filasClub.includes(f) ? ['A', 'C', 'pasillo', 'D', 'F'] : ['A', 'B', 'C', 'pasillo', 'D', 'E', 'F'];

        letras.forEach(l => {
            if (l === 'pasillo') { filaDiv.innerHTML += '<div class="pasillo"></div>'; return; }
            const id = `${f}${l}`;
            const btn = document.createElement('button');
            btn.innerText = id;
            if (asientosOcupadosGlobal.includes(id)) {
                btn.className = 'asiento ocupado'; btn.disabled = true;
            } else {
                btn.className = 'asiento disponible';
                btn.onclick = () => manejarSeleccionAsiento(id, btn);
            }
            filaDiv.appendChild(btn);
        });
        contenedor.appendChild(filaDiv);
    }
}

function manejarSeleccionAsiento(id, elemento) {
    const indice = reserva.asientos.indexOf(id);
    if (indice > -1) {
        reserva.asientos.splice(indice, 1);
        elemento.classList.remove('seleccionado');
    } else if (reserva.asientos.length < reserva.cantidadBoletos) {
        reserva.asientos.push(id);
        elemento.classList.add('seleccionado');
    }
}

// --- 6. CIERRE: GUARDAR Y PRINT ---

function finalizarReserva() {
    if (reserva.asientos.length < reserva.cantidadBoletos) {
        alert("Debe seleccionar todos los asientos."); return;
    }

    // 1. Guardar en historial y actualizar puestos ocupados (JSON persistente)
    asientosOcupadosGlobal.push(...reserva.asientos);
    localStorage.setItem('asientosOcupados', JSON.stringify(asientosOcupadosGlobal));

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
    let tabla = `<table><thead><tr><th>Vuelo</th><th>Destino</th><th>Hora</th><th>Estado</th></tr></thead><tbody>`;
    baseDeDatosVuelos.forEach(v => {
        tabla += `<tr><td>${v.nro}</td><td>${v.destino}</td><td>${v.salida}</td>
                  <td style="color:${v.estado === 'Retrasado' ? 'red' : 'green'}">${v.estado}</td></tr>`;
    });
    contenedor.innerHTML = tabla + `</tbody></table>`;
}

document.addEventListener('DOMContentLoaded', () => {
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
        document.getElementById('origen').value = valor;
    } else {
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