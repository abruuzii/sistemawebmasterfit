<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        // Soporta role:admin,recepcionista  y role:admin|recepcionista
        $allowed = collect($roles)
            ->flatMap(fn ($r) => preg_split('/[|,]/', (string) $r))
            ->map(fn ($r) => strtolower(trim($r)))
            ->filter()
            ->values()
            ->all();

        $userRole = strtolower((string) ($user->rol ?? ''));

        if (!in_array($userRole, $allowed, true)) {
            return response()->json([
                'message' => 'No autorizado para este recurso.',
                'rol' => $user->rol,
            ], 403);
        }

        return $next($request);
    }
}
