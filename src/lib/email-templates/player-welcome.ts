// src/lib/email-templates/player-welcome.ts
import { BaseEmailLayout } from "./layout";

export function getPlayerWelcomeEmail(playerName: string, dashboardUrl: string) {
  const iconShirt = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBzdHJva2U9Im5vbmUiIGQ9Ik0wIDBoMjR2MjRIMHoiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNMTUgNGw2IDJ2NWgtM3Y4YTEgMSAwIDAgMSAtMSAxaC0xMGExIDEgMCAwIDEgLTEgLTF2LThoLTN2LTVsNiAtMmEzIDMgMCAwIDAgNiAwIiAvPjwvc3ZnPg==";
  const iconVideo = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBzdHJva2U9Im5vbmUiIGQ9Ik0wIDBoMjR2MjRIMHoiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNNyA0djE2bDEzIC04eiIgLz48L3N2Zz4=";
  const iconPalette = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBzdHJva2U9Im5vbmUiIGQ9Ik0wIDBoMjR2MjRIMHoiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNMTIgMjFhOSA5IDAgMCAxIDAgLTE4YzQuOTcgMCA5IDMuNTgyIDkgOGMwIDEuMDYgLS40NzQgMi4wNzggLTEuMzE4IDIuODI4Yy0uODQ0IC43NSAtMS45ODkgMS4xNzIgLTMuMTgyIDEuMTcyaC0yLjVhMiAyIDAgMCAwIC0xIDMuNzVhMS4zIDEuMyAwIDAgMSAtMSAyLjI1IiAvPjxjaXJjbGUgY3g9IjguNSIgY3k9IjEwLjUiIHI9IjEiIC8+PGNpcmNsZSBjeD0iMTIuNSIgY3k9IjcuNSIgcj0iMSIgLz48Y2lyY2xlIGN4PSIxNi41IiBjeT0iMTAuNSIgcj0iMSIgLz48L3N2Zz4=";

  const content = `
    <h1 style="font-size: 26px; font-weight: 900; margin-top: 0; margin-bottom: 20px; color: #fff; letter-spacing: -0.02em;">
      ¡Bienvenido, ${playerName}!
    </h1>
    
    <p style="font-size: 15px; line-height: 1.6; color: #a1a1aa; margin-bottom: 32px;">
      Has dado el primer paso hacia el siguiente nivel. En <strong>'Ballershub</strong> los clubes, agencias y scouts están buscando talento deportivo de forma activa. Para destacar, es crucial que estructures tu perfil del siguiente modo:
    </p>

    <!-- STEP 1 -->
    <div class="step-card">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="52" valign="top">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #27272a, #18181b); border: 1px solid #3f3f46; border-radius: 10px; text-align: center; line-height: 38px;">
              <img src="${iconShirt}" alt="Icon" width="20" height="20" style="vertical-align: middle;" />
            </div>
          </td>
          <td valign="middle">
            <h3 style="margin: 0 0 6px 0; font-size: 16px; color: #fff; font-weight: 600; letter-spacing: -0.01em;">
              1. Datos Futbolísticos
            </h3>
            <p style="margin: 0; font-size: 14px; color: #a1a1aa; line-height: 1.5;">
              Ingresa tu historial de clubes, liga actual, posiciones, y detalles físicos. Mientras más conciso seas, mejores <em>oportunidades</em> tendrás de recibir alertas.
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
              <img src="${iconVideo}" alt="Icon" width="20" height="20" style="vertical-align: middle;" />
            </div>
          </td>
          <td valign="middle">
            <div style="display:inline-block; font-size: 10px; font-weight: 800; background-color: #3f3f46; color: #fff; padding: 2px 8px; border-radius: 4px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.1em;">Paso Clave</div>
            <h3 style="margin: 0 0 6px 0; font-size: 16px; color: #fff; font-weight: 600; letter-spacing: -0.01em;">
              2. Sube tus Highlights
            </h3>
            <p style="margin: 0; font-size: 14px; color: #a1a1aa; line-height: 1.5;">
              Vincúlate directamente a tus videos de YouTube. El material visual y los reportes de scouting son <strong>lo primero</strong> que las Agencias quieren analizar.
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
              <img src="${iconPalette}" alt="Icon" width="20" height="20" style="vertical-align: middle;" />
            </div>
          </td>
          <td valign="middle">
            <h3 style="margin: 0 0 6px 0; font-size: 16px; color: #fff; font-weight: 600; letter-spacing: -0.01em;">
              3. Personaliza tu Identidad
            </h3>
            <p style="margin: 0; font-size: 14px; color: #a1a1aa; line-height: 1.5;">
              Edita los colores y formato de tu tarjeta pública. Un perfil con excelente estética genera una impresión instantánea mucho más profesional.
            </p>
          </td>
        </tr>
      </table>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="text-align: center;">
          <a href="${dashboardUrl}" class="btn-primary">
            Ir a mi Panel de Control
          </a>
        </td>
      </tr>
    </table>
  `;

  return BaseEmailLayout(
    content,
    "Los pasos para activar tu Perfil Deportivo en 'Ballershub y destacar en el ecosistema de scouting."
  );
}
