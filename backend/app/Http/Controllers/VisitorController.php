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
            'status' => $isNewUser ? 'TRAINED' : 'RETURNING',
            // ADD THESE TWO LINES:
            'visitor_id' => $visitor->VisitorID,
            'log_id' => $log->id 
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
    public function checkUser(Request $request)
    {
        $request->validate(['photo' => 'required|string']);

        // 1. Save the temp image
        $base64Image = $request->photo;
        $imageParts = explode(";base64,", $base64Image);
        $imageDecoded = base64_decode($imageParts[1]);
        
        $tempPath = storage_path('app/temp_recognition.jpg');
        file_put_contents($tempPath, $imageDecoded);

        // 2. Run Python Recognition
        $pythonPath = "C:\\VSCode Projects\\ViSecure_project\\ai_engine\\venv\\Scripts\\python.exe";
        $scriptPath = "C:\\VSCode Projects\\ViSecure_project\\ai_engine\\06_recognize_face.py";
        
        $command = "\"$pythonPath\" \"$scriptPath\" \"$tempPath\" 2>&1";
        $output = shell_exec($command);
        $cleanOutput = trim($output);

        // --- NEW ROBUST LOGIC ---
        // 1. Check if "MATCH:" exists ANYWHERE in the output (ignoring warnings)
        if (str_contains($cleanOutput, "MATCH:")) {
            // Extract the name using Regex (safer than splitting)
            preg_match('/MATCH:(.+)/', $cleanOutput, $matches);
            
            if (isset($matches[1])) {
                $name = trim($matches[1]);
                $visitor = Visitor::where('FullName', $name)->first();
                
                if ($visitor) {
                    return response()->json([
                        'status' => 'FOUND',
                        'visitor' => $visitor
                    ]);
                }
            }
        }

        // 2. Return a cleaner error message to the frontend
        $debugMsg = "Unknown Error";
        if (str_contains($cleanOutput, "NO_FACE_DETECTED")) {
            $debugMsg = "No face clearly visible. Please remove glasses/masks or improve lighting.";
        } elseif (str_contains($cleanOutput, "UNKNOWN")) {
            $debugMsg = "Face not recognized. Please register first.";
        }

        return response()->json(['status' => 'NOT_FOUND', 'debug' => $debugMsg], 404);
    }
    public function getAllVisitors()
    {
        // This fetches every visitor from your 'visitors' table
        // We order by 'created_at' desc so the newest registrations appear first
        $visitors = Visitor::orderBy('created_at', 'desc')->get();

        return response()->json($visitors);
    }

    // --- CHECKOUT LOGIC ---
    public function checkout(Request $request)
    {
        // 1. Validate we got the Log ID from the QR code
        $request->validate(['log_id' => 'required|integer']);

        // 2. Find the Log
        $log = VisitLog::find($request->log_id);

        if (!$log) {
            return response()->json(['message' => 'Visit record not found.'], 404);
        }

        // 3. Check if already checked out
        if ($log->ExitTimestamp) {
            return response()->json(['message' => 'Visitor already checked out.'], 400);
        }

        // 4. Mark the time
        $log->ExitTimestamp = now();
        $log->save();

        // 5. Return success and the time
        return response()->json([
            'message' => 'Checkout Successful',
            'time_out' => $log->ExitTimestamp->toTimeString(),
            'visitor_name' => $log->visitor->FullName // Assuming relationship exists
        ]);
    }
}