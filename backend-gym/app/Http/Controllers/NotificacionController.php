<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use SendGrid\Mail\Mail as SendGridMail;
use App\Models\User;

class NotificacionController extends Controller
{
    public function vencenManana()
    {
        $tz = 'America/Guayaquil';

        $targetDate = request('date')
            ? Carbon::parse(request('date'), $tz)->toDateString()
            : Carbon::now($tz)->addDay()->toDateString();

        $dryRun = request('dry') == '1';

        // 1) Correos de admins
        $adminEmails = User::where('rol', 'admin')
            ->where('is_active', 1)
            ->pluck('email')
            ->filter()
            ->values()
            ->all();

        if (empty($adminEmails)) {
            return response()->json([
                'ok' => false,
                'sent' => false,
                'target_date' => $targetDate,
                'admin_count' => 0,
                'msg' => 'No hay admins activos con email',
            ], 200);
        }

        // 2) Último pago por cliente (tipo pago)
        $lastPayments = DB::table('transacciones')
            ->select('cliente_id', DB::raw('MAX(fecha) as last_fecha'))
            ->where('tipo', 'pago')
            ->groupBy('cliente_id');

        // 3) Traer datos necesarios para calcular vencimiento
        $rows = DB::table('clientes as c')
            ->joinSub($lastPayments, 'lp', fn($j) => $j->on('lp.cliente_id', '=', 'c.id'))
            ->join('transacciones as t', function ($j) {
                $j->on('t.cliente_id', '=', 'c.id')
                    ->on('t.fecha', '=', 'lp.last_fecha')
                    ->where('t.tipo', '=', 'pago');
            })
            ->join('membresias as m', 'm.id', '=', 't.membresia_id')
            ->where('c.estado', 'activo')
            ->select([
                'c.id',
                'c.nombre',
                'c.apellido',
                'c.correo',
                't.fecha as ultimo_pago',
                'm.nombre as membresia',
                'm.duracion_meses',
                'm.duracion_dias',
            ])
            ->get();

        $clientesVencen = [];

        foreach ($rows as $r) {
            if (empty($r->ultimo_pago)) continue;

            $inicio = Carbon::parse($r->ultimo_pago, $tz);

            $dias  = (int)($r->duracion_dias ?? 0);
            $meses = (int)($r->duracion_meses ?? 0);

            if ($dias <= 0 && $meses <= 0) continue;

            $vence = $dias > 0
                ? $inicio->copy()->addDays($dias)
                : $inicio->copy()->addMonths($meses);

            if ($vence->toDateString() !== $targetDate) continue;

            $clientesVencen[] = [
                'cliente_id' => $r->id,
                'cliente' => trim(($r->nombre ?? '') . ' ' . ($r->apellido ?? '')),
                'correo' => $r->correo,
                'membresia' => $r->membresia,
                'ultimo_pago' => $inicio->toDateString(),
                'vence' => $vence->toDateString(),
            ];
        }

        // Si no hay nadie que venza ese día, NO enviar
        if (empty($clientesVencen)) {
            return response()->json([
                'ok' => true,
                'sent' => false,
                'target_date' => $targetDate,
                'admin_count' => count($adminEmails),
                'count' => 0,
                'msg' => 'No hay clientes que venzan en la fecha objetivo',
            ], 200);
        }

        // Modo prueba: no envía, solo devuelve lista
        if ($dryRun) {
            return response()->json([
                'ok' => true,
                'sent' => false,
                'dry' => true,
                'target_date' => $targetDate,
                'admin_count' => count($adminEmails),
                'count' => count($clientesVencen),
                'clientes' => $clientesVencen,
            ], 200);
        }

        // =========================
        // 4) Construir correo PRO
        // =========================

        $gymName = env('SENDGRID_FROM_NAME', 'Sistema Gym');

        // Texto plano (fallback)
        $plainLines = [
            "{$gymName} - Aviso de vencimiento de membresías",
            "Fecha objetivo: {$targetDate}",
            "",
            "Clientes cuya membresía vence en la fecha indicada:",
            ""
        ];

        foreach ($clientesVencen as $c) {
            $plainLines[] = "- {$c['cliente']} | {$c['correo']} | {$c['membresia']} | Vence: {$c['vence']}";
        }

        $plain = implode("\n", $plainLines);

        // HTML
        $rowsHtml = '';
        foreach ($clientesVencen as $c) {
            $rowsHtml .= '
              <tr>
                <td style="padding:10px;border-bottom:1px solid #eee;">' . e($c['cliente']) . '</td>
                <td style="padding:10px;border-bottom:1px solid #eee;">' . e($c['correo']) . '</td>
                <td style="padding:10px;border-bottom:1px solid #eee;">' . e($c['membresia']) . '</td>
                <td style="padding:10px;border-bottom:1px solid #eee;">' . e($c['vence']) . '</td>
              </tr>';
        }

        $html = '
        <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111;">
          <div style="max-width:760px;margin:0 auto;border:1px solid #eaeaea;border-radius:12px;overflow:hidden;">
            <div style="background:#111;color:#fff;padding:16px 18px;">
              <div style="font-size:16px;font-weight:700;">' . e($gymName) . '</div>
              <div style="font-size:13px;opacity:.85;">Notificación automática</div>
            </div>

            <div style="padding:18px;">
              <h2 style="margin:0 0 10px;font-size:18px;">Aviso: membresías por vencer</h2>

              <p style="margin:0 0 14px;">
                Se detectaron clientes cuya membresía vence el día <b>' . e($targetDate) . '</b>.
              </p>

              <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:10px;overflow:hidden;">
                <thead>
                  <tr style="background:#f7f7f7;">
                    <th align="left" style="padding:10px;border-bottom:1px solid #eee;">Cliente</th>
                    <th align="left" style="padding:10px;border-bottom:1px solid #eee;">Correo</th>
                    <th align="left" style="padding:10px;border-bottom:1px solid #eee;">Membresía</th>
                    <th align="left" style="padding:10px;border-bottom:1px solid #eee;">Vence</th>
                  </tr>
                </thead>
                <tbody>
                  ' . $rowsHtml . '
                </tbody>
              </table>

              <p style="margin:14px 0 0;color:#555;font-size:12px;">
                Este mensaje fue generado automáticamente por el sistema para apoyar la gestión de renovaciones.
                Si ya se registró una renovación, puede ignorarlo.
              </p>
            </div>
          </div>
        </div>';

        // =========================
        // 5) Enviar por SendGrid
        // =========================

        $fromEmail = env('SENDGRID_FROM_EMAIL');
        $fromName  = $gymName;

        $email = new SendGridMail();
        $email->setFrom($fromEmail, $fromName);

        // Asunto más formal
        $email->setSubject("Aviso de vencimiento: membresías ({$targetDate})");

        // Contenidos
        $email->addContent("text/plain", $plain);
        $email->addContent("text/html", $html);

        // Reply-to (opcional)
        if (!empty($fromEmail)) {
            $email->setReplyTo($fromEmail, $fromName);
        }

        foreach ($adminEmails as $to) {
            $email->addTo($to);
        }

        $sendgrid = new \SendGrid(env('SENDGRID_API_KEY'));
        $response = $sendgrid->send($email);

        return response()->json([
            'ok' => true,
            'sent' => true,
            'target_date' => $targetDate,
            'admin_count' => count($adminEmails),
            'sendgrid_status' => $response->statusCode(),
            'count' => count($clientesVencen),
        ], 200);
    }
}
