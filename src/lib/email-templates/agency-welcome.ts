// src/lib/email-templates/agency-welcome.ts
import { BaseEmailLayout } from "./layout";

export function getAgencyWelcomeEmail(managerName: string, dashboardUrl: string) {
  const iconBuilding = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBzdHJva2U9Im5vbmUiIGQ9Ik0wIDBoMjR2MjRIMHoiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNMyAyMWwxOCAwIiAvPjxwYXRoIGQ9Ik05IDhsMSAwIiAvPjxwYXRoIGQ9Ik05IDEybDEgMCIgLz48cGF0aCBkPSJNOSAxNmwxIDAiIC8+PHBhdGggZD0iTTE0IDhsMSAwIiAvPjxwYXRoIGQ9Ik0xNCAxMmwxIDAiIC8+PHBhdGggZD0iTTE0IDE2bDEgMCIgLz48cGF0aCBkPSJNNSAyMXYtMTZhMiAyIDAgMCAxIDIgLTJoMTBhMiAyIDAgMCAxIDIgMnYxNiIgLz48L3N2Zz4=";
  const iconUsers = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBzdHJva2U9Im5vbmUiIGQ9Ik0wIDBoMjR2MjRIMHoiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNMTAgMTNhMiAyIDAgMSAwIDQgMGEyIDIgMCAwIDAgLTQgMCIgLz48cGF0aCBkPSJNOCAyMXYtMWEyIDIgMCAwIDEgMiAtMmg0YTIgMiAwIDAgMSAyIDJ2MSIgLz48cGF0aCBkPSJNMTUgNWEyIDIgMCAxIDAgNCAwYTIgMiAwIDAgMCAtNCAwIiAvPjxwYXRoIGQ9Ik0xNyAxMGgyYTIgMiAwIDAgMSAyIDJ2MSIgLz48cGF0aCBkPSJNNSA1YTIgMiAwIDEgMCA0IDBhMiAyIDAgMCAwIC00IDAiIC8+PHBhdGggZD0iTTMgMTN2LTFhMiAyIDAgMCAxIDIgLTJoMiIgLz48L3N2Zz4=";
  const iconBriefcase = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBzdHJva2U9Im5vbmUiIGQ9Ik0wIDBoMjR2MjRIMHoiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNMyA3bTAgMmEyIDIgMCAwIDEgMiAtMmgxNGEyIDIgMCAwIDEgMiAydjlhMiAyIDAgMCAxIC0yIDJoLTE0YTIgMiAwIDAgMSAtMiAtMnoiIC8+PHBhdGggZD0iTTggN3YtMmEyIDIgMCAwIDEgMiAtMmg0YTIgMiAwIDAgMSAyIDJ2MiIgLz48cGF0aCBkPSJNMTIgMTJsMCAuMDEiIC8+PHBhdGggZD0iTTMgMTNhMjAgMjAgMCAwIDAgMTggMCIgLz48L3N2Zz4=";

  const content = `
    <h1 style="font-size: 26px; font-weight: 900; margin-top: 0; margin-bottom: 20px; color: #fff; letter-spacing: -0.02em;">
      ¡Hola ${managerName}, bienvenido!
    </h1>
    
    <p style="font-size: 15px; line-height: 1.6; color: #a1a1aa; margin-bottom: 32px;">
      Empieza a organizar todo el scouting de tu red, gestionar talentos, y visualizar perfiles con un nivel de profesionalismo de élite. Configurar <strong>'Ballershub</strong> es súper sencillo si sigues la siguiente hoja de ruta.
    </p>

    <!-- STEP 1 -->
    <div class="step-card">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="52" valign="top">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #27272a, #18181b); border: 1px solid #3f3f46; border-radius: 10px; text-align: center; line-height: 38px;">
              <img src="${iconBuilding}" alt="Icon" width="20" height="20" style="vertical-align: middle;" />
            </div>
          </td>
          <td valign="middle">
            <h3 style="margin: 0 0 6px 0; font-size: 16px; color: #fff; font-weight: 600; letter-spacing: -0.01em;">
              1. Diseña el Setup de tu Agencia
            </h3>
            <p style="margin: 0; font-size: 14px; color: #a1a1aa; line-height: 1.5;">
              Dirígete a la configuración empresarial. Completa el logo corporativo, los correos de contacto y la biografía general de la agencia.
            </p>
          </td>
        </tr>
      </table>
    </div>

    <!-- STEP 2 -->
    <div class="step-card">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="52" valign="top">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #27272a, #18181b); border: 1px solid #3f3f46; border-radius: 10px; text-align: center; line-height: 38px;">
              <img src="${iconUsers}" alt="Icon" width="20" height="20" style="vertical-align: middle;" />
            </div>
          </td>
          <td valign="middle">
            <div style="display:inline-block; font-size: 10px; font-weight: 800; background-color: #3f3f46; color: #fff; padding: 2px 8px; border-radius: 4px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.1em;">Paso Clave</div>
            <h3 style="margin: 0 0 6px 0; font-size: 16px; color: #fff; font-weight: 600; letter-spacing: -0.01em;">
              2. Importa a tus Jugadores
            </h3>
            <p style="margin: 0; font-size: 14px; color: #a1a1aa; line-height: 1.5;">
              Utiliza el sistema de <strong>Invitaciones</strong> para enlazar formalmente los perfiles públicos de tus futbolistas a la marca y tablero de tu Agencia.
            </p>
          </td>
        </tr>
      </table>
    </div>

    <!-- STEP 3 -->
    <div class="step-card" style="margin-bottom: 40px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="52" valign="top">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #27272a, #18181b); border: 1px solid #3f3f46; border-radius: 10px; text-align: center; line-height: 38px;">
              <img src="${iconBriefcase}" alt="Icon" width="20" height="20" style="vertical-align: middle;" />
            </div>
          </td>
          <td valign="middle">
            <h3 style="margin: 0 0 6px 0; font-size: 16px; color: #fff; font-weight: 600; letter-spacing: -0.01em;">
              3. Delega Operaciones al Staff
            </h3>
            <p style="margin: 0; font-size: 14px; color: #a1a1aa; line-height: 1.5;">
              Lleva la red operativa a la nube: envía invitaciones a tus socios y entrenadores para auditar talentos y visualizar estadísticas en tiempo real.
            </p>
          </td>
        </tr>
      </table>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="text-align: center;">
          <a href="${dashboardUrl}" class="btn-primary">
            Ir a mi Dashboard de Agencia
          </a>
        </td>
      </tr>
    </table>
  `;

  return BaseEmailLayout(
    content,
    "Los pasos clave para establecer tu marca como agencia representativa y armar tu directorio de futbolistas."
  );
}
