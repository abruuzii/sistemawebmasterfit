<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use Illuminate\Http\Request;

class ClienteAuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'correo' => ['required', 'email'],
        ]);

        $cliente = Cliente::where('correo', $request->correo)->first();

        if (!$cliente) {
            return response()->json(['message' => 'Correo no registrado.'], 404);
        }

        if (strtolower($cliente->estado) !== 'activo') {
            return response()->json(['message' => 'Cliente inactivo.'], 403);
        }

        // opcional: borrar tokens viejos para evitar acumulación
        $cliente->tokens()->delete();

        $token = $cliente->createToken('cliente-mobile')->plainTextToken;

        return response()->json([
            'token' => $token,
            'cliente' => $cliente,
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'cliente' => $request->user('sanctum_clientes'),
        ]);
    }

    public function logout(Request $request)
    {
        $cliente = $request->user('sanctum_clientes');
        $cliente->currentAccessToken()->delete();
        return response()->json(['message' => 'Sesión cerrada']);
    }
}
