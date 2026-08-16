import { Component, lazy, Suspense, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { IconType } from 'react-icons';
import { FaDiscord, FaInstagram, FaLinkedin, FaTelegram, FaWhatsapp } from 'react-icons/fa';
import { SiGmail, SiImessage } from 'react-icons/si';
import { useAuth } from '../../context/useAuth';
import styles from './HomeHero.module.css';

const Dithering = lazy(() =>
  import('@paper-design/shaders-react').then((module) => ({
    default: module.Dithering,
  }))
);

// The shader needs WebGL. Its init throws asynchronously inside its own
// promise chain (not during React's render phase), so a React error
// boundary can never catch it — by the time it throws, render has already
// finished. The only reliable fix is to check support up front and skip
// loading the shader entirely when it's unavailable.
function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

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

// The shader is a third-party WebGL component. If it throws at render time
// (no WebGL support, a driver/GPU quirk, a bad context) Suspense alone won't
// catch it — Suspense only handles the loading state, not render errors —
// so the failure would propagate up and could unmount the whole page above
// it. This boundary contains that failure to just the decorative background,
// falling back to the plain dotted pattern instead.
class ShaderErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Hero shader failed to render, falling back:', error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export function HomeHero() {
  const [isHovered, setIsHovered] = useState(false);
  // Computed once on mount, not on every render — WebGL support doesn't
  // change mid-session.
  const [webglSupported] = useState(supportsWebGL);
  const { loginAsGuest } = useAuth();
  const navigate = useNavigate();

  const handleGuest = () => {
    loginAsGuest();
    navigate('/dashboard');
  };

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div
          className={styles.panel}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {webglSupported ? (
            <ShaderErrorBoundary fallback={<div className={styles.shaderFallback} />}>
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
            </ShaderErrorBoundary>
          ) : (
            // No WebGL available — never attempt to load the shader lib at
            // all, so its async init can't throw the unhandled rejection.
            <div className={styles.shaderFallback} />
          )}

          <div className={styles.content}>
            <h1 className={styles.title}>
              <span className={styles.titleMain}>Tag & Trail</span>
              <span className={styles.titleAccent}>Secure, Smart, Seamless</span>
            </h1>
            <p className={styles.subtitle}>
              Automatically process WhatsApp documents and links with malware detection, smart tagging, and fast retrieval.
            </p>
            <div className={styles.actions}>
              <button onClick={handleGuest} className={styles.primaryBtn}>
                <ArrowRight size={18} />
                Try as Guest
              </button>
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