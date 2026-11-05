type MotionCallback = () => void;

type MotionEventConstructor = typeof DeviceMotionEvent & {
    requestPermission?: () => Promise<'granted' | 'denied'>;
};

export default class MotionController {
    private baseline: { x: number; y: number; z: number } | null = null;
    private lastTrigger = 0;
    private listener: ((event: DeviceMotionEvent) => void) | null = null;

    private readonly movementThreshold = 2.5;
    private readonly cooldown = 1200;

    async start(onMovement: MotionCallback) {
        const MotionEvent = window.DeviceMotionEvent as
            | MotionEventConstructor
            | undefined;

        if (!MotionEvent) {
            throw new Error('Motion sensors are not supported.');
        }

        if (MotionEvent.requestPermission) {
            const permission = await MotionEvent.requestPermission();

            if (permission !== 'granted') {
                throw new Error('Motion permission was denied.');
            }
        }

        this.stop();
        this.baseline = null;
        this.lastTrigger = 0;

        this.listener = (event: DeviceMotionEvent) => {
            const acceleration = event.acceleration;

            // Detect actual movement when linear acceleration is available.
            if (
                acceleration?.x != null &&
                acceleration.y != null &&
                acceleration.z != null
            ) {
                const magnitude = Math.sqrt(
                    acceleration.x ** 2 +
                    acceleration.y ** 2 +
                    acceleration.z ** 2
                );

                if (magnitude > this.movementThreshold) {
                    this.trigger(onMovement);
                }

                return;
            }

            // Fallback: detect changes in phone orientation.
            const raw = event.accelerationIncludingGravity;

            if (raw?.x == null || raw.y == null || raw.z == null) {
                return;
            }

            const current = {
                x: raw.x,
                y: raw.y,
                z: raw.z,
            };

            if (!this.baseline) {
                this.baseline = current;
                return;
            }

            const dx = current.x - this.baseline.x;
            const dy = current.y - this.baseline.y;
            const dz = current.z - this.baseline.z;

            const change = Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);

            if (change > this.movementThreshold) {
                this.trigger(onMovement);
                this.baseline = current;
                return;
            }

            // Slowly adapt to normal sensor noise while resting.
            this.baseline.x += dx * 0.02;
            this.baseline.y += dy * 0.02;
            this.baseline.z += dz * 0.02;
        };

        window.addEventListener('devicemotion', this.listener);
    }

    private trigger(callback: MotionCallback) {
        const now = Date.now();

        if (now - this.lastTrigger < this.cooldown) return;

        this.lastTrigger = now;
        callback();
    }

    stop() {
        if (this.listener) {
            window.removeEventListener('devicemotion', this.listener);
            this.listener = null;
        }

        this.baseline = null;
    }
}