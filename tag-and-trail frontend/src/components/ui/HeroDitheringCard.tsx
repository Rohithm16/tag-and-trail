import { ArrowRight } from "lucide-react";
import { useState, Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import {
  FaWhatsapp,
  FaInstagram,
  FaLinkedin,
  FaTelegram,
  FaDiscord,
} from "react-icons/fa";
import { SiGmail, SiImessage } from "react-icons/si";

const Dithering = lazy(() =>
  import("@paper-design/shaders-react").then((mod) => ({
    default: mod.Dithering,
  }))
);

export function HeroDitheringCard() {
  const [isHovered, setIsHovered] = useState(false);

  const socialIcons = [
    {
      Icon: FaWhatsapp,
      color: "#25D366",
      style: { left: "3%", top: "15%" },
      delay: "0s",
      duration: "3.2s",
      label: "WhatsApp",
    },
    {
      Icon: FaInstagram,
      color: "#E4405F",
      style: { left: "2%", top: "45%" },
      delay: "0.5s",
      duration: "3.6s",
      label: "Instagram",
    },
    {
      Icon: FaLinkedin,
      color: "#0A66C2",
      style: { right: "3%", top: "20%" },
      delay: "0.2s",
      duration: "2.8s",
      label: "LinkedIn",
    },
    {
      Icon: SiGmail,
      color: "#EA4335",
      style: { right: "4%", top: "55%" },
      delay: "0.7s",
      duration: "3.4s",
      label: "Gmail",
    },
    {
      Icon: FaTelegram,
      color: "#26A5E4",
      style: { top: "5%", right: "10%" },
      delay: "0.1s",
      duration: "3s",
      label: "Telegram",
    },
    {
      Icon: FaDiscord,
      color: "#5865F2",
      style: { bottom: "8%", left: "5%" },
      delay: "0.8s",
      duration: "3.5s",
      label: "Discord",
    },
    {
      Icon: SiImessage,
      color: "#34C759",
      style: { bottom: "10%", right: "6%" },
      delay: "0.3s",
      duration: "3.1s",
      label: "iMessage",
    },
  ];

  return (
    <section className="flex w-full justify-center px-4 md:px-6">
      <div
        className="relative w-full max-w-7xl"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Card with vanilla background */}
        <div className="relative flex min-h-[600px] items-center justify-center overflow-hidden rounded-[48px] border border-slate-200 bg-[#F0EEE6] shadow-sm">
          {/* Dithering overlay (visible on top of vanilla background) */}
          <Suspense fallback={<div className="absolute inset-0 z-0 bg-[radial-gradient(circle,rgba(99,166,255,0.45)_1px,transparent_1.5px)_0_0/_10px_10px] opacity-40" />}>
            <div className="pointer-events-none absolute inset-[-2px] z-0 opacity-60 mix-blend-multiply saturate-125">
              <Dithering
                colorBack="#00000000"
                colorFront="#63a6ff"
                shape="warp"
                type="4x4"
                speed={isHovered ? 0.52 : 0.16}
                className="block h-full w-full"
                minPixelRatio={1}
              />
            </div>
          </Suspense>

          {/* Content */}
          <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 text-center">
            <h2 className="mb-8 font-serif text-5xl font-medium leading-[1.05] tracking-tight text-slate-950 md:text-7xl lg:text-8xl">
              Tag & Trail <br />
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                Secure, Smart, Seamless
              </span>
            </h2>

            <p className="mb-12 max-w-2xl text-lg leading-relaxed text-slate-600 md:text-xl">
              Automatically process WhatsApp documents & links – ML-powered
              malware detection, smart tagging, and effortless retrieval.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link to="/signup">
                <button className="group relative inline-flex h-14 items-center justify-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-12 text-base font-medium text-white transition-all duration-300 hover:scale-105 hover:ring-4 hover:ring-blue-500/20 active:scale-95">
                  <span className="relative z-10">Get Started</span>
                  <ArrowRight className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </Link>
              <Link to="/login">
                <button className="group relative inline-flex h-14 items-center justify-center gap-3 overflow-hidden rounded-full border border-slate-200 bg-white px-12 text-base font-medium text-slate-900 transition-all duration-300 hover:scale-105 hover:bg-accent hover:text-accent-foreground active:scale-95">
                  <span className="relative z-10">Sign In</span>
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Floating social icons */}
        <style>{`
          @keyframes float {
            0% {
              transform: translateY(0px) translateX(0px);
            }
            50% {
              transform: translateY(-6px) translateX(2px);
            }
            100% {
              transform: translateY(0px) translateX(0px);
            }
          }
        `}</style>

        {socialIcons.map(({ Icon, color, style, delay, duration, label }) => (
          <div
            key={label}
            className="absolute z-20 grid aspect-square w-20 place-items-center rounded-full border border-slate-200/60 bg-white/90 shadow-[0_18px_28px_rgba(15,23,42,0.14)] backdrop-blur-md transition-all duration-300 hover:scale-110 hover:shadow-xl"
            style={{
              ...style,
              animation: `float ${duration} ease-in-out infinite`,
              animationDelay: delay,
            }}
            role="img"
            aria-label={label}
          >
            <div className="flex items-center justify-center transition-transform duration-200 hover:scale-105">
              <Icon size={50} style={{ color }} className="drop-shadow-sm" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}