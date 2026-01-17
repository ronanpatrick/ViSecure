<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // This calls your specific AdminUserSeeder file
        $this->call([
            AdminUserSeeder::class,
        ]);

        // Optional: Keep the test user if you want it for other tests
        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);
    }
}