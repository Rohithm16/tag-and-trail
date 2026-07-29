import { useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { Key, CheckCircle, Circle } from 'lucide-react';
import styles from '../App.module.css';

export function ConnectWhatsAppPage() {
  const [apiKey, setApiKey] = useState('');
  const [connected, setConnected] = useState(false);

  const steps = [
    { id: 1, label: 'Install Twilio SDK', description: 'Run `npm install twilio` in your project.' },
    { id: 2, label: 'Get your API Key', description: 'Find your Account SID and Auth Token in the Twilio Console.' },
    { id: 3, label: 'Enter your API Key', description: 'Paste your credentials below to connect.' },
  ];

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim().length > 0) {
      setConnected(true);
      // TODO: API call to connect
      console.log('Connecting with API Key:', apiKey);
    }
  };

  return (
    <div className={styles.stack}>
      <div className={styles.titleRow}>
        <div className={styles.titleBlock}>
          <h1 className={styles.pageTitle}>Connect WhatsApp</h1>
          <p className={styles.subtitle}>
            Integrate Twilio WhatsApp API to send and receive messages.
          </p>
        </div>
      </div>

      <div className={styles.whatsappSteps}>
        {steps.map((step, index) => (
          <div key={step.id} className={styles.stepItem}>
            <div className={styles.stepIndicator}>
              {index < 2 ? (
                <Circle size={20} className={styles.stepCircle} />
              ) : (
                <CheckCircle size={20} className={styles.stepCircleDone} />
              )}
              <span className={styles.stepNumber}>{step.id}</span>
            </div>
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>{step.label}</h3>
              <p className={styles.stepDescription}>{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleConnect} className={styles.uploadForm}>
        <div className={styles.inputGroup}>
          <label className={styles.label} htmlFor="apiKeyInput">
            <Key size={16} /> Twilio API Key (Auth Token)
          </label>
          <input
            id="apiKeyInput"
            type="password"
            className={styles.input}
            placeholder="Enter your Twilio Auth Token"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={connected}
          />
        </div>

        {connected ? (
          <div className={styles.connectedMessage}>
            <FaWhatsapp size={24} color="#25D366" />
            <span>Successfully connected to WhatsApp!</span>
          </div>
        ) : (
          <button type="submit" className={styles.submitBtn}>
            <FaWhatsapp size={18} /> Connect WhatsApp
          </button>
        )}
      </form>
    </div>
  );
}