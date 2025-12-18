<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

use App\Http\Controllers\MonitorController;

Route::get('/monitor', [MonitorController::class, 'index']);