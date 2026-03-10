// js/dashboard.js
document.addEventListener('DOMContentLoaded', () => {
  const dashError = document.getElementById('dashError');
  const totalMembresiasEl = document.getElementById('totalMembresias');
  const totalClientesEl = document.getElementById('totalClientes');
  const ingresosMesEl = document.getElementById('ingresosMes');

  const porVencerBody = document.getElementById('porVencerBody');
  const countPorVencer = document.getElementById('countPorVencer');

  const vencidosBody = document.getElementById('vencidosBody');
  const countVencidos = document.getElementById('countVencidos');

  const logoutBtn = document.getElementById('logoutBtn');

  const token =
    localStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    localStorage.getItem('access_token');

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  const headers = {
    Authorization: 'Bearer ' + token,
    Accept: 'application/json',
  };

  function showError(msg) {
    if (!dashError) return;
    dashError.textContent = msg;
    dashError.classList.remove('hidden');
  }

  function clearError() {
    if (!dashError) return;
    dashError.textContent = '';
    dashError.classList.add('hidden');
  }

  function renderCurrentDate() {
    const el = document.getElementById('currentDateDisplay');
    if (!el) return;
    try {
      const now = new Date();
      const formatted = now.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      el.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } catch {
      el.textContent = new Date().toLocaleDateString();
    }
  }

  // ==========================
  // Helpers robustos (por si cambia el shape)
  // ==========================
  function getClienteId(row) {
    return row?.cliente_id ?? row?.id ?? row?.cliente?.id ?? null;
  }

  function getClienteFullName(row) {
    if (!row) return '-';
    const nombre = row?.nombre ?? row?.cliente?.nombre ?? '';
    const apellido = row?.apellido ?? row?.cliente?.apellido ?? '';
    const full = `${nombre} ${apellido}`.trim();
    return full || row?.full_name || row?.nombre_completo || '-';
  }

  function getCedula(row) {
    return row?.cedula ?? row?.cedula_identidad ?? row?.cliente?.cedula_identidad ?? '-';
  }

  function getCorreo(row) {
    return row?.correo ?? row?.email ?? row?.cliente?.correo ?? '-';
  }

  function getMembresiaNombre(row) {
    return row?.membresia?.nombre ?? row?.membresia_nombre ?? row?.membresia ?? '-';
  }

  function getFechaUltimoPago(row) {
    return row?.fecha_ultimo_pago ?? row?.ultimo_pago ?? row?.fecha_pago ?? '-';
  }

  function getFechaInicio(row) {
    return row?.fecha_inicio ?? row?.fecha_ultimo_pago ?? row?.ultimo_pago ?? row?.fecha_pago ?? '-';
  }

  // Helpers for robust YMD handling and inclusive end-date calculation
  function onlyYMD(x) {
    if (!x) return null;
    const s = String(x);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
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
    d.setDate(d.getDate() + Math.max(0, n - 1));
    return d.toISOString().slice(0, 10);
  }

  function addMonthsEndYMD(ymd, meses) {
    if (!ymd) return null;
    const d = new Date(ymd + 'T00:00:00');
    const n = Number(meses || 0);
    d.setMonth(d.getMonth() + Math.max(0, n));
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  function calcularFechaFinFromRow(row) {
    // If backend already provides a clean YMD fecha_fin, use it
    const ya = onlyYMD(row?.fecha_fin ?? row?.fin_membresia ?? row?.fecha_fin_membresia);
    if (ya) return ya;

    // Determine start date from available fields: prefer fecha_inicio, then fecha_ultimo_pago
    const inicio = onlyYMD(row?.fecha_inicio ?? row?.fecha_ultimo_pago ?? row?.ultimo_pago ?? row?.fecha_pago);
    if (!inicio) return null;

    // Try to get duration from nested membership or direct fields
    const mem = row?.membresia ?? row;
    const durDias = mem?.duracion_dias ?? mem?.duracion ?? mem?.duracion_dia ?? null;
    const durMeses = mem?.duracion_meses ?? mem?.duracion_mes ?? null;

    if (durDias && Number(durDias) > 0) return addDaysEndYMD(inicio, durDias);
    if (durMeses && Number(durMeses) > 0) return addMonthsEndYMD(inicio, durMeses);

    return null;
  }

  function getFechaFin(row) {
    return calcularFechaFinFromRow(row) || (row?.fecha_fin ?? row?.fin_membresia ?? row?.fecha_fin_membresia ?? '-');
  }

  // positivo = faltan, negativo = vencido
  function getDiasRestantes(row) {
    if (row?.dias_restantes !== undefined && row?.dias_restantes !== null && row?.dias_restantes !== '') {
      const n = Number(row.dias_restantes);
      if (!Number.isNaN(n)) return n;
    }
    if (row?.dias_vencidos !== undefined && row?.dias_vencidos !== null && row?.dias_vencidos !== '') {
      const n = Number(row.dias_vencidos);
      if (!Number.isNaN(n)) return -Math.abs(n);
    }
    if (row?.dias_vencido !== undefined && row?.dias_vencido !== null && row?.dias_vencido !== '') {
      const n = Number(row.dias_vencido);
      if (!Number.isNaN(n)) return -Math.abs(n);
    }
    return null;
  }

  function detalleBtnHtml(row) {
    const id = getClienteId(row);
    return id
      ? `<a href="cliente_detalle.html?id=${encodeURIComponent(id)}"
            class="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">Ver</a>`
      : `<span class="text-xs text-gray-400">-</span>`;
  }

  function safeArray(x) {
    return Array.isArray(x) ? x : [];
  }

  function renderTablaPorVencer(clientes, total = null) {
    if (!porVencerBody) return;
    porVencerBody.innerHTML = '';
    
    // Limit to 10 clients for display
    const limitedClientes = Array.isArray(clientes) ? clientes.slice(0, 10) : [];
    const shown = limitedClientes.length;
    
    if (countPorVencer) {
      if (typeof total === 'number' && !Number.isNaN(total)) {
        countPorVencer.textContent = `Mostrando ${shown} de ${total}`;
      } else {
        countPorVencer.textContent = `${shown} cliente(s)`;
      }
    }

    if (!Array.isArray(limitedClientes) || limitedClientes.length === 0) {
      porVencerBody.innerHTML = `
        <tr><td colspan="8" class="px-3 py-3 text-center text-gray-500">
          No hay clientes con membresía por vencer.
        </td></tr>`;
      return;
    }

    limitedClientes.forEach((row) => {
      const dias = getDiasRestantes(row);
      let diasTxt = '-';
      let badgeColor = 'inline-flex px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800';

      if (dias !== null) {
        if (dias < 0) {
          badgeColor = 'inline-flex px-2 py-1 rounded-full text-xs bg-red-100 text-red-800';
          diasTxt = `Vencido hace ${Math.abs(dias)} día(s)`;
        } else if (dias === 0) {
          diasTxt = 'Vence hoy';
        } else {
          if (dias <= 2) badgeColor = 'inline-flex px-2 py-1 rounded-full text-xs bg-red-100 text-red-800';
          diasTxt = `${dias} día(s)`;
        }
      }

      const tr = document.createElement('tr');
      tr.className = 'border-b';
      tr.innerHTML = `
        <td class="px-3 py-2">${getClienteFullName(row)}</td>
        <td class="px-3 py-2">${getCedula(row)}</td>
        <td class="px-3 py-2">${getCorreo(row)}</td>
        <td class="px-3 py-2">${getMembresiaNombre(row)}</td>
        <td class="px-3 py-2">${getFechaInicio(row)}</td>
        <td class="px-3 py-2">${getFechaFin(row)}</td>
        <td class="px-3 py-2"><span class="${badgeColor}">${diasTxt}</span></td>
        <td class="px-3 py-2">${detalleBtnHtml(row)}</td>
      `;
      porVencerBody.appendChild(tr);
    });
  }

  function renderTablaVencidos(clientes, total = null) {
    if (!vencidosBody) return;
    vencidosBody.innerHTML = '';
    
    // Limit to 10 clients for display
    const limitedClientes = Array.isArray(clientes) ? clientes.slice(0, 10) : [];
    const shown = limitedClientes.length;
    
    if (countVencidos) {
      if (typeof total === 'number' && !Number.isNaN(total)) {
        countVencidos.textContent = `Mostrando ${shown} de ${total}`;
      } else {
        countVencidos.textContent = `${shown} cliente(s)`;
      }
    }

    if (!Array.isArray(limitedClientes) || limitedClientes.length === 0) {
      vencidosBody.innerHTML = `
        <tr><td colspan="8" class="px-3 py-3 text-center text-gray-500">
          No hay clientes con membresía vencida.
        </td></tr>`;
      return;
    }

    limitedClientes.forEach((row) => {
      const dias = getDiasRestantes(row);
      let diasTxt = '-';
      const badgeColor = 'inline-flex px-2 py-1 rounded-full text-xs bg-red-100 text-red-800';

      if (dias !== null) {
        if (dias < 0) diasTxt = `Vencido hace ${Math.abs(dias)} día(s)`;
        else if (dias === 0) diasTxt = 'Vence hoy';
        else diasTxt = `Faltan ${dias} día(s)`;
      } else if (row?.dias_vencidos != null) {
        diasTxt = `Vencido hace ${row.dias_vencidos} día(s)`;
      }

      const tr = document.createElement('tr');
      tr.className = 'border-b';
      tr.innerHTML = `
        <td class="px-3 py-2">${getClienteFullName(row)}</td>
        <td class="px-3 py-2">${getCedula(row)}</td>
        <td class="px-3 py-2">${getCorreo(row)}</td>
        <td class="px-3 py-2">${getMembresiaNombre(row)}</td>
        <td class="px-3 py-2">${getFechaInicio(row)}</td>
        <td class="px-3 py-2">${getFechaFin(row)}</td>
        <td class="px-3 py-2"><span class="${badgeColor}">${diasTxt}</span></td>
        <td class="px-3 py-2">${detalleBtnHtml(row)}</td>
      `;
      vencidosBody.appendChild(tr);
    });
  }

  // ==========================
  // ✅ Carga única
  // ==========================
  init();

  async function init() {
    clearError();
    renderCurrentDate();

    try {
      if (window.loader?.show) window.loader.show();

      // Fetch dashboard summary data
      const respDashboard = await fetch(`${API_BASE_URL}/dashboard/home`, { headers });
      const dataDashboard = await respDashboard.json().catch(() => ({}));

      if (!respDashboard.ok) throw new Error(dataDashboard.message || 'Error al cargar el dashboard');

      // Fetch vencimientos data for tables
      const respVenc = await fetch(`${API_BASE_URL}/clientes/vencimientos-home`, { headers });
      const dataVenc = await respVenc.json().catch(() => ({}));

      if (!respVenc.ok) throw new Error(dataVenc.message || 'Error al cargar vencimientos');

      // tarjetas
      if (ingresosMesEl) {
        ingresosMesEl.textContent = dataDashboard.ingresos_mes != null
          ? `$ ${Number(dataDashboard.ingresos_mes).toFixed(2)}`
          : '$ -';
      }

      if (totalMembresiasEl) {
        totalMembresiasEl.textContent = dataDashboard.total_membresias != null ? `${dataDashboard.total_membresias}` : '-';
      }

      if (totalClientesEl) {
        totalClientesEl.textContent = dataDashboard.clientes_activos != null ? `${dataDashboard.clientes_activos}` : '-';
      }

      // tablas
      function extractListAndTotal(raw) {
        if (Array.isArray(raw)) return { list: raw, total: raw.length };
        if (raw == null) return { list: [], total: 0 };
        if (Array.isArray(raw.data)) {
          const total = raw.total ?? raw.count ?? raw.meta?.total ?? raw.data.length;
          return { list: raw.data, total: Number.isNaN(Number(total)) ? null : Number(total) };
        }
        const arr = Array.isArray(raw.items) ? raw.items : (Array.isArray(raw.rows) ? raw.rows : []);
        if (arr.length) {
          const total = raw.total ?? raw.count ?? raw.meta?.total ?? arr.length;
          return { list: arr, total: Number.isNaN(Number(total)) ? null : Number(total) };
        }
        return { list: Array.isArray(raw) ? raw : [], total: null };
      }

      const porVencerInfo = extractListAndTotal(dataVenc.por_vencer);
      const vencidosInfo = extractListAndTotal(dataVenc.vencidos);

      porVencerInfo.total = porVencerInfo.total ?? (dataVenc.por_vencer_total ?? dataVenc.por_vencer_count ?? dataVenc.total_por_vencer ?? null);
      vencidosInfo.total = vencidosInfo.total ?? (dataVenc.vencidos_total ?? dataVenc.vencidos_count ?? dataVenc.total_vencidos ?? null);

      renderTablaPorVencer(porVencerInfo.list, porVencerInfo.total);
      renderTablaVencidos(vencidosInfo.list, vencidosInfo.total);

    } catch (err) {
      console.error(err);
      showError(err.message || 'Error inesperado al cargar el dashboard.');
    } finally {
      if (window.loader?.hide) window.loader.hide();
    }
  }

  // refresh button
  const refreshBtn = document.getElementById('refreshBtn');
  refreshBtn?.addEventListener('click', () => {
    init();
  });

  // logout
  logoutBtn?.addEventListener('click', async () => {
    try {
      await fetch(`${API_BASE_URL}/logout`, { method: 'POST', headers });
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      window.location.href = 'login.html';
    }
  });
});
