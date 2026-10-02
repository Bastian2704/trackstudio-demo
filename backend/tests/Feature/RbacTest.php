<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;

/*
|--------------------------------------------------------------------------
| TS-15 — RBAC desde el claim de Auth0 (D4.8)
|--------------------------------------------------------------------------
|
| La sonda no representa un recurso de negocio: demuestra, antes de HU-05,
| que la misma identidad stateless produce 403 o 204 según el rol del JWT.
| Spec: docs/specs/backend/HU-04.md §3.2 y §4.
|
*/

it('rechaza con 401 UNAUTHENTICATED cuando falta el token', function () {
    $this->postJson('/api/v1/rbac-check')
        ->assertUnauthorized()
        ->assertJsonPath('code', 'UNAUTHENTICATED');
});

it('rechaza con 403 FORBIDDEN cuando un artista intenta escribir', function () {
    impersonarToken(claimsDeToken('artista'));

    $this->postJson('/api/v1/rbac-check')
        ->assertForbidden()
        ->assertJsonPath('code', 'FORBIDDEN');
});

it('permite a un productor ejecutar la acción protegida', function () {
    impersonarToken(claimsDeToken('productor'));

    $this->postJson('/api/v1/rbac-check')
        ->assertNoContent();
});

it('ejecuta la autorización sin consultar la base de datos', function () {
    impersonarToken(claimsDeToken('productor'));

    $consultas = 0;
    DB::listen(function () use (&$consultas): void {
        $consultas++;
    });

    $this->postJson('/api/v1/rbac-check')->assertNoContent();

    expect($consultas)->toBe(0);
});
