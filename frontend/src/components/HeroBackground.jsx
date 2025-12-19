/* eslint-disable react-hooks/unsupported-syntax */
import { useEffect, useRef } from "react";

const HeroBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;

    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();
    window.addEventListener("resize", setCanvasSize);

    // Particle class
    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        this.opacity = Math.random() * 0.5 + 0.2;

        // Random theme color
        const colors = [
          { r: 238, g: 199, b: 244 }, // #EEC7F4 - primaryColor
          { r: 171, g: 212, b: 255 }, // #ABD4FF - secondaryColor
          { r: 196, g: 181, b: 253 }, // #C4B5FD - lightPurple
          { r: 146, g: 144, b: 195 }, // #9290c3 - softPurple
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Wrap around screen
        if (this.x > canvas.width) this.x = 0;
        if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        if (this.y < 0) this.y = canvas.height;
      }

      draw() {
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Fog wave class
    class FogWave {
      constructor(y, amplitude, frequency, speed, color) {
        this.y = y;
        this.amplitude = amplitude;
        this.frequency = frequency;
        this.speed = speed;
        this.offset = Math.random() * Math.PI * 2;
        this.color = color;
      }

      update() {
        this.offset += this.speed;
      }

      draw() {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);

        for (let x = 0; x <= canvas.width; x += 5) {
          const y =
            this.y +
            Math.sin(x * this.frequency + this.offset) * this.amplitude;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(canvas.width, canvas.height);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(
          0,
          this.y - 100,
          0,
          canvas.height
        );
        gradient.addColorStop(0, this.color.start);
        gradient.addColorStop(1, this.color.end);

        ctx.fillStyle = gradient;
        ctx.fill();
      }
    }

    // Create particles
    const particles = [];
    const particleCount = 60;
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    // Create fog waves
    const fogWaves = [
      new FogWave(canvas.height * 0.6, 30, 0.003, 0.01, {
        start: "rgba(238, 199, 244, 0.15)",
        end: "rgba(238, 199, 244, 0)",
      }),
      new FogWave(canvas.height * 0.65, 25, 0.004, 0.015, {
        start: "rgba(171, 212, 255, 0.12)",
        end: "rgba(171, 212, 255, 0)",
      }),
      new FogWave(canvas.height * 0.7, 35, 0.002, 0.008, {
        start: "rgba(196, 181, 253, 0.18)",
        end: "rgba(196, 181, 253, 0)",
      }),
      new FogWave(canvas.height * 0.75, 20, 0.005, 0.012, {
        start: "rgba(146, 144, 195, 0.1)",
        end: "rgba(146, 144, 195, 0)",
      }),
    ];

    // Draw grid
    const drawGrid = (offset) => {
      ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
      ctx.lineWidth = 1;

      const gridSize = 60;
      const offsetX = offset % gridSize;
      const offsetY = offset % gridSize;

      // Vertical lines
      for (let x = -offsetX; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = -offsetY; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    };

    // Draw connections between close particles
    const drawConnections = () => {
      const maxDistance = 150;

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxDistance) {
            const opacity = (1 - distance / maxDistance) * 0.2;
            ctx.strokeStyle = `rgba(171, 212, 255, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    let gridOffset = 0;

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      drawGrid(gridOffset);
      gridOffset += 0.3;

      // Draw fog waves
      fogWaves.forEach((wave) => {
        wave.update();
        wave.draw();
      });

      // Draw connections
      drawConnections();

      // Update and draw particles
      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener("resize", setCanvasSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.9 }}
    />
  );
};

export default HeroBackground;
