# Guía de Desarrollo - BackendVetApp

## 1. Servidor Local

### Iniciar el servidor
```bash
npm run dev
```
Esto arranca el servidor en `http://localhost:3000` con auto-reload (si cambias un archivo, se reinicia solo).

### Detener el servidor
Presiona `Ctrl + C` en la terminal donde está corriendo.

### Iniciar en modo producción (sin auto-reload)
```bash
npm start
```

---

## 2. Probar cambios

### Desde Postman
1. Cambia el environment a `base_url = http://localhost:3000`
2. Selecciona el request que quieras probar
3. Adjunta un audio y dale Send

### Desde terminal (curl)
```bash
curl -X POST http://localhost:3000/consultation/process -F "audio=@ruta/al/audio.mp3" -F "section=anamnesis"
```

---

## 3. Ajustar un Prompt

Los prompts están en `src/prompts/`. Cada archivo exporta un string.

1. Abre el archivo del prompt que quieras modificar (ej: `src/prompts/treatment-planPrompt.js`)
2. Edita el texto del prompt
3. Guarda el archivo
4. Si usas `npm run dev`, el servidor se reinicia solo
5. Prueba con un audio en Postman o curl

**No necesitas tocar nada más.** Solo el archivo del prompt.

---

## 4. Agregar una Nueva Sección Clínica

Ejemplo: agregar una sección `examen_complementario`.

### Paso 1 — Crear el prompt
Crea el archivo `src/prompts/complementary-examPrompt.js`:
```js
const COMPLEMENTARY_EXAM_PROMPT = `Tu prompt aquí...

Devuelve SOLO JSON válido, sin markdown, sin backticks, sin texto adicional:

{
  "examenes": []
}`;

module.exports = COMPLEMENTARY_EXAM_PROMPT;
```

### Paso 2 — Registrar en el promptRouter
Abre `src/services/promptRouter.js` y agrega:
```js
// Arriba, agregar el require:
const COMPLEMENTARY_EXAM_PROMPT = require('../prompts/complementary-examPrompt');

// Dentro del objeto PROMPTS, agregar:
examen_complementario: COMPLEMENTARY_EXAM_PROMPT,
```

### Paso 3 — Agregar columna en Supabase
Ve al SQL Editor de Supabase y ejecuta:
```sql
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS examen_complementario JSONB;
```

### Paso 4 — Probar
```bash
curl -X POST http://localhost:3000/consultation/process -F "audio=@audio.mp3" -F "section=examen_complementario"
```

**Eso es todo.** No necesitas tocar controller, routes ni services.

---

## 5. Agregar una Nueva Tabla y Asociarla

Ejemplo: crear tabla `patients` y asociar cada consulta a un paciente.

### Paso 1 — Crear la tabla en Supabase
Ve al SQL Editor de Supabase y ejecuta:
```sql
-- Crear tabla de pacientes
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  species TEXT,
  breed TEXT,
  age TEXT,
  weight TEXT,
  sex TEXT,
  owner_name TEXT,
  owner_phone TEXT
);

-- Agregar columna de relación en consultations
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id);

-- Permisos de acceso
CREATE POLICY "Allow all on patients" ON patients FOR ALL TO anon USING (true) WITH CHECK (true);
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
```

### Paso 2 — Crear el servicio
Crea `src/services/patientService.js`:
```js
const supabase = require('../config/supabaseClient');
const logger = require('../utils/logger');

async function createPatient(patientData) {
  const { data, error } = await supabase
    .from('patients')
    .insert(patientData)
    .select()
    .single();

  if (error) {
    logger.error('Error al crear paciente:', error.message);
    throw new Error(error.message);
  }
  return data;
}

async function getPatient(id) {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    logger.error('Error al obtener paciente:', error.message);
    throw new Error(error.message);
  }
  return data;
}

async function listPatients() {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error al listar pacientes:', error.message);
    throw new Error(error.message);
  }
  return data;
}

module.exports = { createPatient, getPatient, listPatients };
```

### Paso 3 — Crear el controller
Crea `src/controllers/patientController.js`:
```js
const { createPatient, getPatient, listPatients } = require('../services/patientService');

async function create(req, res) {
  try {
    const patient = await createPatient(req.body);
    res.status(201).json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getById(req, res) {
  try {
    const patient = await getPatient(req.params.id);
    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function list(req, res) {
  try {
    const patients = await listPatients();
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { create, getById, list };
```

### Paso 4 — Crear las rutas
Crea `src/routes/patientRoutes.js`:
```js
const express = require('express');
const router = express.Router();
const { create, getById, list } = require('../controllers/patientController');

router.post('/', create);
router.get('/', list);
router.get('/:id', getById);

module.exports = router;
```

### Paso 5 — Registrar las rutas en app.js
Abre `src/app.js` y agrega:
```js
const patientRoutes = require('./routes/patientRoutes');
app.use('/patients', patientRoutes);
```

### Paso 6 — Asociar consulta a paciente
Ahora al crear una consulta puedes enviar `patient_id` en el body para asociarla.

### Resumen del patrón
Para cualquier tabla nueva siempre es:
1. **SQL** en Supabase (tabla + permisos)
2. **Service** (`src/services/`) — lógica de base de datos
3. **Controller** (`src/controllers/`) — recibe request, llama al service, responde
4. **Routes** (`src/routes/`) — define los endpoints (GET, POST, PUT, DELETE)
5. **app.js** — registrar la nueva ruta

---

## 6. Instalar una nueva dependencia (paquete npm)

```bash
npm install nombre-del-paquete
```

Esto actualiza `package.json` y `package-lock.json` automáticamente.

---

## 7. Limpiar cache y reinstalar

Si algo no funciona o quieres empezar limpio:

```bash
# Borrar node_modules y cache
rm -rf node_modules
npm cache clean --force

# Reinstalar todo
npm install
```

---

## 8. Ramas de Git (importante)

Actualmente solo existe la rama `master`, que es la que Render despliega automáticamente. Esto significa que **cualquier push a master se despliega a producción de inmediato**.

### Si quieres probar algo sin afectar producción

Crea una rama nueva:
```bash
# Crear rama y cambiarte a ella
git checkout -b mi-experimento

# Haz tus cambios, prueba en local...

# Commit normal
git add .
git commit -m "Probando cambio X"

# Push a GitHub (NO se despliega porque Render solo escucha master)
git push https://linodevmobile@github.com/linodevmobile/BackendVetApp.git mi-experimento
```

### Cuando el cambio esté listo para producción
```bash
# Vuelve a master
git checkout master

# Trae los cambios de tu rama
git merge mi-experimento

# Push a master = se despliega automáticamente
git push https://linodevmobile@github.com/linodevmobile/BackendVetApp.git master
```

### Regla de oro
- **`master`** = producción. Solo sube aquí lo que ya probaste y funciona.
- **Otras ramas** = experimentos, pruebas, features en desarrollo. Puedes romper cosas sin miedo.

---

## 9. Subir cambios a GitHub

Después de hacer cambios y probarlos localmente:

```bash
# Ver qué archivos cambiaste
git status

# Agregar los archivos modificados
git add src/prompts/archivo-que-cambiaste.js

# Crear el commit con un mensaje descriptivo
git commit -m "Descripción de lo que hiciste"

# Subir a GitHub (usar tu cuenta personal)
# A master (se despliega automáticamente):
git push https://linodevmobile@github.com/linodevmobile/BackendVetApp.git master

# A otra rama (NO se despliega):
git push https://linodevmobile@github.com/linodevmobile/BackendVetApp.git nombre-de-rama
```

---

## 10. Desplegar a Producción (Render)

### Despliegue automático
Render está conectado a tu rama `master`. Cada vez que haces `git push` a **master**, Render detecta el cambio y **despliega automáticamente**. Push a otras ramas NO despliega.

### Despliegue manual (si el automático falla)
1. Ve a render.com > tu servicio BackendVetApp
2. Clic en "Manual Deploy" > "Deploy latest commit"

### Verificar que está funcionando
Abre en el navegador: https://backendvetapp.onrender.com

---

## 11. Variables de entorno

### Local
Edita el archivo `.env` en la raíz del proyecto.

### Producción (Render)
1. Ve a render.com > tu servicio > Environment
2. Agrega o edita las variables ahí

**Nunca subas el archivo `.env` a GitHub.** Ya está en `.gitignore`.

---

## 12. Estructura rápida de referencia

```
src/
├── config/          # Clientes (OpenAI, Supabase) — rara vez se tocan
├── controllers/     # Orquestación — uno por recurso (consultation, patient, etc.)
├── prompts/         # AQUÍ se ajustan los prompts ← lo más frecuente
├── routes/          # Rutas Express — una por recurso
├── services/
│   ├── promptRouter.js    # ← registrar nuevas secciones aquí
│   ├── llmService.js      # Configuración del modelo GPT
│   ├── transcriptionService.js  # Configuración de transcripción
│   ├── stateService.js    # Operaciones con tabla consultations
│   └── storageService.js  # Subida de audios a Storage
├── utils/           # Logger y parser JSON
├── app.js           # Config de Express — registrar nuevas rutas aquí
└── server.js        # Entry point
```

### Resumen: qué archivo tocar según lo que quieras hacer

| Quiero... | Archivo(s) a modificar |
|---|---|
| Ajustar un prompt | `src/prompts/[seccion]Prompt.js` |
| Agregar nueva sección clínica | `src/prompts/` + `src/services/promptRouter.js` + SQL en Supabase |
| Agregar nueva tabla | SQL + `src/services/` + `src/controllers/` + `src/routes/` + `src/app.js` |
| Cambiar modelo de IA | `src/services/llmService.js` (línea del model) |
| Cambiar modelo de transcripción | `src/services/transcriptionService.js` (línea del model) |
| Cambiar puerto | `.env` (variable PORT) |
| Cambiar keys | `.env` (local) o Render dashboard (producción) |
