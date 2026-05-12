/**
 * SISTEMA INTEGRADO DE RESERVA DE VUELOS
 */

// --- 1. ESTADO GLOBAL Y CONFIGURACIÓN ---
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

// --- 2. NAVEGACIÓN GENERAL (SINCRONIZADA CON HTML) ---

function mostrarPaso(paso) {
    // Referencia al contenedor del carrusel y buscador
    const heroVisual = document.getElementById('contenedor-reserva-visual');

    // Ocultamos todas las secciones de contenido
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById('seccion-itinerario').classList.add('hidden');
    document.getElementById('seccion-faq').classList.add('hidden');

    if (paso === 1) {
        // Mostramos el bloque visual completo (Carrusel + Buscador)
        if (heroVisual) heroVisual.classList.remove('hidden');
        document.getElementById('paso1').classList.remove('hidden');
    } else {
        // Ocultamos el bloque visual para pasos de datos o asientos
        if (heroVisual) heroVisual.classList.add('hidden');
        const seccionObjetivo = document.getElementById(`paso${paso}`);
        if (seccionObjetivo) seccionObjetivo.classList.remove('hidden');
    }
}

function mostrarSeccion(idSeccion) {
    const heroVisual = document.getElementById('contenedor-reserva-visual');
    
    // Al entrar a Itinerario o FAQ, siempre ocultamos el bloque visual de reserva
    if (heroVisual) heroVisual.classList.add('hidden');

    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById('seccion-itinerario').classList.add('hidden');
    document.getElementById('seccion-faq').classList.add('hidden');

    if (idSeccion === 'itinerario') {
        renderizarItinerario();
        document.getElementById('seccion-itinerario').classList.remove('hidden');
    } else if (idSeccion === 'faq') {
        document.getElementById('seccion-faq').classList.remove('hidden');
    }
}

// --- 3. PASO 1: LÓGICA DE BÚSQUEDA Y PASAJEROS ---

function toggleDropdown(event) {
    const panel = document.getElementById('selector-panel');
    if (event) event.stopPropagation(); // Evita que se cierre al hacer clic dentro
    panel.classList.toggle('show');
}

function cambiarCant(id, cambio) {
    const input = document.getElementById(id);
    
    // Calcular cuánto sería el total si permitimos este cambio
    const adultos = parseInt(document.getElementById('cant-adultos').value) || 0;
    const ninos = parseInt(document.getElementById('cant-ninos').value) || 0;
    const infantes = parseInt(document.getElementById('cant-infantes').value) || 0;
    const mayores = parseInt(document.getElementById('cant-mayores').value) || 0;
    const totalActual = adultos + ninos + infantes + mayores;

    // Si intenta sumar (+) y ya hay 8, mostrar advertencia y no hacer nada
    if (cambio > 0 && totalActual >= 8) {
        alert("Advertencia: Solo puede registrar máximo 8 pasajeros");
        return;
    }

    let valor = parseInt(input.value) + cambio;
    
    // Validar mínimo (usualmente 1 para adultos o 0 para el resto)
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
    
    // Actualización dinámica del texto en la barra
    if (total === 1 && adultos === 1) {
        resumen.innerText = "Adulto 1";
    } else {
        resumen.innerText = `${total} Pasajeros`;
    }
}

function procesarBusqueda() {
    const origenInput = document.getElementById('origen').value;
    const destinoSelect = document.getElementById('destino-select').value;
    const esIdaVuelta = document.getElementById('tipo-viaje').checked;

    // Obtener conteo de categorías
    const adultos = parseInt(document.getElementById('cant-adultos').value) || 0;
    const ninos = parseInt(document.getElementById('cant-ninos').value) || 0;
    const infantes = parseInt(document.getElementById('cant-infantes').value) || 0;
    const mayores = parseInt(document.getElementById('cant-mayores').value) || 0;

    const totalPasajeros = adultos + ninos + infantes + mayores;

    // --- NUEVA VALIDACIÓN DE LÍMITE ---
    if (totalPasajeros > 8) {
        alert("⚠️ ADVERTENCIA: Solo puede registrar un máximo de 8 pasajeros por reserva.");
        return; // Detiene la ejecución
    }

    if (!destinoSelect || !origenInput) {
        alert("Por favor, complete el origen y el destino.");
        return;
    }

    // Regla de seguridad para menores
    if ((ninos > 0 || infantes > 0) && adultos === 0) {
        alert("REGLA DE SEGURIDAD: Todo menor de edad debe ir acompañado de un adulto representante.");
        return;
    }

    if (totalPasajeros === 0) {
        alert("Debe seleccionar al menos un pasajero.");
        return;
    }

    // Guardar estado y avanzar
    reserva.origen = origenInput;
    reserva.destino = destinoSelect;
    reserva.cantidadBoletos = totalPasajeros;
    reserva.conteoCategorias = { adultos, ninos, infantes, mayores };
    reserva.tipoViaje = esIdaVuelta ? "Ida y vuelta" : "Solo ida";

    generarFormulariosPasajeros();
    mostrarPaso(3);
}

// --- 4. PASO 3: FORMULARIOS DE PASAJEROS ---

function generarFormulariosPasajeros() {
    const contenedor = document.getElementById('contenedor-pasajeros');
    contenedor.innerHTML = ""; 
    
    for (let i = 1; i <= reserva.cantidadBoletos; i++) {
        contenedor.innerHTML += `
            <div class="card-pasajero">
                <h4>Datos del Pasajero ${i}</h4>
                <input type="text" placeholder="Nombre y Apellido" id="p-nombre-${i}" required>
                <input type="text" placeholder="Cédula" id="p-cedula-${i}" required>
                <input type="text" placeholder="Pasaporte" id="p-pasaporte-${i}" required>
                <div class="preguntas-rutinarias">
                    <h5>Asistencia y Salud:</h5>
                    <label><input type="checkbox" id="p-silla-${i}"> ¿Silla de ruedas?</label><br>
                    <label><input type="checkbox" id="p-vision-${i}"> ¿Visión reducida?</label><br>
                    <label><input type="checkbox" id="p-movilidad-${i}"> ¿Movilidad reducida?</label><br>
                    <label>Edad: <input type="number" id="p-edad-${i}" min="0" placeholder="Ej: 25"></label>
                </div>
            </div>
        `;
    }
}

function confirmarPasajeros() {
    reserva.pasajeros = []; 
    for (let i = 1; i <= reserva.cantidadBoletos; i++) {
        const nombre = document.getElementById(`p-nombre-${i}`).value;
        const cedula = document.getElementById(`p-cedula-${i}`).value;
        const edad = parseInt(document.getElementById(`p-edad-${i}`).value);

        if (!nombre || !cedula || isNaN(edad)) {
            alert(`Faltan datos o edad inválida del pasajero ${i}`);
            return;
        }

        reserva.pasajeros.push({
            nombre, cedula,
            pasaporte: document.getElementById(`p-pasaporte-${i}`).value,
            asistencia: {
                silla: document.getElementById(`p-silla-${i}`).checked,
                vision: document.getElementById(`p-vision-${i}`).checked,
                movilidad: document.getElementById(`p-movilidad-${i}`).checked
            },
            edad: edad
        });
    }
    renderizarMapaAsientos();
    mostrarPaso(4);
}

// --- 5. PASO 4: MAPA DE ASIENTOS Y RESTRICCIONES ---

function renderizarMapaAsientos() {
    const contenedor = document.getElementById('mapa-avion-container');
    contenedor.innerHTML = "";

    for (let f = 1; f <= 22; f++) {
        const filaDiv = document.createElement('div');
        filaDiv.className = 'fila';
        const letras = configAvion.filasClub.includes(f) ? ['A', 'C', 'pasillo', 'D', 'F'] : ['A', 'B', 'C', 'pasillo', 'D', 'E', 'F'];

        letras.forEach(l => {
            if (l === 'pasillo') {
                const p = document.createElement('div'); p.className = 'pasillo';
                filaDiv.appendChild(p); return;
            }
            const id = `${f}${l}`;
            const btn = document.createElement('button');
            btn.innerText = id;
            if (configAvion.asientosBloqueados.includes(id)) {
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
        return;
    }

    if (reserva.asientos.length < reserva.cantidadBoletos) {
        const pasajeroActual = reserva.pasajeros[reserva.asientos.length];
        const esSalidaEmergencia = configAvion.salidasEmergencia.includes(id);
        
        // Validación de seguridad para salidas de emergencia
        if (esSalidaEmergencia && (pasajeroActual.edad < 18 || pasajeroActual.edad >= 60 || Object.values(pasajeroActual.asistencia).includes(true))) {
            alert("SEGURIDAD: Este asiento es salida de emergencia. No apto para menores, adultos mayores o personas con asistencia.");
            return;
        }

        reserva.asientos.push(id);
        elemento.classList.add('seleccionado');
    } else {
        alert("Cupo de asientos completo.");
    }
}

// --- 6. FUNCIONES DE APOYO Y EVENTOS ---

function renderizarItinerario() {
    const contenedor = document.getElementById('tabla-vuelos');
    let tabla = `<table><thead><tr><th>Vuelo</th><th>Destino</th><th>Hora</th><th>Estado</th></tr></thead><tbody>`;
    baseDeDatosVuelos.forEach(v => {
        tabla += `<tr><td>${v.nro}</td><td>${v.destino}</td><td>${v.salida}</td>
                  <td style="color:${v.estado === 'Retrasado' ? 'red' : 'green'}">${v.estado}</td></tr>`;
    });
    contenedor.innerHTML = tabla + `</tbody></table>`;
}

function finalizarReserva() {
    if (reserva.asientos.length < reserva.cantidadBoletos) {
        alert("Debe seleccionar todos los asientos antes de finalizar."); return;
    }
    const jsonString = JSON.stringify({ reserva, exportado: new Date().toISOString() }, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reserva_${reserva.destino}.json`;
    link.click();
    alert("¡Reserva finalizada con éxito!");
}

// Event Listeners Iniciales
document.addEventListener('DOMContentLoaded', () => {
    const toggleViaje = document.getElementById('tipo-viaje');
    if (toggleViaje) {
        toggleViaje.addEventListener('change', function() {
            document.getElementById('label-tipo-viaje').innerText = this.checked ? "Ida y vuelta" : "Solo ida";
            const vueltaGroup = document.getElementById('vuelta-group');
            if (vueltaGroup) {
                vueltaGroup.style.opacity = this.checked ? "1" : "0.3";
                vueltaGroup.querySelector('input').disabled = !this.checked;
            }
        });
    }

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('dropdown-pasajeros');
        const panel = document.getElementById('selector-panel');
        if (panel && dropdown && !dropdown.contains(e.target)) {
            panel.classList.remove('show');
        }
    });
});