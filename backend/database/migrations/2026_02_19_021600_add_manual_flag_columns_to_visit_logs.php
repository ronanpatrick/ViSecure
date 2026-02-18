<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('visit_logs', function (Blueprint $table) {
            // Add these two columns
            if (!Schema::hasColumn('visit_logs', 'IsManualFlag')) {
                $table->boolean('IsManualFlag')->default(false)->after('IsFlagged');
            }
            if (!Schema::hasColumn('visit_logs', 'ManualFlagReason')) {
                $table->string('ManualFlagReason')->nullable()->after('IsManualFlag');
            }
        });
    }

    public function down()
    {
        Schema::table('visit_logs', function (Blueprint $table) {
            $table->dropColumn(['IsManualFlag', 'ManualFlagReason']);
        });
    }
};