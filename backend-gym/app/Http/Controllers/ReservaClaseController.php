<?php

namespace App\Http\Controllers;

use App\Models\ReservaClase;
use App\Models\HorarioClase;
use Illuminate\Http\Request;
use App\Models\Cliente;
use App\Models\Transaccion;
use App\Models\Membresia;
use Illuminate\Database\QueryException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReservaClaseController extends Controller
{
    // =========================
    // PERSONAL: listar reservas
    // =========================
    public function index(Request $request)
    {
        $request->validate([
            'fecha' => ['nullable', 'date_format:Y-m-d'],
            'estado' => ['nullable', 'in:CONFIRMADA,CANCELADA'],
            'cliente_id' => ['nullable', 'integer'],
            'entrenador_id' => ['nullable', 'integer'],
            'horario_id' => ['nullable', 'integer'],
            'desde' => ['nullable', 'date_format:Y-m-d'],
            'hasta' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:desde'],
        ]);

        $user = auth()->user();

        $query = ReservaClase::query()->with([
            'cliente:id,nombre,apellido,correo,telefono,estado',
            'horario:id,clase_id,entrenador_id,fecha_inicio,fecha_fin,sala,cupo_maximo,estado',
            'horario.clase:id,nombre',
            'horario.entrenador:id,nombre,apellido,rol',
        ]);

        // Si es entrenador: solo ve reservas de sus horarios
        if ($user->rol === 'entrenador') {
            $query->whereHas('horario', function ($q) use ($user) {
                $q->where('entrenador_id', $user->id);
            });
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('cliente_id')) {
            $query->where('cliente_id', $request->cliente_id);
        }

        if ($request->filled('horario_id')) {
            $query->where('horario_id', $request->horario_id);
        }

        if ($request->filled('entrenador_id')) {
            $query->whereHas('horario', function ($q) use ($request) {
                $q->where('entrenador_id', $request->entrenador_id);
            });
        }

        // ✅ Si viene "fecha", filtra por ese día y NO aplica rango
        if ($request->filled('fecha')) {
            $query->whereHas('horario', function ($q) use ($request) {
                $q->whereDate('fecha_inicio', $request->fecha);
            });
        } else {
            // ✅ Si no viene "fecha", aplica desde/hasta
            $desde = $request->get('desde');
            $hasta = $request->get('hasta');

            if ($desde || $hasta) {
                $query->whereHas('horario', function ($q) use ($desde, $hasta) {
                    if ($desde) $q->whereDate('fecha_inicio', '>=', $desde);
                    if ($hasta) $q->whereDate('fecha_inicio', '<=', $hasta);
                });
            }
        }

        return response()->json([
            'data' => $query->orderByDesc('id')->paginate(20),
        ]);
    }

    // =========================
    // CLIENTE: mis reservas (historial con filtros)
    // =========================
    public function mias(Request $request)
    {
        $request->validate([
            'tipo' => ['nullable', 'in:pasadas,futuras,todas'],
            'estado' => ['nullable', 'in:CONFIRMADA,CANCELADA'],
            'desde' => ['nullable', 'date_format:Y-m-d'],
            'hasta' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:desde'],
        ]);

        $cliente = $request->user('sanctum_clientes');

        $tipo = $request->get('tipo', 'todas');
        $desde = $request->get('desde');
        $hasta = $request->get('hasta');

        $query = ReservaClase::query()
            ->where('cliente_id', $cliente->id)
            ->with([
                'horario:id,clase_id,entrenador_id,fecha_inicio,fecha_fin,sala,estado,cupo_maximo',
                'horario.clase:id,nombre',
                'horario.entrenador:id,nombre,apellido',
            ]);

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($tipo === 'pasadas') {
            $query->whereHas('horario', fn($q) => $q->where('fecha_inicio', '<', now()));
        } elseif ($tipo === 'futuras') {
            $query->whereHas('horario', fn($q) => $q->where('fecha_inicio', '>=', now()));
        }

        if ($desde || $hasta) {
            $query->whereHas('horario', function ($q) use ($desde, $hasta) {
                if ($desde) $q->whereDate('fecha_inicio', '>=', $desde);
                if ($hasta) $q->whereDate('fecha_inicio', '<=', $hasta);
            });
        }

        return response()->json([
            'data' => $query->orderByDesc('id')->paginate(20),
        ]);
    }

    // =========================
    // PERSONAL: historial de reservas de un cliente
    // =========================
    public function historialCliente(Request $request, int $cliente)
    {
        $request->validate([
            'tipo' => ['nullable', 'in:pasadas,futuras,todas'],
            'estado' => ['nullable', 'in:CONFIRMADA,CANCELADA'],
            'desde' => ['nullable', 'date_format:Y-m-d'],
            'hasta' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:desde'],
        ]);

        $tipo = $request->get('tipo', 'todas');
        $desde = $request->get('desde');
        $hasta = $request->get('hasta');

        $user = auth()->user();

        $query = ReservaClase::query()
            ->where('cliente_id', $cliente)
            ->with([
                'cliente:id,nombre,apellido,correo,telefono,estado',
                'horario:id,clase_id,entrenador_id,fecha_inicio,fecha_fin,sala,estado,cupo_maximo',
                'horario.clase:id,nombre',
                'horario.entrenador:id,nombre,apellido,rol',
            ]);

        // entrenador solo ve sus horarios
        if ($user->rol === 'entrenador') {
            $query->whereHas('horario', fn($q) => $q->where('entrenador_id', $user->id));
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($tipo === 'pasadas') {
            $query->whereHas('horario', fn($q) => $q->where('fecha_inicio', '<', now()));
        } elseif ($tipo === 'futuras') {
            $query->whereHas('horario', fn($q) => $q->where('fecha_inicio', '>=', now()));
        }

        if ($desde || $hasta) {
            $query->whereHas('horario', function ($q) use ($desde, $hasta) {
                if ($desde) $q->whereDate('fecha_inicio', '>=', $desde);
                if ($hasta) $q->whereDate('fecha_inicio', '<=', $hasta);
            });
        }

        return response()->json([
            'data' => $query->orderByDesc('id')->paginate(20),
        ]);
    }

    // =========================
    // CLIENTE: crear reserva
    // =========================
public function storeCliente(Request $request)
{
    $request->validate([
        'horario_id' => ['required', 'integer', 'exists:horarios_clases,id'],
    ]);

    $cliente = $request->user('sanctum_clientes');

    try {
        return DB::transaction(function () use ($request, $cliente) {
            $horario = HorarioClase::query()
                ->withCount(['reservasConfirmadas as reservas_confirmadas'])
                ->lockForUpdate()
                ->findOrFail($request->horario_id);

            if ($horario->estado !== 'ACTIVO') {
                return response()->json(['message' => 'Horario no disponible.'], 422);
            }

            if ($horario->fecha_inicio <= now()) {
                return response()->json(['message' => 'No puedes reservar un horario pasado.'], 422);
            }

            $confirmadas = (int) ($horario->reservas_confirmadas ?? 0);
            if ($confirmadas >= (int) $horario->cupo_maximo) {
                return response()->json(['message' => 'No hay cupos disponibles.'], 422);
            }

            // Buscar reserva existente sin filtrar por estado (por índice único horario_id+cliente_id)
            $reservaExistente = ReservaClase::where('horario_id', $horario->id)
                ->where('cliente_id', $cliente->id)
                ->lockForUpdate()
                ->first();

            if ($reservaExistente) {
                if ($reservaExistente->estado === 'CONFIRMADA') {
                    return response()->json(['message' => 'Ya tienes una reserva para este horario.'], 409);
                }

                $reservaExistente->update([
                    'estado' => 'CONFIRMADA',
                    'fecha_reserva' => now(),
                ]);

                return response()->json([
                    'message' => 'Reserva reactivada',
                    'data' => $reservaExistente->load('horario.clase', 'horario.entrenador'),
                ], 200);
            }

            $reserva = ReservaClase::create([
                'horario_id' => $horario->id,
                'cliente_id' => $cliente->id,
                'estado' => 'CONFIRMADA',
                'fecha_reserva' => now(),
            ]);

            return response()->json([
                'message' => 'Reserva creada',
                'data' => $reserva->load('horario.clase', 'horario.entrenador'),
            ], 201);
        });
    } catch (QueryException $e) {
        if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
            return response()->json([
                'message' => 'Ya existe una reserva para este horario y cliente.'
            ], 409);
        }

        throw $e;
    }
}

    // =========================
    // CLIENTE: cancelar mi reserva
    // =========================
public function cancelarCliente(Request $request, int $id)
{
    $cliente = $request->user('sanctum_clientes');

    $reserva = ReservaClase::with('horario')->findOrFail($id);

    if ((int) $reserva->cliente_id !== (int) $cliente->id) {
        return response()->json(['message' => 'No autorizado.'], 403);
    }

    if ($reserva->estado === 'CANCELADA') {
        return response()->json(['message' => 'La reserva ya está cancelada.'], 200);
    }

    if (!$reserva->horario) {
        return response()->json(['message' => 'La reserva no tiene horario asociado.'], 422);
    }

    $inicioClase = Carbon::parse($reserva->horario->fecha_inicio);
    $ahora = now();

    // Si ya pasó la clase
    if ($inicioClase->lte($ahora)) {
        return response()->json([
            'message' => 'No puedes cancelar una reserva de un horario pasado.'
        ], 422);
    }

    // Solo cancelar con al menos 1 hora de anticipación
    $limiteCancelacion = $inicioClase->copy()->subHour();

    if ($ahora->gte($limiteCancelacion)) {
        return response()->json([
            'message' => 'Solo puedes cancelar con al menos 1 hora de anticipación.'
        ], 422);
    }

    $reserva->update(['estado' => 'CANCELADA']);

    return response()->json(['message' => 'Reserva cancelada']);
}


    // =========================
    // PERSONAL: crear reserva para un cliente
    // =========================
public function storePersonal(Request $request)
{
    $request->validate([
        'horario_id' => ['required', 'integer', 'exists:horarios_clases,id'],
        'cliente_id' => ['required', 'integer', 'exists:clientes,id'],
    ]);

    try {
        return DB::transaction(function () use ($request) {
            $horario = HorarioClase::query()
                ->withCount(['reservasConfirmadas as reservas_confirmadas'])
                ->lockForUpdate()
                ->findOrFail($request->horario_id);

            if ($horario->estado !== 'ACTIVO') {
                return response()->json(['message' => 'Horario no disponible.'], 422);
            }

            if ($horario->fecha_inicio <= now()) {
                return response()->json(['message' => 'No puedes reservar un horario pasado.'], 422);
            }

            $confirmadas = (int) ($horario->reservas_confirmadas ?? 0);
            if ($confirmadas >= (int) $horario->cupo_maximo) {
                return response()->json(['message' => 'No hay cupos disponibles.'], 422);
            }

            //  Buscar existente sin filtrar por estado
            $reservaExistente = ReservaClase::where('horario_id', $horario->id)
                ->where('cliente_id', $request->cliente_id)
                ->lockForUpdate()
                ->first();

            if ($reservaExistente) {
                if ($reservaExistente->estado === 'CONFIRMADA') {
                    return response()->json(['message' => 'Ese cliente ya tiene reserva en este horario.'], 409);
                }

                // Reactivar si estaba cancelada
                $reservaExistente->update([
                    'estado' => 'CONFIRMADA',
                    'fecha_reserva' => now(),
                ]);

                return response()->json([
                    'message' => 'Reserva reactivada',
                    'data' => $reservaExistente->load('cliente', 'horario.clase', 'horario.entrenador'),
                ], 200);
            }

            $reserva = ReservaClase::create([
                'horario_id' => $horario->id,
                'cliente_id' => $request->cliente_id,
                'estado' => 'CONFIRMADA',
                'fecha_reserva' => now(),
            ]);

            return response()->json([
                'message' => 'Reserva creada',
                'data' => $reserva->load('cliente', 'horario.clase', 'horario.entrenador'),
            ], 201);
        });
    } catch (QueryException $e) {
        if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
            return response()->json([
                'message' => 'Ya existe una reserva para este horario y cliente.'
            ], 409);
        }

        throw $e;
    }
}

    // =========================
    // PERSONAL: cancelar
    // =========================
    public function cancelarPersonal(Request $request, int $id)
    {
        $user = auth()->user();

        $reserva = ReservaClase::with('horario')->findOrFail($id);

        if ($reserva->estado === 'CANCELADA') {
            return response()->json(['message' => 'La reserva ya está cancelada.'], 200);
        }

        if ($user->rol === 'entrenador') {
            if (!$reserva->horario || (int) $reserva->horario->entrenador_id !== (int) $user->id) {
                return response()->json(['message' => 'No autorizado.'], 403);
            }
        }

        $reserva->update(['estado' => 'CANCELADA']);

        return response()->json(['message' => 'Reserva cancelada']);
    }
}
