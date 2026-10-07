<?php

declare(strict_types=1);

return [
    'required' => 'El campo :attribute es obligatorio.',
    'string' => 'El campo :attribute debe ser texto.',
    'email' => 'El campo :attribute debe ser un email válido.',
    'max' => [
        'string' => 'El campo :attribute no debe superar los :max caracteres.',
    ],

    'attributes' => [
        'name' => 'nombre',
        'email' => 'email',
    ],
];
