import './styles.css';

export const metadata = {
  title: 'WaitAds',
  description: 'Turn AI waiting time into opt-in developer rewards.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
