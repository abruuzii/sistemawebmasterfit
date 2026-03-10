<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
   public function up()
{
    Schema::table('transacciones', function (Blueprint $table) {
        $table->string('tipo_pago')->default('efectivo'); // efectivo / transferencia
        $table->text('comprobante_url')->nullable();      // URL en Firebase
    });
}

public function down()
{
    Schema::table('transacciones', function (Blueprint $table) {
        $table->dropColumn(['tipo_pago', 'comprobante_url']);
    });
}

};
