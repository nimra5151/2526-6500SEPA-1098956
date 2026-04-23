import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

// #190: Back to top button — appears after scrolling 400px
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <Button
      size="icon"
      variant="outline"
      aria-label="Back to top"
      className="fixed bottom-20 right-4 z-50 rounded-full shadow-lg bg-background/90 backdrop-blur-sm md:bottom-6"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <ArrowUp className="w-4 h-4" />
    </Button>
  );
}
