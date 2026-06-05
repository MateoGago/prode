# Prode Mundial 2026

Juego de predicciones del Mundial 2026 para un grupo de amigos. Cada uno predice los resultados de los partidos; el que más puntos acumula gana el premio. Webapp + PWA instalable en el celular.

## Stack

- **[Next.js 16](https://nextjs.org)** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS 4**
- **Supabase** (Postgres + Auth + RLS)
- **[Bun](https://bun.sh)** como package manager y runtime de scripts
- **[Biome](https://biomejs.dev)** para lint + format
- **Vitest** + React Testing Library para tests
- **Husky** + **commitlint** para conventional commits

## Requisitos previos

Usamos **Bun** (no npm/yarn/pnpm). Instalalo:

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# o con Homebrew
brew install oven-sh/bun/bun

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

Verificá que quedó instalado:

```bash
bun --version
```

## Instalación

```bash
git clone git@github.com:Santipac/prode.git
cd prode
bun install
```

> `bun install` corre el script `prepare`, que activa los hooks de Husky automáticamente. No tenés que hacer nada extra.

## Levantar el proyecto

```bash
bun run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en el navegador.

## Scripts

| Comando | Qué hace |
|---|---|
| `bun run dev` | Servidor de desarrollo |
| `bun run build` | Build de producción |
| `bun run start` | Sirve el build de producción |
| `bun run test` | Corre los tests una vez (Vitest) |
| `bun run test:watch` | Tests en modo watch |
| `bun run lint` | Chequea el código con Biome |
| `bun run format` | Formatea el código con Biome |
| `bun run seed` | Siembra equipos y fixtures desde el snapshot de openfootball |
| `bun run sync` | Refresca resultados + bracket desde openfootball en vivo (idempotente) |

## Convención de commits

Usamos **[Conventional Commits](https://www.conventionalcommits.org)**, validados por commitlint en cada commit (hook `commit-msg`). Además, antes de cada commit corre Biome (hook `pre-commit`).

Formato: `tipo: descripción`. Ejemplos:

```
feat: agregar pantalla de predicciones
fix: corregir el cálculo de puntos en empates
docs: actualizar instrucciones de instalación
```

Tipos válidos: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `build`, `ci`, `style`, `perf`.

Un commit que no cumple el formato (ej: `arreglos varios`) **se rechaza** automáticamente.

## Estructura del proyecto (Screaming Architecture)

El árbol de `src/` grita el dominio (un prode), no el framework:

```
src/
  app/                 # Routing de Next (fino, delega a las features)
  features/            # Una carpeta por capacidad de negocio
    fixtures/          # Equipos, partidos y datos de la API
    predictions/       # Predicciones + regla de bloqueo (lógica pura)
    scoring/           # Motor de puntos (lógica pura)
    results/           # Confirmación de resultados e ingesta
    leaderboard/       # Tabla de posiciones
    auth/              # Login, sesión y perfiles
  shared/              # Utilidades compartidas (fechas, cliente Supabase, tipos)
```

Dentro de cada feature se separa la **lógica pura** de la **infra/UI**. El código va en **inglés**; el castellano queda para los textos que ve el usuario.

## Reglas del juego

- Resultado exacto: **3 pts** · Ganador / empate acertado: **1 pt** · Nada: **0**
- Categorías excluyentes (cobrás la más alta que aplique).
- Eliminatorias: cuenta el resultado **con alargue**; multiplicadores por ronda (la final vale más). Si predecís un empate, elegís quién avanza.
- No se puede crear ni editar una predicción **desde el horario del partido** (anti-trampa validado server-side).
- Las fechas se muestran siempre en **hora argentina (UTC-3)**.

> El plan completo y las tareas viven en Linear (workspace `prode-arg`).

## Supabase local (Docker / OrbStack)

No hace falta tocar el proyecto de Supabase en la nube para desarrollar: la **Supabase CLI levanta todo el stack en contenedores** (Postgres + Auth + Storage + Realtime + Studio) y aplica las migraciones de `supabase/migrations` y el `supabase/seed.sql` automáticamente.

### 1. Instalar un runtime de contenedores

La CLI necesita Docker corriendo. Elegí según tu sistema:

**Windows**

- **Docker Desktop** (recomendado): descargalo de [docker.com](https://www.docker.com/products/docker-desktop/) e instalalo. Requiere **WSL2** — el instalador lo activa solo; si no, corré en PowerShell **como administrador**:

  ```powershell
  wsl --install
  ```

  Reiniciá, abrí Docker Desktop y esperá a que diga *Engine running*. Dejalo abierto mientras desarrollás.
- En Settings → *Resources → WSL Integration*, activá la integración con tu distro de WSL si trabajás desde la terminal de WSL.

> **OrbStack** es una alternativa más liviana a Docker Desktop, pero **solo corre en macOS y Linux** (no tiene versión nativa de Windows). En Windows quedate con Docker Desktop.

**macOS / Linux**

- **OrbStack** (recomendado, [orbstack.dev](https://orbstack.dev)) — más rápido y liviano que Docker Desktop:

  ```bash
  brew install orbstack
  ```

- O **Docker Desktop** ([docker.com](https://www.docker.com/products/docker-desktop/)).

Verificá que el daemon responde:

```bash
docker ps
```

### 2. Instalar la Supabase CLI

```bash
# macOS / Linux (Homebrew)
brew install supabase/tap/supabase

# Windows (Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# o, en cualquier sistema, sin instalar nada global:
bunx supabase --version
```

> Si usás `bunx supabase`, anteponé `bunx` a todos los comandos `supabase ...` de abajo.

### 3. Crear el `.env` de Supabase

La config de `supabase/config.toml` resuelve algunas claves por **substitución de variables** (`env(...)`), sobre todo el login con Google. La CLI las lee de un archivo **`supabase/.env`** (ya está en el `.gitignore`, así que no se commitea).

Copiá el ejemplo y completá los valores:

```bash
cp supabase/.env.example supabase/.env
```

| Variable | Requerida | Qué es |
|---|---|---|
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` | para login con Google | Client ID de las credenciales OAuth de Google Cloud |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` | para login con Google | Client Secret de esas mismas credenciales |

> Si todavía no vas a probar el login con Google, podés dejarlas vacías; el resto del stack arranca igual.

### 4. Levantar el stack

```bash
supabase start
```

La primera vez baja las imágenes de Docker (tarda unos minutos). Al terminar imprime las URLs y **claves locales**. Para volver a verlas:

```bash
supabase status
```

Vas a obtener algo así:

```
         API URL: http://127.0.0.1:54321
      Studio URL: http://127.0.0.1:54323
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
   Publishable key: sb_publishable_...
       Secret key: sb_secret_...
```

- **Studio** (panel visual de la DB y Auth): [http://127.0.0.1:54323](http://127.0.0.1:54323)
- Los emails de Auth (magic links, confirmaciones) caen en **Inbucket**: [http://127.0.0.1:54324](http://127.0.0.1:54324)

### 5. Conectar la app a tu Supabase local

Copiá los valores de `supabase status` a tu `.env.local` (ver la sección siguiente):

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # "Publishable key" del status
SUPABASE_SERVICE_ROLE=sb_secret_...                       # "Secret key" del status
```

### Comandos útiles

| Comando | Qué hace |
|---|---|
| `supabase start` | Levanta el stack en Docker |
| `supabase stop` | Apaga los contenedores (conserva los datos) |
| `supabase stop --no-backup` | Apaga y borra los datos del volumen |
| `supabase status` | Muestra URLs y claves locales |
| `supabase db reset` | Recrea la DB desde cero: corre migraciones + `seed.sql` |
| `supabase migration new <nombre>` | Crea un archivo de migración nuevo |

> Si Docker/OrbStack no está corriendo, `supabase start` falla con un error de conexión al daemon. Asegurate de que `docker ps` funcione antes.

## Variables de entorno

Copiá el ejemplo y completá con tus claves:

```bash
cp .env.example .env.local
```

> Para desarrollo **local** usá las claves que imprime `supabase status` (ver la sección anterior). Para apuntar al proyecto **en la nube**, usá las del dashboard de Supabase.

| Variable | Ámbito | Requerida | Qué es |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | público | ✅ | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | público | ✅ | Clave `sb_publishable_...` (sistema nuevo de keys; la `anon` JWT está deprecada) |
| `NEXT_PUBLIC_SITE_URL` | público | — | Origin para el redirect de Google OAuth. En local cae al origin del request; en prod ponela |
| `SUPABASE_SERVICE_ROLE` | servidor | ✅ | Clave service-role (saltea RLS). **Solo server**, sin prefijo `NEXT_PUBLIC_`. La usan las server actions de admin y los scripts `seed`/`sync` |
| `SUPABASE_URL` | servidor | — | Fallback de la URL para los scripts cuando no está `NEXT_PUBLIC_SUPABASE_URL` (ej: CI) |

Las claves están en el dashboard de Supabase → **Settings → API**.

## Testing

El dominio (motor de scoring, regla de bloqueo) se construye **test-first** (TDD). Corré `bun run test:watch` mientras desarrollás.
