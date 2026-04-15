# BackendVetApp

API backend para gestión de historias clínicas veterinarias. Recibe audios de consultas, los transcribe y extrae información clínica estructurada usando IA.

## Flujo

```
Audio → Supabase Storage → OpenAI Transcripción → GPT Procesamiento → Supabase DB → Respuesta JSON
```

## Stack

- **Node.js + Express** — Servidor API
- **OpenAI** — Transcripción de audio (gpt-4o-transcribe) + procesamiento clínico (gpt-4o-mini)
- **Supabase** — Base de datos PostgreSQL + Storage para audios
- **Multer** — Manejo de archivos

## Instalación

```bash
npm install
```

## Variables de entorno

Crear archivo `.env` en la raíz:

```
OPENAI_API_KEY=tu-key
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key
PORT=3000
```

## Base de datos

Ejecutar la migración en Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  anamnesis JSONB,
  examen_fisico JSONB,
  abordaje_diagnostico JSONB,
  diagnostico_presuntivo JSONB,
  diagnostico_definitivo JSONB,
  plan_terapeutico JSONB,
  pronostico_evolucion JSONB
);
```

Crear el bucket de Storage:

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('consultations-audio', 'consultations-audio', true);
```

## Uso

```bash
npm start       # Producción
npm run dev     # Desarrollo (auto-reload)
```

## Endpoint

### `POST /consultation/process`

**Content-Type:** `multipart/form-data`

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `audio` | File | Sí | Archivo de audio (mp3, wav, m4a). Máx 20MB |
| `section` | String | Sí | Sección clínica a procesar |
| `consultation_id` | String | No | ID de consulta existente (si no se envía, crea una nueva) |

**Secciones válidas:**

- `anamnesis`
- `examen_fisico`
- `abordaje_diagnostico`
- `diagnostico_presuntivo`
- `diagnostico_definitivo`
- `plan_terapeutico`
- `pronostico_evolucion`

### Ejemplo con curl

```bash
curl -X POST http://localhost:3000/consultation/process \
  -F "audio=@mi-audio.mp3" \
  -F "section=anamnesis"
```

### Respuesta

```json
{
  "consultation_id": "uuid",
  "section": "anamnesis",
  "audio_path": "uuid.mp3",
  "transcription": "texto transcrito del audio...",
  "structured_data": { ... },
  "consultation": { ... }
}
```

## Estructura del proyecto

```
src/
├── config/          # Clientes de OpenAI y Supabase
├── controllers/     # Orquestación del flujo
├── prompts/         # Prompts clínicos por sección
├── routes/          # Definición de rutas Express
├── services/        # Lógica de negocio (transcripción, LLM, storage, estado)
├── utils/           # Logger y parser JSON seguro
├── app.js           # Configuración Express
└── server.js        # Entry point
```

## Deploy

Listo para desplegar en **Render** o **Railway**. Configurar las variables de entorno en el dashboard del servicio.
