// js/cliente_detalle.js
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const clienteId = urlParams.get('id');

  // ✅ Ocultar/Deshabilitar "Detalle de cliente" si no hay id (por si reusan menú)
  const menuDetalle = document.querySelector('[data-module="cliente_detalle"]');
  if (!clienteId && menuDetalle) {
    menuDetalle.classList.add('hidden');
  }

  if (!clienteId) {
    alert('Falta el id del cliente en la URL');
    window.location.href = 'clientes.html';
    return;
  }

  // --- elementos DOM ---
  const detalleError = document.getElementById('detalleError');
  const logoutBtn = document.getElementById('logoutBtn');
  let allPRs = []; // aquí guardaremos todos los PRs del cliente
const prFiltroEjercicio = document.getElementById('prFiltroEjercicio');
const pagoError = document.getElementById('pagoError');
// Ocultar fin de membresía y días restantes (no se muestran en UI)
document.getElementById('clienteFechaFin')?.parentElement?.classList.add('hidden');
document.getElementById('clienteDiasRestantes')?.parentElement?.classList.add('hidden');


function showPagoError(msg) {
  if (!pagoError) return;
  pagoError.textContent = msg;
  pagoError.classList.remove('hidden');
  abrirPagoForm(); // para que el usuario vea el mensaje
  pagoError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearPagoError() {
  if (!pagoError) return;
  pagoError.textContent = '';
  pagoError.classList.add('hidden');
}


  // info lectura
  const clienteTitulo = document.getElementById('clienteTitulo');
  const clienteNombre = document.getElementById('clienteNombre');
  const clienteCedula = document.getElementById('clienteCedula');
  const clienteCorreo = document.getElementById('clienteCorreo');
  const clienteTelefono = document.getElementById('clienteTelefono');
  const clienteDireccion = document.getElementById('clienteDireccion');
  const clienteFechaNac = document.getElementById('clienteFechaNac');
  const clienteEdad = document.getElementById('clienteEdad');
  const clientePeso = document.getElementById('clientePeso');
  const clienteAltura = document.getElementById('clienteAltura');
  const clienteCondicion = document.getElementById('clienteCondicion');
  const clienteEstado = document.getElementById('clienteEstado');
  const clienteMembresia = document.getElementById('clienteMembresia');
  const clienteFechaFin = document.getElementById('clienteFechaFin');
  const clienteDiasRestantes = document.getElementById('clienteDiasRestantes');


  // edición
  const btnEditarCliente = document.getElementById('btnEditarCliente');
  const btnEliminarCliente = document.getElementById('btnEliminarCliente');
  const infoLectura = document.getElementById('infoLectura');
  const formEditarCliente = document.getElementById('formEditarCliente');

  const editTelefono = document.getElementById('editTelefono');
  const editEstado = document.getElementById('editEstado');
  const editPeso = document.getElementById('editPeso');
  const editPesoFecha = document.getElementById('editPesoFecha'); // ✅
  const editAltura = document.getElementById('editAltura');
  const editDireccion = document.getElementById('editDireccion');
  const editCondicion = document.getElementById('editCondicion');
  const btnCancelarEdicion = document.getElementById('btnCancelarEdicion');
  const btnGuardarEdicion = document.getElementById('btnGuardarEdicion');

  // ✅ Toggle form pago (IDs EXACTOS de tu HTML)
  const togglePagoFormBtn = document.getElementById('togglePagoFormBtn');
  const pagoFormWrapper = document.getElementById('pagoFormWrapper');

  // pagos
  const pagoForm = document.getElementById('pagoForm');
  const membresiaPago = document.getElementById('membresiaPago');
  const montoPago = document.getElementById('montoPago');
  const descripcionPago = document.getElementById('descripcionPago');
  const registrarPagoBtn = document.getElementById('registrarPagoBtn');
  const pagosBody = document.getElementById('pagosBody');
  const pagosCount = document.getElementById('pagosCount');
  let allPagos = []; // arriba, global


  const tipoPago = document.getElementById('tipoPago');
  const comprobanteWrapper = document.getElementById('comprobanteWrapper');
  const comprobanteArchivo = document.getElementById('comprobanteArchivo');

  // Fecha inicio
  const fechaHoyRadio = document.getElementById('fechaHoy');
  const fechaElegirRadio = document.getElementById('fechaElegir');
  const fechaInicioWrapper = document.getElementById('fechaInicioWrapper');
  const fechaInicioInput = document.getElementById('fechaInicioInput');

  // Set max date to today
  if (fechaInicioInput) fechaInicioInput.max = todayYMD();

  // Event listeners for radio buttons
  if (fechaHoyRadio) {
    fechaHoyRadio.addEventListener('change', () => {
      if (fechaInicioWrapper) fechaInicioWrapper.classList.add('hidden');
    });
  }
  if (fechaElegirRadio) {
    fechaElegirRadio.addEventListener('change', () => {
      if (fechaInicioWrapper) fechaInicioWrapper.classList.remove('hidden');
    });
  }

  // modal comprobante
  const comprobanteModal = document.getElementById('comprobanteModal');
  const comprobanteImage = document.getElementById('comprobanteImage');
  const comprobanteClose = document.getElementById('comprobanteClose');

  // ✅ PRs
  const prForm = document.getElementById('prForm');
  const prEjercicio = document.getElementById('prEjercicio');
  const prFecha = document.getElementById('prFecha');
  const prMarca = document.getElementById('prMarca');
  const prUnidad = document.getElementById('prUnidad');
  const prGuardarBtn = document.getElementById('prGuardarBtn');
  const prsBody = document.getElementById('prsBody');
  const prsCount = document.getElementById('prsCount');

  // ✅ Pesos historial
  const pesosBody = document.getElementById('pesosBody');
  const pesosCount = document.getElementById('pesosCount');

  // Estado
  let todasLasMembresias = [];
  let clienteActual = null;
  let enviando = false;

  
  const btnImprimirPagos = document.getElementById('btnImprimirPagos');
const printDesde = document.getElementById('printDesde');
const printHasta = document.getElementById('printHasta');
function getPagoFechaYMD(p) {
  return (p?.fecha || p?.created_at || '').toString().slice(0, 10);
}

btnImprimirPagos?.addEventListener('click', async () => {
  try {
    const desde = printDesde?.value?.trim() || '';
    const hasta = printHasta?.value?.trim() || '';

    const url =
      `${API_BASE_URL}/clientes/${clienteId}/historial-pdf` +
      `?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/pdf',
      },
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error('No se pudo generar el PDF. ' + (txt || ''));
    }

    const blob = await res.blob();
    const fileUrl = URL.createObjectURL(blob);

    const isiOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isiOS) {
      window.open(fileUrl, '_blank', 'noopener');
    } else {
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = 'historial_pagos.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
  } catch (err) {
    console.error(err);
    alert(err?.message || 'Error descargando PDF');
  }
});


function descargarPdfHistorial({ cliente, pagos, desde, hasta }) {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    alert('Falta cargar jsPDF en el HTML.');
    return;
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const nombre = cliente?.nombre || 'Cliente';
  const cedula = cliente?.cedula || '';
  const rango = `Rango: ${desde || '---'} a ${hasta || '---'}`;

  doc.setFontSize(14);
  doc.text('Historial de pagos', 14, 16);
  doc.setFontSize(11);
  doc.text(`Cliente: ${nombre}`, 14, 24);
  if (cedula) doc.text(`Cédula: ${cedula}`, 14, 30);
  doc.text(rango, 14, 36);

  const head = [[ 'Fecha', 'Membresía', 'Monto', 'Tipo', 'Registrado por', 'Descripción', 'Fin' ]];

  const body = (pagos || []).map(p => {
    const fecha = onlyYMD(p?.fecha ?? p?.created_at) || '-';

    // Mejorado: usa tu helper que resuelve por id si no viene el objeto
    const mem = getMembresiaDePago(p);
    const memNombre =
      mem?.nombre ||
      p?.membresia?.nombre ||
      p?.membresia_nombre ||
      '-';

    const monto = `$ ${Number(p?.monto || 0).toFixed(2)}`;
    const tipo = (getTipoPago(p) || '-');

    const registradoPor =
      p?.registrado_por_nombre ||
      p?.registradoPorNombre ||
      p?.usuario?.name ||
      p?.user?.name ||
      '-';

    const descripcion =
      (p?.descripcion ?? p?.detalle ?? p?.observacion ?? '') || '-';

    const fin = calcularFechaFinDesdePago(p) || '-';

    return [fecha, memNombre, monto, tipo, registradoPor, descripcion, fin];
  });

  doc.autoTable({
    startY: 42,
    head,
    body,
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 28 },
      2: { cellWidth: 18 },
      3: { cellWidth: 18 },
      4: { cellWidth: 28 },
      5: { cellWidth: 45 },
      6: { cellWidth: 18 }
    }
  });

  const d = new Date();
  const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const safe = String(cedula || 'cliente').replace(/[^\w-]+/g, '_');
  const filename = `historial_pagos_${safe}_${ymd}.pdf`;

  // Descarga robusta + fallback iOS (abre en pestaña)
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);

  const isiOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const a = document.createElement('a');
  a.href = url;

  if (isiOS) {
    a.target = '_blank';     // iPhone/iPad: mejor abrir
    a.rel = 'noopener';
  } else {
    a.download = filename;   // Android/PC: descarga directa
  }

  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
  // Helpers
  
  function calcularEdad(fechaNacStr) {
  if (!fechaNacStr) return null;

  const ymd = String(fechaNacStr).slice(0, 10); // soporta "YYYY-MM-DD" o "YYYY-MM-DD HH:mm:ss"
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return null;

  const hoy = new Date();
  let edad = hoy.getFullYear() - y;

  // si aún no cumple años este año, restar 1
  const cumpleEsteAno = new Date(hoy.getFullYear(), m - 1, d);
  if (hoy < cumpleEsteAno) edad -= 1;

  return edad;
}

  function getPagoFechaYMD(p) {
  return (p?.fecha || p?.created_at || '').toString().slice(0, 10);
}

function setMembresiaActualDesdePagos(listaPagos) {
  const pagosSolo = (listaPagos || [])
    .filter(p => String(p?.tipo || '').toLowerCase() === 'pago')
    .sort((a, b) => String(onlyYMD(b?.fecha || b?.created_at) || '')
      .localeCompare(String(onlyYMD(a?.fecha || a?.created_at) || '')));

  const ultimo = pagosSolo[0];

  if (!ultimo) {
    safeText(clienteMembresia, clienteActual?.membresia?.nombre ?? '-');
    return;
  }

  // 1) si viene objeto o string directo
  let nombreMem =
    ultimo?.membresia?.nombre ||
    ultimo?.membresia_nombre ||
    (typeof ultimo?.membresia === 'string' ? ultimo.membresia : null);

  // 2) si solo viene membresia_id, lo resolvemos desde todasLasMembresias
  if (!nombreMem) {
    const id = ultimo?.membresia_id ?? ultimo?.membresiaId ?? null;
    const mem = (todasLasMembresias || []).find(m => String(m.id) === String(id));
    if (mem) nombreMem = mem.nombre;
  }

  safeText(clienteMembresia, nombreMem || '-');
}


  function showError(msg) {
    if (!detalleError) return;
    detalleError.textContent = msg;
    detalleError.classList.remove('hidden');
  }

  function clearError() {
    if (!detalleError) return;
    detalleError.textContent = '';
    detalleError.classList.add('hidden');
  }

  function safeText(el, val) {
    if (!el) return;
    el.textContent = val;
  }

  function todayYMD() {
    return new Date().toISOString().slice(0, 10);
  }
function onlyYMD(x) {
  if (!x) return null;

  // Si ya viene como YYYY-MM-DD, perfecto
  const s = String(x);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Si viene timestamp (ISO), conviértelo a fecha LOCAL
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s.slice(0, 10);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}


function addDaysEndYMD(ymd, dias) {
  if (!ymd) return null;
  const d = new Date(ymd + 'T00:00:00');
  const n = Number(dias || 0);
  // inclusivo: 1 día => +0
  d.setDate(d.getDate() + Math.max(0, n - 1));
  return d.toISOString().slice(0, 10);
}


function addMonthsEndYMD(ymd, meses) {
  if (!ymd) return null;
  const d = new Date(ymd + 'T00:00:00');
  const n = Number(meses || 0);
  d.setMonth(d.getMonth() + Math.max(0, n));
  return d.toISOString().slice(0, 10);
}

function diffDaysYMD(ymdFin) {
  if (!ymdFin) return null;

  // Fin: al FINAL del día (23:59:59)
  const fin = new Date(ymdFin + 'T23:59:59');

  // Hoy: inicio del día
  const hoy = new Date();
  hoy.setHours(0,0,0,0);

  const ms = fin.getTime() - hoy.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}


// 👉 obtiene la membresía del pago (del objeto o por ID en membresías activas)
function getMembresiaDePago(pago) {
  if (pago?.membresia && typeof pago.membresia === 'object') return pago.membresia;

  const id = pago?.membresia_id ?? pago?.membresiaId ?? null;
  if (id == null) return null;

  return (todasLasMembresias || []).find(m => String(m.id) === String(id)) || null;
}

// 👉 calcula fecha_fin de un pago usando duración (dias o meses)
function calcularFechaFinDesdePago(pago) {
  // si el backend ya manda fecha_fin, úsala
  const ya = onlyYMD(pago?.fecha_fin);
  if (ya) return ya;

  // Usar fecha_inicio si existe, sino fecha del pago
  const inicio = onlyYMD(pago?.fecha_inicio) || onlyYMD(pago?.fecha || pago?.created_at);
  const mem = getMembresiaDePago(pago);
  if (!inicio || !mem) return null;

  const durDias = mem?.duracion_dias != null ? Number(mem.duracion_dias) : null;
  const durMeses = mem?.duracion_meses != null ? Number(mem.duracion_meses) : null;

  if (durDias && durDias > 0) return addDaysEndYMD(inicio, durDias);
  if (durMeses && durMeses > 0) return addMonthsEndYMD(inicio, durMeses);

  return null; // 👈 importante: no inventes 1 mes si no hay duración
}

// 👉 calcula estado actual (igual que tu lógica de clientes.html: activo si fin >= hoy)
function calcularVigenciaMembresia(pagos) {
  const pagosSolo = (pagos || []).filter(p => String(p?.tipo || '').toLowerCase() === 'pago');

pagosSolo.sort((a, b) => {
    const fa = calcularFechaFinDesdePago(a) || '';
    const fb = calcularFechaFinDesdePago(b) || '';
    return (fb || '').localeCompare(fa || '');
});

  const ultimo = pagosSolo[0];
  if (!ultimo) return { estado: 'inactivo', fecha_fin: null, dias: null };

  const fechaFin = calcularFechaFinDesdePago(ultimo);
  if (!fechaFin) return { estado: 'inactivo', fecha_fin: null, dias: null };

  const dias = diffDaysYMD(fechaFin);

  // ✅ activo si fecha_fin >= hoy
  const estado = (dias != null && dias >= 0) ? 'activo' : 'inactivo';

  return { estado, fecha_fin: fechaFin, dias };
}

function pintarVigenciaEnUI(v) {
  if (!v) return;

  // estado badge
  if (clienteEstado) {
    const est = (v.estado || 'inactivo').toLowerCase();
    clienteEstado.textContent = est;
    clienteEstado.className =
      'inline-flex items-center px-2 py-0.5 rounded text-xs ' +
      (est === 'activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700');
  }

  if (clienteFechaFin) clienteFechaFin.textContent = v.fecha_fin || '-';

  if (clienteDiasRestantes) {
    if (v.dias == null) clienteDiasRestantes.textContent = '-';
    else if (v.dias < 0) clienteDiasRestantes.textContent = `Vencido hace ${Math.abs(v.dias)} día(s)`;
    else if (v.dias === 0) clienteDiasRestantes.textContent = 'Vence hoy';
    else clienteDiasRestantes.textContent = `Faltan ${v.dias} día(s)`;
  }
}


  // Labels ejercicios
  const EJ_LABELS = {
    snatch: 'Snatch',
    clean_and_jerk: 'Clean and jerk',
    sentadilla: 'Sentadilla',
    peso_muerto: 'Peso muerto',
    press_militar: 'Press militar',
  };

  function labelEjercicio(v) {
    if (!v) return '-';
    const key = String(v).toLowerCase().trim();
    return EJ_LABELS[key] || v;
  }

  function openComprobanteModal(url) {
    if (!url || !comprobanteModal || !comprobanteImage) return;
    comprobanteImage.src = url;
    comprobanteModal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  }

  function closeComprobanteModal() {
    if (!comprobanteModal || !comprobanteImage) return;
    comprobanteModal.classList.add('hidden');
    comprobanteImage.src = '';
    document.body.classList.remove('overflow-hidden');
  }

  function getTipoPago(pago) {
    const raw =
      pago?.tipo_pago ??
      pago?.metodo_pago ??
      pago?.forma_pago ??
      pago?.tipoPago ??
      pago?.payment_method ??
      pago?.payment_type ??
      pago?.metodo ??
      null;

    return raw ? String(raw).toLowerCase().trim() : '';
  }

  function getComprobanteUrl(pago) {
    return (
      pago?.comprobante_url ??
      pago?.comprobanteUrl ??
      pago?.url_comprobante ??
      pago?.comprobante ??
      null
    );
  }

  // ✅ Toggle del formulario de pago (con tus IDs)
  function abrirPagoForm() {
    if (!pagoFormWrapper || !togglePagoFormBtn) return;
    pagoFormWrapper.classList.remove('hidden');
    togglePagoFormBtn.setAttribute('aria-expanded', 'true');
    togglePagoFormBtn.textContent = '− Ocultar formulario';
    pagoFormWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function cerrarPagoForm() {
    if (!pagoFormWrapper || !togglePagoFormBtn) return;
    pagoFormWrapper.classList.add('hidden');
    togglePagoFormBtn.setAttribute('aria-expanded', 'false');
    togglePagoFormBtn.textContent = '+ Registrar pago';
  }

  togglePagoFormBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!pagoFormWrapper) return;

    const estaOculto = pagoFormWrapper.classList.contains('hidden');
    if (estaOculto) abrirPagoForm();
    else cerrarPagoForm();
  });

  // mostrar/ocultar comprobante según tipoPago
  tipoPago?.addEventListener('change', () => {
    if (!comprobanteWrapper || !comprobanteArchivo) return;
    if (tipoPago.value === 'transferencia') {
      comprobanteWrapper.classList.remove('hidden');
    } else {
      comprobanteWrapper.classList.add('hidden');
      comprobanteArchivo.value = '';
    }
  });

  // logout
  logoutBtn?.addEventListener('click', async () => {
    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: 'application/json',
        },
      });
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      window.location.href = 'login.html';
    }
  });

  // carga inicial
  cargarHomeCliente();
  async function cargarHomeCliente() {
  clearError();
  try {
    if (window.loader) loader.show();

    const resp = await fetch(`${API_BASE_URL}/clientes/${clienteId}/home`, {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.message || 'Error al cargar el detalle (home).');

    // 1) Cliente
    clienteActual = data.cliente || null;
    if (clienteActual) pintarCliente(clienteActual);

    // 2) Membresías activas (activo = 1)
    const mems = Array.isArray(data.membresias_activas)
      ? data.membresias_activas
      : (data.membresias_activas?.data ?? []);
    todasLasMembresias = mems;
    renderMembresias(mems);

    // 3) Pagos (transacciones)
    const pagos = Array.isArray(data.transacciones)
      ? data.transacciones
      : (data.transacciones?.data ?? []);
    allPagos = pagos;
    renderPagos(pagos);
    pintarVigenciaEnUI(calcularVigenciaMembresia(pagos));

    // 4) Pesos
    const pesos = Array.isArray(data.pesos) ? data.pesos : (data.pesos?.data ?? []);
    renderPesos(pesos);

    // 5) Ejercicios/PRs
    const ejercicios = Array.isArray(data.ejercicios) ? data.ejercicios : (data.ejercicios?.data ?? []);
    allPRs = ejercicios;
    renderPRsFiltrados();

  } catch (err) {
    console.error(err);
    showError(err.message || 'Error inesperado al cargar el detalle.');
  } finally {
    if (window.loader) loader.hide();
  }
}

function renderMembresias(lista) {
  if (!membresiaPago) return;

  membresiaPago.innerHTML = '<option value="">Seleccione una membresía...</option>';

  const activas = (lista || []).filter(m => Number(m?.activo) === 1 || m?.activo === true);

  activas.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.nombre} - $${Number(m.precio).toFixed(2)}`;
    membresiaPago.appendChild(opt);
  });
}


// ====== RENDER PAGOS (SIN FETCH) ======
function renderPagos(lista) {
  if (!pagosBody) return;
  pagosBody.innerHTML = '';

  // ✅ Actualizar “membresía actual” según último pago
  setMembresiaActualDesdePagos(lista);

  if (pagosCount) pagosCount.textContent = `${(lista || []).length} pago(s)`;

  if (!lista || lista.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 9;
    td.className = 'px-3 py-3 text-center text-gray-500';
    td.textContent = 'No hay pagos registrados.';
    tr.appendChild(td);
    pagosBody.appendChild(tr);
    return;
  }

  // ✅ Mostrar solo las primeras 2 filas, las demás con clase "hidden"
  const MAX_VISIBLE = 2;
  const mostrarMas = lista.length > MAX_VISIBLE;


  lista.sort((a, b) => {
    const finA = onlyYMD(a?.fecha_fin) || '';
    const finB = onlyYMD(b?.fecha_fin) || '';
    return finB.localeCompare(finA);
  });

  lista.forEach((pago, index) => {
    const tr = document.createElement('tr');
    tr.className = 'border-b';

    // Agregar clase "hidden" a filas después de la 2ª
    if (index >= MAX_VISIBLE) {
      tr.classList.add('hidden');
      tr.classList.add('pago-oculto');
    }

    const tipoPagoNorm = getTipoPago(pago);
    const tipoMostrado = tipoPagoNorm || '-';
    const esTransferencia = tipoPagoNorm === 'transferencia';

    const descripcion = pago.descripcion ?? '-';
    const fechaFin = onlyYMD(pago?.fecha_fin) || calcularFechaFinDesdePago(pago) || '-';


    const comprobanteUrl = getComprobanteUrl(pago);
    const comprobanteHtml =
      esTransferencia && comprobanteUrl
        ? `<button type="button"
             data-url="${comprobanteUrl}"
             class="ver-comprobante-btn text-sm inline-block px-2 py-1 bg-blue-50 text-blue-600 rounded">
             Ver
           </button>`
        : '-';

const registradoPor =
  pago?.registrado_por ||
  (pago?.creador
    ? `${(pago.creador.nombre || '')} ${(pago.creador.apellido || '')}`.trim() +
      (pago.creador.rol ? ` (${pago.creador.rol})` : '')
    : '-') || '-';


    tr.innerHTML = `
      <td class="px-3 py-2">${onlyYMD(pago.fecha ?? pago.created_at) || '-'}</td>
      <td class="px-3 py-2">${onlyYMD(pago.fecha_inicio) || '-'}</td>
      <td class="px-3 py-2">${pago.membresia?.nombre ?? '-'}</td>
      <td class="px-3 py-2">$ ${Number(pago.monto || 0).toFixed(2)}</td>
      <td class="px-3 py-2 capitalize">${tipoMostrado}</td>
      <td class="px-3 py-2">${registradoPor}</td>
      <td class="px-3 py-2">${descripcion}</td>
      <td class="px-3 py-2">${fechaFin}</td>
      <td class="px-3 py-2">${comprobanteHtml}</td>
    `;
    pagosBody.appendChild(tr);
  });

  // Agregar fila de "Ver historial completo" si hay más de 2 pagos
  if (mostrarMas) {
    const trVerMas = document.createElement('tr');
    trVerMas.className = 'border-b bg-gray-50 hover:bg-gray-100 cursor-pointer';
    trVerMas.id = 'verMasPagosBtn';
    const tdVerMas = document.createElement('td');
    tdVerMas.colSpan = 8;
    tdVerMas.className = 'px-3 py-3 text-left text-blue-600 font-semibold text-sm';
    tdVerMas.textContent = '📋 Ver historial completo';
    trVerMas.appendChild(tdVerMas);
    pagosBody.appendChild(trVerMas);

    // Evento para mostrar/ocultar filas
    trVerMas.addEventListener('click', () => {
      const pagosOcultos = document.querySelectorAll('.pago-oculto');
      const todosVisibles = Array.from(pagosOcultos).every(row => !row.classList.contains('hidden'));

      pagosOcultos.forEach(row => {
        if (todosVisibles) {
          row.classList.add('hidden');
        } else {
          row.classList.remove('hidden');
        }
      });

      // Cambiar el texto del botón
      if (todosVisibles) {
        tdVerMas.textContent = '📋 Ver historial completo';
      } else {
        tdVerMas.textContent = '📋 Ocultar filas';
      }
    });
  }
}

// ====== RENDER PESOS (SIN FETCH) ======
function renderPesos(lista) {
  if (!pesosBody) return;
  pesosBody.innerHTML = '';

  const arr = lista || [];
  if (pesosCount) pesosCount.textContent = `${arr.length} registro(s)`;

  if (arr.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 2;
    td.className = 'px-3 py-3 text-center text-gray-500';
    td.textContent = 'Sin pesos registrados.';
    tr.appendChild(td);
    pesosBody.appendChild(tr);
    return;
  }

  arr.forEach((x) => {
    const tr = document.createElement('tr');
    tr.className = 'border-b';
    tr.innerHTML = `
      <td class="px-3 py-2">${x.fecha ?? '-'}</td>
      <td class="px-3 py-2">${x.peso != null ? Number(x.peso).toFixed(2) : '-'}</td>
    `;
    pesosBody.appendChild(tr);
  });
}


async function cargarClienteYPagos() {
  clearError();
  try {
    if (window.loader) loader.show();

    const respCliente = await fetch(`${API_BASE_URL}/clientes/${clienteId}`, {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
    });

    const dataCliente = await respCliente.json();
    if (!respCliente.ok) throw new Error(dataCliente.message || 'Error al cargar cliente');

    clienteActual = dataCliente;
    pintarCliente(dataCliente);

    // ✅ EN PARALELO (no uno tras otro)
    await Promise.allSettled([
      cargarPagos(),           // historial de pagos
      cargarHistorialPesos(),  // pesos
      cargarHistorialPRs(),    // ejercicios/PRs
    ]);

  } catch (error) {
    console.error(error);
    showError(error.message || 'Error inesperado al cargar el detalle.');
  } finally {
    if (window.loader) loader.hide();
  }
}

  function pintarCliente(c) {
    let nombreCompleto = '';
    if (c.nombre || c.apellido) {
      nombreCompleto = `${c.nombre ?? ''} ${c.apellido ?? ''}`.trim();
    } else if (c.full_name || c.nombre_completo) {
      nombreCompleto = c.full_name || c.nombre_completo;
    } else if (c.usuario && (c.usuario.nombre || c.usuario.apellido)) {
      nombreCompleto = `${c.usuario.nombre ?? ''} ${c.usuario.apellido ?? ''}`.trim();
    }

    safeText(clienteTitulo, `Detalle del cliente: ${nombreCompleto || '-'} `);
    safeText(clienteNombre, nombreCompleto || '-');
    safeText(clienteCedula, c.cedula_identidad ?? '-');
    safeText(clienteCorreo, c.correo ?? '-');
    safeText(clienteTelefono, c.telefono ?? '-');
    safeText(clienteDireccion, c.direccion ?? '-');
    safeText(clienteFechaNac, c.fecha_nacimiento ?? '-');
    const edad = calcularEdad(c.fecha_nacimiento);
    safeText(clienteEdad, (edad !== null && edad >= 0) ? `${edad} años` : '-');
    safeText(clientePeso, c.peso != null ? `${c.peso} kg` : '-');
    safeText(clienteAltura, c.altura != null ? `${c.altura} m` : '-');
    safeText(clienteCondicion, c.condicion_medica ?? '-');


    safeText(clienteMembresia, c.membresia?.nombre ?? '-');

    // rellenar form edición
    if (editTelefono) editTelefono.value = c.telefono ?? '';
    if (editEstado) editEstado.value = c.estado ?? 'activo';
    if (editPeso) editPeso.value = c.peso ?? '';
    if (editAltura) editAltura.value = c.altura ?? '';
    if (editDireccion) editDireccion.value = c.direccion ?? '';
    if (editCondicion) editCondicion.value = c.condicion_medica ?? '';

    if (editPesoFecha && !editPesoFecha.value) editPesoFecha.value = todayYMD();
    if (prFecha && !prFecha.value) prFecha.value = todayYMD();
  }

  // HISTORIAL PESOS
  async function cargarHistorialPesos() {
    if (!pesosBody) return;
    pesosBody.innerHTML = '';

    const resp = await fetch(`${API_BASE_URL}/clientes/${clienteId}/pesos`, {
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/json',
      },
    });

    const data = await resp.json().catch(() => []);
    if (!resp.ok) throw new Error(data.message || 'Error al cargar historial de pesos');

    const lista = Array.isArray(data) ? data : (data?.data ?? []);
    if (pesosCount) pesosCount.textContent = `${lista.length} registro(s)`;

    if (lista.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 2;
      td.className = 'px-3 py-3 text-center text-gray-500';
      td.textContent = 'Sin pesos registrados.';
      tr.appendChild(td);
      pesosBody.appendChild(tr);
      return;
    }

    lista.forEach((x) => {
      const tr = document.createElement('tr');
      tr.className = 'border-b';
      tr.innerHTML = `
        <td class="px-3 py-2">${x.fecha ?? '-'}</td>
        <td class="px-3 py-2">${x.peso != null ? Number(x.peso).toFixed(2) : '-'}</td>
      `;
      pesosBody.appendChild(tr);
    });
  }

// HISTORIAL PRs + filtro
async function cargarHistorialPRs() {
  if (!prsBody) return;
  prsBody.innerHTML = '';

  const resp = await fetch(`${API_BASE_URL}/clientes/${clienteId}/ejercicios`, {
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json',
    },
  });

  const data = await resp.json().catch(() => []);
  if (!resp.ok) throw new Error(data.message || 'Error al cargar historial de PRs');

  const lista = Array.isArray(data) ? data : (data?.data ?? []);

  // ✅ guardamos todo en memoria
  allPRs = lista;

  // ✅ render inicial
  renderPRsFiltrados();
}

function renderPRsFiltrados() {
  if (!prsBody) return;

  const filtro = prFiltroEjercicio?.value || 'all';

  const listaFiltrada =
    filtro === 'all'
      ? allPRs
      : allPRs.filter((x) => String(x.ejercicio || '').toLowerCase() === String(filtro).toLowerCase());

  if (prsCount) prsCount.textContent = `${listaFiltrada.length} registro(s)`;

  prsBody.innerHTML = '';

  if (listaFiltrada.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 3;
    td.className = 'px-3 py-3 text-center text-gray-500';
    td.textContent = filtro === 'all'
      ? 'Sin PRs registrados.'
      : 'No hay PRs para este ejercicio.';
    tr.appendChild(td);
    prsBody.appendChild(tr);
    return;
  }

  listaFiltrada.forEach((x) => {
    const tr = document.createElement('tr');
    tr.className = 'border-b';
    const unidad = x.unidad ? String(x.unidad).toLowerCase() : '';
    tr.innerHTML = `
      <td class="px-3 py-2">${(x.fecha ?? '-').toString().slice(0,10)}</td>
      <td class="px-3 py-2">${labelEjercicio(x.ejercicio)}</td>
      <td class="px-3 py-2">${x.marca_maxima != null ? Number(x.marca_maxima).toFixed(2) : '-'} ${unidad}</td>
    `;
    prsBody.appendChild(tr);
  });
}
prFiltroEjercicio?.addEventListener('change', () => {
  renderPRsFiltrados();
});


  // REGISTRAR PR
  prForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    try {
      if (!prEjercicio?.value) throw new Error('Seleccione un ejercicio.');
      if (!prFecha?.value) throw new Error('Seleccione una fecha.');
      if (!prMarca?.value) throw new Error('Ingrese la marca máxima.');
      if (!prUnidad?.value) throw new Error('Seleccione la unidad.');

      if (prGuardarBtn) {
        prGuardarBtn.disabled = true;
        prGuardarBtn.textContent = 'Guardando...';
      }

      if (window.loader) loader.show();

      const payload = {
        ejercicio: prEjercicio.value,
        marca_maxima: Number(prMarca.value),
        unidad: prUnidad.value,
        fecha: prFecha.value,
      };

      const resp = await fetch(`${API_BASE_URL}/clientes/${clienteId}/ejercicios`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || 'Error al registrar PR');

      if (prMarca) prMarca.value = '';
      if (prFecha) prFecha.value = todayYMD();

      await cargarHistorialPRs();
    } catch (err) {
      console.error(err);
      showError(err.message || 'Error registrando PR.');
    } finally {
      if (window.loader) loader.hide();
      if (prGuardarBtn) {
        prGuardarBtn.disabled = false;
        prGuardarBtn.textContent = 'Guardar PR';
      }
    }
  });

  // PAGOS
async function cargarPagos() {
  if (!pagosBody) return;

  pagosBody.innerHTML = '';
  try {
    if (window.loader) loader.show();

    const resp = await fetch(`${API_BASE_URL}/transacciones/cliente/${clienteId}`, {
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/json',
      },
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.message || 'Error al cargar pagos');

    const lista = Array.isArray(data) ? data : (data?.data ?? []);

    // ✅ Guardar en memoria (para imprimir)
    allPagos = lista;

    // ✅ Render único (usa tu renderPagos actualizado con Registrado por)
    renderPagos(lista);

    // ✅ Vigencia (si quieres que se actualice también)
    pintarVigenciaEnUI(calcularVigenciaMembresia(lista));

  } catch (error) {
    console.error(error);
    showError(error.message || 'Error al cargar historial de pagos.');
  } finally {
    if (window.loader) loader.hide();
  }
}


  pagosBody?.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.ver-comprobante-btn');
    if (!btn) return;
    const url = btn.getAttribute('data-url');
    openComprobanteModal(url);
  });

  comprobanteClose?.addEventListener('click', closeComprobanteModal);
  comprobanteModal?.addEventListener('click', (ev) => {
    if (ev.target === comprobanteModal) closeComprobanteModal();
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && comprobanteModal && !comprobanteModal.classList.contains('hidden')) {
      closeComprobanteModal();
    }
  });


  // MEMBRESIAS
  async function cargarMembresias() {
    try {
      if (window.loader) loader.show();

      const resp = await fetch(`${API_BASE_URL}/membresias?activo=1`, {
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: 'application/json',
        },
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || 'Error al cargar membresías');

      todasLasMembresias = Array.isArray(data) ? data : (data?.data ?? []);

      if (membresiaPago) membresiaPago.innerHTML = '<option value="">Seleccione una membresía...</option>';
 

      todasLasMembresias
  .filter(m => Number(m?.activo) === 1 || m?.activo === true)
  .forEach((m) => {

        if (membresiaPago) {
          const opt1 = document.createElement('option');
          opt1.value = m.id;
          opt1.textContent = `${m.nombre} - $${Number(m.precio).toFixed(2)}`;
          membresiaPago.appendChild(opt1);
        }

      });

    } catch (error) {
      console.error(error);
      showError(error.message || 'La membresía seleccionada está inactiva.');
    } finally {
      if (window.loader) loader.hide();
    }
  }

  membresiaPago?.addEventListener('change', () => {
    const idSel = membresiaPago.value;
    const mem = todasLasMembresias.find((m) => String(m.id) === String(idSel));
    if (mem && montoPago) montoPago.value = Number(mem.precio).toFixed(2);
    else if (montoPago) montoPago.value = '';
  });

  async function subirComprobanteFirebase(archivo, clienteIdLocal) {
    if (!archivo) return null;
    const timestamp = Date.now();
    const path = `comprobantes/${clienteIdLocal}/${timestamp}_${archivo.name}`;
    const storageRef = storage.ref().child(path);
    const snapshot = await storageRef.put(archivo);
    const url = await snapshot.ref.getDownloadURL();
    return url;
  }

  async function getLogoMasterfitUrl() {
  // ✅ Ruta dentro de Storage (NO gs://)
  const path = 'comprobantes-de-pago/435987360_122104082054314557_104584896865871736_n.jpg';

  // storage ya existe en tu proyecto (porque ya subes comprobantes)
  const ref = storage.ref().child(path);

  // ✅ Esto devuelve un https "download url"
  return await ref.getDownloadURL();
}


  // Registrar pago
  pagoForm?.addEventListener('submit', async (e) => {
    clearPagoError();
    e.preventDefault();
    clearError();

    if (enviando) {
    showPagoError('Ya se está procesando un pago. Espere un momento.');
      return;
    }
    enviando = true;

    if (registrarPagoBtn) {
      registrarPagoBtn.disabled = true;
      registrarPagoBtn.textContent = 'Guardando...';
    }

    try {
      const membresia_id = membresiaPago?.value;
      if (!membresia_id) throw new Error('Seleccione una membresía.');

      const mem = todasLasMembresias.find((m) => String(m.id) === String(membresia_id));
      if (!mem) throw new Error('Membresía inválida.');

      const tipo = tipoPago?.value || 'efectivo';
      let comprobanteUrl = null;
      const archivo = comprobanteArchivo?.files?.[0] || null;

      if (tipo === 'transferencia') {
        if (!archivo) throw new Error('Debe adjuntar el comprobante.');
        if (window.loader) loader.show();
        comprobanteUrl = await subirComprobanteFirebase(archivo, clienteId);
      }

      const payload = {
        cliente_id: Number(clienteId),
        membresia_id: Number(membresia_id),
        monto: Number(mem.precio),
        tipo: 'pago',
        descripcion: (descripcionPago?.value || '').trim() || 'Pago registrado manualmente',
        tipo_pago: tipo,
        comprobante_url: comprobanteUrl,
      };

      // Fecha inicio
      let fecha_inicio = null;
      if (fechaElegirRadio && fechaElegirRadio.checked) {
        fecha_inicio = fechaInicioInput?.value;
        if (!fecha_inicio) throw new Error('Seleccione una fecha de inicio.');
        const selectedDate = new Date(fecha_inicio + 'T00:00:00');
        const today = new Date(); today.setHours(0,0,0,0);
        if (selectedDate > today) throw new Error('La fecha de inicio no puede ser futura.');
      } else if (fechaHoyRadio && fechaHoyRadio.checked) {
        fecha_inicio = todayYMD();
      }
      if (fecha_inicio) payload.fecha_inicio = fecha_inicio;

      // ✅ Validación UX: si aún hay membresía vigente, no permitir pagar otra
const ultimoPago = (allPagos || [])
  .filter(p => (p.tipo || '').toLowerCase() === 'pago')
  .sort((a, b) => String(b.fecha || b.created_at || '').localeCompare(String(a.fecha || a.created_at || '')))[0];

const fechaFin = calcularFechaFinDesdePago(ultimoPago);
if (fechaFin) {
  const fin = new Date(fechaFin + 'T00:00:00');
  const hoy = new Date(); hoy.setHours(0,0,0,0);

  if (fin >= hoy) {
    showPagoError('Este cliente aún tiene una membresía vigente. No se puede registrar otro pago hasta que venza.');
    return;
  }
}


      const resp = await fetch(`${API_BASE_URL}/transacciones`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || 'Error al registrar pago');

      await cargarClienteYPagos();

      // limpiar formulario
      if (descripcionPago) descripcionPago.value = '';
      if (membresiaPago) membresiaPago.value = '';
      if (montoPago) montoPago.value = '';
      if (tipoPago) tipoPago.value = 'efectivo';
      if (comprobanteArchivo) comprobanteArchivo.value = '';
      if (comprobanteWrapper) comprobanteWrapper.classList.add('hidden');
      // Reset fecha inicio
      if (fechaHoyRadio) fechaHoyRadio.checked = true;
      if (fechaElegirRadio) fechaElegirRadio.checked = false;
      if (fechaInicioWrapper) fechaInicioWrapper.classList.add('hidden');
      if (fechaInicioInput) fechaInicioInput.value = '';

      // ✅ cerrar form al guardar
      cerrarPagoForm();
    } catch (error) {
      console.error(error);
  showPagoError(error.message || 'Error al registrar pago.');
    } finally {
      if (window.loader) loader.hide();
      if (registrarPagoBtn) {
        registrarPagoBtn.disabled = false;
        registrarPagoBtn.textContent = 'Guardar pago';
      }
      enviando = false;
    }
  });

  // MODO EDICIÓN
  function mostrarEdicion(mostrar) {
    if (!infoLectura || !formEditarCliente) return;
    if (mostrar) {
      infoLectura.classList.add('hidden');
      formEditarCliente.classList.remove('hidden');
    } else {
      infoLectura.classList.remove('hidden');
      formEditarCliente.classList.add('hidden');
    }
  }

  btnEditarCliente?.addEventListener('click', () => {
    if (editPesoFecha && !editPesoFecha.value) editPesoFecha.value = todayYMD();
    mostrarEdicion(true);
  });

  btnCancelarEdicion?.addEventListener('click', () => {
    if (clienteActual) pintarCliente(clienteActual);
    mostrarEdicion(false);
  });

  formEditarCliente?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const payload = {
      telefono: editTelefono?.value?.trim() || '',
      direccion: editDireccion?.value?.trim() || '',
      estado: editEstado?.value || '',
      condicion_medica: editCondicion?.value?.trim() || '',
    };

    if (editPeso && editPeso.value !== '') {
      payload.peso = Number(editPeso.value);
      if (editPesoFecha && editPesoFecha.value) payload.peso_fecha = editPesoFecha.value;
    }

    if (editAltura && editAltura.value !== '') payload.altura = Number(editAltura.value);


    Object.keys(payload).forEach((k) => {
      if (payload[k] === '' || payload[k] === null) delete payload[k];
    });

    if (btnGuardarEdicion) {
      btnGuardarEdicion.disabled = true;
      btnGuardarEdicion.textContent = 'Guardando...';
    }

    try {
      if (window.loader) loader.show();

      const resp = await fetch(`${API_BASE_URL}/clientes/${clienteId}`, {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (!resp.ok) {
        const msg =
          data.message ||
          (data.errors && JSON.stringify(data.errors)) ||
          'Error al actualizar cliente';
        throw new Error(msg);
      }

      clienteActual = data.cliente || clienteActual;
      await cargarClienteYPagos();
      mostrarEdicion(false);
    } catch (error) {
      console.error(error);
      showError(error.message || 'Error al actualizar el cliente.');
    } finally {
      if (window.loader) loader.hide();
      if (btnGuardarEdicion) {
        btnGuardarEdicion.disabled = false;
        btnGuardarEdicion.textContent = 'Guardar cambios';
      }
    }
  });

  // ELIMINAR CLIENTE
  btnEliminarCliente?.addEventListener('click', async () => {
    const confirmar = window.confirm('¿Seguro que deseas eliminar este cliente? Esta acción no se puede deshacer.');
    if (!confirmar) return;

    clearError();

    try {
      if (window.loader) loader.show();

const resp = await fetch(`${API_BASE_URL}/clientes/${clienteId}`, {
  method: 'DELETE',
  headers: {
    Authorization: 'Bearer ' + token,
    Accept: 'application/json',
  },
});

let data = {};
try {
  data = await resp.json();
} catch (_) {
  // por si el backend devuelve vacío o algo no-json
}

if (resp.status === 409) {
  // Membresía activa (bloqueado por backend)
  throw new Error((data?.message || 'No se puede eliminar: membresía activa.'));
}

if (!resp.ok) {
  throw new Error(data?.message || 'Error al eliminar cliente');
}

      alert('Cliente eliminado correctamente.');
      window.location.href = 'clientes.html';
    } catch (error) {
      console.error(error);
      showError(error.message || 'Error al eliminar el cliente.');
    } finally {
      if (window.loader) loader.hide();
    }
  });
  
});
