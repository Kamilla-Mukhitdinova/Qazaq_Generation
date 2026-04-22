import { motion } from 'framer-motion';

const FloatingShape = ({ 
  delay = 0, 
  duration = 20, 
  size = 100, 
  color = 'gold',
  initialX = 0,
  initialY = 0 
}: {
  delay?: number;
  duration?: number;
  size?: number;
  color?: 'gold' | 'turquoise' | 'primary';
  initialX?: number;
  initialY?: number;
}) => {
  const colorClasses = {
    gold: 'bg-gradient-to-br from-gold/20 to-gold/5',
    turquoise: 'bg-gradient-to-br from-turquoise/20 to-turquoise/5',
    primary: 'bg-gradient-to-br from-primary/20 to-primary/5',
  };

  return (
    <motion.div
      className={`absolute rounded-full ${colorClasses[color]} backdrop-blur-3xl`}
      style={{ 
        width: size, 
        height: size,
        left: `${initialX}%`,
        top: `${initialY}%`,
      }}
      animate={{
        x: [0, 100, -50, 100, 0],
        y: [0, -100, 50, -50, 0],
        scale: [1, 1.2, 0.9, 1.1, 1],
        rotate: [0, 90, 180, 270, 360],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
};

const GlowOrb = ({ 
  delay = 0, 
  size = 300, 
  color = 'gold',
  x = 50,
  y = 50 
}: {
  delay?: number;
  size?: number;
  color?: 'gold' | 'turquoise' | 'primary';
  x?: number;
  y?: number;
}) => {
  const colorStyles = {
    gold: 'radial-gradient(circle, hsl(42 80% 55% / 0.15) 0%, transparent 70%)',
    turquoise: 'radial-gradient(circle, hsl(175 60% 45% / 0.15) 0%, transparent 70%)',
    primary: 'radial-gradient(circle, hsl(220 60% 25% / 0.2) 0%, transparent 70%)',
  };

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ 
        width: size, 
        height: size,
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        background: colorStyles[color],
      }}
      animate={{
        scale: [1, 1.3, 1],
        opacity: [0.5, 0.8, 0.5],
      }}
      transition={{
        duration: 8,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
};

const GridLines = () => (
  <div className="absolute inset-0 overflow-hidden opacity-10">
    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-gold" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  </div>
);

const ParticleField = () => {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 1,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-gold/30"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            y: [0, -200],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};

const Cube3D = ({ delay = 0, x = 50, y = 50, size = 80 }: { delay?: number; x?: number; y?: number; size?: number }) => (
  <motion.div
    className="absolute"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      width: size,
      height: size,
      transformStyle: 'preserve-3d',
      perspective: '1000px',
    }}
    animate={{
      rotateX: [0, 360],
      rotateY: [0, 360],
    }}
    transition={{
      duration: 20,
      delay,
      repeat: Infinity,
      ease: "linear",
    }}
  >
    <div 
      className="absolute inset-0 border border-gold/30 bg-gold/5 backdrop-blur-sm"
      style={{ transform: 'translateZ(40px)' }}
    />
    <div 
      className="absolute inset-0 border border-turquoise/30 bg-turquoise/5 backdrop-blur-sm"
      style={{ transform: 'rotateY(90deg) translateZ(40px)' }}
    />
    <div 
      className="absolute inset-0 border border-primary/30 bg-primary/5 backdrop-blur-sm"
      style={{ transform: 'rotateX(90deg) translateZ(40px)' }}
    />
  </motion.div>
);

const HexagonPattern = () => (
  <motion.div 
    className="absolute inset-0 opacity-5"
    initial={{ opacity: 0 }}
    animate={{ opacity: 0.05 }}
    transition={{ duration: 2 }}
  >
    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="hexagons" width="50" height="43.4" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
          <polygon 
            points="25,0 50,14.4 50,43.4 25,57.7 0,43.4 0,14.4" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="0.5"
            className="text-gold"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hexagons)" />
    </svg>
  </motion.div>
);

export const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-background via-background to-secondary/30">
      {/* Base gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      
      {/* Grid pattern */}
      <GridLines />
      
      {/* Hexagon pattern */}
      <HexagonPattern />
      
      {/* Particle field */}
      <ParticleField />
      
      {/* Glow orbs */}
      <GlowOrb color="gold" size={600} x={20} y={30} delay={0} />
      <GlowOrb color="turquoise" size={500} x={80} y={60} delay={2} />
      <GlowOrb color="primary" size={400} x={50} y={80} delay={4} />
      
      {/* Floating shapes */}
      <FloatingShape delay={0} size={150} color="gold" initialX={10} initialY={20} duration={25} />
      <FloatingShape delay={2} size={100} color="turquoise" initialX={80} initialY={10} duration={20} />
      <FloatingShape delay={4} size={80} color="primary" initialX={70} initialY={70} duration={22} />
      <FloatingShape delay={6} size={120} color="gold" initialX={20} initialY={80} duration={28} />
      <FloatingShape delay={8} size={60} color="turquoise" initialX={90} initialY={40} duration={18} />
      
      {/* 3D Cubes */}
      <Cube3D x={15} y={25} size={60} delay={0} />
      <Cube3D x={85} y={75} size={80} delay={5} />
      <Cube3D x={75} y={20} size={50} delay={10} />
      
      {/* Kazakh ornament overlay */}
      <div className="absolute inset-0 kazakh-pattern opacity-30" />
      
      {/* Vignette effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/50 via-transparent to-background/50" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/50" />
    </div>
  );
};

export default AnimatedBackground;
