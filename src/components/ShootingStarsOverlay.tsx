import { useRef, useEffect } from 'react';

const ShootingStarsConfig = {
    color: "#ffffff",
    minSpeed: 10,
    maxSpeed: 30,
    minSize: 0.5,
    maxSize: 1.5, // Thinner, sharper stars
    minDuration: 200, // Faster lifecycle
    maxDuration: 800,
    spawnProbability: 0.05, // Occasional spawn
};

interface Star {
    x: number;
    y: number;
    length: number;
    angle: number;
    speed: number;
    opacity: number;
    createdAt: number;
    duration: number;
}

export function ShootingStarsOverlay() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const starsRef = useRef<Star[]>([]);
    const animationFrameRef = useRef<number>();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const createStar = (): Star => {
            const angle = Math.PI / 4; // 45 degrees diagonal
            const speed = ShootingStarsConfig.minSpeed + Math.random() * (ShootingStarsConfig.maxSpeed - ShootingStarsConfig.minSpeed);

            // Spawn primarily from top-left/top area
            const startX = Math.random() * canvas.width;

            return {
                x: startX,
                y: -50,
                length: 20 + Math.random() * 80, // Longer, streak-like
                angle: angle,
                speed: speed,
                opacity: 0,
                createdAt: Date.now(),
                duration: ShootingStarsConfig.minDuration + Math.random() * (ShootingStarsConfig.maxDuration - ShootingStarsConfig.minDuration)
            };
        };

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear but transparent
            const now = Date.now();

            // Randomly spawn new star
            if (Math.random() < ShootingStarsConfig.spawnProbability) {
                starsRef.current.push(createStar());
            }

            // Update and draw stars
            starsRef.current = starsRef.current.filter(star => {
                const age = now - star.createdAt;
                if (age > star.duration) return false;

                // Move
                star.x += Math.cos(star.angle) * star.speed;
                star.y += Math.sin(star.angle) * star.speed;

                // Fade in/out
                if (age < 100) {
                    star.opacity = Math.min(1, age / 100);
                } else if (age > star.duration - 200) {
                    star.opacity = Math.max(0, (star.duration - age) / 200);
                } else {
                    star.opacity = 1;
                }

                // Draw
                ctx.beginPath();
                // Gradient for the trail
                const grad = ctx.createLinearGradient(
                    star.x, star.y,
                    star.x - Math.cos(star.angle) * star.length,
                    star.y - Math.sin(star.angle) * star.length
                );
                grad.addColorStop(0, `rgba(255, 255, 255, ${star.opacity})`);
                grad.addColorStop(1, `rgba(255, 255, 255, 0)`);

                ctx.strokeStyle = grad;
                ctx.lineWidth = ShootingStarsConfig.minSize + Math.random() * (ShootingStarsConfig.maxSize - ShootingStarsConfig.minSize);
                ctx.lineCap = 'round';

                ctx.moveTo(star.x, star.y);
                ctx.lineTo(
                    star.x - Math.cos(star.angle) * star.length,
                    star.y - Math.sin(star.angle) * star.length
                );
                ctx.stroke();

                return true;
            });

            animationFrameRef.current = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none z-10" // Overlay, no clicks
            style={{ width: '100%', height: '100%' }}
        />
    );
}
