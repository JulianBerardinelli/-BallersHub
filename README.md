⚽ BallersHub

¡Bienvenido a **BallersHub**! Plataforma digital para el ecosistema del fútbol, construida con tecnologías web modernas para brindar una experiencia ágil, accesible y profesional. Incluye módulos de autenticación, paneles privados y un flujo de onboarding para nuevos usuarios.

## ✨ Características principales

- 🔐 **Autenticación** con Supabase y manejo de sesiones en Next.js.
- 📊 **Dashboard** modular con rutas agrupadas para usuarios y administradores.
- 🧩 **Componentes reutilizables** construidos con [HeroUI](https://www.heroui.com/) y estilizados con Tailwind CSS 4.
- 💾 **Base de datos PostgreSQL** manejada mediante **Drizzle ORM**.
- 🎨 Soporte de **temas personalizados** (modo oscuro predeterminado).

## 🧰 Tecnologías

| Tecnología | Uso principal |
|------------|--------------|
| [Next.js 15](https://nextjs.org/) | Framework web de React con App Router |
| [React 19](https://react.dev/) | Biblioteca de UI |
| [TypeScript](https://www.typescriptlang.org/) | Tipado estático |
| [Tailwind CSS 4](https://tailwindcss.com/) | Estilos utilitarios |
| [HeroUI](https://www.heroui.com/) | Biblioteca de componentes |
| [Supabase](https://supabase.com/) | Autenticación y almacenamiento |
| [Drizzle ORM](https://orm.drizzle.team/) | ORM para PostgreSQL |
| [PostgreSQL](https://www.postgresql.org/) | Base de datos relacional |

## 📦 Instalación

1. Clona el repositorio:
   ```bash
   git clone https://github.com/<usuario>/BallersHub.git
   cd BallersHub
   ```
2. Instala las dependencias:
   ```bash
   npm install
   # o yarn / pnpm / bun
   ```
3. Crea un archivo `.env` en la raíz con tus variables de entorno:

   | Variable | Descripción |
   |----------|-------------|
   | `DATABASE_URL` | Cadena de conexión a PostgreSQL |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` o `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Llave pública para el cliente |
   | `SUPABASE_SERVICE_ROLE_KEY` | Llave con permisos de servicio |
   | `NEXT_PUBLIC_SITE_URL` | URL pública del sitio (usada en metadatos y redirecciones) |

4. Ejecuta la base de datos y aplica las migraciones:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```
5. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## ⚙️ Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Levanta el servidor de desarrollo con Turbopack |
| `npm run build` | Genera la compilación de producción |
| `npm start` | Inicia la app compilada |
| `npm run lint` | Ejecuta ESLint sobre el proyecto |
| `npm run typecheck` | Verifica los tipos de TypeScript |
| `npm run db:generate` | Genera migraciones con Drizzle Kit |
| `npm run db:migrate` | Aplica migraciones a la base de datos |
| `npm run db:studio` | Abre la interfaz de Drizzle Studio |

## 🗂️ Estructura de carpetas

```
src/
├── app/          # Rutas y layouts de Next.js (auth, dashboard, onboarding, site, API)
├── components/   # Componentes reutilizables (UI, layout, auth, teams...)
├── db/           # Configuración de Drizzle y esquemas SQL
├── hooks/        # Hooks personalizados
├── lib/          # Utilidades (Supabase, configuración de DB, almacenamiento, etc.)
└── styles/       # Estilos globales y utilidades de Tailwind
```

## 🤝 Contribución

Las contribuciones son bienvenidas. Antes de enviar un pull request, ejecuta los scripts de linting y verificación de tipos para mantener la calidad del código.

## 📄 Licencia

Este proyecto se distribuye bajo la licencia que se defina en el repositorio. Si aún no existe, se recomienda agregar una.

---
Hecho con ❤️ por la comunidad de BallersHub.
