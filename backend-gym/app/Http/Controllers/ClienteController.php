<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Membresia;
use App\Models\Transaccion;
use App\Models\Progreso;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class ClienteController extends Controller
{

    private function anexarEstadoMembresia(Cliente $cliente): Cliente
    {
        // Último pago (por id)
        $ult = Transaccion::where('cliente_id', $cliente->id)
            ->where('tipo', 'pago')
            ->orderByDesc('id')
            ->first();

        // membresía a usar: la del último pago (si existe), si no la del cliente
        $membresia = null;
        if ($ult && $ult->membresia_id) {
            $membresia = Membresia::find($ult->membresia_id);
        }
        if (!$membresia && $cliente->membresia_id) {
            $membresia = $cliente->relationLoaded('membresia')
                ? $cliente->membresia
                : Membresia::find($cliente->membresia_id);
        }

        $cliente->membresia_nombre = $membresia?->nombre;

        // Si no hay pago, no hay fecha_fin => inactivo
        if (!$ult || !$ult->fecha) {
            $cliente->fecha_ultimo_pago = null;
            $cliente->fecha_fin = null;
            $cliente->dias_restantes = null;
            $cliente->estado_membresia = 'inactivo';
            return $cliente;
        }

        $inicio = $ult->fecha_inicio
            ? Carbon::parse($ult->fecha_inicio)->startOfDay()
            : Carbon::parse($ult->fecha)->startOfDay();

        // Calcular fecha fin (prioriza duracion_dias, si no duracion_meses)
        if ($membresia && !is_null($membresia->duracion_dias)) {
            $fin = $inicio->copy()->addDays((int) $membresia->duracion_dias);
        } elseif ($membresia && !is_null($membresia->duracion_meses)) {
            $fin = $inicio->copy()->addMonthsNoOverflow((int) $membresia->duracion_meses);
        } else {
            $fin = $inicio->copy()->addMonthNoOverflow(); // fallback
        }

        $hoy = Carbon::now()->startOfDay();
        $diasRestantes = $hoy->diffInDays($fin, false); 

        $cliente->fecha_ultimo_pago = $inicio->toDateString();
        $cliente->fecha_fin = $fin->toDateString();
        $cliente->dias_restantes = $diasRestantes;
        $cliente->estado_membresia = ($fin->greaterThanOrEqualTo($hoy)) ? 'activo' : 'inactivo';


        return $cliente;
    }

    // =========================
    // ✅ LISTA PAGINADA DE CLIENTES
    // =========================

public function listaPaginada(Request $request)
{
    $perPage = (int) $request->get('per_page', 10);
    $perPage = max(5, min($perPage, 100));

    $q = trim((string) $request->get('q', ''));
    $estado = strtolower(trim((string) $request->get('estado_membresia', '')));

    // ✅ último pago por cliente (por id, más confiable que por fecha)
    $mx = DB::table('transacciones')
        ->select('cliente_id', DB::raw('MAX(id) as ultimo_id'))
        ->where('tipo', 'pago')
        ->groupBy('cliente_id');

    // expresiones de duración (preferir membresía del último pago, si no, la del cliente)
    $durDias  = "COALESCE(mu.duracion_dias, mc.duracion_dias)";
    $durMeses = "COALESCE(mu.duracion_meses, mc.duracion_meses)";

    $fechaFinExpr = "
      CASE
        WHEN ult.fecha IS NULL THEN NULL
        WHEN ($durDias) IS NOT NULL THEN DATE_ADD(COALESCE(DATE(ult.fecha_inicio), DATE(ult.fecha)), INTERVAL ($durDias) DAY)
        WHEN ($durMeses) IS NOT NULL THEN DATE_ADD(COALESCE(DATE(ult.fecha_inicio), DATE(ult.fecha)), INTERVAL ($durMeses) MONTH)
        ELSE DATE_ADD(COALESCE(DATE(ult.fecha_inicio), DATE(ult.fecha)), INTERVAL 1 MONTH)
      END
    ";

    $query = Cliente::query()
        ->leftJoinSub($mx, 'mx', function ($join) {
            $join->on('mx.cliente_id', '=', 'clientes.id');
        })
        ->leftJoin('transacciones as ult', 'ult.id', '=', 'mx.ultimo_id')
        ->leftJoin('membresias as mc', 'mc.id', '=', 'clientes.membresia_id')
        ->leftJoin('membresias as mu', 'mu.id', '=', 'ult.membresia_id')
        ->select([
            'clientes.id',
            'clientes.nombre',
            'clientes.apellido',
            'clientes.cedula_identidad',
            'clientes.correo',
            'clientes.telefono',

            DB::raw('COALESCE(mu.nombre, mc.nombre) as membresia_nombre'),
            DB::raw('COALESCE(DATE(ult.fecha_inicio), DATE(ult.fecha)) as fecha_ultimo_pago'),
            DB::raw("$fechaFinExpr as fecha_fin"),

            DB::raw("
              CASE
                WHEN ($fechaFinExpr) IS NULL THEN 'inactivo'
                WHEN DATE($fechaFinExpr) >= CURDATE() THEN 'activo'
                ELSE 'inactivo'
              END as estado_membresia
            "),

            DB::raw("
              CASE
                WHEN ($fechaFinExpr) IS NULL THEN NULL
                ELSE DATEDIFF(DATE($fechaFinExpr), CURDATE())
              END as dias_restantes
            "),
        ])
        ->orderByDesc('clientes.id');

    // búsqueda
    if ($q !== '') {
        $query->where(function ($w) use ($q) {
            $w->where('clientes.nombre', 'like', "%{$q}%")
              ->orWhere('clientes.apellido', 'like', "%{$q}%")
              ->orWhere('clientes.cedula_identidad', 'like', "%{$q}%")
              ->orWhere('clientes.correo', 'like', "%{$q}%");
        });
    }

    // filtro por estado_membresia
    if (in_array($estado, ['activo', 'inactivo'], true)) {
        if ($estado === 'activo') {
            $query->whereRaw("($fechaFinExpr) IS NOT NULL AND DATE($fechaFinExpr) >= CURDATE()");
        } else {
            $query->whereRaw("($fechaFinExpr) IS NULL OR DATE($fechaFinExpr) < CURDATE()");
        }
    }

    return response()->json($query->paginate($perPage));
}



public function vencimientosHome(Request $request)
{
    $hoy = Carbon::today();

    $diasAviso = (int) $request->query('dias_aviso', 7);   // default 7
    $limit     = (int) $request->query('limit', 0);        // 0 = sin límite
    if ($diasAviso < 1) $diasAviso = 7;

    $cacheKey = "vencimientos_home:dias={$diasAviso}:limit={$limit}";

    return Cache::remember($cacheKey, 30, function () use ($hoy, $diasAviso, $limit) {

        // ✅ Solo clientes con ÚLTIMO pago + membresía de ese pago
        $clientes = Cliente::whereHas('ultimoPago')
            ->select('id', 'nombre', 'apellido', 'cedula_identidad', 'correo')
            ->with([
                'ultimoPago' => function ($q) {
                    $q->select('id','cliente_id','membresia_id','fecha','created_at')
                      ->with(['membresia:id,nombre,duracion_dias,duracion_meses']);
                }
            ])
            ->get();

        $porVencer = [];
        $vencidos  = [];

        foreach ($clientes as $cliente) {
            $ultima = $cliente->ultimoPago;
            $membresia = $ultima?->membresia;

            if (!$ultima || !$membresia) continue;

            $inicio = $ultima->fecha_inicio
                ? Carbon::parse($ultima->fecha_inicio)->startOfDay()
                : ($ultima->fecha ? Carbon::parse($ultima->fecha)->startOfDay() : $ultima->created_at->copy()->startOfDay());

            $fin = $this->calcularFechaFin($inicio, $membresia);

            $diasRestantes = $hoy->diffInDays($fin, false);

            // Por vencer: 0..diasAviso
            if ($diasRestantes >= 0 && $diasRestantes <= $diasAviso) {
                $porVencer[] = [
                    'cliente_id'        => $cliente->id,
                    'nombre'            => $cliente->nombre,
                    'apellido'          => $cliente->apellido,
                    'cedula'            => $cliente->cedula_identidad,
                    'correo'            => $cliente->correo,
                    'membresia'         => $membresia->nombre,
                    'fecha_ultimo_pago' => $inicio->toDateString(),
                    'fecha_fin'         => $fin->toDateString(),
                    'dias_restantes'    => $diasRestantes,
                ];
            }

            // Vencidos: < 0
            if ($diasRestantes < 0) {
                $vencidos[] = [
                    'cliente_id'        => $cliente->id,
                    'nombre'            => $cliente->nombre,
                    'apellido'          => $cliente->apellido,
                    'cedula'            => $cliente->cedula_identidad,
                    'correo'            => $cliente->correo,
                    'membresia'         => $membresia->nombre,
                    'fecha_ultimo_pago' => $inicio->toDateString(),
                    'fecha_fin'         => $fin->toDateString(),
                    'dias_vencidos'     => abs($diasRestantes),
                ];
            }
        }

        // ordenar (más urgente primero)
        usort($porVencer, fn($a, $b) => $a['dias_restantes'] <=> $b['dias_restantes']);
        usort($vencidos,  fn($a, $b) => $b['dias_vencidos']  <=> $a['dias_vencidos']);

        // aplicar limit si viene
        if ((int)$limit > 0) {
            $porVencer = array_slice($porVencer, 0, $limit);
            $vencidos  = array_slice($vencidos,  0, $limit);
        }

        return response()->json([
            'por_vencer' => $porVencer,
            'vencidos'   => $vencidos,
        ]);
    });
}

    public function home(Cliente $cliente)
{
    $cacheKey = "cliente_home_{$cliente->id}";

    return Cache::remember($cacheKey, 30, function () use ($cliente) {

        // Cliente (con membresía asignada actual)
        $clienteData = Cliente::with(['membresia','usuario'])
            ->select('id','usuario_id','nombre','apellido','cedula_identidad','correo','telefono','direccion','fecha_nacimiento','estado','peso','altura','condicion_medica','membresia_id','foto')
            ->findOrFail($cliente->id);

        // Historial de pagos (poder limitar)
$transacciones = Transaccion::where('cliente_id', $cliente->id)
    ->where('tipo', 'pago')
    ->with([
        'membresia:id,nombre,duracion_dias,duracion_meses',
        'creador:id,nombre,apellido,rol'
    ])
    ->orderByRaw('COALESCE(fecha, created_at) DESC')
    ->limit(50)
    ->get()
    ->map(function ($t) {
        $t->registrado_por = $t->creador
            ? trim(($t->creador->nombre ?? '') . ' ' . ($t->creador->apellido ?? '')) . ' (' . ($t->creador->rol ?? '') . ')'
            : null;
        return $t;
    });


        // Pesos (solo tipo peso)
        $pesos = Progreso::where('cliente_id', $cliente->id)
            ->where('tipo', 'peso')
            ->orderBy('fecha', 'desc')
            ->get(['id','peso','fecha']);

        // Ejercicios 
        $ejercicios = Progreso::where('cliente_id', $cliente->id)
            ->where('tipo', 'ejercicio')
            ->orderBy('fecha', 'desc')
            ->limit(100)
            ->get();

        // Membresías activas (activo = 1)
        $membresiasActivas = Membresia::where('activo', 1)
            ->orderBy('nombre')
            ->get(['id','nombre','precio','duracion_dias','duracion_meses','activo']);

        return response()->json([
            'cliente' => $clienteData,
            'transacciones' => $transacciones,
            'pesos' => $pesos,
            'ejercicios' => $ejercicios,
            'membresias_activas' => $membresiasActivas,
        ]);
    });
}
    // =========================
    // ✅ CLIENTES POR VENCER
    // =========================
public function clientesPorVencer(Request $request)
{
    $hoy = Carbon::today();
    $diasAviso = (int) ($request->query('dias_aviso', 7));
    $limit = (int) ($request->query('limit', 10));
    if ($limit < 1) $limit = 10;

    // Trae SOLO el último pago por cliente (SQL), NO todas las transacciones
    $rows = DB::table(DB::raw("
        (
          SELECT t.*,
                 ROW_NUMBER() OVER (
                   PARTITION BY t.cliente_id
                   ORDER BY COALESCE(t.fecha, t.created_at) DESC, t.id DESC
                 ) AS rn
          FROM transacciones t
          WHERE t.tipo = 'pago'
        ) tp
    "))
    ->join('clientes as c', 'c.id', '=', 'tp.cliente_id')
    ->join('membresias as m', 'm.id', '=', 'tp.membresia_id')
    ->where('tp.rn', 1)
    ->select([
        'c.id as cliente_id',
        'c.nombre',
        'c.apellido',
        'c.cedula_identidad as cedula',
        'c.correo',
        'm.nombre as membresia',
        'm.duracion_dias',
        'm.duracion_meses',
        'tp.fecha',
        'tp.fecha_inicio',
        'tp.created_at',
    ])
    ->get();

    $resultado = [];

    foreach ($rows as $r) {
        $fechaInicio = !empty($r->fecha_inicio)
            ? Carbon::parse($r->fecha_inicio)->startOfDay()
            : (!empty($r->fecha) ? Carbon::parse($r->fecha)->startOfDay() : Carbon::parse($r->created_at)->startOfDay());

        // Calcular fecha fin
        $duracionDias = (int) ($r->duracion_dias ?? 0);
        if ($duracionDias > 0) {
            $fechaFin = $fechaInicio->copy()->addDays($duracionDias);
        } else {
            $duracionMeses = (int) ($r->duracion_meses ?? 1);
            if ($duracionMeses < 1) $duracionMeses = 1;
            $fechaFin = $fechaInicio->copy()->addMonthsNoOverflow($duracionMeses);
        }

        $diasRestantes = $hoy->diffInDays($fechaFin, false);

        // Solo por vencer: 0..diasAviso
        if ($diasRestantes >= 0 && $diasRestantes <= $diasAviso) {
            $resultado[] = [
                'cliente_id'        => $r->cliente_id,
                'nombre'            => $r->nombre,
                'apellido'          => $r->apellido,
                'cedula'            => $r->cedula,
                'correo'            => $r->correo,
                'membresia'         => $r->membresia,
                'fecha_ultimo_pago' => $fechaInicio->toDateString(),
                'fecha_fin'         => $fechaFin->toDateString(),
                'dias_restantes'    => $diasRestantes,
            ];
        }
    }

    // Ordena por los que vencen primero
    usort($resultado, fn($a,$b) => ($a['dias_restantes'] ?? 999999) <=> ($b['dias_restantes'] ?? 999999));

    // Limitar para dashboard
    if ($limit > 0) $resultado = array_slice($resultado, 0, $limit);

    return response()->json($resultado);
}


    // =========================
    // ✅ CLIENTES VENCIDOS
    // =========================
public function clientesVencidos(Request $request)
{
    $hoy = Carbon::today();
    $limit = (int) ($request->query('limit', 10));
    if ($limit < 1) $limit = 10;

    $rows = DB::table(DB::raw("
        (
          SELECT t.*,
                 ROW_NUMBER() OVER (
                   PARTITION BY t.cliente_id
                   ORDER BY COALESCE(t.fecha, t.created_at) DESC, t.id DESC
                 ) AS rn
          FROM transacciones t
          WHERE t.tipo = 'pago'
        ) tp
    "))
    ->join('clientes as c', 'c.id', '=', 'tp.cliente_id')
    ->join('membresias as m', 'm.id', '=', 'tp.membresia_id')
    ->where('tp.rn', 1)
    ->select([
        'c.id as cliente_id',
        'c.nombre',
        'c.apellido',
        'c.cedula_identidad as cedula',
        'c.correo',
        'm.nombre as membresia',
        'm.duracion_dias',
        'm.duracion_meses',
        'tp.fecha',
        'tp.fecha_inicio',
        'tp.created_at',
    ])
    ->get();

    $resultado = [];

    foreach ($rows as $r) {
        $fechaInicio = !empty($r->fecha_inicio)
            ? Carbon::parse($r->fecha_inicio)->startOfDay()
            : (!empty($r->fecha) ? Carbon::parse($r->fecha)->startOfDay() : Carbon::parse($r->created_at)->startOfDay());

        $duracionDias = (int) ($r->duracion_dias ?? 0);
        if ($duracionDias > 0) {
            $fechaFin = $fechaInicio->copy()->addDays($duracionDias);
        } else {
            $duracionMeses = (int) ($r->duracion_meses ?? 1);
            if ($duracionMeses < 1) $duracionMeses = 1;
            $fechaFin = $fechaInicio->copy()->addMonthsNoOverflow($duracionMeses);
        }

        $diasVencidos = $fechaFin->diffInDays($hoy, false);

        if ($diasVencidos > 0) {
            $resultado[] = [
                'cliente_id'        => $r->cliente_id,
                'nombre'            => $r->nombre,
                'apellido'          => $r->apellido,
                'cedula'            => $r->cedula,
                'correo'            => $r->correo,
                'membresia'         => $r->membresia,
                'fecha_ultimo_pago' => $fechaInicio->toDateString(),
                'fecha_fin'         => $fechaFin->toDateString(),
                'dias_vencidos'     => $diasVencidos,
            ];
        }
    }

    // Ordena por los más vencidos primero
    usort($resultado, fn($a,$b) => ($b['dias_vencidos'] ?? 0) <=> ($a['dias_vencidos'] ?? 0));

    // Limitar para dashboard
    if ($limit > 0) $resultado = array_slice($resultado, 0, $limit);

    return response()->json($resultado);
}


    // =========================
    // LISTAR CLIENTES
    // =========================
public function index(Request $request)
{
    $hoy = Carbon::today();
    $filtro = strtolower($request->query('estado_membresia', ''));

    $clientes = Cliente::with([
        'membresia',
        'usuario',
        'ultimoPago.membresia',
    ])->get();

    $clientes = $clientes->map(function ($cliente) use ($hoy) {
        $ultima = $cliente->ultimoPago;
        $membresia = $ultima?->membresia ?? $cliente->membresia;

        // sin pagos: no tiene vigencia
        if (!$ultima || !$membresia) {
            $cliente->estado_membresia = 'inactivo';
            $cliente->fecha_fin_membresia = null;
            $cliente->dias_restantes = null;
            return $cliente;
        }

        $inicio = $ultima->fecha
            ? Carbon::parse($ultima->fecha)->startOfDay()
            : $ultima->created_at->copy()->startOfDay();

        $fin = $this->calcularFechaFin($inicio, $membresia)->startOfDay();

        $cliente->fecha_fin_membresia = $fin->toDateString();
        $cliente->dias_restantes = $hoy->diffInDays($fin, false); // + faltan, - vencido
        $cliente->estado_membresia = $fin->gte($hoy) ? 'activo' : 'inactivo';

        return $cliente;
    });

    if (in_array($filtro, ['activo', 'inactivo'], true)) {
        $clientes = $clientes->filter(fn ($c) => $c->estado_membresia === $filtro)->values();
    }

    return response()->json($clientes);
}

    // =========================
    // CREAR CLIENTE + PAGO INICIAL
    // =========================
    public function store(Request $request)
    {
        $validated = $request->validate([
            'usuario_id'        => 'required|exists:users,id',
            'nombre'            => 'required|string|max:255',
            'apellido'          => 'required|string|max:255',
            'cedula_identidad'  => 'required|string|max:255|unique:clientes,cedula_identidad',
            'telefono'          => 'required|string|max:255',
            'direccion'         => 'required|string',
            'correo'            => 'required|email|max:255|unique:clientes,correo',
            'fecha_nacimiento'  => 'required|date',
            'estado'            => 'required|in:activo,inactivo,pendiente,suspendido',
            'peso'              => 'nullable|numeric',
            'altura'            => 'nullable|numeric',
            'condicion_medica'  => 'nullable|string',
            'membresia_id'      => 'required|exists:membresias,id',
            'monto_inicial'     => 'nullable|numeric|min:0',
            'descripcion_pago'  => 'nullable|string',
            'tipo_pago'       => 'required|in:efectivo,transferencia',
            'comprobante_url' => 'nullable|url|required_if:tipo_pago,transferencia',

        ]);


        if ($request->has('foto')) {
            $validated['foto'] = $request->input('foto');
        }

        return DB::transaction(function () use ($validated) {

            $cliente = Cliente::create([
                'usuario_id'        => $validated['usuario_id'],
                'nombre'            => $validated['nombre'],
                'apellido'          => $validated['apellido'],
                'cedula_identidad'  => $validated['cedula_identidad'],
                'telefono'          => $validated['telefono'],
                'direccion'         => $validated['direccion'],
                'correo'            => $validated['correo'],
                'fecha_nacimiento'  => $validated['fecha_nacimiento'],
                'estado'            => $validated['estado'],
                'peso'              => $validated['peso'] ?? null,
                'altura'            => $validated['altura'] ?? null,
                'condicion_medica'  => $validated['condicion_medica'] ?? null,
                'membresia_id'      => $validated['membresia_id'],
                'foto'              => $validated['foto'] ?? 'cliente_default.jpg',
            ]);
if (array_key_exists('peso', $validated) && $validated['peso'] !== null) {
    $fecha = !empty($validated['peso_fecha'])
        ? Carbon::parse($validated['peso_fecha'])->toDateString()
        : now('America/Guayaquil')->toDateString();

    Progreso::create([
        'cliente_id' => $cliente->id,
        'tipo'       => 'peso',
        'peso'       => (float) $validated['peso'],
        'fecha'      => $fecha,
    ]);
}


            $membresia = Membresia::findOrFail($validated['membresia_id']);
            $montoInicial = $validated['monto_inicial'] ?? $membresia->precio;

Transaccion::create([
    'cliente_id'      => $cliente->id,
    'membresia_id'    => $membresia->id,
    'monto'           => $montoInicial,
    'tipo'            => 'pago',
    'descripcion'     => $validated['descripcion_pago'] ?? 'Pago inicial al crear el cliente',
    'fecha'           => now('America/Guayaquil')->toDateString(),
    'tipo_pago'       => $validated['tipo_pago'],
    'comprobante_url' => $validated['tipo_pago'] === 'transferencia'
        ? ($validated['comprobante_url'] ?? null)
        : null,
    'created_by'      => auth()->id(),
]);



            return response()->json([
                'message' => 'Cliente creado correctamente con pago inicial.',
                'cliente' => $cliente->load('membresia', 'usuario'),
            ], 201);
        });
    }

public function show(Cliente $cliente)
{
    $hoy = Carbon::today();

    $cliente->load([
        'membresia',
        'usuario',
        'ultimoPago.membresia',
    ]);

    $ultima = $cliente->ultimoPago;
    $membresia = $ultima?->membresia ?? $cliente->membresia;

    if (!$ultima || !$membresia) {
        $cliente->estado_membresia = 'inactivo';
        $cliente->fecha_fin_membresia = null;
        $cliente->dias_restantes = null;
        return response()->json($cliente);
    }


$inicio = $ultima->fecha_inicio
    ? Carbon::parse($ultima->fecha_inicio)->startOfDay()
    : ($ultima->fecha
        ? Carbon::parse($ultima->fecha)->startOfDay()
        : $ultima->created_at->copy()->startOfDay());

    $fin = $this->calcularFechaFin($inicio, $membresia)->startOfDay();

    $cliente->fecha_fin_membresia = $fin->toDateString();
    $cliente->dias_restantes = $hoy->diffInDays($fin, false);
    $cliente->estado_membresia = $fin->gte($hoy) ? 'activo' : 'inactivo';

    return response()->json($cliente);
}


    // =========================
    // ACTUALIZAR CLIENTE + HISTORIAL PESO
    // =========================
    public function update(Request $request, Cliente $cliente)
    {
        $validated = $request->validate([
            'usuario_id'       => 'sometimes|exists:users,id',
            'cedula_identidad' => 'sometimes|string|max:255|unique:clientes,cedula_identidad,' . $cliente->id,
            'telefono'         => 'sometimes|string|max:255',
            'direccion'        => 'sometimes|string',
            'correo'           => 'sometimes|email|max:255|unique:clientes,correo,' . $cliente->id,
            'fecha_nacimiento' => 'sometimes|date',
            'estado'           => 'sometimes|in:activo,inactivo,pendiente,suspendido',
            'peso'             => 'nullable|numeric',
            'peso_fecha'       => 'sometimes|date',
            'altura'           => 'nullable|numeric',
            'condicion_medica' => 'nullable|string',
            'membresia_id'     => 'sometimes|exists:membresias,id',
        ]);

        if ($request->has('foto')) {
            $validated['foto'] = $request->input('foto');
        }

        $pesoAnterior = $cliente->peso;
        $cliente->update($validated);

        if ($request->filled('peso')) {
            $nuevoPeso = (float) $request->peso;
            $cambio = ($pesoAnterior === null) || ((float)$pesoAnterior !== $nuevoPeso);

            if ($cambio) {
                $fecha = $request->filled('peso_fecha')
                    ? Carbon::parse($request->peso_fecha)->toDateString()
                    : now()->toDateString();

                Progreso::create([
                    'cliente_id' => $cliente->id,
                    'tipo'       => 'peso',
                    'peso'       => $nuevoPeso,
                    'fecha'      => $fecha,
                ]);
            }
        }

        return response()->json([
            'message' => 'Cliente actualizado correctamente.',
            'cliente' => $cliente,
        ]);
    }

    public function destroy(Cliente $cliente)
{
    $hoy = Carbon::today('America/Guayaquil');

    // Cargar relaciones necesarias para determinar estado de membresía
    $cliente->load([
        'ultimoPago.membresia',
        'membresia',
    ]);

    $ultima = $cliente->ultimoPago ?? null;

    // membresía del último pago
    $membresia = $ultima?->membresia ?? $cliente->membresia ?? null;

    if ($ultima && $membresia) {
        $inicio = !empty($ultima->fecha)
            ? Carbon::parse($ultima->fecha)->startOfDay()
            : Carbon::parse($ultima->created_at)->startOfDay();

        $fin = $this->calcularFechaFin($inicio, $membresia)->startOfDay();

        // si aún está vigente, NO permitir eliminar
        if ($fin->gte($hoy)) {
            return response()->json([
                'message' => 'No se puede eliminar el cliente porque tiene una membresía activa.',
                'estado_membresia' => 'activo',
                'fecha_fin' => $fin->toDateString(),
                'dias_restantes' => $hoy->diffInDays($fin, false),
            ], 409); // 409 Conflict 
        }
    }

    $cliente->delete();

    return response()->json(['message' => 'Cliente eliminado correctamente.']);
}


    // =========================
    // PERFIL CLIENTE LOGUEADO
    // =========================
    public function me(Request $request)
    {
        $user = $request->user();

        $cliente = Cliente::where('correo', $user->email)
            ->with('membresia')
            ->first();

        if (!$cliente) {
            return response()->json(['message' => 'No se encontró cliente asociado.'], 404);
        }

        return response()->json($cliente);
    }

    public function updateMe(Request $request)
    {
        $user = $request->user();

        $cliente = Cliente::where('correo', $user->email)->first();
        if (!$cliente) {
            return response()->json(['message' => 'No se encontró cliente asociado.'], 404);
        }

        $validated = $request->validate([
            'telefono'         => 'sometimes|string|max:255',
            'direccion'        => 'sometimes|string',
            'peso'             => 'nullable|numeric',
            'peso_fecha'       => 'sometimes|date',
            'altura'           => 'nullable|numeric',
            'condicion_medica' => 'nullable|string',
        ]);

        $pesoAnterior = $cliente->peso;
        $cliente->update($validated);

        if ($request->filled('peso')) {
            $nuevoPeso = (float) $request->peso;
            $cambio = ($pesoAnterior === null) || ((float)$pesoAnterior !== $nuevoPeso);

            if ($cambio) {
                $fecha = $request->filled('peso_fecha')
                    ? Carbon::parse($request->peso_fecha)->toDateString()
                    : now()->toDateString();

                Progreso::create([
                    'cliente_id' => $cliente->id,
                    'tipo'       => 'peso',
                    'peso'       => $nuevoPeso,
                    'fecha'      => $fecha,
                ]);
            }
        }

        return response()->json([
            'message' => 'Perfil de cliente actualizado correctamente.',
            'cliente' => $cliente,
        ]);
    }

    public function historialPesos($clienteId)
    {
        $cliente = Cliente::findOrFail($clienteId);

        $historial = Progreso::where('cliente_id', $cliente->id)
            ->where('tipo', 'peso')
            ->orderBy('fecha', 'desc')
            ->get(['id', 'peso', 'fecha']);

        return response()->json($historial);
    }
    private function calcularFechaFin(Carbon $fechaInicio, $membresia): Carbon
{
    $duracionDias = (int) ($membresia->duracion_dias ?? 0);

    if ($duracionDias > 0) {
        return $fechaInicio->copy()->addDays($duracionDias);
    }

    $duracionMeses = (int) ($membresia->duracion_meses ?? 1);
    if ($duracionMeses < 1) $duracionMeses = 1;

    return $fechaInicio->copy()->addMonthsNoOverflow($duracionMeses);
}

}
