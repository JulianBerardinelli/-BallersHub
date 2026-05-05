import { XCircle } from "lucide-react";
import CheckoutDoneLayout from "@/components/site/checkout/CheckoutDoneLayout";

export const metadata = {
  title: "Pago rechazado · 'BallersHub",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ internal?: string; reason?: string }>;
};

export default async function CheckoutFailurePage({ searchParams }: PageProps) {
  const { internal, reason } = await searchParams;
  const retryHref = internal
    ? `/checkout/pro-player?retry=${internal}`
    : "/pricing";

  return (
    <CheckoutDoneLayout
      variant="failure"
      Icon={XCircle}
      title="No pudimos procesar tu pago"
      description={
        reasonCopy(reason) ?? (
          <>
            El procesador rechazó la operación. No te cobramos nada. Probá con
            otra tarjeta o método de pago — tus datos siguen guardados.
          </>
        )
      }
      primary={{ label: "Reintentar el pago", href: retryHref }}
      secondary={{ label: "Volver a planes", href: "/pricing" }}
    />
  );
}

function reasonCopy(reason: string | undefined): React.ReactNode {
  switch (reason) {
    case "cc_rejected_insufficient_amount":
      return (
        <>
          La tarjeta no tiene fondos suficientes. Probá con otro método o
          contactá a tu banco.
        </>
      );
    case "cc_rejected_bad_filled_card_number":
    case "cc_rejected_bad_filled_date":
    case "cc_rejected_bad_filled_security_code":
      return (
        <>
          Los datos de la tarjeta no son correctos. Revisá el número, la fecha
          de vencimiento y el código de seguridad e intentá de nuevo.
        </>
      );
    case "cc_rejected_high_risk":
      return (
        <>
          El procesador detectó un riesgo en la operación. Probá con otra
          tarjeta o contactá a tu banco para autorizar el cargo.
        </>
      );
    default:
      return null;
  }
}
