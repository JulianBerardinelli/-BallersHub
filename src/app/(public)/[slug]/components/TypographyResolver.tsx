import { Syncopate, Roboto_Mono, Michroma, Inter, Playfair_Display, Lora, Lato } from "next/font/google";

const syncopate = Syncopate({ subsets: ["latin"], weight: ["400", "700"], variable: '--font-heading' });
const michroma = Michroma({ subsets: ["latin"], weight: ["400"], variable: '--font-heading' });
const inter = Inter({ subsets: ["latin"], variable: '--font-body' });
const robotoMono = Roboto_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: '--font-body' });
const playfair = Playfair_Display({ subsets: ["latin"], variable: '--font-heading' });
const lora = Lora({ subsets: ["latin"], variable: '--font-heading' });
const lato = Lato({ subsets: ["latin"], weight: ["400", "700"], variable: '--font-body' });

export function resolveTypographyClasses(typographyId: string | null) {
  switch (typographyId) {
    case "syncopate":
      return `${syncopate.variable} ${robotoMono.variable} font-sans`;
    case "michroma":
      return `${michroma.variable} ${inter.variable} font-sans`;
    case "inter":
      return `${inter.variable} ${inter.variable} font-sans`;
    case "satoshi": // fallback assuming base fonts or inter for generic sans
      return `${inter.variable} ${inter.variable} font-sans`;
    case "playfair":
      return `${playfair.variable} ${lato.variable} font-serif`;
    case "lora":
      return `${lora.variable} ${lato.variable} font-serif`;
    default:
      return `${syncopate.variable} ${robotoMono.variable} font-sans`;
  }
}
