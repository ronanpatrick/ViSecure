<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        // 1. Validate the input
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // 2. Check if the user exists and password is correct
        if (Auth::attempt($credentials)) {
            $user = Auth::user();
            // Create a simple token (for now, we'll just return success)
            return response()->json([
                'status' => 'success',
                'message' => 'Login successful',
                'user' => $user
            ]);
        }

        // 3. If failed
        return response()->json([
            'status' => 'error',
            'message' => 'Invalid credentials'
        ], 401);
    }
}