<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Models\VisitorLog; // <--- IMPORT THE MODEL

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
            // 2. CALL THE "BRAIN"
            // ==========================================
            
            $pythonPath = "C:\\VSCode Projects\\ViSecure_project\\ai_engine\\venv\\Scripts\\python.exe";
            $scriptPath = "C:\\VSCode Projects\\ViSecure_project\\ai_engine\\04_verify_scan.py";
            
            if (!file_exists($pythonPath)) return response()->json(['success' => false, 'error' => 'Python not found']);
            if (!file_exists($scriptPath)) return response()->json(['success' => false, 'error' => 'Script not found']);

            $command = "\"$pythonPath\" \"$scriptPath\" \"$filePath\"";
            $output = shell_exec($command . " 2>&1");
            $result = json_decode($output, true);

            // Cleanup temp image (Optional: Keep it if you want to save proof of entry)
            // unlink($filePath); 

            // ==========================================
            // 3. LOG THE RESULT TO DATABASE
            // ==========================================

            if ($result && isset($result['success']) && $result['success']) {
                
                // --- SUCCESS: LOG THE ENTRY ---
                VisitorLog::create([
                    'name' => $result['name'],
                    'status' => 'GRANTED',
                    'visited_at' => now(),
                    // 'image_path' => $fileName, // Uncomment if you want to save the photo link
                ]);

                return response()->json([
                    'success' => true,
                    'name' => $result['name'],
                    'message' => $result['message']
                ]);

            } else {
                
                // --- SECURITY: LOG THE FAILED ATTEMPT ---
                // This tracks "Unknown" people trying to enter
                VisitorLog::create([
                    'name' => 'Unknown',
                    'status' => 'DENIED',
                    'visited_at' => now(),
                ]);

                $errorMsg = $result['message'] ?? 'Unknown Error';
                return response()->json([
                    'success' => false,
                    'error' => $errorMsg
                ]);
            }

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()]);
        }
    }
}