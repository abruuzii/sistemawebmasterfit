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
    Schema::table('membresias', function (Blueprint $table) {
        $table->renameColumn('duracion_dias', 'duracion_meses');  // Renombramos la columna
    });
}

public function down()
{
    Schema::table('membresias', function (Blueprint $table) {
        $table->renameColumn('duracion_meses', 'duracion_dias');  // Volvemos a renombrar si revertimos
    });
}

};
