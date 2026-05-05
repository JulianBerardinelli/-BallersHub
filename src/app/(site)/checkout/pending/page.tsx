import { Hourglass } from "lucide-react";
import CheckoutDoneLayout from "@/components/site/checkout/CheckoutDoneLayout";

export const metadata = {
  title: "Pago en proceso · 'BallersHub",
  robots: { index: false, follow: false },
};

export default function CheckoutPendingPage() {
  return (
    <CheckoutDoneLayout
      variant="pending"
      Icon={Hourglass}
      title="Estamos procesando tu pago"
      description={
        <>
          Algunos métodos (efectivo, transferencia, débito en Argentina)
          tardan unos minutos en confirmarse. Te vamos a mandar un email
          apenas se acredite — no hace falta que hagas nada más.
        </>
      }
      primary={{ label: "Ir a mi dashboard", href: "/dashboard" }}
      secondary={{ label: "Volver al inicio", href: "/" }}
    />
  );
}
