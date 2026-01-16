<?php

namespace App\Http\Controllers;

use App\Models\Visitor;
use App\Models\VisitLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage; 

class VisitorController extends Controller
{
    public function store(Request $request)
    {
        // 1. Validate Input
        $validated = $request->validate([
            'FullName' => 'required|string',
            'Age' => 'required|integer',
            'Sex' => 'required|string',
            'PurposeOfVisit' => 'required|string',
            'PersonToVisit' => 'nullable|string',
            'photos' => 'array', 
        ]);

        // 2. SMART FORK: Check if Visitor already exists
        $visitor = Visitor::where('FullName', $validated['FullName'])->first();
        $isNewUser = false;

        if (!$visitor) {
            // --- PATH A: NEW VISITOR ---
            $isNewUser = true;

            // Create the record first (so we have an ID/Name)
            $visitor = Visitor::create([
                'FullName' => $validated['FullName'],
                'Age' => $request->Age,
                'Sex' => $request->Sex,
                'AffiliationType' => $request->AffiliationType ?? 'Visitor',
                'ContactNumber' => $request->ContactNumber ?? null,
                'EmailAddress' => $request->EmailAddress ?? null,
            ]);

            // CHECK PHOTOS
            if ($request->has('photos') && count($request->photos) > 0) {
                // We pass the WHOLE visitor object now, so we can delete it if it fails
                $this->savePhotosAndTrain($visitor, $request->photos);
            }
        } 
        
        // --- PATH B: RETURNING VISITOR ---

        // 3. Create Visit Log
        $log = VisitLog::create([
            'VisitorID' => $visitor->VisitorID,
            'EntryTimestamp' => now(),
            'PurposeOfVisit' => $validated['PurposeOfVisit'],
            'PersonToVisit' => $request->PersonToVisit,
            'DepartmentToVisit' => $request->DepartmentToVisit ?? null,
            'PrivacyConsentGiven' => true,
        ]);

        // 4. Return Response
        return response()->json([
            'message' => $isNewUser 
                ? 'Registration & AI Training Complete! You may now enter.' 
                : 'Welcome back! Your visit has been logged.',
            'visitor_name' => $visitor->FullName,
            'status' => $isNewUser ? 'TRAINED' : 'RETURNING'
        ], 201);
    }

    // --- HELPER FUNCTION: STRICTER VERSION (With Zombie Cleanup) ---
    private function savePhotosAndTrain($visitor, $photos)
    {
        $name = $visitor->FullName;

        // 1. Create Folder
        $basePath = "C:\\VSCode Projects\\ViSecure_project\\ai_engine\\dataset";
        $userFolder = $basePath . "\\" . $name;

        if (!file_exists($userFolder)) {
            mkdir($userFolder, 0777, true);
        }

        // Paths
        $pythonPath = "C:\\VSCode Projects\\ViSecure_project\\ai_engine\\venv\\Scripts\\python.exe";
        $validatorScript = "C:\\VSCode Projects\\ViSecure_project\\ai_engine\\05_validate_face.py";
        $trainerScript = "C:\\VSCode Projects\\ViSecure_project\\ai_engine\\02_face_training.py";

        $validFaceCount = 0;
        $checksNeeded = 3; // We will check the first 3 photos

        // 2. Loop through photos
        foreach ($photos as $index => $base64Image) {
            $imageParts = explode(";base64,", $base64Image);
            if (count($imageParts) < 2) continue; 
            
            $imageDecoded = base64_decode($imageParts[1]);
            $filePath = $userFolder . "\\image_" . $index . ".jpg";
            
            // Save file
            file_put_contents($filePath, $imageDecoded);

            // 3. STRICT CHECK: Run Validator on the first 3 images
            if ($index < $checksNeeded) {
                $command = "\"$pythonPath\" \"$validatorScript\" \"$filePath\" 2>&1";
                
                $output = [];
                exec($command, $output); 

                // SEARCH FOR KEYWORD "DETECTED_FACE"
                $faceFound = false;
                foreach ($output as $line) {
                    if (trim($line) === "DETECTED_FACE") {
                        $faceFound = true;
                        break;
                    }
                }

                if (!$faceFound) {
                    // --- FAIL CLEANUP ---
                    
                    // 1. Delete the bad photos folder
                    array_map('unlink', glob("$userFolder/*.*"));
                    rmdir($userFolder);

                    // 2. IMPORTANT: DELETE THE ZOMBIE USER FROM DATABASE 🧟‍♂️🔫
                    $visitor->delete();
                    
                    // 3. Stop Everything
                    abort(422, "⚠️ Validation Failed on Photo #".($index+1).": No face detected. Please hold still and align your face.");
                }
                
                $validFaceCount++;
            }
        }

        // 4. Run Training ONLY if we passed all checks
        if ($validFaceCount >= $checksNeeded) {
            $command = "\"$pythonPath\" \"$trainerScript\"";
            shell_exec($command . " 2>&1");
        }
    }
}