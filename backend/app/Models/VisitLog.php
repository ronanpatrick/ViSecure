<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VisitLog extends Model
{
    use HasFactory;

    protected $primaryKey = 'LogID';

    protected $fillable = [
        'VisitorID',
        'EntryTimestamp',
        'ExitTimestamp',
        'ExpectedExitTimestamp',
        'PurposeOfVisit',
        'PersonToVisit',
        'DepartmentToVisit',
        'Status',
        'PrivacyConsentGiven',
    ];
}