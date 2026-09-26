import "./globals.css";

export const metadata = {
  title: "AI Face Access Control — NIE",
  description:
    "AI-Based Smart Face Recognition Access Control and Intrusion Alert System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
