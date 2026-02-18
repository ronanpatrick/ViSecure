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
        Schema::table('visit_logs', function (Blueprint $table) {
            $table->string('FlagReason')->nullable()->after('IsFlagged');
        });
    }

    public function down()
    {
        Schema::table('visit_logs', function (Blueprint $table) {
            $table->dropColumn('FlagReason');
        });
    }
};
