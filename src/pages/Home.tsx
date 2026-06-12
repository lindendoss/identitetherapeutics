import { useEffect } from "react";

// The server serves index-static.html directly for the root path.
// This component is a fallback in case the React router handles "/" internally.
export default function Home() {
  useEffect(() => {
    // Force a full page reload to get the server-rendered static HTML
    // which contains the ocean hero + all content sections
    window.location.href = "/";
  }, []);

  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      height: "100vh",
      background: "#0A0A0D",
      color: "#EFE7D6",
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: "12px",
      letterSpacing: "0.2em",
      textTransform: "uppercase" as const
    }}>
      Loading&hellip;
    </div>
  );
}
