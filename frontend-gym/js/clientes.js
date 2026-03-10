// js/clientes.js
document.addEventListener('DOMContentLoaded', () => {
  const errorBox = document.getElementById('clientesError');
  const clientesBody = document.getElementById('clientesBody');
  const clientesCount = document.getElementById('clientesCount');
  const buscarInput = document.getElementById('buscarInput');
  const filtroEstadoMembresia = document.getElementById('filtroEstadoMembresia');

  const nuevoClienteBtn = document.getElementById('nuevoClienteBtn');
  const nuevoClienteCard = document.getElementById('nuevoClienteCard');
  const cancelarClienteBtn = document.getElementById('cancelarClienteBtn');
  const clienteForm = document.getElementById('clienteForm');
  const guardarClienteBtn = document.getElementById('guardarClienteBtn');
  const membresiaSelect = document.getElementById('membresiaSelect');
  const tipoPagoCliente = document.getElementById('tipoPagoCliente');
  const comprobanteWrapperCliente = document.getElementById('comprobanteWrapperCliente');
  const comprobanteArchivoCliente = document.getElementById('comprobanteArchivoCliente');

  // Inputs del formulario
  const nombreInput = document.getElementById('nombreCliente');
  const apellidoInput = document.getElementById('apellidoCliente');
  const cedulaInput = document.getElementById('cedula');
  const telefonoInput = document.getElementById('telefono');
  const direccionInput = document.getElementById('direccion');
  const correoInput = document.getElementById('correoCliente');
  const fechaNacimientoInput = document.getElementById('fechaNacimiento');
  const pesoInput = document.getElementById('peso');
  const alturaInput = document.getElementById('altura');
  const condicionMedicaInput = document.getElementById('condicionMedica');
  const estadoSelect = document.getElementById('estadoSelect');

  const token = localStorage.getItem('authToken');
  const authUser = JSON.parse(localStorage.getItem('authUser') || 'null');

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // =========================
  //  ESTADO + PAGINACIÓN
  // =========================
  let listaClientes = [];
  let page = 1;
  const PER_PAGE = 20;
  let cargando = false;

  let currentAbort = null;

  // Membresías: cargar solo 1 vez (cuando abres el card)
  let membresiasCargadas = false;

  // Botón "Cargar más"
  let btnCargarMas = document.getElementById('btnCargarMas');
  if (!btnCargarMas) {
    btnCargarMas = document.createElement('button');
    btnCargarMas.id = 'btnCargarMas';
    btnCargarMas.type = 'button';
    btnCargarMas.className =
      'mt-4 inline-flex items-center justify-center px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-800 text-sm';
    btnCargarMas.textContent = 'Cargar más';

    const tableWrap =
      (clientesBody && clientesBody.closest('.overflow-x-auto')) ||
      (clientesBody && clientesBody.closest('.bg-white')) ||
      clientesBody?.parentElement;

    if (tableWrap && tableWrap.parentElement) {
      const wrap = document.createElement('div');
      wrap.className = 'flex justify-center';
      wrap.appendChild(btnCargarMas);
      tableWrap.parentElement.appendChild(wrap);
    } else {
      document.body.appendChild(btnCargarMas);
    }
  }

  function setBtnCargarMasVisible(visible) {
    if (!btnCargarMas) return;
    btnCargarMas.classList.toggle('hidden', !visible);
  }

  function setBtnCargarMasLoading(loading) {
    if (!btnCargarMas) return;
    btnCargarMas.disabled = loading;
    btnCargarMas.textContent = loading ? 'Cargando...' : 'Cargar más';
  }

  function showError(msg) {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
  }

  function clearError() {
    if (!errorBox) return;
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
  }

  function getEstadoMembresia(c) {
    // Si hay fecha_fin, calcular estado basado en vigencia
    if (c?.fecha_fin) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const fin = new Date(c.fecha_fin + 'T00:00:00');
      return fin >= hoy ? 'activo' : 'inactivo';
    }
    // Fallback a campos de estado
    const est = (c?.estado_membresia ?? '').toString().toLowerCase().trim();
    if (est === 'activo' || est === 'inactivo') return est;
    return (c?.estado ?? '').toString().toLowerCase().trim() || 'activo';
  }

  // =========================
  //  VALIDACIONES
  // =========================
  function showHelp(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }

  function showFieldError(id, message) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = message;
      el.classList.remove('hidden');
    }
  }

  function clearFieldError(id) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = '';
      el.classList.add('hidden');
    }
  }

  function validateCedula() {
    const value = (cedulaInput?.value || '').trim();
    clearFieldError('cedulaError');

    if (!value) return (showFieldError('cedulaError', 'La cédula es obligatoria.'), false);
    if (!/^\d+$/.test(value)) return (showFieldError('cedulaError', 'Solo debe ingresar números.'), false);
    if (value.length !== 10) return (showFieldError('cedulaError', 'Debe ingresar exactamente 10 dígitos.'), false);
    return true;
  }

  function validateTelefono() {
    const value = (telefonoInput?.value || '').trim();
    clearFieldError('telefonoError');

    if (!value) return (showFieldError('telefonoError', 'El teléfono es obligatorio.'), false);
    if (!/^\d+$/.test(value)) return (showFieldError('telefonoError', 'Solo debe ingresar números.'), false);
    if (value.length !== 10) return (showFieldError('telefonoError', 'Debe ingresar exactamente 10 dígitos.'), false);
    return true;
  }

  function validateCorreo() {
    const value = (correoInput?.value || '').trim();
    clearFieldError('correoError');

    if (!value) return (showFieldError('correoError', 'El correo es obligatorio.'), false);

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(value)) return (showFieldError('correoError', 'Ingrese un correo electrónico válido.'), false);

    return true;
  }

  function validatePeso() {
    const value = (pesoInput?.value || '').trim();
    clearFieldError('pesoError');
    if (!value) return true;
    if (Number.isNaN(Number(value))) return (showFieldError('pesoError', 'Solo debe ingresar números (puede usar decimales).'), false);
    return true;
  }

  function validateAltura() {
    const value = (alturaInput?.value || '').trim();
    clearFieldError('alturaError');
    if (!value) return true;
    if (Number.isNaN(Number(value))) return (showFieldError('alturaError', 'Solo debe ingresar números (puede usar decimales).'), false);
    return true;
  }

  cedulaInput?.addEventListener('focus', () => showHelp('cedulaHelp'));
  telefonoInput?.addEventListener('focus', () => showHelp('telefonoHelp'));
  correoInput?.addEventListener('focus', () => showHelp('correoHelp'));
  pesoInput?.addEventListener('focus', () => showHelp('pesoHelp'));
  alturaInput?.addEventListener('focus', () => showHelp('alturaHelp'));

  const MAX_DIGITS = 10;

  function sanitizeNumericInput(el, maxLen) {
    const orig = el.value || '';
    const sanitized = orig.replace(/\D/g, '').slice(0, maxLen);
    if (sanitized !== orig) el.value = sanitized;
  }

  function attachNumericRestrictions(el) {
    if (!el) return;

    el.addEventListener('keydown', (e) => {
      const allowedKeys = ['Backspace', 'ArrowLeft', 'ArrowRight', 'Delete', 'Tab', 'Home', 'End'];
      if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) return;

      if (!/\d/.test(e.key)) {
        e.preventDefault();
        return;
      }

      const selectionLength = (el.selectionEnd || 0) - (el.selectionStart || 0);
      const digitsCount = (el.value.match(/\d/g) || []).length;
      if (digitsCount >= MAX_DIGITS && selectionLength === 0) e.preventDefault();
    });

    el.addEventListener('paste', (e) => {
      e.preventDefault();
      const paste = (e.clipboardData || window.clipboardData).getData('text') || '';
      const onlyDigits = paste.replace(/\D/g, '').slice(0, MAX_DIGITS);
      const before = el.value.slice(0, el.selectionStart || 0);
      const after = el.value.slice(el.selectionEnd || 0);
      el.value = (before + onlyDigits + after).replace(/\D/g, '').slice(0, MAX_DIGITS);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    el.addEventListener('input', () => {
      sanitizeNumericInput(el, MAX_DIGITS);
      if (el === cedulaInput) validateCedula();
      if (el === telefonoInput) validateTelefono();
    });
  }

  attachNumericRestrictions(cedulaInput);
  attachNumericRestrictions(telefonoInput);

  correoInput?.addEventListener('input', validateCorreo);
  pesoInput?.addEventListener('input', validatePeso);
  alturaInput?.addEventListener('input', validateAltura);

  tipoPagoCliente?.addEventListener('change', () => {
    if (!comprobanteWrapperCliente || !comprobanteArchivoCliente) return;
    if (tipoPagoCliente.value === 'transferencia') {
      comprobanteWrapperCliente.classList.remove('hidden');
    } else {
      comprobanteWrapperCliente.classList.add('hidden');
      comprobanteArchivoCliente.value = '';
      clearFieldError('comprobanteError');
    }
  });

  async function subirComprobanteFirebase(archivo) {
    if (!archivo) return null;
    const timestamp = Date.now();
    const path = `comprobantes_nuevos_clientes/${timestamp}_${archivo.name}`;
    const storageRef = storage.ref().child(path);
    const snapshot = await storageRef.put(archivo);
    return await snapshot.ref.getDownloadURL();
  }

  // =========================
  //  MEMBRESÍAS (LAZY)
  // =========================
  async function cargarMembresias() {
    const resp = await fetch(`${API_BASE_URL}/membresias`, {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
    });

    const data = await resp.json().catch(() => ([]));
    if (!resp.ok) throw new Error(data.message || 'Error al cargar membresías');

    if (membresiaSelect) {
      membresiaSelect.innerHTML = '<option value="">Seleccione una membresía...</option>';
      const arr = Array.isArray(data) ? data : (data.data || []);
      arr.forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.nombre} ($${m.precio})`;
        membresiaSelect.appendChild(opt);
      });
    }

    membresiasCargadas = true;
  }

  // Mostrar/ocultar card de nuevo cliente + cargar membresías SOLO cuando se abre
  nuevoClienteBtn?.addEventListener('click', async () => {
    nuevoClienteCard?.classList.toggle('hidden');

    const abierto = !nuevoClienteCard?.classList.contains('hidden');
    if (abierto && !membresiasCargadas) {
      try {
        if (window.loader) loader.show();
        await cargarMembresias();
      } catch (e) {
        console.error(e);
        showError(e.message || 'No se pudieron cargar las membresías.');
      } finally {
        if (window.loader) loader.hide();
      }
    }
  });

  cancelarClienteBtn?.addEventListener('click', () => {
    nuevoClienteCard?.classList.add('hidden');
    clienteForm?.reset();
    clearFieldError('cedulaError');
    clearFieldError('telefonoError');
    clearFieldError('correoError');
    clearFieldError('pesoError');
    clearFieldError('alturaError');
    clearFieldError('comprobanteError');
    if (tipoPagoCliente) tipoPagoCliente.value = 'efectivo';
    comprobanteWrapperCliente?.classList.add('hidden');
  });

  // =========================
  //  LISTA (PAGINADA) + CARGAR MÁS
  // =========================
  function getFiltrosActuales() {
    const q = (buscarInput?.value || '').trim();
    const est = (filtroEstadoMembresia?.value || 'all').toLowerCase();
    return { q, est };
  }

  function parsePaginado(payload) {
    // Laravel paginate/simplePaginate
    if (payload && Array.isArray(payload.data)) {
      return {
        rows: payload.data,
        current: payload.current_page ?? 1,
        next: payload.next_page_url ?? null,
        total: payload.total ?? null,        // paginate
        last: payload.last_page ?? null,     // paginate
      };
    }
    // fallback
    return { rows: Array.isArray(payload) ? payload : [], current: 1, next: null, total: null, last: null };
  }

  async function resetYPrimeraPagina() {
    page = 1;
    listaClientes = [];
    if (clientesBody) clientesBody.innerHTML = '';
    setBtnCargarMasVisible(false);
    await cargarPagina({ append: false });
  }

async function cargarPagina({ append }) {
    if (cargando) return;
    cargando = true;
    clearError();
    setBtnCargarMasLoading(true);

    if (currentAbort) {
      try { currentAbort.abort(); } catch (e) {}
    }
    currentAbort = new AbortController();

    try {
      const { q, est } = getFiltrosActuales();

      const params = new URLSearchParams();
      params.set('page', String(page));        // Página actual
      params.set('per_page', String(10));      // Asegúrate de que per_page sea 10
      if (q) params.set('q', q);               // Búsqueda
      if (est && est !== 'all') params.set('estado_membresia', est);  // Filtro de estado

      const url = `${API_BASE_URL}/clientes/lista?${params.toString()}`;

      if (window.loader) loader.show();

      const resp = await fetch(url, {
        signal: currentAbort.signal,
        headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
      });

      const payload = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(payload.message || 'Error al cargar clientes');

      const pg = parsePaginado(payload);
      const rows = Array.isArray(pg.rows) ? pg.rows : [];

      if (!append) listaClientes = [];
      listaClientes = append ? [...listaClientes, ...rows] : rows;

      renderTabla(listaClientes, pg.total);

      // Si hay más clientes, muestra el botón "Cargar más"
      const hayMas = !!pg.next;
      setBtnCargarMasVisible(hayMas);

    } catch (e) {
      if (e?.name === 'AbortError') return;
      console.error(e);
      showError(e.message || 'Error inesperado al cargar clientes.');
      setBtnCargarMasVisible(false);
    } finally {
      cargando = false;
      setBtnCargarMasLoading(false);
      if (window.loader) loader.hide();
    }
}


btnCargarMas?.addEventListener('click', async () => {
    if (cargando) return;
    page += 1;  // Incrementar la página
    await cargarPagina({ append: true });  // Cargar la siguiente página
});

  // =========================
  //  RENDER TABLA
  // =========================
function renderTabla(clientes, total) {
  if (!clientesBody) return;
  clientesBody.innerHTML = '';

  const mostrados = clientes?.length || 0;

  // Actualizar el contador de clientes
  if (clientesCount) {
    if (typeof total === 'number') {
      // Mostrar "Mostrando X de Y cliente(s)"
      clientesCount.textContent = `Mostrando ${mostrados} de ${total} cliente(s)`;
    } else {
      clientesCount.textContent = `${mostrados} cliente(s)`;
    }
  }

  if (!clientes || clientes.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 7;
    td.className = 'px-3 py-3 text-center text-gray-500';
    td.textContent = 'No hay clientes registrados.';
    tr.appendChild(td);
    clientesBody.appendChild(tr);
    return;
  }

  clientes.forEach((c) => {
    const tr = document.createElement('tr');
    tr.className = 'border-b';

    const nombreCompleto =
      (c.nombre || c.apellido)
        ? `${c.nombre ?? ''} ${c.apellido ?? ''}`.trim()
        : (c.usuario ? `${c.usuario.nombre ?? ''} ${c.usuario.apellido ?? ''}`.trim() : '-');

    const est = getEstadoMembresia(c);
    const cls = est === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

    // ✅ soporte backend liviano: membresia_nombre
    const nombreMembresia = c.membresia_nombre ?? c.membresia?.nombre ?? '-';

    tr.innerHTML = `
      <td class="px-3 py-2">${nombreCompleto || '-'}</td>
      <td class="px-3 py-2">${c.cedula_identidad ?? '-'}</td>
      <td class="px-3 py-2">${c.correo ?? '-'}</td>
      <td class="px-3 py-2">${c.telefono ?? '-'}</td>
      <td class="px-3 py-2">${c.membresia?.nombre ?? c.membresia_nombre ?? '-'}</td>
      <td class="px-3 py-2">
        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs ${cls}">
          ${est}
        </span>
      </td>
      <td class="px-3 py-2">
        <button class="text-blue-600 hover:underline text-xs" type="button" data-id="${c.id}">
          Ver
        </button>
      </td>
    `;

    clientesBody.appendChild(tr);
  });
}


  // Delegación click en "Ver"
  clientesBody?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    if (!id) return;
    window.location.href = `cliente_detalle.html?id=${encodeURIComponent(id)}`;
  });

  // =========================
  //  BUSCAR / FILTRO (PAG 1)
  // =========================
let debounceT = null;
function debounceReset() {
  clearTimeout(debounceT);
  debounceT = setTimeout(() => resetYPrimeraPagina(), 350);
}

buscarInput?.addEventListener('input', debounceReset);  // Actualiza los resultados con la búsqueda
  filtroEstadoMembresia?.addEventListener('change', () => resetYPrimeraPagina());

  // =========================
  //  CREAR CLIENTE
  // =========================
  clienteForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const cedulaOK = validateCedula();
    const telefonoOK = validateTelefono();
    const correoOK = validateCorreo();
    const pesoOK = validatePeso();
    const alturaOK = validateAltura();

    if (!cedulaOK || !telefonoOK || !correoOK || !pesoOK || !alturaOK) return;

    if (!authUser || !authUser.id) return showError('No se encontró el usuario autenticado.');
    if (!membresiaSelect?.value) return showError('Seleccione una membresía.');

    const tipoPago = tipoPagoCliente?.value || 'efectivo';
    let comprobanteUrl = null;

    if (tipoPago === 'transferencia') {
      const archivo = comprobanteArchivoCliente?.files?.[0];
      if (!archivo) {
        clearFieldError('comprobanteError');
        showFieldError('comprobanteError', 'El comprobante de transferencia es obligatorio.');
        return;
      }
    }

    const payload = {
      usuario_id: authUser.id,
      nombre: nombreInput?.value?.trim() || '',
      apellido: apellidoInput?.value?.trim() || '',
      cedula_identidad: cedulaInput?.value?.trim() || '',
      telefono: telefonoInput?.value?.trim() || '',
      direccion: direccionInput?.value?.trim() || '',
      correo: correoInput?.value?.trim() || '',
      fecha_nacimiento: fechaNacimientoInput?.value?.trim() || null,
      estado: estadoSelect?.value || 'activo',
      foto: 'cliente_default.jpg',
      peso: pesoInput?.value?.trim() ? Number(pesoInput.value.trim()) : null,
      altura: alturaInput?.value?.trim() ? Number(alturaInput.value.trim()) : null,
      condicion_medica: condicionMedicaInput?.value?.trim() || null,
      membresia_id: Number(membresiaSelect.value),
      tipo_pago: tipoPago,
      comprobante_url: null,
    };

    guardarClienteBtn.disabled = true;
    guardarClienteBtn.textContent = 'Guardando...';

    try {
      if (window.loader) loader.show();

      if (tipoPago === 'transferencia') {
        const archivo = comprobanteArchivoCliente?.files?.[0];
        comprobanteUrl = await subirComprobanteFirebase(archivo);
        payload.comprobante_url = comprobanteUrl;
      }

      const resp = await fetch(`${API_BASE_URL}/clientes`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        if (data?.errors && typeof data.errors === 'object') {
          clearFieldError('cedulaError');
          clearFieldError('telefonoError');
          clearFieldError('correoError');
          clearFieldError('pesoError');
          clearFieldError('alturaError');
          clearFieldError('comprobanteError');

const translate = (msg, field) => {
  if (!msg) return '';
  const m = String(msg).trim();

  // ✅ Laravel devolviendo la key de traducción
  if (m === 'validation.unique' || /validation\.unique/i.test(m)) {
    if (field === 'cedula_identidad' || field === 'cedula') return 'La cédula ya está registrada.';
    if (field === 'telefono') return 'El teléfono ya está registrado.';
    if (field === 'correo' || field === 'correoCliente' || field === 'email') return 'El correo ya está registrado.';
    return 'Este valor ya está registrado.';
  }

  // ✅ Caso típico cuando Laravel manda el mensaje en inglés
  if (/already been taken|has already been taken/i.test(m)) {
    if (field === 'cedula_identidad') return 'La cédula ya está registrada.';
    if (field === 'telefono') return 'El teléfono ya está registrado.';
    if (field === 'correo' || field === 'email') return 'El correo ya está registrado.';
    return 'El valor ya está en uso.';
  }

  return m;
};


          const errors = data.errors;
          const otros = [];

          Object.keys(errors).forEach((k) => {
            const firstMsg = Array.isArray(errors[k]) ? errors[k][0] : String(errors[k]);
            const translated = translate(firstMsg, k);

            if (k === 'cedula_identidad' || k === 'cedula') showFieldError('cedulaError', translated || firstMsg);
            else if (k === 'telefono') showFieldError('telefonoError', translated || firstMsg);
            else if (k === 'correo' || k === 'correoCliente' || k === 'email') showFieldError('correoError', translated || firstMsg);
            else if (k === 'peso') showFieldError('pesoError', translated || firstMsg);
            else if (k === 'altura') showFieldError('alturaError', translated || firstMsg);
            else otros.push(translated || firstMsg);
          });

          if (otros.length) showError(otros.join(' '));
        } else {
          showError(data.message || 'Error al crear cliente');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // ✅ recargar desde página 1 para ver el nuevo
// ✅ recargar desde página 1 para ver el nuevo
clienteForm.reset();
nuevoClienteCard?.classList.add('hidden');
comprobanteWrapperCliente?.classList.add('hidden');
if (tipoPagoCliente) tipoPagoCliente.value = 'efectivo';

// ✅ dejar todo como al inicio (como si recargó)
if (buscarInput) buscarInput.value = '';
if (filtroEstadoMembresia) filtroEstadoMembresia.value = 'all';
if (window.resetClientesVista) window.resetClientesVista();

await resetYPrimeraPagina();


    } catch (err) {
      console.error(err);
      showError(err.message || 'Error de conexión al crear cliente.');
    } finally {
      if (window.loader) loader.hide();
      guardarClienteBtn.disabled = false;
      guardarClienteBtn.textContent = 'Guardar cliente';
    }
  });

  // =========================
  //  CARGA INICIAL (solo lista)
  // =========================
  resetYPrimeraPagina();
});
