<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name' => 'ViSecure Admin',
            'email' => 'admin@visecure.ph',
            'password' => Hash::make('password123'),
            'role' => 'admin',
        ]);
    }
}