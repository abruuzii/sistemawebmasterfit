<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if ($user && isset($user->is_active) && !$user->is_active) {
            return response()->json(['message' => 'Usuario inactivo.'], 403);
        }
        return $next($request);
    }
}
