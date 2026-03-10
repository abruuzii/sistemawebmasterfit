// js/clientes_vencimientos.js
document.addEventListener('DOMContentLoaded', () => {
  const errorBox = document.getElementById('errorBox');

  const tabPorVencer = document.getElementById('tabPorVencer');
  const tabVencidos = document.getElementById('tabVencidos');

  const panelPorVencer = document.getElementById('panelPorVencer');
  const panelVencidos = document.getElementById('panelVencidos');

  const tbodyPorVencer = document.getElementById('tbodyPorVencer');
  const tbodyVencidos = document.getElementById('tbodyVencidos');

  const countPorVencerEl = document.getElementById('countPorVencer');
  const countVencidosEl = document.getElementById('countVencidos');

  const token =
    localStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    localStorage.getItem('access_token');

  if (!token) {
    window.location.href = 'login.html';
    return;
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

  function setActiveTab(which) {
    const active =
      'px-4 py-2 text-sm font-medium border-b-2 border-blue-500 text-blue-600 bg-blue-50';
    const inactive =
      'px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700';

    if (which === 'porVencer') {
      tabPorVencer.className = active;
      tabVencidos.className = inactive;
      panelPorVencer.classList.remove('hidden');
      panelVencidos.classList.add('hidden');
    } else {
      tabVencidos.className = active;
      tabPorVencer.className = inactive;
      panelVencidos.classList.remove('hidden');
      panelPorVencer.classList.add('hidden');
    }
  }

  tabPorVencer?.addEventListener('click', () => setActiveTab('porVencer'));
  tabVencidos?.addEventListener('click', () => setActiveTab('vencidos'));

  function actionDetalle(clienteId) {
    return `
      <a href="cliente_detalle.html?id=${encodeURIComponent(clienteId)}"
         class="inline-flex items-center px-2 py-1 rounded bg-slate-900 text-white hover:bg-slate-800 text-xs">
        Ver
      </a>
    `;
  }

  function renderEmptyRow(tbody, colSpan, text) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = colSpan;
    td.className = 'px-3 py-3 text-center text-gray-500';
    td.textContent = text;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  function renderPorVencer(lista, total = null) {
    tbodyPorVencer.innerHTML = '';

    const shown = Array.isArray(lista) ? lista.length : 0;
    if (countPorVencerEl) {
      if (typeof total === 'number' && !Number.isNaN(total)) {
        countPorVencerEl.textContent = `Mostrando ${shown} de ${total}`;
      } else {
        countPorVencerEl.textContent = `${shown} cliente(s)`;
      }
    }

    if (!Array.isArray(lista) || lista.length === 0) {
      renderEmptyRow(tbodyPorVencer, 8, 'No hay clientes por vencer.');
      return;
    }

    lista.forEach((c) => {
      const nombre = `${c.nombre ?? ''} ${c.apellido ?? ''}`.trim() || '-';
      const cedula = c.cedula ?? c.cedula_identidad ?? '-';
      const correo = c.correo ?? '-';
      const membresia = c.membresia ?? c.membresia_nombre ?? '-';
      const ultimoPago = c.fecha_ultimo_pago ?? '-';
      const fechaFin = c.fecha_fin ?? '-';

      const dias = (c.dias_restantes ?? null);

      let badgeClass = 'inline-flex px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800';
      let txt = '-';

      if (dias !== null && dias !== undefined) {
        const d = Number(dias);
        if (!Number.isNaN(d)) {
          if (d === 0) txt = 'Vence hoy';
          else if (d > 0) {
            if (d <= 2) badgeClass = 'inline-flex px-2 py-1 rounded-full text-xs bg-red-100 text-red-800';
            txt = `Faltan ${d} día(s)`;
          } else {
            badgeClass = 'inline-flex px-2 py-1 rounded-full text-xs bg-red-100 text-red-800';
            txt = `Vencido hace ${Math.abs(d)} día(s)`;
          }
        }
      }

      const tr = document.createElement('tr');
      tr.className = 'border-b';
      tr.innerHTML = `
        <td class="px-3 py-2">${nombre}</td>
        <td class="px-3 py-2">${cedula}</td>
        <td class="px-3 py-2">${correo}</td>
        <td class="px-3 py-2">${membresia}</td>
        <td class="px-3 py-2">${ultimoPago}</td>
        <td class="px-3 py-2">${fechaFin}</td>
        <td class="px-3 py-2"><span class="${badgeClass}">${txt}</span></td>
        <td class="px-3 py-2">${actionDetalle(c.cliente_id ?? c.id)}</td>
      `;
      tbodyPorVencer.appendChild(tr);
    });
  }

  function renderVencidos(lista, total = null) {
    tbodyVencidos.innerHTML = '';

    const shown = Array.isArray(lista) ? lista.length : 0;
    if (countVencidosEl) {
      if (typeof total === 'number' && !Number.isNaN(total)) {
        countVencidosEl.textContent = `Mostrando ${shown} de ${total}`;
      } else {
        countVencidosEl.textContent = `${shown} cliente(s)`;
      }
    }

    if (!Array.isArray(lista) || lista.length === 0) {
      renderEmptyRow(tbodyVencidos, 8, 'No hay clientes vencidos.');
      return;
    }

    // Ordenar por días vencidos de menor a mayor
    lista.sort((a, b) => {
      const diasA = Number(a.dias_vencidos ?? 0);
      const diasB = Number(b.dias_vencidos ?? 0);
      return diasA - diasB;
    });

    lista.forEach((c) => {
      const nombre = `${c.nombre ?? ''} ${c.apellido ?? ''}`.trim() || '-';
      const cedula = c.cedula ?? c.cedula_identidad ?? '-';
      const correo = c.correo ?? '-';
      const membresia = c.membresia ?? c.membresia_nombre ?? '-';
      const ultimoPago = c.fecha_ultimo_pago ?? '-';
      const fechaFin = c.fecha_fin ?? '-';

      const dv = (c.dias_vencidos ?? null);
      const diasTxt = (dv !== null && dv !== undefined && !Number.isNaN(Number(dv)))
        ? `Vencido hace ${Number(dv)} día(s)`
        : '-';

      const badgeClass = 'inline-flex px-2 py-1 rounded-full text-xs bg-red-100 text-red-800';

      const tr = document.createElement('tr');
      tr.className = 'border-b';
      tr.innerHTML = `
        <td class="px-3 py-2">${nombre}</td>
        <td class="px-3 py-2">${cedula}</td>
        <td class="px-3 py-2">${correo}</td>
        <td class="px-3 py-2">${membresia}</td>
        <td class="px-3 py-2">${ultimoPago}</td>
        <td class="px-3 py-2">${fechaFin}</td>
        <td class="px-3 py-2"><span class="${badgeClass}">${diasTxt}</span></td>
        <td class="px-3 py-2">${actionDetalle(c.cliente_id ?? c.id)}</td>
      `;
      tbodyVencidos.appendChild(tr);
    });
  }

  async function cargar() {
    clearError();
    try {
      if (window.loader) loader.show();

      const resp = await fetch(`${API_BASE_URL}/clientes/vencimientos-home`, {
        headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.message || 'Error al cargar vencimientos');

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

      const porVencerInfo = extractListAndTotal(data.por_vencer);
      const vencidosInfo = extractListAndTotal(data.vencidos);

      // fallback: algunos endpoints devuelven totales en campos separados
      porVencerInfo.total = porVencerInfo.total ?? (data.por_vencer_total ?? data.por_vencer_count ?? data.total_por_vencer ?? null);
      vencidosInfo.total = vencidosInfo.total ?? (data.vencidos_total ?? data.vencidos_count ?? data.total_vencidos ?? null);

      renderPorVencer(porVencerInfo.list, porVencerInfo.total);
      renderVencidos(vencidosInfo.list, vencidosInfo.total);
    } catch (e) {
      console.error(e);
      showError(e.message || 'Error inesperado.');
      renderPorVencer([]);
      renderVencidos([]);
    } finally {
      if (window.loader) loader.hide();
    }
  }

  setActiveTab('porVencer');
  cargar();
});
