// generate-test.js
const fs = require('fs');

function BaseEmailLayout(content, preheader) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>'Ballershub</title>
  <!--[if mso]>
  <style>
    table {border-collapse:collapse;border-spacing:0;margin:0;}
    div, td {padding:0;}
    div {margin:0 !important;}
  </style>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
    
    body {
      margin: 0;
      padding: 0;
      background-color: #09090b;
      color: #fafafa;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #09090b;
      padding-bottom: 60px;
      padding-top: 40px;
    }
    
    .webkit {
      max-width: 600px;
      margin: 0 auto;
      background-color: #09090b;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #27272a;
    }
    
    .outer-table {
      margin: 0 auto;
      width: 100%;
      max-width: 600px;
      border-spacing: 0;
      font-family: 'Inter', sans-serif;
      color: #fafafa;
    }

    a {
      color: #fafafa;
      text-decoration: none;
    }

    .btn-primary {
      background-color: #fafafa;
      color: #09090b !important;
      font-weight: 600;
      padding: 14px 24px;
      border-radius: 8px;
      display: inline-block;
      text-decoration: none;
      font-size: 14px;
    }

    .step-card {
      background-color: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <span style="display:none !important; visibility:hidden; mso-hide:all; font-size:1px; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden;">
    ${preheader}
  </span>

  <center class="wrapper">
    <div class="webkit">
      <table class="outer-table">
        <tr>
          <td style="padding: 40px 30px 20px 30px; text-align: center;">
            <p style="font-weight: 900; font-size: 24px; letter-spacing: -0.05em; margin: 0; color: #fff;">'Ballershub</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 30px 40px 30px;">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="padding: 30px; background-color: #000; text-align: center; border-top: 1px solid #27272a;">
            <p style="margin: 0; font-size: 12px; color: #71717a;">
              Estás recibiendo este correo porque te has registrado en 'Ballershub.<br>
              © ${new Date().getFullYear()} 'Ballershub. Todos los derechos reservados.
            </p>
          </td>
        </tr>
      </table>
    </div>
  </center>
</body>
</html>
  `;
}

function getPlayerWelcomeEmail(playerName, dashboardUrl) {
  const content = `
    <h1 style="font-size: 24px; font-weight: 800; margin-top: 0; margin-bottom: 20px; color: #fff;">
      ¡Bienvenido a 'Ballershub, ${playerName}!
    </h1>
    
    <p style="font-size: 15px; line-height: 1.6; color: #a1a1aa; margin-bottom: 24px;">
      Has dado el primer paso hacia el siguiente nivel. En 'Ballershub los clubes, agencias y scouts están buscando talento deportivo de forma activa. Para destacar, es crucial que completes tu perfil profesional al 100%.
    </p>

    <div class="step-card">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="36" valign="top">
            <div style="width: 24px; height: 24px; background-color: #3f3f46; border-radius: 50%; text-align: center; line-height: 24px; color: #fff; font-size: 13px; font-weight: bold;">
              1
            </div>
          </td>
          <td>
            <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #fff; font-weight: 600;">
              Completa tus Datos Futbolísticos
            </h3>
            <p style="margin: 0; font-size: 14px; color: #a1a1aa; line-height: 1.5;">
              Sube tu historial, liga actual, posiciones, y detalles de tu complexión física. Mientras más preciso seas, mejores oportunidades tendrás de hacer *"Match"*.
            </p>
          </td>
        </tr>
      </table>
    </div>

    <div class="step-card">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="36" valign="top">
            <div style="width: 24px; height: 24px; background-color: #3f3f46; border-radius: 50%; text-align: center; line-height: 24px; color: #fff; font-size: 13px; font-weight: bold;">
              2
            </div>
          </td>
          <td>
            <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #fff; font-weight: 600;">
              Sube tus Highlights (Clave)
            </h3>
            <p style="margin: 0; font-size: 14px; color: #a1a1aa; line-height: 1.5;">
              Pega los enlaces a tus videos de YouTube o fotos de archivo. El material visual y los recortes tácticos son <strong>lo primero</strong> que los ojeadores quieren ver.
            </p>
          </td>
        </tr>
      </table>
    </div>

    <div class="step-card" style="margin-bottom: 32px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="36" valign="top">
            <div style="width: 24px; height: 24px; background-color: #3f3f46; border-radius: 50%; text-align: center; line-height: 24px; color: #fff; font-size: 13px; font-weight: bold;">
              3
            </div>
          </td>
          <td>
            <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #fff; font-weight: 600;">
              Personaliza tu Diseño
            </h3>
            <p style="margin: 0; font-size: 14px; color: #a1a1aa; line-height: 1.5;">
              Edita los colores y formato de tu tarjeta pública. Un perfil con excelente estética deportiva genera una impresión instantánea mucho más profesional.
            </p>
          </td>
        </tr>
      </table>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="text-align: center;">
          <a href="${dashboardUrl}" class="btn-primary">
            Armar mi Perfil Oficial
          </a>
        </td>
      </tr>
    </table>
    
    <p style="text-align: center; font-size: 13px; color: #71717a; margin-top: 24px;">
      Si necesitas ayuda, no dudes en responder este correo o abrir un ticket de soporte en la plataforma.
    </p>
  `;

  return BaseEmailLayout(
    content,
    "Los pasos para activar tu Perfil Deportivo en 'Ballershub y destacar en el ecosistema de scouting."
  );
}

function getAgencyWelcomeEmail(managerName, dashboardUrl) {
  const content = `
    <h1 style="font-size: 24px; font-weight: 800; margin-top: 0; margin-bottom: 20px; color: #fff;">
      ¡Hola ${managerName}, bienvenido a 'Ballershub!
    </h1>
    
    <p style="font-size: 15px; line-height: 1.6; color: #a1a1aa; margin-bottom: 24px;">
      Empieza a organizar todo el scouting de tu red, gestionar talentos, y visualizar perfiles con un nivel de profesionalismo de élite. Configurar la plataforma es simple si sigues la siguiente hoja de ruta.
    </p>

    <!-- STEP 1 -->
    <div class="step-card">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="36" valign="top">
            <div style="width: 24px; height: 24px; background-color: #3f3f46; border-radius: 50%; text-align: center; line-height: 24px; color: #fff; font-size: 13px; font-weight: bold;">
              1
            </div>
          </td>
          <td>
            <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #fff; font-weight: 600;">
              Diseña el Setup de tu Agencia
            </h3>
            <p style="margin: 0; font-size: 14px; color: #a1a1aa; line-height: 1.5;">
              Dirígete a la configuración de Perfil de la Agencia. Completa el logo corporativo, los correos de contacto, y la descripción general comercial.
            </p>
          </td>
        </tr>
      </table>
    </div>

    <!-- STEP 2 -->
    <div class="step-card">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="36" valign="top">
            <div style="width: 24px; height: 24px; background-color: #3f3f46; border-radius: 50%; text-align: center; line-height: 24px; color: #fff; font-size: 13px; font-weight: bold;">
              2
            </div>
          </td>
          <td>
            <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #fff; font-weight: 600;">
              Importa a tus Jugadores (Roster)
            </h3>
            <p style="margin: 0; font-size: 14px; color: #a1a1aa; line-height: 1.5;">
              En la pestaña <em>"Mis Jugadores"</em>, utiliza el sistema de <strong>Invitación</strong> para enlazar formalmente los perfiles públicos de tus futbolistas representados a la marca de tu Agencia.
            </p>
          </td>
        </tr>
      </table>
    </div>

    <!-- STEP 3 -->
    <div class="step-card" style="margin-bottom: 32px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="36" valign="top">
            <div style="width: 24px; height: 24px; background-color: #3f3f46; border-radius: 50%; text-align: center; line-height: 24px; color: #fff; font-size: 13px; font-weight: bold;">
              3
            </div>
          </td>
          <td>
            <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #fff; font-weight: 600;">
              Integra a tu Staff
            </h3>
            <p style="margin: 0; font-size: 14px; color: #a1a1aa; line-height: 1.5;">
              Lleva la red operativa a la nube: puedes enviar invitaciones gratuitas a tus socios, coordinadores y entrenadores para que también auditen talentos dentro del mismo entorno de tablero.
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
    
    <p style="text-align: center; font-size: 13px; color: #71717a; margin-top: 24px;">
      Nos tomamos muy en serio tu actividad. Si requieres ayuda técnica con una migración masiva de perfiles, contacta con nuestro servicio de soporte prioritario.
    </p>
  `;

  return BaseEmailLayout(
    content,
    "Los pasos clave para establecer tu marca como agencia representativa y armar tu directorio de futbolistas."
  );
}

fs.writeFileSync('preview-player-welcome.html', getPlayerWelcomeEmail('Lionel', 'http://localhost:3000/dashboard'));
fs.writeFileSync('preview-agency-welcome.html', getAgencyWelcomeEmail('Pep', 'http://localhost:3000/dashboard'));
console.log('Archivos generados exitosamente.');
