import './globals.css';

export const metadata = {
  title: 'CareRelay | Turn caregiver updates into clear family handoffs',
  description:
    'CareRelay uses Gemini to turn a caregiver brain-dump into a WhatsApp-ready family handoff while remembering unresolved actions.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
