<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use SendGrid\Mail\Mail as SendGridMail;
use App\Models\User;
use Illuminate\Support\Facades\Cache;


class NotificarMembresiasPorVencer extends Command
{
    protected $signature = 'gym:notificar-vencen-manana';
    protected $description = 'Envía correo a admins con clientes que vencen mañana';

    public function handle()
    {
        $tz = 'America/Guayaquil';
        $targetDate = Carbon::now($tz)->addDay()->toDateString();

        // 1) Correos de admins
        $adminEmails = User::where('rol', 'admin')
            ->where('is_active', 1)
            ->pluck('email')
            ->filter()
            ->values()
            ->all();

        if (empty($adminEmails)) {
            $this->info("No hay admins activos con email");
            return Command::SUCCESS;
        }

        // 2) Último pago por cliente (tipo pago)
        $lastPayments = DB::table('transacciones')
            ->select('cliente_id', DB::raw('MAX(fecha) as last_fecha'))
            ->where('tipo', 'pago')
            ->groupBy('cliente_id');

        // 3) Traer datos para calcular vencimiento
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
                'cliente'   => trim(($r->nombre ?? '') . ' ' . ($r->apellido ?? '')),
                'correo'    => $r->correo,
                'membresia' => $r->membresia,
                'vence'     => $vence->toDateString(),
            ];
        }

        if (empty($clientesVencen)) {
            $this->info("No hay clientes que venzan mañana ({$targetDate})");
            return Command::SUCCESS;
        }

        // =========================
        // 4) Construir correo PRO
        // =========================
        $gymName   = env('SENDGRID_FROM_NAME', 'Gimnasio Master Fit');
        $fromEmail = env('SENDGRID_FROM_EMAIL');

        // Texto plano (fallback)
        $plainLines = [
            "{$gymName} - Aviso de vencimiento de membresías",
            "Fecha objetivo: {$targetDate}",
            "",
            "Se listan los clientes cuya membresía vence en la fecha indicada:",
            ""
        ];

        foreach ($clientesVencen as $c) {
            $plainLines[] = "- {$c['cliente']} | {$c['correo']} | {$c['membresia']} | Vence: {$c['vence']}";
        }

        $plainLines[] = "";
        $plainLines[] = "Este mensaje fue generado automáticamente para apoyar la gestión de renovaciones.";
        $plainLines[] = "Si ya se registró una renovación, puede ignorar esta notificación.";

        $plain = implode("\n", $plainLines);

        // HTML bonito
        $rowsHtml = '';
        foreach ($clientesVencen as $c) {
            $rowsHtml .= '
              <tr>
                <td style="padding:10px;border-bottom:1px solid #eee;">' . e($c['cliente']) . '</td>
                
                <td style="padding:10px;border-bottom:1px solid #eee;">' . e($c['membresia']) . '</td>
                <td style="padding:10px;border-bottom:1px solid #eee;">' . e($c['vence']) . '</td>
              </tr>';
        }

        $total = count($clientesVencen);

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
                Se detectaron <b>' . e($total) . '</b> cliente(s) cuya membresía vence el día <b>' . e($targetDate) . '</b>.
              </p>

              <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:10px;overflow:hidden;">
                <thead>
                  <tr style="background:#f7f7f7;">
                    <th align="left" style="padding:10px;border-bottom:1px solid #eee;">Cliente</th>
                    <th align="left" style="padding:10px;border-bottom:1px solid #eee;">Membresía</th>
                    <th align="left" style="padding:10px;border-bottom:1px solid #eee;">Vence</th>
                  </tr>
                </thead>
                <tbody>
                  ' . $rowsHtml . '
                </tbody>
              </table>

              <p style="margin:14px 0 0;color:#555;font-size:12px;">
                Este mensaje fue generado automáticamente para apoyar la gestión de renovaciones.
                Si ya se registró una renovación, puede ignorar esta notificación.
              </p>
            </div>
          </div>
        </div>';

        // =========================
        // 5) Enviar por SendGrid
        // =========================
        $email = new SendGridMail();
        $email->setFrom($fromEmail, $gymName);
        $email->setSubject("Aviso de vencimiento: membresías ({$targetDate})");
        $email->addContent("text/plain", $plain);
        $email->addContent("text/html", $html);

        if (!empty($fromEmail)) {
            $email->setReplyTo($fromEmail, $gymName);
        }

        foreach ($adminEmails as $to) {
            $email->addTo($to);
        }

        $sendgrid = new \SendGrid(env('SENDGRID_API_KEY'));
        $resp = $sendgrid->send($email);

        $this->info("Enviado a " . count($adminEmails) . " admin(s). SendGrid=" . $resp->statusCode() . " clientes=" . $total);
                // =========================
        // 6) Enviar correo a cada CLIENTE
        // =========================
        $enviadosClientes = 0;
        $erroresClientes  = 0;

        foreach ($clientesVencen as $c) {

            // (Opcional) evita duplicados por si el cron corre dos veces
            $cacheKey = "mail:vencimiento_cliente:{$c['correo']}:{$targetDate}";
            if (Cache::has($cacheKey)) {
                continue;
            }

            $plainCliente = implode("\n", [
                "{$gymName} - Recordatorio de vencimiento",
                "",
                "Hola {$c['cliente']},",
                "Te recordamos que tu membresía vence el {$c['vence']}.",
                "",
                "Si deseas renovar, ponte en contacto con administración.",
                "",
                "Este mensaje fue generado automáticamente. No es necesario responder.",
            ]);

            $htmlCliente = '
            <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111;">
              <div style="max-width:760px;margin:0 auto;border:1px solid #eaeaea;border-radius:12px;overflow:hidden;">
                <div style="background:#111;color:#fff;padding:16px 18px;">
                  <div style="font-size:16px;font-weight:700;">' . e($gymName) . '</div>
                  <div style="font-size:13px;opacity:.85;">Notificación automática</div>
                </div>

                <div style="padding:18px;">
                  <h2 style="margin:0 0 10px;font-size:18px;">Tu membresía vence mañana</h2>

                  <p style="margin:0 0 12px;">
                    Hola <b>' . e($c['cliente']) . '</b>, te recordamos que tu membresía
                     vence el día <b>' . e($c['vence']) . '</b>.
                  </p>

                  <div style="background:#f7f7f7;border:1px solid #eee;border-radius:10px;padding:12px 14px;margin:12px 0;">
                    <div><b>Membresía:</b> ' . e($c['membresia']) . '</div>
                    <div><b>Vence:</b> ' . e($c['vence']) . '</div>
                  </div>

                  <p style="margin:0 0 10px;">
                    Si deseas renovar, ponte en contacto con administración.
                  </p>

                  <p style="margin:14px 0 0;color:#555;font-size:12px;">
                    Este mensaje fue generado automáticamente.
                  </p>
                </div>
              </div>
            </div>';

            try {
                $emailCliente = new SendGridMail();
                $emailCliente->setFrom($fromEmail, $gymName);
                $emailCliente->setSubject("Tu membresía vence mañana ({$targetDate})");
                $emailCliente->addTo($c['correo'], $c['cliente']);
                $emailCliente->addContent("text/plain", $plainCliente);
                $emailCliente->addContent("text/html", $htmlCliente);

                if (!empty($fromEmail)) {
                    $emailCliente->setReplyTo($fromEmail, $gymName);
                }

                $sendgrid = new \SendGrid(env('SENDGRID_API_KEY'));
                $respCliente = $sendgrid->send($emailCliente);

                if ($respCliente->statusCode() >= 200 && $respCliente->statusCode() < 300) {
                    $enviadosClientes++;
                    Cache::put($cacheKey, true, now()->addDays(3)); // opcional
                } else {
                    $erroresClientes++;
                }
            } catch (\Throwable $e) {
                $erroresClientes++;
            }
        }

        $this->info("Clientes: enviados={$enviadosClientes} errores={$erroresClientes}");

        return Command::SUCCESS;
    }
}
