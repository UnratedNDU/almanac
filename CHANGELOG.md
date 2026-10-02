# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado semántico.

## [Sin publicar]

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