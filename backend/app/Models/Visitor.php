<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Visitor extends Model
{
    use HasFactory;

    // We tell Laravel your primary key is 'VisitorID', not standard 'id'
    protected $primaryKey = 'VisitorID';

    protected $fillable = [
        'FacialData',
        'FullName',
        'Age',
        'Sex',
        'AffiliationType',
        'ContactNumber',
        'EmailAddress',
    ];
}