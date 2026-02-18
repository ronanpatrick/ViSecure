<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Http; // 👈 NEW: For talking to Python Server
use Illuminate\Support\Facades\DB;   // 👈 NEW: For DB queries
use Carbon\Carbon;                   // 👈 NEW: For Date math

class AIService
{
    protected $pythonPath;
    protected $aiBasePath;
    
    // 🐍 The URL of your running Python AI Engine (main.py)
    protected $baseUrl = 'http://127.0.0.1:5000'; 

    public function __construct()
    {
        $this->pythonPath = env('AI_PYTHON_PATH');
        $this->aiBasePath = env('AI_ENGINE_PATH');
    }

    // ---------------------------------------------------------
    // 🤖 NEW: TRAFFIC PREDICTION (Python Server)
    // ---------------------------------------------------------

    /**
     * Sends raw historical logs to the Python AI Engine.
     * The Python engine uses Polynomial Regression to return a prediction curve.
     */
    public function predictHourlyTraffic()
    {
        try {
            // 1. EXTRACT DATA (Get logs from the last 30 days)
            // We only need the timestamps.
            $rawLogs = DB::table('visit_logs')
                ->select('EntryTimestamp as timestamp')
                ->whereDate('EntryTimestamp', '<', Carbon::today()) // Strictly past data
                ->whereDate('EntryTimestamp', '>=', Carbon::today()->subDays(30)) // Optimization: Limit data size
                ->get()
                ->toArray();

            // 2. SEND TO PYTHON (The "Handshake")
            // We send the data to the /predict-traffic endpoint we defined in main.py
            $response = Http::timeout(5)->post("{$this->baseUrl}/predict-traffic", [
                'history' => $rawLogs
            ]);

            // 3. RETURN PREDICTION
            if ($response->successful()) {
                return $response->json()['prediction'];
            }

            // Fallback: If Python is offline, log it and return flat line
            \Illuminate\Support\Facades\Log::warning("AI Engine Offline: " . $response->body());
            return array_fill(0, 24, 0);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("AI Connection Error: " . $e->getMessage());
            return array_fill(0, 24, 0);
        }
    }

    // ---------------------------------------------------------
    // 👤 EXISTING: FACE RECOGNITION (Shell Scripts)
    // ---------------------------------------------------------

    /**
     * Check if the face is already registered (Script 07)
     */
    public function findDuplicate($base64Image)
    {
        if (strlen($base64Image) > 14000000) return "IMAGE_TOO_LARGE";

        $tempPath = storage_path('app/temp_check_' . uniqid() . '.jpg');
        $this->saveBase64ToDisk($base64Image, $tempPath);

        $script = $this->aiBasePath . "\\07_check_duplicate.py";
        $command = "\"{$this->pythonPath}\" \"$script\" \"$tempPath\" 2>&1";
        $output = shell_exec($command);
        
        if (file_exists($tempPath)) unlink($tempPath); // Cleanup

        // Parse Output
        if (str_contains($output, "DUPLICATE_FOUND:")) {
            preg_match('/DUPLICATE_FOUND:(\d+)/', $output, $matches);
            return $matches[1] ?? null; // Returns the ID of the duplicate
        }

        return null; // No duplicate found
    }

    /**
     * Recognize a user from a photo (Script 06)
     */
    public function recognizeUser($base64Image)
    {
        $tempPath = storage_path('app/temp_recog_' . uniqid() . '.jpg');
        $this->saveBase64ToDisk($base64Image, $tempPath);

        $script = $this->aiBasePath . "\\06_recognize_face.py";
        $command = "\"{$this->pythonPath}\" \"$script\" \"$tempPath\" 2>&1";
        $output = shell_exec($command);
        $cleanOutput = trim($output);

        if (file_exists($tempPath)) unlink($tempPath);

        // Parse: "MATCH:15_Doe_John"
        if (str_contains($cleanOutput, "MATCH:")) {
            preg_match('/MATCH:(.+)/', $cleanOutput, $matches);
            if (isset($matches[1])) {
                preg_match('/^(\d+)_/', trim($matches[1]), $idMatch);
                return ['status' => 'FOUND', 'id' => $idMatch[1] ?? null];
            }
        }

        // Return debug info if failed
        if (str_contains($cleanOutput, "NO_FACE_DETECTED")) return ['status' => 'ERROR', 'msg' => 'No face visible.'];
        return ['status' => 'NOT_FOUND', 'msg' => 'Face not recognized.'];
    }

    /**
     * Save photos and run training (Script 05 & 02)
     */
    public function validateAndTrain($visitor, $photos)
    {
        $safeSurname = Str::slug($visitor->Surname);
        $safeFirstName = Str::slug($visitor->FirstName);
        $folderName = "{$visitor->VisitorID}_{$safeSurname}_{$safeFirstName}";
        
        $aiUserFolder = $this->aiBasePath . "\\dataset\\" . $folderName;
        $storageFolder = "photos/" . $folderName;

        if (!file_exists($aiUserFolder)) mkdir($aiUserFolder, 0777, true);
        if (!Storage::disk('public')->exists($storageFolder)) Storage::disk('public')->makeDirectory($storageFolder);

        $validatorScript = $this->aiBasePath . "\\05_validate_face.py";
        $validFaceCount = 0;

        foreach ($photos as $index => $photo) {
            $aiFilePath = $aiUserFolder . "\\image_" . $index . ".jpg";
            $this->saveBase64ToDisk($photo, $aiFilePath);
            
            // Save copy to public storage
            $storageFilePath = $storageFolder . "/image_" . $index . ".jpg";
            Storage::disk('public')->put($storageFilePath, file_get_contents($aiFilePath));

            // Run Validator (Only for first few photos to save time)
            if ($index < 3) {
                $command = "\"{$this->pythonPath}\" \"$validatorScript\" \"$aiFilePath\" 2>&1";
                $output = shell_exec($command);
                if (str_contains($output, "DETECTED_FACE")) {
                    $validFaceCount++;
                } else {
                    // ROLLBACK: Delete everything if bad photo
                    $this->cleanupFolders($aiUserFolder, $storageFolder);
                    return false; // Failed
                }
            }
        }

        // Run Trainer (Script 02)
        $trainerScript = $this->aiBasePath . "\\02_face_training.py";
        shell_exec("\"{$this->pythonPath}\" \"$trainerScript\" 2>&1");
        
        return true; // Success
    }

    // --- Helpers ---

    private function saveBase64ToDisk($base64, $path)
    {
        $imageParts = explode(";base64,", $base64);
        $content = base64_decode(count($imageParts) > 1 ? $imageParts[1] : $base64);
        file_put_contents($path, $content);
    }

    private function cleanupFolders($aiFolder, $publicFolder)
    {
        array_map('unlink', glob("$aiFolder/*.*"));
        rmdir($aiFolder);
        Storage::disk('public')->deleteDirectory($publicFolder);
    }

    public function checkPurpose($text)
    {
        try {
            // 1. Send text to Python Engine
            $response = Http::timeout(2)->post("{$this->baseUrl}/check-purpose", [
                'purpose' => $text
            ]);

            if ($response->successful()) {
                return $response->json(); // Returns { "is_suspicious": true, "confidence": 98.5 }
            }

            // Fallback: If Python is offline, assume it's NOT suspicious (to avoid blocking)
            return ['is_suspicious' => false, 'confidence' => 0];

        } catch (\Exception $e) {
            // Log error but don't crash
            \Illuminate\Support\Facades\Log::error("NLP Error: " . $e->getMessage());
            return ['is_suspicious' => false, 'confidence' => 0];
        }
    }
}