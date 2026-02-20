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

        // 2. Attempt to authenticate the user
        if (Auth::attempt($credentials)) {
            $user = Auth::user();
            
            // 🔑 CREATE REAL TOKEN: This is required for your protected routes
            $token = $user->createToken('admin-token')->plainTextToken;

            return response()->json([
                'status' => 'success',
                'token' => $token,
                'message' => 'Login successful',
                'user' => $user
            ]);
        }

        // 3. Return 401 if authentication fails
        return response()->json([
            'status' => 'error',
            'message' => 'Invalid email or password'
        ], 401);
    }
}