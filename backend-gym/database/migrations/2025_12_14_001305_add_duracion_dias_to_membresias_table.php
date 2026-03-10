<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('membresias', function (Blueprint $table) {
            $table->unsignedInteger('duracion_dias')->nullable()->after('duracion_meses');
        });
    }

    public function down(): void
    {
        Schema::table('membresias', function (Blueprint $table) {
            $table->dropColumn('duracion_dias');
        });
    }
};
