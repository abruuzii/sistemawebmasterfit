<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
{
    $validated = $request->validate([
        'nombre'    => 'required|string|max:255',
        'apellido'  => 'required|string|max:255',
        'email'     => 'required|string|email|max:255|unique:users',
        'usuario'   => 'required|string|max:255|unique:users',
        'password'  => 'required|string|min:8',
        'rol'       => 'required|in:admin,entrenador,recepcionista', // 👈 clientes van en tabla clientes
    ]);

    // Hashear password
    $validated['password'] = Hash::make($validated['password']);

    // Crear usuario
    $user = User::create($validated);

    // Crear token Sanctum
    $token = $user->createToken('auth_token')->plainTextToken;

    return response()->json([
        'message' => 'Usuario registrado correctamente.',
        'user'    => $user,
        'token'   => $token,
    ], 201);
}

    /**
     * Inicio de sesión.
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        // Buscar usuario
        $user = User::where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Credenciales incorrectas.'],
            ]);
        }

        if (!$user->is_active) {
            return response()->json(['message' => 'Tu cuenta está inactiva. Contacta con el administrador.'], 403);
        }

        // Crear token
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Inicio de sesión exitoso.',
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Cerrar sesión (revocar token actual).
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sesión cerrada correctamente.']);
    }

    /**
     * Obtener información del usuario autenticado.
     */
    public function me(Request $request)
    {
        return response()->json($request->user());
    }
}
