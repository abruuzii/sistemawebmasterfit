let chartClientes = null;
let chartIngresos = null;

function token() {
  return localStorage.getItem('authToken');
}

function showErr(msg) {
  const el = document.getElementById('repError');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function clearErr() {
  const el = document.getElementById('repError');
  if (!el) return;
  el.classList.add('hidden');
  el.textContent = '';
}

// ✅ fetchJSON robusto: si viene HTML/texto también muestra algo útil
async function fetchJSON(url) {
  try {
    if (window.loader) loader.show();

    const resp = await fetch(url, {
      headers: { Authorization: 'Bearer ' + token(), Accept: 'application/json' }
    });

    const contentType = resp.headers.get('content-type') || '';

    let data;
    if (contentType.includes('application/json')) {
      data = await resp.json().catch(() => ({}));
    } else {
      const text = await resp.text().catch(() => '');
      data = { message: text ? text.slice(0, 300) : 'Server Error' };
    }

    if (!resp.ok) throw new Error(data.message || 'Error');
    return data;
  } finally {
    if (window.loader) loader.hide();
  }
}

function toCSV(headers, rows) {
  const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const body = rows.map(r => r.map(esc).join(',')).join('\n');
  return headers.map(esc).join(',') + '\n' + body;
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function generateColors(n) {
  const palette = [
    '#60A5FA', '#34D399', '#F97316', '#F87171', '#C084FC',
    '#FDE68A', '#A3E635', '#60A5FA', '#FB7185', '#7DD3FC'
  ];
  const colors = [];
  for (let i = 0; i < n; i++) colors.push(palette[i % palette.length]);
  return colors;
}

function renderChart(canvasId, labels, values, title, existingChart, chartType = 'bar') {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  if (existingChart) existingChart.destroy();

  if (chartType === 'pie') {
    const colors = generateColors(values.length || labels.length || 1);
    return new Chart(ctx, {
      type: 'pie',
      data: { labels, datasets: [{ label: title, data: values, backgroundColor: colors }] },
      options: { responsive: true, plugins: { legend: { display: true } } }
    });
  }

  return new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: title, data: values, backgroundColor: generateColors(values.length) }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnCargar');
  const fromEl = document.getElementById('from');
  const toEl = document.getElementById('to');
  const groupEl = document.getElementById('group');

  // defaults: últimos 30 días
  const today = new Date();
  const toISO = (d) => d.toISOString().slice(0, 10);
  const dFrom = new Date(today);
  dFrom.setDate(today.getDate() - 30);

  if (fromEl) fromEl.value = toISO(dFrom);
  if (toEl) toEl.value = toISO(today);

  let lastClientes = null;
  let lastIngresos = null;

  async function loadReports() {
    clearErr();
    const from = fromEl?.value;
    const to = toEl?.value;
    const group = groupEl?.value;

    try {
      // Clientes
      lastClientes = await fetchJSON(`${API_BASE_URL}/reportes/clientes?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&group=${encodeURIComponent(group)}`);
      const totalClientesEl = document.getElementById('totalClientes');
      if (totalClientesEl) totalClientesEl.textContent = lastClientes.total ?? '-';

      const labelsC = Array.isArray(lastClientes.series) ? lastClientes.series.map(x => x.etiqueta) : [];
      const valuesC = Array.isArray(lastClientes.series) ? lastClientes.series.map(x => Number(x.total)) : [];
      const chartTypeVal = (document.getElementById('chartType')?.value) || 'bar';
      chartClientes = renderChart('chartClientes', labelsC, valuesC, 'Clientes', chartClientes, chartTypeVal);

      // Ingresos
      lastIngresos = await fetchJSON(`${API_BASE_URL}/reportes/ingresos?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&group=${encodeURIComponent(group)}`);
      const totalIngresosEl = document.getElementById('totalIngresos');
      if (totalIngresosEl) totalIngresosEl.textContent = Number(lastIngresos.total || 0).toFixed(2);

      const labelsI = Array.isArray(lastIngresos.series) ? lastIngresos.series.map(x => x.etiqueta) : [];
      const valuesI = Array.isArray(lastIngresos.series) ? lastIngresos.series.map(x => Number(x.total)) : [];
      const chartTypeVal2 = (document.getElementById('chartType')?.value) || 'bar';
      chartIngresos = renderChart('chartIngresos', labelsI, valuesI, 'Ingresos', chartIngresos, chartTypeVal2);

    } catch (e) {
      showErr(e.message);
      console.error(e);
    }
  }

  // Si el botón existe, usarlo; si no, cargar automáticamente.
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      loadReports();
    });
  } else {
    loadReports().catch((e) => console.error('Error auto-loading reports:', e));
  }

  function renderCurrentCharts() {
    const chartTypeVal = (document.getElementById('chartType')?.value) || 'bar';

    if (!lastClientes || !lastIngresos) {
      loadReports().catch((e) => console.error('Error loading reports before render:', e));
      return;
    }

    const labelsC = Array.isArray(lastClientes.series) ? lastClientes.series.map(x => x.etiqueta) : [];
    const valuesC = Array.isArray(lastClientes.series) ? lastClientes.series.map(x => Number(x.total)) : [];
    chartClientes = renderChart('chartClientes', labelsC, valuesC, 'Clientes', chartClientes, chartTypeVal);

    const labelsI = Array.isArray(lastIngresos.series) ? lastIngresos.series.map(x => x.etiqueta) : [];
    const valuesI = Array.isArray(lastIngresos.series) ? lastIngresos.series.map(x => Number(x.total)) : [];
    chartIngresos = renderChart('chartIngresos', labelsI, valuesI, 'Ingresos', chartIngresos, chartTypeVal);
  }

  const chartTypeEl = document.getElementById('chartType');
  if (chartTypeEl) chartTypeEl.addEventListener('change', renderCurrentCharts);

  function debounce(fn, wait = 300) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  const debouncedLoad = debounce(() => loadReports(), 300);
  fromEl?.addEventListener('change', debouncedLoad);
  toEl?.addEventListener('change', debouncedLoad);
  groupEl?.addEventListener('change', debouncedLoad);

  // Export CSV (Clientes / Ingresos)
  document.getElementById('exportClientes')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!lastClientes) return showErr('Primero carga el reporte de clientes.');
    const headers = ['fecha', 'total_clientes'];
    const rows = (lastClientes.series || []).map(x => [x.etiqueta, x.total]);
    downloadFile(`reporte_clientes_${lastClientes.from}_a_${lastClientes.to}.csv`, toCSV(headers, rows));
  });

  document.getElementById('exportIngresos')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!lastIngresos) return showErr('Primero carga el reporte de ingresos.');
    const headers = ['fecha', 'total_ingresos'];
    const rows = (lastIngresos.series || []).map(x => [x.etiqueta, x.total]);
    downloadFile(`reporte_ingresos_${lastIngresos.from}_a_${lastIngresos.to}.csv`, toCSV(headers, rows));
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token(), Accept: 'application/json' }
      });
    } catch {}
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    window.location.href = 'login.html';
  });

  // ==============================
  // ✅ Filtrar Pagos por Usuario
  // ==============================
  let lastPagosUsuario = null;

  const puUser = document.getElementById('pu_user');
  const puFrom = document.getElementById('pu_from');
  const puTo = document.getElementById('pu_to');
  const puVer = document.getElementById('pu_ver');
  const puExport = document.getElementById('pu_export');
  const puErr = document.getElementById('pu_error');
  const puTotal = document.getElementById('pu_total');
  const puTotalMonto = document.getElementById('pu_total_monto');
  const puTbody = document.getElementById('pu_tbody');

  function showPuErr(msg) {
    if (!puErr) return;
    puErr.textContent = msg;
    puErr.classList.remove('hidden');
  }
  function clearPuErr() {
    if (!puErr) return;
    puErr.classList.add('hidden');
    puErr.textContent = '';
  }

  // ✅ (NUEVO) blindaje total contra submit/recarga en esta página
  // Si por cualquier razón hay un <form> envolviendo, bloqueamos submit.
  // (No afecta tu diseño, solo evita recargas)
  document.addEventListener('submit', (e) => {
    // bloquea submit solo si el submit viene del bloque de pagos por usuario
    if (e.target?.querySelector?.('#pu_ver') || e.target?.querySelector?.('#pu_export')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  }, true);

  // ✅ (NUEVO) si presionan Enter en los inputs del filtro, NO submit (solo ejecuta ver)
  [puUser, puFrom, puTo].forEach(el => {
    el?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        verPagosPorUsuario().catch(err => showPuErr(err.message || 'Error al cargar.'));
      }
    }, true);
  });

  async function loadUsuariosPU() {
    const users = await fetchJSON(`${API_BASE_URL}/reportes/usuarios`);
    if (!puUser) return;

    puUser.innerHTML = `<option value="">Seleccionar usuario...</option>`;
    users.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = u.label;
      puUser.appendChild(opt);
    });
  }

  // Defaults del filtro usuario = mismo rango del reporte general
  if (puFrom) puFrom.value = fromEl?.value || '';
  if (puTo) puTo.value = toEl?.value || '';

  async function verPagosPorUsuario() {
    clearPuErr();

    const user_id = puUser?.value;
    const from = puFrom?.value;
    const to = puTo?.value;

    if (!user_id) return showPuErr('Selecciona un usuario.');
    if (!from || !to) return showPuErr('Selecciona un rango de fechas.');

    const url =
      `${API_BASE_URL}/reportes/pagos-por-usuario` +
      `?user_id=${encodeURIComponent(user_id)}` +
      `&from=${encodeURIComponent(from)}` +
      `&to=${encodeURIComponent(to)}`;

    const data = await fetchJSON(url);
    lastPagosUsuario = data;

    if (puTotal) puTotal.textContent = data.total ?? 0;
    if (puTotalMonto) puTotalMonto.textContent = Number(data.total_monto || 0).toFixed(2);

    if (puTbody) puTbody.innerHTML = '';
    (data.rows || []).forEach(r => {
      const tr = document.createElement('tr');
      tr.className = 'border-b';

      // Formatear fecha sin hora - maneja múltiples formatos
      let fechaFormato = '';
      if (r.fecha) {
        // Intenta separar por 'T' (ISO format)
        let fechaSolo = r.fecha.split('T')[0];
        // Si no funciona, intenta separar por espacio
        if (!fechaSolo || fechaSolo === r.fecha) {
          fechaSolo = r.fecha.split(' ')[0];
        }
        fechaFormato = fechaSolo;
      }

      const cols = [
        r.cliente,
        r.cedula,
        r.correo_cliente,
        r.membresia,
        fechaFormato,
        r.tipo_pago,
        r.monto,
      ];

      cols.forEach(v => {
        const td = document.createElement('td');
        td.className = 'px-3 py-2 whitespace-nowrap';
        td.textContent = v ?? '';
        tr.appendChild(td);
      });

      puTbody?.appendChild(tr);
    });
  }

  function exportPagosUsuarioCSV() {
    clearPuErr();
    if (!lastPagosUsuario) return showPuErr('Primero presiona "Ver" para cargar la tabla.');

    const headers = ['cliente','cedula','correo_cliente','membresia','fecha','tipo_pago','monto'];
    const rows = (lastPagosUsuario.rows || []).map(r => headers.map(h => r[h]));

    downloadFile(
      `pagos_usuario_${lastPagosUsuario.user_id}_${lastPagosUsuario.from}_a_${lastPagosUsuario.to}.csv`,
      toCSV(headers, rows)
    );
  }

  // ✅ (CAMBIO) Listener en CAPTURE + stopImmediatePropagation (evita que otro script haga recarga)
  puVer?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    verPagosPorUsuario().catch(err => showPuErr(err.message || 'Error al cargar.'));
  }, true);

  puExport?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    exportPagosUsuarioCSV();
  }, true);

  loadUsuariosPU().catch(() => showPuErr('No se pudieron cargar los usuarios.'));
});
