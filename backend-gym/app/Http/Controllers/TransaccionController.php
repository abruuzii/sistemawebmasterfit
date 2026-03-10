<?php

namespace App\Http\Controllers;

use App\Models\Transaccion;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use App\Models\Cliente;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;



class TransaccionController extends Controller
{
    /**
     * Listar todas las transacciones (para admin).
     */
    public function index()
    {
        $transacciones = Transaccion::with('cliente', 'membresia')
            ->get()
            ->map(function ($t) {

                return $this->agregarFechas($t);
            });

        return response()->json($transacciones);
    }

    /**
     * Registrar un pago / devolución.
     */
public function store(Request $request)
{
    $validated = $request->validate([
        'cliente_id'      => 'required|exists:clientes,id',
        'membresia_id'    => 'required|exists:membresias,id',
        'monto'           => 'required|numeric|min:0',
        'tipo'            => 'required|in:pago,devolucion',
        'descripcion'     => 'nullable|string',
        'tipo_pago'       => 'required|in:efectivo,transferencia',
        'comprobante_url' => 'nullable|url|required_if:tipo_pago,transferencia',
        'fecha_manual'    => 'nullable|date',
        'fecha_inicio'    => 'nullable|date|before_or_equal:today',
        'membresia_id' => [
        'required',
            Rule::exists('membresias', 'id')->where('activo', 1),
],

    ]);

    return DB::transaction(function () use ($validated) {

        $hoy = Carbon::today();

        // 1) BLOQUEAR si intenta pagar y aún tiene membresía vigente
        if ($validated['tipo'] === 'pago') {
            $ultimoPago = Transaccion::with('membresia')
                ->where('cliente_id', $validated['cliente_id'])
                ->where('tipo', 'pago')
                ->orderBy('fecha', 'desc')
                ->first();

            if ($ultimoPago && $ultimoPago->membresia) {
                $ultimoPago = $this->agregarFechas($ultimoPago);

                if (!empty($ultimoPago->fecha_fin)) {
                    $fin = Carbon::parse($ultimoPago->fecha_fin)->startOfDay();

                    if ($fin->gte($hoy)) {
                        return response()->json([
                            'message'   => 'Este cliente aún tiene una membresía vigente. No se puede registrar otro pago hasta que venza.',
                            'fecha_fin' => $fin->toDateString(),
                        ], 422);
                    }
                }
            }
        }

        // ✅ 2) Crear transacción
        $transaccion = new Transaccion([
            'cliente_id'      => $validated['cliente_id'],
            'membresia_id'    => $validated['membresia_id'],
            'monto'           => $validated['monto'],
            'tipo'            => $validated['tipo'],
            'descripcion'     => $validated['descripcion'] ?? null,
            'tipo_pago'       => $validated['tipo_pago'],
            'comprobante_url' => $validated['comprobante_url'] ?? null,
            'created_by'      => auth()->id(),
            'fecha_inicio'    => $validated['fecha_inicio'] ?? null,
        ]);

        $transaccion->fecha = !empty($validated['fecha_manual'])
            ? Carbon::parse($validated['fecha_manual'])->toDateString()
            : now('America/Guayaquil')->toDateString();


        $transaccion->save();

        // 3) Si fue pago, marcar cliente como ACTIVO 
        if ($validated['tipo'] === 'pago') {
            Cliente::where('id', $validated['cliente_id'])->update([
                'estado'      => 'activo',
                'membresia_id'=> $validated['membresia_id'], // opcional, si quieres mantenerlo sincronizado
            ]);
        }

        // Recargar y devolver con fecha_fin calculada
        $transaccion = $transaccion->fresh()->load('membresia');
        $transaccion = $this->agregarFechas($transaccion);

        return response()->json([
            'message'     => 'Transacción registrada correctamente.',
            'transaccion' => $transaccion,
        ], 201);
    });
}

    /**
     * Historial de pagos de un cliente
     */
public function transaccionesCliente($clienteId)
{
    $transacciones = Transaccion::with(['membresia', 'creador:id,nombre,apellido,rol'])
        ->where('cliente_id', $clienteId)
        ->orderBy('fecha', 'desc')
        ->get()
        ->map(function ($t) {
            $t = $this->agregarFechas($t);

            $t->registrado_por = $t->creador
                ? (trim($t->creador->nombre . ' ' . $t->creador->apellido) . ' (' . $t->creador->rol . ')')
                : null;

            return $t;
        });

    return response()->json($transacciones);
}


    /**
     * --------------------------
     * MÉTODO PRIVADO CENTRALIZADO
     * --------------------------
     * Añade fecha_inicio y fecha_fin a cualquier transacción.
     * Esto asegura que TODO el sistema sea consistente.
     */
    private function agregarFechas($t)
{
    $fechaInicio = $t->fecha_inicio
        ? Carbon::parse($t->fecha_inicio)->startOfDay()
        : ($t->fecha ? Carbon::parse($t->fecha)->startOfDay() : Carbon::parse($t->created_at)->startOfDay());

    $t->fecha_inicio = $fechaInicio->toDateString();

    if ($t->tipo === 'pago' && $t->membresia) {

        $dias  = (int) ($t->membresia->duracion_dias ?? 0);
        $meses = (int) ($t->membresia->duracion_meses ?? 0);

        if ($dias > 0) {
            $fechaFin = $fechaInicio->copy()->addDays(max(1,$dias) - 1)->toDateString();
        } else {
            if ($meses < 1) $meses = 1;
            $fechaFin = $fechaInicio->copy()->addMonthsNoOverflow($meses)->toDateString();
        }

        $t->fecha_fin = $fechaFin;
    } else {
        $t->fecha_fin = null;
    }

    return $t;
}

}
