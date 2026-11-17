<x-mail::message>
# Te invitaron a Track Studio

Tienes acceso a la producción **{{ $productionName }}**. Crea tu cuenta para escuchar las versiones y comentarlas.

<x-mail::button :url="$url">
Aceptar invitación
</x-mail::button>

El enlace caduca el {{ $expiresAt }} (hora de Ecuador) y solo sirve una vez.

Si no esperabas este correo, ignóralo.
</x-mail::message>