import localFont from "next/font/local";

export const zuume = localFont({
  src: [
    {
      path: "../fonts/Zuume/Zuume-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/Zuume/fontspring-demo-zuumerough-bold.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/Zuume/Zuume-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/Zuume/ZuumeCut-ExtraLightItalic.otf",
      weight: "200",
      style: "italic",
    },
    {
      path: "../fonts/Zuume/ZuumeEdgeCut-SemiBoldItalic.otf",
      weight: "600",
      style: "italic",
    },
    {
      path: "../fonts/Zuume/ZuumeCut-ExtraBoldItalic.otf",
      weight: "800",
      style: "italic",
    },
    {
      path: "../fonts/Zuume/ZuumeCut-BlackItalic.otf",
      weight: "900",
      style: "italic",
    },
  ],
  variable: "--font-zuume",
  display: "swap",
});
