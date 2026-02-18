<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VisitLog extends Model
{
    use HasFactory;

    // 1. Force it to use the correct table (since you have two migration files)
    protected $table = 'visit_logs'; 

    // 👇 ADD THIS LINE (Assuming your column is named 'LogID')
    protected $primaryKey = 'LogID';

    // 2. Allow these fields to be saved (Crucial!)
    protected $fillable = [
        'VisitorID',
        'EntryTimestamp',
        'ExitTimestamp',
        'PurposeOfVisit',
        'PersonToVisit',
        'DepartmentToVisit',
        'PrivacyConsentGiven',
        'Status',
        'IsFlagged',       // AI
        'FlagReason',      // AI
        'IsManualFlag',    // 👈 NEW (Add this)
        'ManualFlagReason' // 👈 NEW (Add this)
    ];

    // 3. Link it to the Visitor table
    public function visitor()
    {
        // This connects 'VisitorID' in logs to 'VisitorID' in visitors table
        return $this->belongsTo(Visitor::class, 'VisitorID', 'VisitorID');
    }
}