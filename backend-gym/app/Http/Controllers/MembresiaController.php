<?php

namespace App\Http\Controllers;

use App\Models\Membresia;
use Illuminate\Http\Request;

class MembresiaController extends Controller
{
public function index(Request $request)
{
    $q = \App\Models\Membresia::query();


    if ($request->has('activo')) {
        $q->where('activo', (int)$request->query('activo'));
    }

    return response()->json($q->orderBy('nombre')->get(), 200);
}

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre'        => 'required|string|max:255',
            'descripcion'   => 'nullable|string',
            'precio'        => 'required|numeric|min:0',
            'duracion_dias'  => 'nullable|integer|min:1|required_without:duracion_meses',
            'duracion_meses' => 'nullable|integer|min:1|required_without:duracion_dias',

            'activo'        => 'boolean',
        ]);

        if (!empty($validated['duracion_dias'])) {
            $validated['duracion_meses'] = null;
        } else {
            $validated['duracion_dias'] = null;
        }

        $membresia = Membresia::create($validated);

        return response()->json([
            'message' => 'Membresía creada exitosamente.',
            'data' => $membresia
        ], 201);
    }

    public function show($id)
    {
        $membresia = Membresia::find($id);
        if (!$membresia) return response()->json(['message' => 'Membresía no encontrada.'], 404);
        return response()->json($membresia, 200);
    }

    public function update(Request $request, $id)
    {
        $membresia = Membresia::find($id);
        if (!$membresia) return response()->json(['message' => 'Membresía no encontrada.'], 404);

        $validated = $request->validate([
            'nombre'        => 'sometimes|string|max:255',
            'descripcion'   => 'nullable|string',
            'precio'        => 'sometimes|numeric|min:0',
            'duracion_dias'  => 'nullable|integer|min:1',
            'duracion_meses' => 'nullable|integer|min:1',
            'activo'        => 'boolean',
        ]);

        if (array_key_exists('duracion_dias', $validated) && !empty($validated['duracion_dias'])) {
            $validated['duracion_meses'] = null;
        }
        if (array_key_exists('duracion_meses', $validated) && !empty($validated['duracion_meses'])) {
            $validated['duracion_dias'] = null;
        }

        $membresia->update($validated);

        return response()->json([
            'message' => 'Membresía actualizada correctamente.',
            'data' => $membresia
        ], 200);
    }

    public function destroy($id)
    {
        $membresia = Membresia::find($id);
        if (!$membresia) return response()->json(['message' => 'Membresía no encontrada.'], 404);

        $membresia->delete();
        return response()->json(['message' => 'Membresía eliminada correctamente.'], 200);
    }
}
