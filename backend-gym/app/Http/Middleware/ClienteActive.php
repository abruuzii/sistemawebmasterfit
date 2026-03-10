<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ClienteActive
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
public function handle($request, \Closure $next)
{
    $cliente = $request->user('sanctum_clientes');

    if (!$cliente || strtolower($cliente->estado) !== 'activo') {
        return response()->json(['message' => 'Cliente inactivo.'], 403);
    }

    return $next($request);
}

}
