<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('security_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('VisitorID');
            $table->unsignedBigInteger('LogID')->nullable(); // Optional: Link to specific visit
            $table->string('Action'); // 'FLAG', 'UNFLAG', 'BAN', 'UNBAN', 'FORCE_EXIT'
            $table->string('Reason')->nullable();
            $table->string('Officer')->default('System'); // 'System' or Admin Name
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent();

            // Foreign Keys
            $table->foreign('VisitorID')->references('VisitorID')->on('visitors')->onDelete('cascade');
            $table->foreign('LogID')->references('LogID')->on('visit_logs')->onDelete('set null');
        });
    }

    public function down()
    {
        Schema::dropIfExists('security_logs');
    }
};