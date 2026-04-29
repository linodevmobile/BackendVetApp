# VetApp — Handoff para Claude Code

Paquete de diseño completo para implementar la app **VetApp** (software clínico veterinario) en Flutter.

---

## ⚠️ Sobre estos archivos

Los archivos `.jsx` y `.html` de `prototype/` **son referencias de diseño**, no código de producción. Fueron creados como un prototipo interactivo en React para explorar y validar la experiencia visual y de interacción antes de construir la app real.

**Tu tarea es recrear estos diseños en Flutter**, usando los tokens del theme (`lib/theme/*.dart`) y los assets SVG (`assets/`) que ya están preparados.

**No** portees el JSX 1-a-1. Lee cada archivo como "así debe verse y comportarse esta pantalla", y luego construye el equivalente idiomático en Flutter (widgets nativos, Material 3, `flutter_svg`, etc.).

---

## 🎯 Fidelidad

**Hi-fi.** El prototipo es pixel-perfect: colores, tipografías, spacing, radios, estados de interacción, microanimaciones. Los valores en los archivos Dart de `lib/theme/` son los oficiales — úsalos literalmente, no aproximaciones.

---

## 📦 Estructura del paquete

```
design_handoff_vetapp/
├── README.md                          ← este archivo
├── Flutter Handoff.html               ← spec visual completa (abrir en navegador)
├── Assets.html                        ← preview del icono + especies
│
├── screenshots/                       ← referencia visual por pantalla (PNG)
│   ├── 01-splash.png
│   ├── 02-login.png
│   ├── 03-dashboard.png
│   ├── 04-patients.png
│   ├── 05-patient-profile.png
│   ├── 06-consultation.png
│   ├── 07-hospitalization.png
│   └── 08-hospital-patient.png
│
├── lib/theme/                         ← 4 archivos Dart listos para copiar a lib/theme/
│   ├── app_colors.dart                · AppColors (paleta)
│   ├── app_dimensions.dart            · AppRadii + AppSpacing
│   ├── app_text_styles.dart           · AppText (tipografía)
│   └── app_theme.dart                 · ThemeData · Material 3 wiring
│
├── assets/                            ← SVGs listos para pubspec.yaml
│   ├── icon/
│   │   ├── app-icon.svg               · 1024×1024 app icon (fondo azul)
│   │   ├── app-icon-light.svg         · monocromo para fondos oscuros
│   │   └── wordmark.svg               · logo horizontal con tagline
│   └── species/
│       ├── dog.svg                    · stroke="currentColor"
│       ├── cat.svg                    · stroke="currentColor"
│       ├── rabbit.svg                 · exótico · stroke="currentColor"
│       └── bird.svg                   · exótico · stroke="currentColor"
│
└── prototype/                         ← REFERENCIAS — no es código de producción
    ├── VetApp Rediseño.html           · entry point (abrir en navegador)
    └── components/
        ├── tokens.jsx                 · design tokens (equivalente a AppColors/AppSpacing)
        ├── primitives.jsx             · Icon, Chip, Btn, Card, Field, TextInput, PetAvatar
        ├── dashboard.jsx              · Pantalla "Hoy"
        ├── patient-search.jsx         · Búsqueda + lista de pacientes
        ├── patient-profile.jsx        · Ficha clínica del paciente
        ├── consultation.jsx           · Consulta con dictado + IA
        ├── hospitalization.jsx        · Lista de hospitalizados (triage)
        ├── hospital-patient.jsx       · Ficha del hospitalizado (4 tabs + FAB Registrar)
        ├── auth-system.jsx            · Splash, Login, Toast, Dialog, ConfirmDialog
        └── analysis.jsx               · Panel lateral (solo para contexto del proyecto — no es pantalla de la app)
```

---

## 🚀 Cómo usar este paquete desde Claude Code

1. **Copia la carpeta completa** a tu repo Flutter. Sugerencia: `<repo>/design_handoff_vetapp/`.

2. **Copia los archivos de theme** a tu proyecto:
   ```
   design_handoff_vetapp/lib/theme/*  →  <repo>/lib/theme/
   ```

3. **Copia los assets** a tu proyecto:
   ```
   design_handoff_vetapp/assets/  →  <repo>/assets/
   ```

4. **Agrega al `pubspec.yaml`**:
   ```yaml
   dependencies:
     google_fonts: ^6.2.1
     flutter_svg: ^2.0.10

   flutter:
     assets:
       - assets/icon/
       - assets/species/
   ```

5. **Cablea el theme en `main.dart`**:
   ```dart
   import 'theme/app_theme.dart';

   MaterialApp(
     theme: AppTheme.light,
     home: const DashboardScreen(),
   );
   ```

6. **Pídele a Claude Code que construya pantalla por pantalla**, por ejemplo:

   > "Abre `design_handoff_vetapp/prototype/components/hospitalization.jsx` y `hospital-patient.jsx`. Construye la funcionalidad de hospitalización en Flutter en `lib/features/hospitalization/`. Respeta literalmente los colores, spacing y tipografía que están en `lib/theme/*.dart`. Usa flutter_svg para los avatares de especie. Los textos quedan en español. No portees el JSX — léelo como spec y escribe Flutter idiomático."

---

## 🗺️ Pantallas / Vistas

A continuación cada pantalla con su propósito, layout, y archivo de referencia. Cada una tiene también un PNG en `screenshots/` — úsalo para comparar tu implementación Flutter contra el diseño.

| # | Pantalla | Archivo JSX | Screenshot |
|---|---|---|---|
| 1 | Splash | `auth-system.jsx` → `Splash` | `screenshots/01-splash.png` |
| 2 | Login | `auth-system.jsx` → `Login` | `screenshots/02-login.png` |
| 3 | Dashboard / Hoy | `dashboard.jsx` | `screenshots/03-dashboard.png` |
| 4 | Buscar pacientes | `patient-search.jsx` | `screenshots/04-patients.png` |
| 5 | Ficha paciente | `patient-profile.jsx` | `screenshots/05-patient-profile.png` |
| 6 | Nueva consulta | `consultation.jsx` | `screenshots/06-consultation.png` |
| 7 | Hospitalización (lista) | `hospitalization.jsx` | `screenshots/07-hospitalization.png` |
| 8 | Ficha hospitalizado | `hospital-patient.jsx` | `screenshots/08-hospital-patient.png` |

### 1. Splash
**Archivo de referencia:** `prototype/components/auth-system.jsx` → `function Splash`
**Propósito:** pantalla de arranque de 1-2s mientras se resuelven sesión y permisos.
**Layout:** fondo blanco, wordmark "VetApp" centrado (Instrument Serif italic 44px), tagline en mono 10px abajo, 24px sep.

---

### 2. Login
**Archivo:** `prototype/components/auth-system.jsx` → `function Login`
**Propósito:** autenticación con email + contraseña. Single-screen, sin tabs de registro (onboarding es aparte).
**Layout:**
- Header: wordmark pequeño (Instrument Serif italic 28px)
- Título `h1` "Iniciar sesión" · Inter 600 28px · letter-spacing -0.4
- Copy sutil ink60 · 14px
- Input email + password (ver `Field` + `TextInput` en primitives.jsx)
- Botón primario full-width "Entrar" · altura 48px · radius 10
- Link secundario "¿Olvidaste tu contraseña?"

---

### 3. Dashboard ("Hoy")
**Archivo:** `prototype/components/dashboard.jsx` → `function Dashboard`
**Propósito:** home del profesional. Muestra de un vistazo: citas del día, hospitalizados críticos, tareas pendientes.
**Layout:** scroll vertical, secciones separadas por 20-24px.

**Componentes:**
- Header con saludo `Hola, Dr. Sánchez` en Instrument Serif italic 28px + meta del día
- **Kicker stats:** 3 cards 1/3 ancho cada una: "Citas hoy · 8", "Hospitalizados · 10", "Críticos · 2"
- **Lista "Próximas citas":** 4-5 items, cada uno con hora en mono, nombre paciente, dueño, dx
- **Lista "Atención requerida":** pacientes hospitalizados con vitales fuera de rango o tareas vencidas
- **Tile CTA "Nueva consulta":** destacado (primary), ancho completo

**Notas de implementación:**
- La data está mockeada en el JSX; en Flutter vendrá de Providers/Bloc. Usa los mismos nombres de campo.
- Las cards usan el widget `Card` del prototype → traducir a Flutter `Card(elevation: 0, shape: RoundedRectangleBorder(borderRadius: AppRadii.r3))`.

---

### 4. Buscar pacientes
**Archivo:** `prototype/components/patient-search.jsx` → `function PatientSearch`
**Propósito:** buscar paciente por nombre, dueño, o ID. Lista todos si no hay query.
**Layout:**
- Header con back-button + título + botón `+` para nuevo paciente
- Search input sticky debajo del header
- Lista virtualizada de pacientes — cada fila 68px alto: avatar (`PetAvatar` con SVG de especie), nombre + especie/raza, dueño, último visit en mono
- Tap en fila → navega a Patient Profile

**Data:** ver `PATIENTS` exportado en `patient-search.jsx`. Incluye 20+ pacientes de ejemplo.

---

### 5. Ficha del paciente
**Archivo:** `prototype/components/patient-profile.jsx` → `function PatientProfile`
**Propósito:** ficha clínica del paciente: datos, historial, consultas, vacunas, alergias.
**Layout:**
- Header con back + nombre + botón editar
- Hero con avatar grande (80px), nombre Instrument Serif italic 32px, especie/raza/edad
- Stats strip: peso, castrado, microchip
- Tabs: `Resumen / Historial / Vacunas / Archivos`
- Cada tab con su feed/lista

---

### 6. Nueva consulta
**Archivo:** `prototype/components/consultation.jsx` → `function Consultation`
**Propósito:** registrar una consulta en vivo. Núcleo diferenciador del producto: dictado por voz + extracción con IA.
**Layout (4 pasos, flujo lineal):**
1. **Seleccionar paciente** — search + selección
2. **Dictado en vivo** — botón record grande centrado, waveform animada, transcripción streaming debajo
3. **Revisión IA** — campos auto-rellenados (motivo, examen, dx presuntivo, plan), cada uno editable con badge "IA" indicando confianza
4. **Confirmar y firmar** — resumen + botón "Firmar y guardar"

**Estados importantes:**
- `recording`, `processing`, `reviewing`, `saving`
- El botón mic tiene 3 estados visuales (idle / recording + waveform / processing + spinner)

---

### 7. Hospitalización (lista triage)
**Archivo:** `prototype/components/hospitalization.jsx` → `function Hospitalization`
**Propósito:** pantalla principal para el turno del veterinario. Muestra los 10 pacientes hospitalizados con triage visual automático.
**Layout:**
- Header sticky:
  - Contador global: `10 activos · 2 críticos · 2 vencidas` en mono 11px
  - Búsqueda inline
  - Chips de filtro: Todos · Críticos · Vencidas · Atención · Salen hoy
  - Toggle de vista: **Pacientes / Tareas / Vitales**
- **Vista Pacientes (default):** lista 72px por fila con:
  - Barra lateral izquierda de severidad (4px ancho, rojo crítico / ámbar atención / verde estable)
  - `PetAvatar` 44px con halo rojo si crítico
  - Nombre + "Día N" en mono
  - Dx en ink60 11px
  - 3 vitales en mono con celdas rojas si fuera de rango
  - Próxima tarea con badge `⚠` si hay vencidas
- **Vista Tareas:** agrupadas por ventana (Vencidas / Ahora / En 30 min)
- **Vista Vitales:** matriz compacta fila=paciente × columna=Tº/FC/FR/SpO₂
- Tap en paciente → **quick-peek bottom sheet** (no pantalla completa)

**Data:** constante `HOSP` al final del archivo — 10 pacientes realistas con dx clínicos plausibles.

---

### 8. Quick-peek del paciente (bottom sheet)
**Archivo:** `prototype/components/hospitalization.jsx` → `function PatientSheet`
**Propósito:** consulta rápida sin salir de la lista. Solo muestra vitales + próxima tarea + CTA a ficha completa.
**Layout:**
- Handle 36×4px
- Header con avatar + nombre + chip de estado
- Grid 4 celdas con Tº/FC/FR/SpO₂
- Card con "Tarea vencida" o "Próxima tarea"
- Botón primary full-width **"Abrir ficha completa"**

---

### 9. Ficha del hospitalizado (pantalla completa)
**Archivo:** `prototype/components/hospital-patient.jsx` → `function HospitalPatient`
**Propósito:** pantalla de trabajo durante el turno. Todo lo que el veterinario hace por el paciente pasa por aquí.
**Layout:**
- Header sticky con avatar + nombre + vitales strip + **4 tabs**:
  - **Resumen** — alerta crítica si aplica, ingreso + plan, próximas 3 tareas, última nota, botón Alta
  - **Bitácora** — timeline cronológico inverso; cada entrada con pill de tipo (medicamento/fluido/procedimiento/alimentación/nota/vital), autor, timestamp, badge "IA" si fue dictada. Card prominente arriba para dictar nueva nota
  - **Tareas** — 3 secciones: Vencidas · Pendientes · Completadas. Tap para toggle
  - **Vitales 24h** — 3 gráficos SVG (Tº, FC, SpO₂) con puntos rojos en out-of-range
- **FAB "Registrar"** sticky bottom-right → abre `ActionPickerSheet`

**Flujo de registro de acción:**
1. Tap FAB → `ActionPickerSheet` con 6 opciones: Medicamento · Fluidoterapia · Procedimiento · Alimentación · Vital · Nota
2. Tap opción → `ActionForm` (sheet alto, ~94% altura) con campos específicos:
   - **Medicamento:** fármaco · dosis · vía (IV/IM/SC/VO/Tópica) · frecuencia · observaciones
   - **Fluido:** solución (Ringer/SSN/Dextrosa) · volumen ml · velocidad ml/h · vía · obs
   - **Procedimiento:** tipo · descripción (textarea) · duración
   - **Alimentación:** dieta · volumen · vía · aceptación
   - **Vital:** Tº · FC · FR · SpO₂ · obs
   - **Nota:** textarea libre
3. Confirmar → toast success + entrada al timeline

**Data de bitácora:** `BITACORA_KIRA` y similares en `hospitalization.jsx`.

---

## 🎨 Design Tokens

Todos los valores están en `lib/theme/app_colors.dart`, `app_dimensions.dart`, `app_text_styles.dart`. **No hardcodees** — siempre referencia a estas clases.

### Colores principales

| Token              | Valor     | Uso |
|--------------------|-----------|-----|
| `AppColors.primary` | `#0052CC` | CTAs, links, accent |
| `AppColors.primarySoft` | `#E1ECFB` | fondos de badge/chip/avatar |
| `AppColors.ink` | `#0E1726` | texto principal |
| `AppColors.ink80` | `#2A3447` | texto secundario |
| `AppColors.ink60` | `#4C5563` | meta |
| `AppColors.ink40` | `#767B87` | meta tenue |
| `AppColors.bg` | `#F8F9FA` | fondo de página |
| `AppColors.surface` | `#FFFFFF` | cards |
| `AppColors.line` | `#E5E7EB` | divisores |
| `AppColors.urgent` | `#D73A49` | críticos, errores |
| `AppColors.urgentSoft` | `#FAE2E4` | fondo alerta crítica |
| `AppColors.warn` | `#B65A00` | atención |
| `AppColors.ok` | `#1C7C4A` | estable, éxito |

### Spacing

```dart
AppSpacing.xs = 4     // gap entre chips
AppSpacing.sm = 8     // gap interno
AppSpacing.md = 12    // padding cards
AppSpacing.lg = 16    // padding pantalla
AppSpacing.xl = 20    // separación secciones
AppSpacing.xxl = 24   // bloques grandes
AppSpacing.section = 40
```

### Radios

```dart
AppRadii.r1 = 4       // chips, pills
AppRadii.r2 = 8       // inputs, botones
AppRadii.r3 = 12      // cards, dialogs
AppRadii.r4 = 16      // bottom sheets
AppRadii.pill = 999
```

### Tipografía

- **Sans:** Inter (400, 500, 600, 700)
- **Mono:** JetBrains Mono (400, 500) — exclusivo para timestamps, stats, kickers
- **Serif:** Instrument Serif italic — exclusivo para títulos grandes de pantalla (hero, saludos)

Ver `app_text_styles.dart` para la escala completa. Convención: **Usa Mono para cualquier dato que un humano lee en paralelo (hora, % vital, ID).**

---

## 🔄 Interacciones y microanimaciones

- **Transiciones de pantalla:** slide horizontal (push/pop), 280ms, curve: `Curves.easeOutCubic`
- **Bottom sheets:** slide-up 220ms, overlay fade 160ms
- **Toast:** fade-in 180ms desde top, auto-dismiss 3s
- **Tab switch:** indicador subrayado anima 200ms
- **FAB:** sin animación de entrada (sticky posicional)
- **Waveform del dictado:** animación CSS `wave` con 5-8 barras, duración aleatoria 300-600ms por barra

---

## 🗄️ Estado (sugerencia arquitectónica)

Esta es mi recomendación, pero es decisión del equipo:

- **Riverpod** o **Bloc** (tu preferencia)
- Por pantalla principal, un `Notifier` / `Cubit`:
  - `DashboardNotifier` — citas del día, stats, tareas críticas
  - `PatientSearchNotifier` — query, resultados, filtros
  - `HospitalizationNotifier` — lista de internados, vista actual (list/tasks/vitals), filtros
  - `HospitalPatientNotifier` — paciente actual, tab activa, tareas, bitácora
  - `ConsultationFlowNotifier` — máquina de estados del dictado (idle/recording/processing/reviewing)

Mock data inicial en `lib/data/mocks/` para desarrollo sin backend.

---

## 🖼️ Assets

### Icono de app

`assets/icon/app-icon.svg` es el master 1024×1024. Para iOS necesitas PNG en múltiples tamaños (20/29/40/60/76/83.5/1024pt × @1x/@2x/@3x). Opciones:
- Usa [appicon.co](https://www.appicon.co/) subiendo el SVG
- O exporta desde Figma con todos los sizes a la vez
- O usa el paquete `flutter_launcher_icons`:
  ```yaml
  flutter_launcher_icons:
    android: true
    ios: true
    image_path: "assets/icon/app-icon.svg"  # convierte a PNG automáticamente
  ```

### Avatares de especie

Los 4 SVG usan `stroke="currentColor"`. En Flutter con `flutter_svg`:

```dart
SvgPicture.asset(
  'assets/species/$species.svg',
  width: 36, height: 36,
  colorFilter: ColorFilter.mode(tintColor, BlendMode.srcIn),
)
```

Mapa especie → archivo: `dog | cat | rabbit | bird` (sin extensión — se concatena `.svg`).

---

## ⚠️ Cosas que NO están resueltas aquí

Estos son deliberadamente out-of-scope del handoff. Decide con el equipo de producto:

- **Backend API** — todo está mockeado. Diseña el contrato REST/GraphQL antes de empezar.
- **Autenticación real** — splash/login son solo UI. Cableado con Firebase/Auth0/custom queda al equipo.
- **Permisos por rol** — ¿qué ve un asistente vs. un veterinario titular? No está reflejado en el diseño.
- **Offline-first** — la hospitalización es crítica; cuando no hay internet debe seguir funcionando. Evalúa `drift` / `isar` / `hive`.
- **Push notifications** — para tareas vencidas y críticos. No está mockeado.
- **Impresión / PDF** — resumen de alta, receta, consentimientos. Usa `pdf` package.
- **Onboarding** — solo hay splash + login; falta flujo de registro, setup de clínica, importación de pacientes.

---

## 💡 Prompts sugeridos para Claude Code

Copia-pega estos como starting point:

### Arranque
> "Leer `design_handoff_vetapp/README.md` completo. Luego revisar los archivos de tema en `lib/theme/` y listar los componentes base que necesitaremos crear antes de construir pantallas (equivalente a `primitives.jsx`). Propón una estructura de carpetas para el proyecto Flutter."

### Una pantalla específica
> "Construir la pantalla Hospitalización en Flutter. Archivos de referencia:
> - `design_handoff_vetapp/prototype/components/hospitalization.jsx`
> - `design_handoff_vetapp/prototype/components/hospital-patient.jsx`
>
> Usa los tokens de `lib/theme/`. El FAB Registrar debe abrir un action picker modal con 6 opciones. Incluye mock data equivalente a la constante `HOSP` del JSX. Pon todo en `lib/features/hospitalization/`."

### Auditoría de fidelidad
> "Después de implementar la pantalla X, comparar con `prototype/components/X.jsx`. Verificar que: (1) los colores corresponden a `AppColors`, (2) el spacing usa `AppSpacing`, (3) los radios usan `AppRadii`, (4) las tipografías usan `AppText`. Reportar desviaciones."

---

## 📬 Dudas durante la implementación

Si algo no está claro en el diseño (estado de error, caso edge, interacción no documentada), **no inventes** — márcalo en el código con `// TODO(design): ...` y deja que producto/diseño lo resuelvan. Es mejor una página en blanco que un comportamiento asumido.
