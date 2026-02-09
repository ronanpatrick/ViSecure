<?php

namespace App\Http\Controllers;

use App\Models\Visitor;
use App\Models\VisitLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str; // Added for cleaner folder names

class VisitorController extends Controller
{
    // THIS IS THE REGISTRATION FUNCTION (Named 'store' in Laravel)
    public function store(Request $request)
    {
        // 1. Validate Input (SPLIT NAMES)
        $validated = $request->validate([
            'FirstName' => 'required|string|max:255',
            'MiddleInitial' => 'nullable|string|max:5',
            'Surname' => 'required|string|max:255',
            'Age' => 'required|integer',
            'Sex' => 'required|string',
            'PurposeOfVisit' => 'required|string',
            'PersonToVisit' => 'nullable|string',
            'photos' => 'array', 
            'photos.*' => 'string', 
        ]);

        // 2. Check Duplicate by NAME (First + Last)
        // We use the new split columns here
        $visitor = Visitor::where('FirstName', $validated['FirstName'])
                          ->where('Surname', $validated['Surname'])
                          ->first();
                          
        $isNewUser = false;

        if (!$visitor) {
            // --- PATH A: NEW VISITOR ---
            $isNewUser = true;

            // =========================================================
            // 🛑 DUPLICATE FACE CHECK
            // =========================================================
            if ($request->has('photos') && count($request->photos) > 0) {
                // Check Size
                $base64Image = $request->photos[0];
                if (strlen($base64Image) > 14000000) { 
                    return response()->json(['message' => 'Image too large.'], 422);
                }

                if (str_contains($base64Image, ";base64,")) {
                    $imageParts = explode(";base64,", $base64Image);
                    $imageDecoded = base64_decode($imageParts[1]);
                    $tempPath = storage_path('app/temp_check_' . uniqid() . '.jpg');
                    file_put_contents($tempPath, $imageDecoded);

                    // Run Python
                    $pythonPath = env('AI_PYTHON_PATH'); 
                    $aiBasePath = env('AI_ENGINE_PATH');
                    $scriptPath = $aiBasePath . "\\07_check_duplicate.py"; 
                    $command = "\"$pythonPath\" \"$scriptPath\" \"$tempPath\" 2>&1";
                    $output = shell_exec($command);
                    \Log::info("🤖 DUPLICATE CHECK: " . $output); 

                    if (file_exists($tempPath)) unlink($tempPath);

                    // Parse Result
                    if (str_contains($output, "DUPLICATE_FOUND:")) {
                        // The label will now look like "15_Doe_John"
                        // Regex (\d+) grabs the first number (15) which is the ID
                        preg_match('/DUPLICATE_FOUND:(\d+)/', $output, $matches);
                        $duplicateID = $matches[1] ?? null;

                        if ($duplicateID) {
                            $duplicateUser = Visitor::find($duplicateID);
                            // Use the Model accessor for the name
                            $duplicateName = $duplicateUser ? $duplicateUser->FullName : "Another User";

                            return response()->json([
                                'message' => "Registration Blocked: Face already registered as '$duplicateName'. Please Log In."
                            ], 422);
                        }
                    }
                }
            }
            // =========================================================

            // Create the record (SPLIT FIELDS)
            $visitor = Visitor::create([
                'FirstName' => $validated['FirstName'],
                'MiddleInitial' => $validated['MiddleInitial'] ?? '',
                'Surname' => $validated['Surname'],
                'Age' => $request->Age,
                'Sex' => $request->Sex,
                'AffiliationType' => $request->AffiliationType ?? 'Visitor',
                'ContactNumber' => $request->ContactNumber ?? null,
                'EmailAddress' => $request->EmailAddress ?? null,
            ]);

            // CHECK PHOTOS & TRAIN AI
            if ($request->has('photos') && count($request->photos) > 0) {
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

        return response()->json([
            'message' => $isNewUser ? 'Registration Complete!' : 'Welcome back!',
            'visitor_name' => $visitor->FullName, // Uses the magic accessor
            'status' => $isNewUser ? 'TRAINED' : 'RETURNING',
            'visitor_id' => $visitor->VisitorID,
            'log_id' => $log->getKey() 
        ], 201);
    }

    private function savePhotosAndTrain($visitor, $photos)
    {
        // 1. ROBUST FOLDER NAMING: "15_Doe_John"
        // This ensures unique folders even if two people have the same name
        $safeSurname = Str::slug($visitor->Surname);
        $safeFirstName = Str::slug($visitor->FirstName);
        $folderName = "{$visitor->VisitorID}_{$safeSurname}_{$safeFirstName}";
        
        \Log::info("🟢 REGISTRATION FOLDER: $folderName");

        $aiBasePath = env('AI_ENGINE_PATH'); 
        $aiDatasetFolder = $aiBasePath . "\\dataset"; 
        $aiUserFolder = $aiDatasetFolder . "\\" . $folderName;
        $storageFolder = "photos/" . $folderName; 

        if (!file_exists($aiUserFolder)) mkdir($aiUserFolder, 0777, true);
        if (!Storage::disk('public')->exists($storageFolder)) Storage::disk('public')->makeDirectory($storageFolder);

        // ... (Python Paths & Config) ...
        $pythonPath = env('AI_PYTHON_PATH');
        $validatorScript = $aiBasePath . "\\05_validate_face.py";
        $trainerScript = $aiBasePath . "\\02_face_training.py";
        $validFaceCount = 0;
        $checksNeeded = 3; 

        foreach ($photos as $index => $base64Image) {
            $imageParts = explode(";base64,", $base64Image);
            if (count($imageParts) < 2) continue; 
            
            $imageDecoded = base64_decode($imageParts[1]);
            
            $aiFilePath = $aiUserFolder . "\\image_" . $index . ".jpg";
            file_put_contents($aiFilePath, $imageDecoded);
            
            $storageFilePath = $storageFolder . "/image_" . $index . ".jpg";
            Storage::disk('public')->put($storageFilePath, $imageDecoded);

            // Run Validator
            if ($index < $checksNeeded) {
                $command = "\"$pythonPath\" \"$validatorScript\" \"$aiFilePath\" 2>&1";
                $output = [];
                exec($command, $output); 
                
                $faceFound = false;
                foreach ($output as $line) {
                    if (str_contains($line, "DETECTED_FACE")) {
                        $faceFound = true;
                        break;
                    }
                }

                if (!$faceFound) {
                    \Log::error("❌ NO FACE FOUND in Photo #$index");
                    // Cleanup
                    array_map('unlink', glob("$aiUserFolder/*.*"));
                    rmdir($aiUserFolder);
                    Storage::disk('public')->deleteDirectory($storageFolder);
                    $visitor->delete();
                    abort(422, "⚠️ No face detected. Check lighting!");
                }
                $validFaceCount++;
            }
        }

        if ($validFaceCount >= $checksNeeded) {
            $command = "\"$pythonPath\" \"$trainerScript\"";
            $trainOutput = shell_exec($command . " 2>&1");
            \Log::info("🧠 Training Output: $trainOutput");
        }
    }

    public function checkUser(Request $request)
    {
        $request->validate(['photo' => 'required|string']);

        $uniqueId = uniqid(); 
        $tempPath = storage_path("app/temp_recognition_{$uniqueId}.jpg"); 

        $imageParts = explode(";base64,", $request->photo);
        $imageDecoded = base64_decode($imageParts[1]);
        file_put_contents($tempPath, $imageDecoded);

        $pythonPath = env('AI_PYTHON_PATH');
        $aiBasePath = env('AI_ENGINE_PATH');
        $scriptPath = $aiBasePath . "\\06_recognize_face.py";
        
        $command = "\"$pythonPath\" \"$scriptPath\" \"$tempPath\" 2>&1";
        $output = shell_exec($command);
        $cleanOutput = trim($output);

        if (file_exists($tempPath)) unlink($tempPath);

        // 5. PARSE RESULT (CRITICAL FIX)
        // Python now returns the folder name: "MATCH:15_Doe_John"
        if (str_contains($cleanOutput, "MATCH:")) {
            preg_match('/MATCH:(.+)/', $cleanOutput, $matches);
            
            if (isset($matches[1])) {
                $folderLabel = trim($matches[1]);
                
                // EXTRACT ID from "15_Doe_John" -> "15"
                // This regex takes everything before the first underscore
                preg_match('/^(\d+)_/', $folderLabel, $idMatch);
                
                if (isset($idMatch[1])) {
                    $visitorID = $idMatch[1];
                    $visitor = Visitor::find($visitorID); // Fast Lookup by ID!
                    
                    if ($visitor) {
                        return response()->json([
                            'status' => 'FOUND',
                            'visitor' => $visitor // Contains 'FullName' via accessor
                        ]);
                    }
                }
            }
        }

        $debugMsg = "Unknown Error";
        if (str_contains($cleanOutput, "NO_FACE_DETECTED")) {
            $debugMsg = "No face visible. Remove mask/glasses.";
        } elseif (str_contains($cleanOutput, "UNKNOWN")) {
            $debugMsg = "Face not recognized. Please register.";
        }

        return response()->json(['status' => 'NOT_FOUND', 'debug' => $debugMsg], 404);
    }

    public function getAllVisitors()
    {
        return response()->json(Visitor::orderBy('created_at', 'desc')->get());
    }

    public function checkout(Request $request)
    {
        $request->validate(['log_id' => 'required']);
        $log = VisitLog::find($request->log_id);

        if (!$log) return response()->json(['message' => 'Record not found'], 404);
        if ($log->ExitTimestamp) return response()->json(['message' => 'Already checked out'], 400);

        $log->ExitTimestamp = now();
        $log->Status = 'Completed';
        $log->save();

        return response()->json([
            'message' => 'Checkout Successful',
            'time_out' => $log->ExitTimestamp->toTimeString(),
        ], 200);
    }

    public function toggleStatus($id)
    {
        $visitor = Visitor::find($id);
        if (!$visitor) return response()->json(['message' => 'Not found'], 404);

        $visitor->Status = ($visitor->Status === 'Banned') ? 'Active' : 'Banned';
        $visitor->save();

        return response()->json(['message' => 'Status updated', 'new_status' => $visitor->Status]);
    }
}