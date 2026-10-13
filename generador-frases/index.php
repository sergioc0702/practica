<?php
declare(strict_types=1);

$frases = [
    "La vida es una aventura audaz o no es nada.",
    "El éxito es la suma de pequeños esfuerzos repetidos día tras día.",
    "La perseverancia es el camino del éxito.",
    "Cree en ti y todo lo demás llegará de forma natural.",
    "La felicidad no es algo hecho: proviene de tus propias acciones.",
];

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

echo json_encode(
    ['frase' => $frases[array_rand($frases)]],
    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
);
