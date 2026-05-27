// Resuelve emails reales (auth.users) para los destinatarios de las
// notificaciones editoriales del blog.
//
// Por qué no usar el Supabase admin client: la sesión de la server
// action ya corre con el rol postgres (Drizzle), que tiene acceso
// directo a auth.users. Una query plana evita el ida y vuelta del
// admin client y elimina la dependencia del SUPABASE_SERVICE_ROLE_KEY
// para este flow (ya está en env de todos modos para otras cosas).
//
// `auth.users` no está en el schema de Drizzle (Supabase managed) →
// usamos `sql` template directo.

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * Lista de emails de TODOS los users con role='admin' en user_profiles.
 * Dinámico: si en algún momento agregás un segundo admin, automáticamente
 * recibe las notificaciones editoriales sin tocar código.
 *
 * Excluye filas donde auth.users.email es NULL (debería ser raro pero
 * el campo es nullable a nivel DB).
 */
export async function getBlogAdminEmails(): Promise<string[]> {
  const result = await db.execute<{ email: string | null }>(sql`
    SELECT au.email
    FROM public.user_profiles up
    JOIN auth.users au ON au.id = up.user_id
    WHERE up.role = 'admin'
      AND au.email IS NOT NULL
  `);
  return Array.from(
    new Set(
      result.rows
        .map((r) => (r.email ?? "").trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

/**
 * Email del autor por user_id. null si no se encuentra (cuenta borrada,
 * etc.) — el caller decide si fallback a log o silenciar.
 */
export async function getAuthorEmailById(userId: string): Promise<string | null> {
  const result = await db.execute<{ email: string | null }>(sql`
    SELECT email FROM auth.users WHERE id = ${userId} LIMIT 1
  `);
  return result.rows[0]?.email ?? null;
}
