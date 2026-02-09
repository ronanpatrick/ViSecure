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
        Schema::table('visitors', function (Blueprint $table) {
            // 🛑 COMMENT THIS OUT (It's already deleted!)
            // $table->dropColumn('FullName');
            
            // Add new columns
            // Note: I added a check to only add them if they don't exist yet, 
            // to prevent another crash if you run this multiple times.
            if (!Schema::hasColumn('visitors', 'FirstName')) {
                $table->string('FirstName')->after('VisitorID');
            }
            if (!Schema::hasColumn('visitors', 'MiddleInitial')) {
                $table->string('MiddleInitial')->nullable()->after('FirstName'); 
            }
            if (!Schema::hasColumn('visitors', 'Surname')) {
                $table->string('Surname')->after('MiddleInitial');
            }
        });
    }
};
