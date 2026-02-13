<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\VisitorController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\API\VisitorLogController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/register', [VisitorController::class, 'store']);

Route::get('/visitors', [VisitorController::class, 'index']);

Route::post('/login', [AuthController::class, 'login']);

Route::get('/logs', [VisitorLogController::class, 'index']);

Route::post('/check-user', [VisitorController::class, 'checkUser']);

// Route to get every registered visitor for the Master List
Route::get('/admin/all-visitors', [VisitorController::class, 'getAllVisitors']);

Route::post('/admin/checkout', [VisitorController::class, 'checkout']);

// Route to Toggle Status (Ban/Unban)
Route::put('/admin/visitors/{id}/status', [VisitorController::class, 'toggleStatus']);

Route::get('/live-monitor', [VisitorLogController::class, 'getLiveMonitoring']);
