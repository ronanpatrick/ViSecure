<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ScanController extends Controller
{
    public function process(Request $request)
    {
        try {
            // 1. Save the Image
            $base64Image = $request->input('image');
            
            if (!$base64Image) {
                return response()->json(['success' => false, 'error' => 'No image sent']);
            }

            $imageParts = explode(";base64,", $base64Image);
            $imageBase64 = base64_decode($imageParts[1]);
            $fileName = 'scan_' . time() . '.png';
            $filePath = storage_path('app/public/temp/' . $fileName);

            if (!file_exists(dirname($filePath))) {
                mkdir(dirname($filePath), 0777, true);
            }
            file_put_contents($filePath, $imageBase64);

            // ==========================================
            // 2. CALL THE "BRAIN" (EXPLICIT PATHS)
            // ==========================================
            
            // POINT TO THE VENV PYTHON (The one with dlib installed)
            // Note: We use double backslashes \\ for Windows paths
            $pythonPath = "C:\\VSCode Projects\\ViSecure_project\\ai_engine\\venv\\Scripts\\python.exe";

            // POINT TO THE PYTHON SCRIPT
            $scriptPath = "C:\\VSCode Projects\\ViSecure_project\\ai_engine\\04_verify_scan.py";
            
            // Check if files exist before running (Good for debugging)
            if (!file_exists($pythonPath)) {
                return response()->json(['success' => false, 'error' => 'Python VENV not found at: ' . $pythonPath]);
            }
            if (!file_exists($scriptPath)) {
                return response()->json(['success' => false, 'error' => 'Script not found at: ' . $scriptPath]);
            }

            // Construct the command
            // We wrap paths in quotes "" just in case there are spaces
            $command = "\"$pythonPath\" \"$scriptPath\" \"$filePath\"";
            
            // Run it (2>&1 redirects errors to output so we can see them if it fails)
            $output = shell_exec($command . " 2>&1");
            
            // Decode the result
            $result = json_decode($output, true);

            // Cleanup: Delete the temp image
            // unlink($filePath); // Uncomment this when it works perfectly

            if ($result && isset($result['success']) && $result['success']) {
                return response()->json([
                    'success' => true,
                    'name' => $result['name'],
                    'message' => $result['message']
                ]);
            } else {
                // If json_decode failed, $output contains the raw error message
                $errorMsg = $result['message'] ?? $output;
                return response()->json([
                    'success' => false,
                    'error' => 'AI Error: ' . $errorMsg
                ]);
            }

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()]);
        }
    }
}