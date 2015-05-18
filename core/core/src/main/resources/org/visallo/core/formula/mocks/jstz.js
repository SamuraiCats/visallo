define([], function() {
    return {
        determine: function() {
            return {
                name: function() {
                    return USERS_TIMEZONE;
                }
            };
        },
        olson: {
          timezones: {
              '-720,0'   : 'Pacific/Majuro',
              '-660,0'   : 'Pacific/Pago_Pago',
              '-600,1'   : 'America/Adak',
              '-600,0'   : 'Pacific/Honolulu',
              '-570,0'   : 'Pacific/Marquesas',
              '-540,0'   : 'Pacific/Gambier',
              '-540,1'   : 'America/Anchorage',
              '-480,1'   : 'America/Los_Angeles',
              '-480,0'   : 'Pacific/Pitcairn',
              '-420,0'   : 'America/Phoenix',
              '-420,1'   : 'America/Denver',
              '-360,0'   : 'America/Guatemala',
              '-360,1'   : 'America/Chicago',
              '-360,1,s' : 'Pacific/Easter',
              '-300,0'   : 'America/Bogota',
              '-300,1'   : 'America/New_York',
              '-270,0'   : 'America/Caracas',
              '-240,1'   : 'America/Halifax',
              '-240,0'   : 'America/Santo_Domingo',
              '-240,1,s' : 'America/Santiago',
              '-210,1'   : 'America/St_Johns',
              '-180,1'   : 'America/Godthab',
              '-180,0'   : 'America/Argentina/Buenos_Aires',
              '-180,1,s' : 'America/Montevideo',
              '-120,0'   : 'America/Noronha',
              '-120,1'   : 'America/Noronha',
              '-60,1'    : 'Atlantic/Azores',
              '-60,0'    : 'Atlantic/Cape_Verde',
              '0,0'      : 'UTC',
              '0,1'      : 'Europe/London',
              '60,1'     : 'Europe/Berlin',
              '60,0'     : 'Africa/Lagos',
              '60,1,s'   : 'Africa/Windhoek',
              '120,1'    : 'Asia/Beirut',
              '120,0'    : 'Africa/Johannesburg',
              '180,0'    : 'Asia/Baghdad',
              '180,1'    : 'Europe/Moscow',
              '210,1'    : 'Asia/Tehran',
              '240,0'    : 'Asia/Dubai',
              '240,1'    : 'Asia/Baku',
              '270,0'    : 'Asia/Kabul',
              '300,1'    : 'Asia/Yekaterinburg',
              '300,0'    : 'Asia/Karachi',
              '330,0'    : 'Asia/Kolkata',
              '345,0'    : 'Asia/Kathmandu',
              '360,0'    : 'Asia/Dhaka',
              '360,1'    : 'Asia/Omsk',
              '390,0'    : 'Asia/Rangoon',
              '420,1'    : 'Asia/Krasnoyarsk',
              '420,0'    : 'Asia/Jakarta',
              '480,0'    : 'Asia/Shanghai',
              '480,1'    : 'Asia/Irkutsk',
              '525,0'    : 'Australia/Eucla',
              '525,1,s'  : 'Australia/Eucla',
              '540,1'    : 'Asia/Yakutsk',
              '540,0'    : 'Asia/Tokyo',
              '570,0'    : 'Australia/Darwin',
              '570,1,s'  : 'Australia/Adelaide',
              '600,0'    : 'Australia/Brisbane',
              '600,1'    : 'Asia/Vladivostok',
              '600,1,s'  : 'Australia/Sydney',
              '630,1,s'  : 'Australia/Lord_Howe',
              '660,1'    : 'Asia/Kamchatka',
              '660,0'    : 'Pacific/Noumea',
              '690,0'    : 'Pacific/Norfolk',
              '720,1,s'  : 'Pacific/Auckland',
              '720,0'    : 'Pacific/Tarawa',
              '765,1,s'  : 'Pacific/Chatham',
              '780,0'    : 'Pacific/Tongatapu',
              '780,1,s'  : 'Pacific/Apia',
              '840,0'    : 'Pacific/Kiritimati'
            }
        }
    };
})
