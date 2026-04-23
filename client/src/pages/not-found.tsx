import { Link } from"wouter";
import { Button } from"@/components/ui/button";
import { motion } from"framer-motion";
import { ArrowLeft, Home } from"lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center space-y-6"
      >
        <h1 className="text-8xl md:text-9xl font-display font-bold text-primary" data-testid="text-404">
          404
        </h1>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold font-display">Page not found</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Link href="/">
            <Button className="neon-btn bg-primary text-white border-0" data-testid="button-go-home">
              <Home className="w-4 h-4" /> Go Home
            </Button>
          </Link>
          <Link href="/classes">
            <Button variant="outline" data-testid="button-browse-classes">
              Browse Classes
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
