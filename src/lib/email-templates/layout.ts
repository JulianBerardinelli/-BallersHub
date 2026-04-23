// src/lib/email-templates/layout.ts

// Helper para iconos de tabler en base64 para evitar bloqueos de red en emails
const getSocialIcon = (name: string) => {
  const icons = {
    x: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNhMWExYWEiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBzdHJva2U9Im5vbmUiIGQ9Ik0wIDBoMjR2MjRIMHoiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNNCA0bDExLjczIDExLjczTTQgMjBsNi43NiAtNi43Nm0yLjQ2IC0yLjQ2bDUuNzggLTUuNzhoLTVsMTQgMTRoLTUiIC8+PC9zdmc+",
    instagram: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNhMWExYWEiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBzdHJva2U9Im5vbmUiIGQ9Ik0wIDBoMjR2MjRIMHoiIGZpbGw9Im5vbmUiLz48cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHJ4PSI0IiAvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjMiIC8+PGxpbmUgeDE9IjE2LjUiIHkxPSI3LjUiIHgyPSIxNi41IiB5Mj0iNy41MDEiIC8+PC9zdmc+",
    linkedin: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNhMWExYWEiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBzdHJva2U9Im5vbmUiIGQ9Ik0wIDBoMjR2MjRIMHoiIGZpbGw9Im5vbmUiLz48cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHJ4PSIyIiAvPjxsaW5lIHgxPSI4IiB5MT0iMTEiIHgyPSI4IiB5Mj0iMTYiIC8+PGxpbmUgeDE9IjhcIiB5MT0iOFwiIHgyPSI4IiB5Mj0iOC4wMSIgLz48bGluZSB4MT0iMTIiIHkxPSIxNiIgeDI9IjEyIiB5Mj0iMTEiIC8+PHBhdGggZD0iTTE2IDE2di0zYTIgMiAwIDAgMCAtNCAtMCIgLz48L3N2Zz4="
  };
  return icons[name as keyof typeof icons] || "";
};

export function BaseEmailLayout(content: string, preheader: string) {
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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;800;900&display=swap');
    
    body {
      margin: 0;
      padding: 0;
      background-color: #030303;
      color: #fafafa;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #030303;
      background-image: radial-gradient(circle at 50% 0%, rgba(39, 39, 42, 0.4) 0%, transparent 60%);
      padding-bottom: 60px;
      padding-top: 40px;
    }
    
    .webkit {
      max-width: 600px;
      margin: 0 auto;
      background-color: #09090b; /* neutral-950 */
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #27272a; /* neutral-800 */
      /* Sutil outline glow simulado con shadow */
      box-shadow: 0 20px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05);
    }
    
    .outer-table {
      margin: 0 auto;
      width: 100%;
      max-width: 600px;
      border-spacing: 0;
      font-family: 'Inter', sans-serif;
      color: #fafafa;
      /* Grid pattern bg simulado */
      background-image: 
        linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
      background-size: 20px 20px;
    }

    a {
      color: #fafafa;
      text-decoration: none;
    }

    .btn-primary {
      background-color: #fafafa;
      color: #09090b !important;
      font-weight: 600;
      padding: 14px 28px;
      border-radius: 8px;
      display: inline-block;
      text-decoration: none;
      font-size: 14px;
      letter-spacing: 0.02em;
    }

    .step-card {
      background-color: #121214; 
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 16px;
    }
    
    .footer-links a {
      color: #a1a1aa;
      font-size: 12px;
      margin: 0 12px;
      text-decoration: underline;
      text-decoration-color: #3f3f46;
    }
  </style>
</head>
<body>
  <span style="display:none !important; visibility:hidden; mso-hide:all; font-size:1px; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden;">
    ${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </span>

  <center class="wrapper">
    <div class="webkit">
      <table class="outer-table">
        <!-- Logo Header Premium -->
        <tr>
          <td style="padding: 40px 30px 0px 30px; text-align: center;">
            <div style="display:inline-block; margin: 0 auto; background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0)); padding: 12px 24px; border-radius: 100px; border: 1px solid rgba(255,255,255,0.05);">
              <p style="font-weight: 900; font-size: 22px; letter-spacing: -0.05em; margin: 0; color: #fff;">
                'Ballershub
              </p>
            </div>
          </td>
        </tr>
        
        <!-- Main Content -->
        <tr>
          <td style="padding: 30px 40px 40px 40px;">
            ${content}
          </td>
        </tr>

        <!-- Highly Professional Footer -->
        <tr>
          <td style="padding: 40px 30px; background-color: #030303; text-align: center; border-top: 1px solid #18181b;">
            <!-- Social Icons -->
            <div style="margin-bottom: 24px;">
              <a href="#" style="display:inline-block; margin: 0 10px;"><img src="${getSocialIcon('x')}" alt="X" width="20" height="20" style="opacity: 0.6;" /></a>
              <a href="#" style="display:inline-block; margin: 0 10px;"><img src="${getSocialIcon('instagram')}" alt="Instagram" width="20" height="20" style="opacity: 0.6;" /></a>
              <a href="#" style="display:inline-block; margin: 0 10px;"><img src="${getSocialIcon('linkedin')}" alt="LinkedIn" width="20" height="20" style="opacity: 0.6;" /></a>
            </div>
            
            <p style="margin: 0 0 16px 0; font-size: 12px; color: #71717a; line-height: 1.5;">
              Estás recibiendo este correo porque tu cuenta fue dada de alta en 'Ballershub.<br>
              © ${new Date().getFullYear()} 'Ballershub. Centralizando el ecosistema deportivo.
            </p>
            
            <div class="footer-links">
              <a href="#">Términos de Servicio</a>
              <a href="#">Privacidad</a>
              <a href="#">Soporte</a>
            </div>
          </td>
        </tr>
      </table>
    </div>
    
    <p style="text-align: center; font-size: 11px; color: #52525b; margin-top: 30px;">
      Por favor, no respondas a este correo. Para contactarnos, utiliza la plataforma.
    </p>
  </center>
</body>
</html>
  `;
}
