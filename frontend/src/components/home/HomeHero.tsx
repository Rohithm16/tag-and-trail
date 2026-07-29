import { lazy, Suspense, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { IconType } from 'react-icons';
import { FaDiscord, FaInstagram, FaLinkedin, FaTelegram, FaWhatsapp } from 'react-icons/fa';
import { SiGmail, SiImessage } from 'react-icons/si';
import styles from './HomeHero.module.css';

const Dithering = lazy(() =>
  import('@paper-design/shaders-react').then((module) => ({
    default: module.Dithering,
  }))
);

type FloatingIcon = {
  Icon: IconType;
  color: string;
  className: string;
  delay: string;
  duration: string;
  label: string;
};

type FloatingIconStyle = CSSProperties & {
  '--icon-color': string;
  '--float-delay': string;
  '--float-duration': string;
};

const floatingIcons: FloatingIcon[] = [
  { Icon: FaWhatsapp, color: '#25d366', className: styles.whatsapp, delay: '0s', duration: '3.2s', label: 'WhatsApp' },
  { Icon: FaInstagram, color: '#e4405f', className: styles.instagram, delay: '0.5s', duration: '3.6s', label: 'Instagram' },
  { Icon: FaLinkedin, color: '#0a66c2', className: styles.linkedin, delay: '0.2s', duration: '2.8s', label: 'LinkedIn' },
  { Icon: SiGmail, color: '#ea4335', className: styles.gmail, delay: '0.7s', duration: '3.4s', label: 'Gmail' },
  { Icon: FaTelegram, color: '#26a5e4', className: styles.telegram, delay: '0.1s', duration: '3s', label: 'Telegram' },
  { Icon: FaDiscord, color: '#5865f2', className: styles.discord, delay: '0.8s', duration: '3.5s', label: 'Discord' },
  { Icon: SiImessage, color: '#34c759', className: styles.imessage, delay: '0.3s', duration: '3.1s', label: 'iMessage' },
];

export function HomeHero() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div
          className={styles.panel}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Suspense fallback={<div className={styles.shaderFallback} />}>
            <div className={styles.shaderLayer}>
              <Dithering
                className={styles.shaderCanvas}
                colorBack="#00000000"
                colorFront="#63a6ff"
                minPixelRatio={1}
                shape="warp"
                speed={isHovered ? 0.52 : 0.16}
                type="4x4"
              />
            </div>
          </Suspense>

          <div className={styles.content}>
            <h1 className={styles.title}>
              <span className={styles.titleMain}>Tag & Trail</span>
              <span className={styles.titleAccent}>Secure, Smart, Seamless</span>
            </h1>
            <p className={styles.subtitle}>
              Automatically process WhatsApp documents and links with malware detection, smart tagging, and fast retrieval.
            </p>
            <div className={styles.actions}>
              <Link to="/signup" className={styles.primaryBtn}>
                <ArrowRight size={18} />
                Try as Guest
              </Link>
              <Link to="/login" className={styles.secondaryBtn}>
                Sign In
              </Link>
            </div>
          </div>

          {floatingIcons.map(({ Icon, className, color, delay, duration, label }) => {
            const iconStyle: FloatingIconStyle = {
              '--icon-color': color,
              '--float-delay': delay,
              '--float-duration': duration,
            };
            return (
              <span
                aria-label={label}
                className={`${styles.socialIcon} ${className}`}
                key={label}
                role="img"
                style={iconStyle}
              >
                <Icon size={46} />
              </span>
            );
          })}
        </div>
      </div>
    </main>
  );
}