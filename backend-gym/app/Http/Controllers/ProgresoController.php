<?php

namespace App\Http\Controllers;

use App\Models\Progreso;
use App\Models\Cliente;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ProgresoController extends Controller
{
    private array $ejerciciosPermitidos = [
        'snatch',
        'clean_and_jerk',
        'sentadilla',
        'peso_muerto',
        'press_militar',
    ];

    // =========================================
    // 1) Cliente logueado: registrar PR ejercicio
    // =========================================
    public function store(Request $request)
    {
        $validated = $request->validate([
            'ejercicio'    => ['required', 'in:' . implode(',', $this->ejerciciosPermitidos)],
            'marca_maxima' => 'required|numeric|min:0',
            'unidad'       => 'required|in:kg,lb',
            'fecha'        => 'sometimes|date',
        ]);

        $cliente_id = $request->user()->cliente->id;

        $progreso = Progreso::create([
            'cliente_id'   => $cliente_id,
            'tipo'         => 'ejercicio',
            'ejercicio'    => $validated['ejercicio'],
            'marca_maxima' => $validated['marca_maxima'],
            'unidad'       => $validated['unidad'],
            'fecha'        => Carbon::parse($validated['fecha'] ?? now())->toDateString(),
        ]);

        return response()->json($progreso, 201);
    }

    // =========================================
    // 2) Cliente logueado: ver MIS ejercicios
    // =========================================
    public function misProgresos(Request $request)
    {
        $cliente_id = $request->user()->cliente->id;

        return Progreso::where('cliente_id', $cliente_id)
            ->where('tipo', 'ejercicio')
            ->orderBy('fecha', 'desc')
            ->orderBy('id', 'desc')
            ->get(['id','ejercicio','marca_maxima','unidad','fecha']);
    }

    // =========================================
    // 3) Staff (admin/recep/entrenador): ver ejercicios de cliente
    // =========================================
    public function historialEjercicios(Cliente $cliente)
    {
        return Progreso::where('cliente_id', $cliente->id)
            ->where('tipo', 'ejercicio')
            ->orderBy('fecha', 'desc')
            ->orderBy('id', 'desc')
            ->get(['id','ejercicio','marca_maxima','unidad','fecha']);
    }

    // =========================================
    // 4) Staff: registrar ejercicio a un cliente
    // =========================================
    public function registrarEjercicio(Request $request, Cliente $cliente)
    {
        $validated = $request->validate([
            'ejercicio'    => ['required', 'in:' . implode(',', $this->ejerciciosPermitidos)],
            'marca_maxima' => 'required|numeric|min:0',
            'unidad'       => 'required|in:kg,lb',
            'fecha'        => 'required|date',
        ]);

        $progreso = Progreso::create([
            'cliente_id'   => $cliente->id,
            'tipo'         => 'ejercicio',
            'ejercicio'    => $validated['ejercicio'],
            'marca_maxima' => $validated['marca_maxima'],
            'unidad'       => $validated['unidad'],
            'fecha'        => Carbon::parse($validated['fecha'])->toDateString(),
        ]);

        return response()->json([
            'message'  => 'PR registrado correctamente.',
            'progreso' => $progreso,
        ], 201);
    }
}
