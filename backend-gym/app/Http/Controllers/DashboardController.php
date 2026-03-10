<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Cliente;
use App\Models\Transaccion;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use App\Models\Membresia;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    public function home()
    {
        $hoy = Carbon::today();
        $diasAviso = 7;
        $limit = 10;

        return Cache::remember('dash_home', 30, function () use ($hoy, $diasAviso, $limit) {

            // Total membresías 
            $totalMembresias = Membresia::count();

            // Ingresos del mes 
            $inicioMes = Carbon::now()->startOfMonth()->toDateString();
            $finMes    = Carbon::now()->endOfMonth()->toDateString();

            $ingresosMes = Transaccion::where('tipo', 'pago')
                ->whereBetween('fecha', [$inicioMes, $finMes])
                ->sum('monto');

            // ✅ Solo trae clientes + su ÚLTIMO pago (y la membresía de ese pago)
            $clientes = Cliente::select('id','nombre','apellido','cedula_identidad','correo','membresia_id')
                ->with([
                    'ultimoPago' => function ($q) {
                        $q->select('id','cliente_id','membresia_id','fecha','fecha_inicio','created_at')
                          ->with(['membresia:id,nombre,duracion_dias,duracion_meses']);
                    }
                ])
                ->get();

            $porVencer = [];
            $vencidos = [];
            $activosCount = 0;

            foreach ($clientes as $cliente) {
                $ultima = $cliente->ultimoPago;
                $membresia = $ultima?->membresia;

                if (!$ultima || !$membresia) continue;

                // ✅ Priorizar fecha_inicio sobre fecha del pago
                $inicio = null;
                if ($ultima->fecha_inicio) {
                    $inicio = Carbon::parse($ultima->fecha_inicio)->startOfDay();
                } elseif ($ultima->fecha) {
                    $inicio = Carbon::parse($ultima->fecha)->startOfDay();
                } else {
                    $inicio = $ultima->created_at->copy()->startOfDay();
                }

                $fin = $this->calcularFechaFin($inicio, $membresia);

                $diasRestantes = $hoy->diffInDays($fin, false);

                if ($diasRestantes >= 0) $activosCount++;

                // Acumular todos los clientes que están por vencer dentro del rango de aviso (sin límite aquí)
                if ($diasRestantes >= 0 && $diasRestantes <= $diasAviso) {
                    $porVencer[] = [
                        'cliente_id'        => $cliente->id,
                        'nombre'            => $cliente->nombre,
                        'apellido'          => $cliente->apellido,
                        'cedula'            => $cliente->cedula_identidad,
                        'correo'            => $cliente->correo,
                        'membresia'         => $membresia->nombre,
                        'fecha_ultimo_pago' => $ultima->fecha ? Carbon::parse($ultima->fecha)->toDateString() : $ultima->created_at->toDateString(),
                        'fecha_inicio'      => $inicio->toDateString(),
                        'fecha_fin'         => $fin->toDateString(),
                        'dias_restantes'    => $diasRestantes,
                    ];
                }

                $diasVencidos = $fin->diffInDays($hoy, false);
                // ✅ Filtrar vencidos recientes: solo incluir si vencieron en los últimos 30 días
                if ($diasVencidos > 0 && $diasVencidos <= 30) {
                    $vencidos[] = [
                        'cliente_id'        => $cliente->id,
                        'nombre'            => $cliente->nombre,
                        'apellido'          => $cliente->apellido,
                        'cedula'            => $cliente->cedula_identidad,
                        'correo'            => $cliente->correo,
                        'membresia'         => $membresia->nombre,
                        'fecha_ultimo_pago' => $ultima->fecha ? Carbon::parse($ultima->fecha)->toDateString() : $ultima->created_at->toDateString(),
                        'fecha_inicio'      => $inicio->toDateString(),
                        'fecha_fin'         => $fin->toDateString(),
                        'dias_vencidos'     => $diasVencidos,
                    ];
                }
            }

            // Ordenar por urgencia: menor dias_restantes primero; menor dias_vencidos primero
            usort($porVencer, function ($a, $b) {
                return $a['dias_restantes'] <=> $b['dias_restantes'];
            });

            usort($vencidos, function ($a, $b) {
                return $a['dias_vencidos'] <=> $b['dias_vencidos'];
            });

            // Aplicar límite con array_slice después de ordenar
            $porVencer = array_slice($porVencer, 0, $limit);
            $vencidos = array_slice($vencidos, 0, $limit);

            return response()->json([
                'ingresos_mes'     => (float) $ingresosMes,
                'total_membresias' => (int) $totalMembresias,
                'clientes_activos' => (int) $activosCount,
                'por_vencer'       => $porVencer,
                'vencidos'         => $vencidos,
            ]);
        });
    }

    private function calcularFechaFin(Carbon $fechaInicio, $membresia): Carbon
    {
        $duracionDias = (int) ($membresia->duracion_dias ?? 0);

        if ($duracionDias > 0) {
            return $fechaInicio->copy()->addDays($duracionDias);
        }

        $duracionMeses = (int) ($membresia->duracion_meses ?? 1);
        if ($duracionMeses < 1) $duracionMeses = 1;

        return $fechaInicio->copy()->addMonthsNoOverflow($duracionMeses);
    }
}