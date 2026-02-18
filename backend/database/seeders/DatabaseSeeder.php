<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Create Admin
        $this->call(AdminUserSeeder::class);

        // 2. Create Visitors & Scenarios (This is the missing part!)
        $this->call(TestScenarioSeeder::class);
    }
}