import { Config } from "@remotion/cli/config";

// Salida de imagen para los frames de video (jpeg = renders más livianos).
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Si más adelante usás <HtmlInCanvas> con efectos WebGL sobre la UI real,
// descomentá esto (y rendereá con --gl=angle):
// Config.setChromiumOpenGlRenderer("angle");
