<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ScanController; // <-- Add this at the VERY TOP of the file

Route::get('/', function () {
    return view('welcome');
});

use App\Http\Controllers\MonitorController;

Route::get('/monitor', [MonitorController::class, 'index']);

Route::get('/scan', function () {
    return view('scan');
});

Route::post('/process-scan', [ScanController::class, 'process']);