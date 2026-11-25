import Link from "next/link";
import { ICON_BODY } from "./brand-paths";

export function LogoMark({ size = 30, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 240 240" aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICON_BODY.replaceAll("NAVY", dark ? "#FFFFFF" : "#102A43") }} />
  );
}

export function Logo({ dark = false, href = "/" }: { dark?: boolean; href?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2 font-heading text-xl font-extrabold ${dark ? "text-white" : "text-navy"}`}>
      <LogoMark dark={dark} />
      <span>SalesBuzz <span className="text-teal">AI</span></span>
    </Link>
  );
}
