# Almanac

Calendario personal, rápido y privado para PC y Android. Hecho con Rust y Tauri.

> Estado: `v0.1.0`, primera versión para Windows. Descarga el instalador desde la sección **Releases**.

## Qué hace

- Eventos, días especiales y fechas que se repiten (cumpleaños, aniversarios) sin tener que reañadirlos.
- Vistas de mes, semana, día y agenda.
- Temas y colores personalizables, con pantallas de carga que muestran el progreso real.
- Inicio de sesión local: tus datos se guardan **cifrados** (Argon2id + XChaCha20-Poly1305) y funcionan sin conexión.
- Sincronización entre PC y móvil con cifrado de extremo a extremo (planeada para `v0.2.0`).

## Desarrollo

Requisitos: Rust estable, Node.js 20 o superior y las dependencias de Tauri para tu sistema
(en Windows: WebView2 y las herramientas de C++ de Visual Studio).

```bash
npm install
npm run tauri dev      # modo desarrollo
npm run tauri build    # instaladores (.msi y .exe)
```

Pruebas:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
npx vitest run
```

## Hoja de ruta

| Versión | Contenido |
|---|---|
| `v0.1.0` | Windows: acceso local, vistas, eventos, recurrencias, temas y pantallas de carga |
| `v0.2.0` | Sincronización con cifrado de extremo a extremo |
| `v0.3.0` | Android y recordatorios |
| `v1.0.0` | Importar y exportar `.ics`, pulido e instaladores para PC y móvil |

## Licencia

[MIT](LICENSE)