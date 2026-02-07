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
            'photos.*' => 'string', // Ensure strictly base64 string
        ]);

        // 2. Check if Visitor already exists by Name
        $visitor = Visitor::where('FullName', $validated['FullName'])->first();
        $isNewUser = false;

        if (!$visitor) {
            // --- PATH A: NEW VISITOR ---
            $isNewUser = true;

            // =========================================================
            // 🛑 NEW SECURITY FEATURE: DUPLICATE FACE CHECK
            // =========================================================
            if ($request->has('photos') && count($request->photos) > 0) {
                // A. Save the first photo temporarily
                $base64Image = $request->photos[0];
                // Limit size to approx 10MB (14,000,000 characters of Base64)
                if (strlen($base64Image) > 14000000) { 
                    return response()->json([
                        'message' => 'Image too large. Please use a lower resolution.'
                    ], 422);
                }

                // Check if image data is valid
                if (str_contains($base64Image, ";base64,")) {
                    $imageParts = explode(";base64,", $base64Image);
                    $imageDecoded = base64_decode($imageParts[1]);
                    
                    // Generate a unique temp filename to avoid conflicts
                    $tempPath = storage_path('app/temp_check_' . uniqid() . '.jpg');
                    file_put_contents($tempPath, $imageDecoded);

                    // B. Run Python Script (07_check_duplicate.py)
                    $pythonPath = env('AI_PYTHON_PATH'); 
                    
                    // ✅ CORRECT: Use the .env path so it looks in the right folder
                    $aiBasePath = env('AI_ENGINE_PATH');
                    $scriptPath = $aiBasePath . "\\07_check_duplicate.py"; 
                    
                    // Execute command
                    $command = "\"$pythonPath\" \"$scriptPath\" \"$tempPath\" 2>&1";
                    $output = shell_exec($command);

                    // ========================================================
                    // ⬇️ ADD THIS LINE RIGHT HERE ⬇️
                    // ========================================================
                    \Log::info("🤖 DUPLICATE CHECK RAW OUTPUT: " . $output); 
                    // ========================================================
                    
                    // C. Cleanup Temp File
                    if (file_exists($tempPath)) {
                        unlink($tempPath);
                    }
                    
                    // C. Cleanup Temp File
                    if (file_exists($tempPath)) {
                        unlink($tempPath);
                    }

                    // D. Parse Result
                    if (str_contains($output, "DUPLICATE_FOUND:")) {
                        // Extract the ID of the person this face belongs to
                        preg_match('/DUPLICATE_FOUND:(\d+)/', $output, $matches);
                        $duplicateID = $matches[1] ?? null;

                        if ($duplicateID) {
                            $duplicateUser = Visitor::find($duplicateID);
                            $duplicateName = $duplicateUser ? $duplicateUser->FullName : "Another User";

                            // STOP REGISTRATION HERE
                            return response()->json([
                                'message' => "Registration Blocked: This face is already registered as '$duplicateName'. Please Log In instead."
                            ], 422);
                        }
                    }
                }
            }
            // =========================================================
            // 🛑 END OF DUPLICATE CHECK
            // =========================================================

            // Create the record (Only if no duplicate was found)
            $visitor = Visitor::create([
                'FullName' => $validated['FullName'],
                'Age' => $request->Age,
                'Sex' => $request->Sex,
                'AffiliationType' => $request->AffiliationType ?? 'Visitor',
                'ContactNumber' => $request->ContactNumber ?? null,
                'EmailAddress' => $request->EmailAddress ?? null,
            ]);

            // CHECK PHOTOS & TRAIN AI
            if ($request->has('photos') && count($request->photos) > 0) {
                // We pass the WHOLE visitor object now, so we can delete it if training fails
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
            
            'visitor_id' => $visitor->VisitorID,
            'log_id' => $log->getKey() 
        ], 201);
    }

    // --- DEBUG VERSION: SAVES TO BOTH AI AND STORAGE FOLDERS ---
    private function savePhotosAndTrain($visitor, $photos)
    {
        $name = $visitor->FullName;
        
        // LOGGING START
        \Log::info("🟢 START REGISTRATION for: $name");

        // 1. Define Paths using .ENV
        $aiBasePath = env('AI_ENGINE_PATH'); 
        $aiDatasetFolder = $aiBasePath . "\\dataset"; 
        $aiUserFolder = $aiDatasetFolder . "\\" . $name;
        $storageFolder = "photos/" . $name; 

        \Log::info("📂 AI Folder: $aiUserFolder");

        // 2. Create Folders
        if (!file_exists($aiUserFolder)) {
            mkdir($aiUserFolder, 0777, true);
        }
        if (!Storage::disk('public')->exists($storageFolder)) {
            Storage::disk('public')->makeDirectory($storageFolder);
        }

        // Python Configuration
        $pythonPath = env('AI_PYTHON_PATH');
        $validatorScript = $aiBasePath . "\\05_validate_face.py";
        $trainerScript = $aiBasePath . "\\02_face_training.py";

        $validFaceCount = 0;
        $checksNeeded = 3; 

        // 3. Loop through photos
        foreach ($photos as $index => $base64Image) {
            \Log::info("📸 Processing Photo #$index"); // LOG
            
            $imageParts = explode(";base64,", $base64Image);
            if (count($imageParts) < 2) {
                 \Log::error("❌ Invalid Image Format on #$index");
                 continue; 
            }
            
            $imageDecoded = base64_decode($imageParts[1]);
            
            // SAVE
            $aiFilePath = $aiUserFolder . "\\image_" . $index . ".jpg";
            file_put_contents($aiFilePath, $imageDecoded);
            $storageFilePath = $storageFolder . "/image_" . $index . ".jpg";
            Storage::disk('public')->put($storageFilePath, $imageDecoded);

            // 4. Run Validator
            if ($index < $checksNeeded) {
                $command = "\"$pythonPath\" \"$validatorScript\" \"$aiFilePath\" 2>&1";
                
                $output = [];
                exec($command, $output); 
                
                // LOG THE PYTHON OUTPUT
                \Log::info("🐍 Python Output #$index: " . implode(" | ", $output));

                $faceFound = false;
                foreach ($output as $line) {
                    if (str_contains($line, "DETECTED_FACE")) {
                        $faceFound = true;
                        break;
                    }
                }

                if (!$faceFound) {
                    \Log::error("❌ NO FACE FOUND in Photo #$index. Aborting."); // LOG FAILURE
                    
                    // Cleanup
                    array_map('unlink', glob("$aiUserFolder/*.*"));
                    rmdir($aiUserFolder);
                    Storage::disk('public')->deleteDirectory($storageFolder);
                    $visitor->delete();
                    
                    // THROW ERROR
                    abort(422, "⚠️ No face detected in Photo #".($index+1).". (Check Lighting!)");
                }
                
                $validFaceCount++;
            }
        }

        // 5. Run Training
        if ($validFaceCount >= $checksNeeded) {
            \Log::info("🧠 Starting Training...");
            $command = "\"$pythonPath\" \"$trainerScript\"";
            $trainOutput = shell_exec($command . " 2>&1");
            \Log::info("🧠 Training Output: $trainOutput");
        }
        
        \Log::info("✅ REGISTRATION COMPLETE for $name");
    }

    public function checkUser(Request $request)
    {
        $request->validate(['photo' => 'required|string']);

        // --- 1. GENERATE UNIQUE FILENAME (The Fix) ---
        // Using uniqid() prevents multiple users from overwriting the same file
        $uniqueId = uniqid(); 
        $fileName = "temp_recognition_{$uniqueId}.jpg";
        $tempPath = storage_path("app/{$fileName}"); 

        // 2. Save the temp image to the UNIQUE path
        $base64Image = $request->photo;
        $imageParts = explode(";base64,", $base64Image);
        $imageDecoded = base64_decode($imageParts[1]);
        file_put_contents($tempPath, $imageDecoded);

        // 3. Run Python Recognition (Using .ENV)
        $pythonPath = env('AI_PYTHON_PATH');
        $aiBasePath = env('AI_ENGINE_PATH');
        $scriptPath = $aiBasePath . "\\06_recognize_face.py";
        
        $command = "\"$pythonPath\" \"$scriptPath\" \"$tempPath\" 2>&1";
        $output = shell_exec($command);
        $cleanOutput = trim($output);

        // --- 4. CLEAN UP IMMEDIATELY ---
        // Delete the specific temp file so it doesn't clutter the server
        if (file_exists($tempPath)) {
            unlink($tempPath);
        }

        // --- NEW ROBUST LOGIC ---
        // 5. Check if "MATCH:" exists ANYWHERE in the output
        if (str_contains($cleanOutput, "MATCH:")) {
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

        // 6. Return a cleaner error message
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
        // 1. Validate the input
        // We accept 'log_id' because that is what the frontend sends
        $request->validate([
            'log_id' => 'required' 
        ]);

        // 2. Find the Log using your custom Primary Key 'LogID'
        // Since your model says: protected $primaryKey = 'LogID';
        // The find() function automatically knows to look for LogID.
        $log = VisitLog::find($request->log_id);

        if (!$log) {
            return response()->json(['message' => 'Visit record not found.'], 404);
        }

        // 3. Check if they already checked out
        if ($log->ExitTimestamp) {
            return response()->json(['message' => 'Visitor already checked out.'], 400);
        }

        // 4. Mark the exit time
        $log->ExitTimestamp = now();
        $log->Status = 'Completed'; // Optional: Good practice to update status
        $log->save();

        // 5. Return success (SAFE VERSION)
        // We removed "$log->visitor->FullName" because it was crashing the server.
        return response()->json([
            'message' => 'Checkout Successful',
            'time_out' => $log->ExitTimestamp->toTimeString(),
        ], 200);
    }

    // --- NEW: TOGGLE BAN STATUS ---
    public function toggleStatus($id)
    {
        // 1. Find the visitor
        $visitor = Visitor::find($id);

        if (!$visitor) {
            return response()->json(['message' => 'Visitor not found'], 404);
        }

        // 2. Toggle the status
        // If currently Banned -> make Active. Else -> make Banned.
        $visitor->Status = ($visitor->Status === 'Banned') ? 'Active' : 'Banned';
        $visitor->save();

        return response()->json([
            'message' => 'Visitor status updated',
            'new_status' => $visitor->Status,
            'id' => $visitor->VisitorID
        ]);
    }
}