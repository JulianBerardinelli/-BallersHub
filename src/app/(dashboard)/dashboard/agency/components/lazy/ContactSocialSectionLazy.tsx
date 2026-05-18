"use client";

import dynamic from "next/dynamic";
import SectionSkeleton from "./_skeleton";

const ContactSocialSection = dynamic(
  () => import("../ContactSocialSection"),
  { ssr: false, loading: () => <SectionSkeleton label="Contacto y redes" /> },
);

export default ContactSocialSection;
