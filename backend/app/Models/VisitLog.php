<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VisitLog extends Model
{
    use HasFactory;

    // 1. Force it to use the correct table (since you have two migration files)
    protected $table = 'visit_logs'; 

    // 2. Allow these fields to be saved (Crucial!)
    protected $fillable = [
        'VisitorID',
        'EntryTimestamp',
        'ExitTimestamp',
        'PurposeOfVisit',
        'PersonToVisit',
        'DepartmentToVisit',
        'PrivacyConsentGiven',
        // Add any other columns you are saving
    ];

    // 3. Link it to the Visitor table
    public function visitor()
    {
        // This connects 'VisitorID' in logs to 'VisitorID' in visitors table
        return $this->belongsTo(Visitor::class, 'VisitorID', 'VisitorID');
    }
}