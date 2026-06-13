"use client";

import dynamic from "next/dynamic";
import SectionSkeleton from "./_skeleton";

const ContactSocialSection = dynamic(
  () => import("../ContactSocialSection"),
  { ssr: false, loading: () => <SectionSkeleton labelKey="contact" /> },
);

export default ContactSocialSection;
