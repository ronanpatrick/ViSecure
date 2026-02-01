<?php

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

Route::get('/debug-libs', function () {
    $python = env('AI_PYTHON_PATH');
    
    // 1. Try to import the libraries
    // We try to import cv2, face_recognition, and numpy
    $command = "\"$python\" -c \"import cv2; import face_recognition; import numpy; print('LIBRARIES_OK')\" 2>&1";
    $output = shell_exec($command);

    return [
        'Python Path' => $python,
        'Library Check Output' => trim($output)
    ];
});

Route::get('/check-limit', function () {
    return [
        'Post Limit' => ini_get('post_max_size'),
        'Upload Limit' => ini_get('upload_max_filesize'),
        'Memory Limit' => ini_get('memory_limit')
    ];
});