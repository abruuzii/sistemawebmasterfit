<?php

namespace App\Http\Controllers;

use App\Models\Clase;
use Illuminate\Http\Request;

class ClaseController extends Controller
{
    public function index(Request $request)
    {
        $soloActivas = $request->boolean('solo_activas', true);

        $query = Clase::query()->orderBy('nombre');

        if ($soloActivas) {
            $query->where('activa', true);
        }

        return response()->json([
            'data' => $query->get()
        ]);
    }
}
