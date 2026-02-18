<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('visitors', function (Blueprint $table) {
            $table->string('MiddleName')->nullable()->after('FirstName'); // Full Middle Name
            $table->string('Email')->nullable()->after('ContactNumber');
            $table->string('VisitorType')->default('Visitor')->after('Sex'); // e.g. Contractor, Parent
        });
    }

    public function down()
    {
        Schema::table('visitors', function (Blueprint $table) {
            $table->dropColumn(['MiddleName', 'Email', 'VisitorType']);
        });
    }
};