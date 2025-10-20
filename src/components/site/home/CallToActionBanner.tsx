import Link from "next/link";
import { Button, Card, CardBody } from "@heroui/react";
import { ArrowRightCircle } from "lucide-react";

export default function CallToActionBanner() {
  return (
    <section>
      <Card className="border-success-500/30 bg-gradient-to-r from-black/60 via-success-500/10 to-black/40 backdrop-blur">
        <CardBody className="flex flex-col items-start gap-6 rounded-2xl p-10 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold text-white">Prepará tu próxima transferencia</h2>
            <p className="text-sm text-neutral-300">
              Organiza tus datos, comparte tu trayectoria y mantené actualizadas tus referencias con BallersHub.
            </p>
          </div>
          <Button
            as={Link}
            href="/auth/sign-up"
            size="lg"
            color="success"
            endContent={<ArrowRightCircle className="h-5 w-5" />}
            className="font-semibold"
          >
            Crear cuenta gratuita
          </Button>
        </CardBody>
      </Card>
    </section>
  );
}
