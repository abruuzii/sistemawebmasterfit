<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Cliente;
use App\Models\Transaccion;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;


class ReportesController extends Controller
{
    public function usuariosActivos(Request $request)
{
    $me = $request->user();

    $q = User::query()->where('is_active', 1)
        ->whereIn('rol', ['admin', 'recepcionista']);

    if (($me->rol ?? null) !== 'admin') {
        $q->where('id', $me->id);
    }

    $users = $q->orderBy('nombre')->get(['id','nombre','apellido','rol']);

    $users = $users->map(function ($u) {
        return [
            'id' => $u->id,
            'label' => trim(($u->nombre ?? '').' '.($u->apellido ?? '')).' ('.($u->rol ?? '').')',
        ];
    });

    return response()->json($users);
}
public function pagosPorUsuario(Request $request)
{
    $data = $request->validate([
        'user_id' => 'required|exists:users,id',
        'from'    => 'required|date',
        'to'      => 'required|date|after_or_equal:from',
    ]);

    $me = $request->user();
    $userId = (int)$data['user_id'];

    if (($me->rol ?? null) !== 'admin' && $userId !== (int)$me->id) {
        return response()->json(['message' => 'No autorizado.'], 403);
    }

    $from = Carbon::parse($data['from'])->toDateString();
    $to   = Carbon::parse($data['to'])->toDateString();

    $rows = Transaccion::query()
        ->where('transacciones.tipo', 'pago')
        ->where('transacciones.created_by', $userId)
        ->whereDate('transacciones.fecha', '>=', $from)
        ->whereDate('transacciones.fecha', '<=', $to)
        ->join('clientes as c', 'c.id', '=', 'transacciones.cliente_id')
        ->join('membresias as m', 'm.id', '=', 'transacciones.membresia_id')
        ->orderByDesc('transacciones.fecha')
        ->get([
            'transacciones.fecha',
            'transacciones.monto',
            'transacciones.tipo_pago',
            'm.nombre as membresia',
            DB::raw("CONCAT_WS(' ', c.nombre, c.apellido) as cliente"),
            'c.cedula_identidad as cedula',
            'c.correo as correo_cliente',
        ]);

    return response()->json([
        'from' => $from,
        'to' => $to,
        'user_id' => $userId,
        'total' => $rows->count(),
        'total_monto' => (string) $rows->sum('monto'),
        'rows' => $rows,
    ]);
}

public function historialPagosPdf(Request $request, $cliente)
{
    $desde = $request->query('desde');
    $hasta = $request->query('hasta');

    $c = Cliente::findOrFail($cliente);

    $q = Transaccion::with(['membresia', 'creador'])
        ->where('cliente_id', $c->id)
        ->where('tipo', 'pago');

    if (!empty($desde)) $q->whereDate('fecha', '>=', $desde);
    if (!empty($hasta)) $q->whereDate('fecha', '<=', $hasta);

    $pagos = $q->orderByDesc('fecha')->get();

    $pagos = $pagos->map(function ($t) {
        $u = $t->creador;
        $nombre = trim((($u->nombre ?? $u->name ?? '') . ' ' . ($u->apellido ?? '')));
        $t->registrado_por = $u ? trim($nombre) . (!empty($u->rol) ? " ({$u->rol})" : "") : null;
        return $t;
    });

    $logoUrl = 'https://firebasestorage.googleapis.com/v0/b/sistemagym-4ec4a.firebasestorage.app/o/comprobantes-de-pago%2F435987360_122104082054314557_104584896865871736_n.jpg?alt=media&token=25c30dfe-8568-4773-a93a-60674f2fd280';

    $fullName = trim(($c->nombre ?? '') . ' ' . ($c->apellido ?? ''));
    $safeName = $this->slugFile($fullName ?: ('cliente_' . $c->id));

    $fileName = "cliente_{$safeName}_historial_de_pagos_" . now('America/Guayaquil')->format('Y-m-d') . ".pdf";

    return Pdf::loadView('pdf.historial_pagos', [
        'cliente' => $c,
        'pagos' => $pagos,
        'desde' => $desde,
        'hasta' => $hasta,
        'logoUrl' => $logoUrl,
    ])->setPaper('a4', 'portrait')
      ->download($fileName);
}

private function slugFile(string $text): string
{
    $text = trim(mb_strtolower($text));
    $text = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text); 
    $text = preg_replace('/[^a-z0-9]+/i', '_', $text);        
    $text = trim($text, '_');
    return $text ?: 'cliente';
}



    public function clientes(Request $request)
    {
        $data = $request->validate([
            'from'  => 'required|date',
            'to'    => 'required|date|after_or_equal:from',
            'group' => 'nullable|in:day,month',
        ]);

        $from = Carbon::parse($data['from'])->startOfDay();
        $to   = Carbon::parse($data['to'])->endOfDay();
        $group = $data['group'] ?? 'day';

        // Agrupar por día o por mes usando created_at de clientes
        $format = $group === 'month' ? '%Y-%m' : '%Y-%m-%d';

        $series = Cliente::query()
            ->selectRaw("DATE_FORMAT(created_at, '{$format}') as etiqueta, COUNT(*) as total")
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('etiqueta')
            ->orderBy('etiqueta')
            ->get();

        $total = $series->sum('total');

        return response()->json([
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'group' => $group,
            'total' => $total,
            'series' => $series, 
        ]);
    }

    public function ingresos(Request $request)
    {
        $data = $request->validate([
            'from'  => 'required|date',
            'to'    => 'required|date|after_or_equal:from',
            'group' => 'nullable|in:day,month',
        ]);

        $from = Carbon::parse($data['from'])->startOfDay();
        $to   = Carbon::parse($data['to'])->endOfDay();
        $group = $data['group'] ?? 'day';

        $format = $group === 'month' ? '%Y-%m' : '%Y-%m-%d';

        $series = Transaccion::query()
            ->selectRaw("DATE_FORMAT(fecha, '{$format}') as etiqueta, SUM(monto) as total")
            ->where('tipo', 'pago')
            ->whereBetween('fecha', [$from, $to])
            ->groupBy('etiqueta')
            ->orderBy('etiqueta')
            ->get();

        $total = $series->sum('total');

        return response()->json([
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'group' => $group,
            'total' => (string) $total,
            'series' => $series, 
        ]);
    }
}
