# Gestión de Ventas & Control de Negocios 🚀
> **Software profesional offline-first para gestión comercial, inventario, cierres de turno y sincronización segura entre terminales.**
> Desarrollado por **Julio_GE**

---

## 📋 Descripción General

**Gestión de Ventas** es una solución integral diseñada para optimizar las operaciones diarias de comercios, restaurantes, cafeterías y negocios minoristas. Su arquitectura offline-first garantiza un funcionamiento ininterrumpido sin depender de conexión a internet, manteniendo la soberanía y privacidad absoluta de todos los datos en el dispositivo local.

---

## ✨ Características Principales

### 1. 💼 Punto de Venta y Cierres de Turno Inteligentes
- **Cálculo automático de ventas**: Registro por arqueo de inventario restante (el sistema calcula exactamente cuántas unidades se vendieron según la diferencia de stock).
- **Desglose de pagos multimoneda y métodos**:
  - Efectivo desglosado por denominaciones de billetes oficiales.
  - Transferencias bancarias con captura de número de comprobante.
  - Ventas a crédito / fiado (VIP) con detalle de cliente y concepto.
- **Detección de diferencias**: Indicadores instantáneos de cuadre de caja (sobrantes o faltantes).
- **Cálculo automático de salarios**: Liquidación configurable fija o por porcentaje sobre el total facturado.

### 2. 📦 Gestión de Inventario y Almacén
- **Catálogo de productos**: Registro por categorías, precios de venta, costos y control de stock mínimo.
- **Entradas y reposiciones de almacén**: Registro de movimientos de entrada, reposición a piso de venta y mermas.
- **Historial de movimientos**: Auditoría completa con fecha, responsable y concepto.
- **Escáner de código de barras**: Soporte para cámara en dispositivos móviles y lectores de código de barras en PC.

### 3. 💱 Monitor de Tasas de Cambio en Vivo (elTOQUE)
- **Monedas soportadas**: USD, EUR, MLC, Zelle, Tarjeta Clásica (CLA), MXN, CAD, GBP, CHF, BRL, COP, CLP, ARS, VES, PEN, DOP y más.
- **Banderas SVG vectoriales**: Visualización nítida y consistente tanto en Windows como en Android.
- **Iconos nativos y deltas de fluctuación**: Indicadores de variación (▲ subida / ▼ bajada) con colores representativos.
- **Automatización de sincronización**: Actualizaciones programadas a las **10:00 AM** y **10:00 PM**, con caché local offline y opción de recarga manual.

### 4. 🔄 Centro de Sincronización QR Offline-First
- **Recepción de Cierres de Turno (Empleado ➔ Admin)**:
  - El empleado genera un código QR comprimido (`LZString`) con su cierre.
  - El Administrador escanea el QR desde su terminal.
  - El Administrador emite automáticamente un código de acuse de recibo (`ACK`) para que el empleado valide el cierre de su turno de manera segura y sin internet.
- **Sincronización Directa entre Administradores (Admin ↔ Admin)**:
  - Permite clonar o sincronizar todo el catálogo, inventario, reportes de ventas y tasas de cambio entre dos terminales de Administrador.
  - **Protocolo de Seguridad**: Exclusivo para sesiones de Administrador activas con **licencia verificada en ambos dispositivos**. La pantalla de activación de licencias rechaza estos paquetes, garantizando que nadie sin licencia pueda capturar o clonar información comercial.

### 5. 🛡️ Copias de Seguridad y Respaldo Inteligente
- **Formato `.gvbak` cifrado y comprimido**: Exportación e importación de la base de datos completa con un solo clic.
- **Auto-backup diario**: Respaldo automático durante el inicio o cambio de jornada.
- **Restauración de penúltima copia (`Backup.old`)**: Recuperación instantánea ante cualquier error humano.
- **Guía de extracción manual de datos**: Rutas físicas en Android (WebView LevelDB), Windows (`%APPDATA%`) y navegador.

### 6. 🎨 Personalización Visual y Adaptabilidad
- **Temas de color**: Blanco Puro, Negro Total, Atardecer, Bosque, Océano, Noche Índigo y Café.
- **Tipografías y tamaños de texto**: Ajuste dinámico de escala de fuentes para pantallas táctiles y monitores grandes.
- **Marca propia**: Carga de logo del negocio e imagen de fondo personalizada.

### 7. 🛠️ Panel de Desarrollador (Dev)
- Control de vigencia de licencias (permanente o por días).
- Configuración de canales de actualización (Telegram / GitHub).
- Ajuste del token de API de tasas.
- Restablecimiento seguro de credenciales maestras y restauración limpia de fábrica.

---

## 📱 Plataformas Compatibles

| Plataforma | Entorno | Distribución |
|---|---|---|
| **Android** | Teléfonos y Tablets (Android 7.0+) | APK / AAB instalable |
| **Windows PC** | Windows 10 / 11 (64-bit) | Instalador Electron / Portable |
| **Web / PWA** | Chrome, Edge, Safari, Firefox | Aplicación Web Progresiva |

---

## 🔒 Arquitectura de Seguridad y Privacidad

- **100% Offline-First**: No se transmiten datos de inventario, ventas ni clientes a servidores de terceros.
- **Permiso de Cámara Seguro**: El procesamiento de códigos QR y códigos de barras ocurre en tiempo real y estrictamente en la memoria local del dispositivo.
- **Aislamiento de Perfiles (RBAC)**: Los empleados no tienen acceso a márgenes de ganancia, costos de adquisición ni configuraciones del sistema.

---

## 📄 Licencia

Este software se distribuye bajo los términos del **Acuerdo de Licencia de Usuario Final (EULA)**. Consulte el archivo `Licence.txt` para más detalles.

---

© 2026 Gestión de Ventas. Desarrollado por **Julio_GE**.
