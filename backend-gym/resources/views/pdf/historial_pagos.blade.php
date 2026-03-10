<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Comprobante</title>
<style>
  :root{
    --accent:#20d3ff;
    --accent2:#0aa6ff;
    --bg0:#000000;
    --bg1:#06131a;
  }

  *{ box-sizing:border-box; }
  @page{ margin:14mm; }

  body{
    margin:0;
    font-family:Arial, sans-serif;
    background:var(--bg0);
    padding:18px;
    color:#eef6ff;
  }

  .sheet{
    background:
      radial-gradient(900px 520px at 18% 12%, rgba(32,211,255,.18), transparent 60%),
      radial-gradient(650px 420px at 85% 18%, rgba(10,166,255,.10), transparent 55%),
      linear-gradient(145deg, var(--bg0), var(--bg1));
    border-radius:18px;
    padding:22px;
    position:relative;
    overflow:hidden;
    box-shadow:0 10px 30px rgba(0,0,0,.55);
    border:1px solid rgba(255,255,255,.06);
  }

  .accentLine{
    position:absolute; left:18px; top:92px;
    width:2px; height:430px;
    background:rgba(32,211,255,.55);
    border-radius:2px;
  }

  .top{ display:flex; justify-content:space-between; align-items:flex-start; gap:16px; }

  /* ✅ Logo más grande y alineado con el título */
  .brand{
    display:flex;
    align-items:center;
    gap:12px;
  }
  .brand img{
    width:74px;
    height:74px;
    border-radius:14px;
    object-fit:cover;
    border:1px solid rgba(255,255,255,.10);
    display:block;
  }
  .brandTitle{
    margin:0;
    font-weight:900;
    letter-spacing:.10em;
    font-size:13px;
    opacity:.95;
    line-height:1; /* ayuda a alineación visual con el logo */
  }

  .meta{ text-align:right; font-size:12px; opacity:.92; line-height:1.45; }
  .chip{ display:inline-block; background:#fff; color:#111; padding:4px 8px; border-radius:7px; font-weight:900; margin-right:8px; }
  .meta b{ color:var(--accent); }

  .titleRow{ margin-top:14px; display:flex; justify-content:space-between; align-items:flex-end; gap:16px; }
  .title{ margin:0; font-size:34px; font-weight:950; color:var(--accent); letter-spacing:.04em; }
  .clientBox{
    border-left:3px solid rgba(32,211,255,.65);
    padding-left:12px;
    font-size:12px;
    opacity:.95;
  }

  table{
    width:100%;
    border-collapse:collapse;
    margin-top:18px;
    font-size:12px;
  }

  thead th{
    padding:10px 10px;
    background:#ffffff;
    color:#111;
    text-align:left;
    font-weight:900;
  }

  /* ✅ Monto alineado a la derecha */
  thead th.money{
    background:var(--accent);
    color:#001018;
    width:120px;
    text-align:right;
  }

  tbody td{
    padding:9px 10px;
    border-bottom:1px solid rgba(255,255,255,.10);
    vertical-align:top;
  }
  tbody tr:nth-child(even) td{ background: rgba(255,255,255,.03); }

  /* ✅ Total debajo de la columna Monto (tfoot) y fondo blanco */
  tfoot td{
    padding:10px 10px;
    border-top:1px solid rgba(255,255,255,.10);
  }
  .totalLabel{
    text-align:right;
    opacity:.85;
    font-weight:700;
  }
  .totalCell{
    background:#ffffff;
    color:#111;
    text-align:right;
    font-weight:950;
    border-radius:10px;
  }

  .footerRow{
    margin-top:10px;
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:12px;
    font-size:12px;
    opacity:.95;
  }

  .small{ font-size:11px; opacity:.75; margin-top:10px; }
</style>
</head>
<body>
  <div class="sheet">
    <div class="accentLine"></div>

    @php
      $nombre = ($cliente->nombre ?? '-') . (isset($cliente->apellido) ? (' ' . $cliente->apellido) : '');
      $cedula = $cliente->cedula_identidad ?? ($cliente->cedula ?? '-');
      $correo = $cliente->correo ?? '-';

      // ✅ "Todas las fechas" si no hay desde/hasta
      $rangoTxt = (empty($desde) && empty($hasta))
        ? 'Todas las fechas'
        : (($desde ?: '---') . ' a ' . ($hasta ?: '---'));

      $numero = time();
      $total = collect($pagos)->sum(fn($x) => (float)($x->monto ?? 0));
    @endphp

    <div class="top">
      <div class="brand">
        @if(!empty($logoUrl))
          <img src="{{ $logoUrl }}" alt="MasterFit">
        @endif
        <p class="brandTitle">GIMNASIO MASTERFIT</p>
      </div>

      <div class="meta">
        <div><span class="chip">N° {{ $numero }}</span></div>
        <div><b>Desde/Hasta:</b> {{ $rangoTxt }}</div>
        <div><b>Emitido:</b> {{ now('America/Guayaquil')->format('Y-m-d H:i') }}</div>
      </div>
    </div>

    <div class="titleRow">
      <h1 class="title">COMPROBANTE</h1>
      <div class="clientBox">
        <div><b>Cliente:</b> {{ trim($nombre) ?: '-' }}</div>
        <div><b>Cédula:</b> {{ $cedula }}</div>
        <div><b>Correo:</b> {{ $correo }}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Membresía</th>
          <th>Tipo pago</th>
          <th class="money">Monto</th>
        </tr>
      </thead>

      <tbody>
        @forelse($pagos as $p)
          <tr>
            <td>{{ \Illuminate\Support\Carbon::parse($p->fecha ?? $p->created_at)->format('Y-m-d') }}</td>
            <td>{{ optional($p->membresia)->nombre ?? '-' }}</td>
            <td style="text-transform:capitalize">{{ $p->tipo_pago ?? '-' }}</td>
            <td style="text-align:right">$ {{ number_format((float)($p->monto ?? 0), 2) }}</td>
          </tr>
        @empty
          <tr>
            <td colspan="4" style="padding:14px; opacity:.75;">No hay pagos en este rango.</td>
          </tr>
        @endforelse
      </tbody>

      <tfoot>
        <tr>
          <td colspan="3" class="totalLabel">TOTAL</td>
          <td class="totalCell">$ {{ number_format($total, 2) }}</td>
        </tr>
      </tfoot>
    </table>

    <div class="footerRow">
      <div class="small">Comprobante interno del gimnasio (pago / asistencia).</div>
    </div>

  </div>
</body>
</html>
