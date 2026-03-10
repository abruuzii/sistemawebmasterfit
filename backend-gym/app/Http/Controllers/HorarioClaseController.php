<?php

namespace App\Http\Controllers;

use App\Models\HorarioClase;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class HorarioClaseController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'fecha' => ['nullable', 'date_format:Y-m-d'],
            'clase_id' => ['nullable', 'integer'],
            'entrenador_id' => ['nullable', 'integer'],
            'solo_activos' => ['nullable', 'boolean'],
            'solo_futuros' => ['nullable', 'boolean'],
        ]);

        $soloActivos = $request->boolean('solo_activos', true);
        $soloFuturos = $request->boolean('solo_futuros', true);

        $query = HorarioClase::query()
            ->with(['clase:id,nombre,duracion_minutos', 'entrenador:id,nombre,apellido,rol'])
            ->withCount(['reservasConfirmadas as reservas_confirmadas']);

        if ($soloActivos) {
            $query->where('estado', 'ACTIVO');
        }

        if ($soloFuturos) {
            $query->where('fecha_inicio', '>', now());
        }

        if ($request->filled('clase_id')) {
            $query->where('clase_id', $request->clase_id);
        }

        if ($request->filled('entrenador_id')) {
            $query->where('entrenador_id', $request->entrenador_id);
        }

        // filtro por día (fecha=YYYY-MM-DD)
        if ($request->filled('fecha')) {
            $inicioDia = Carbon::createFromFormat('Y-m-d', $request->fecha)->startOfDay();
            $finDia = (clone $inicioDia)->endOfDay();
            $query->whereBetween('fecha_inicio', [$inicioDia, $finDia]);
        }

        $horarios = $query->orderBy('fecha_inicio')->get();

        // Agregar cupos_disponibles en el JSON (sin guardar en DB)
        $horarios->transform(function ($h) {
            $confirmadas = (int) ($h->reservas_confirmadas ?? 0);
            $cupoMax = (int) $h->cupo_maximo;
            $h->cupos_disponibles = max($cupoMax - $confirmadas, 0);
            return $h;
        });

        return response()->json(['data' => $horarios]);
    }
}
