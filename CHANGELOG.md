# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado semántico.

## [Sin publicar]

## [0.3.0] - 2026-10-02

Almanac avisa cuando hay una versión nueva y guarda dentro de la app el registro de cambios.

### Añadido
- Aviso «Hay una nueva versión» en el calendario, con las novedades de esa versión y un botón que abre la página de descarga. «Ahora no» lo oculta hasta la siguiente versión.
- Registro de novedades dentro de la app (Ajustes, «Acerca de Almanac», «Novedades»). Se abre solo la primera vez que abres Almanac después de actualizar y muestra lo que cambió desde tu versión anterior.
- «Acerca de Almanac» en Ajustes: versión instalada, «Buscar actualizaciones» y una casilla para no buscar al abrir. Solo se consulta la lista pública de versiones en GitHub; no se envía nada de tu calendario.

### Cambiado
- La política de seguridad de la app permite conectar con `api.github.com` (solo para esa consulta) y abrir en el navegador las páginas de este repositorio.

## [0.2.0] - 2026-10-02

Primeras observaciones de uso: navegación más rápida entre meses, cumpleaños más simples y dos errores del editor corregidos.

### Añadido
- Selector de mes y año: al pulsar el título del calendario se abre una cuadrícula para saltar a cualquier mes sin ir de uno en uno. Se maneja también con el teclado.

### Cambiado
- Un cumpleaños pide solo el día y se repite cada año. La celebración, con hora de inicio y de fin, es opcional.
- Con el aviso «¿Descartar los cambios?» a la vista, Esc significa «seguir editando».

### Corregido
- Al pasar de «Evento» a «Cumpleaños» y volver, el formulario no recuperaba sus valores: seguía en «Todo el día» y «Cada año». Ahora vuelve exactamente a como estaba.
- Con el formulario de «Nuevo evento» modificado, una segunda pulsación de Esc dejaba el editor abierto pero invisible y el botón «Nuevo evento» dejaba de responder.

## [0.1.0] - 2026-10-02

Primera versión: calendario personal para Windows, con los datos cifrados en el dispositivo.

### Añadido
- Cuenta local con contraseña (Argon2id) y clave de recuperación. Los eventos se cifran con XChaCha20-Poly1305 y se guardan en SQLite.
- Bloqueo automático tras un rato sin actividad (configurable).
- Vistas de mes, semana, día y agenda.
- Eventos con color, categoría y notas; tipos de cumpleaños, aniversario y fecha especial.
- Repetición diaria, semanal, mensual y anual: se registra una vez y se repite sola. Se puede omitir una sola ocurrencia.
- Seis temas (claro, oscuro, medianoche, bosque, atardecer y papel), color de acento, densidad y tamaño de letra.
- Fases de la luna en el calendario (opcional).
- Pantallas de carga con progreso real y aviso cuando algo tarda más de lo normal.
- Atajos de teclado: `T`, `←`, `→`, `M`, `S`, `D`, `A` y `N`.
- Instaladores para Windows (`.msi` y `.exe`).

### Limitaciones conocidas
- Aún no hay sincronización entre dispositivos (prevista en `v0.2.0`).
- Aún no hay versión Android ni recordatorios (previstos en `v0.3.0`).
- Aún no se puede cambiar la contraseña, ni importar o exportar `.ics` (previsto en `v1.0.0`).