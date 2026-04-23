import { useRef, useState, MouseEvent, ReactNode } from"react";
import { Card } from"@/components/ui/card";
import { motion } from"framer-motion";

interface AdvancedCardProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
}

export function AdvancedCard({
  children,
  className ="",
  intensity = 15
}: AdvancedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateXValue = ((y - centerY) / centerY) * intensity;
    const rotateYValue = ((centerX - x) / centerX) * intensity;

    setRotateX(rotateXValue);
    setRotateY(rotateYValue);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX,
        rotateY,
        scale: isHovered ? 1.05 : 1,
      }}
      transition={{ type:"spring", stiffness: 300, damping: 30 }}
      style={{
        transformStyle:"preserve-3d",
        perspective:"1000px",
      }}
      className={className}
    >
      <Card className="relative overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-primary/10 opacity-0 transition-opacity duration-300 pointer-events-none"
          animate={{
            opacity: isHovered ? 1 : 0,
          }}
        />

        <div className="relative z-10">
          {children}
        </div>
      </Card>
    </motion.div>
  );
}
