<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AIService
{
    protected $pythonPath;
    protected $aiBasePath;

    public function __construct()
    {
        $this->pythonPath = env('AI_PYTHON_PATH');
        $this->aiBasePath = env('AI_ENGINE_PATH');
    }

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
}