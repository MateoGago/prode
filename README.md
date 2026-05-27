# Prode Mundial 2026

Juego de predicciones del Mundial 2026 para un grupo de amigos. Cada uno predice los resultados de los partidos; el que más puntos acumula gana el premio. Webapp + PWA instalable en el celular.

## Stack

- **[Next.js 16](https://nextjs.org)** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS 4**
- **Supabase** (Postgres + Auth + RLS) — _en construcción_
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

## Variables de entorno

_Próximamente (Slice 2 en adelante):_ vas a necesitar un archivo `.env.local` con las claves de Supabase y de API-Football. Se documenta acá cuando se implemente.

## Testing

El dominio (motor de scoring, regla de bloqueo) se construye **test-first** (TDD). Corré `bun run test:watch` mientras desarrollás.
