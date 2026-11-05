
type MotionCallback = () => void;

type MotionEventConstructor = typeof DeviceMotionEvent & {
    requestPermission?: () => Promise<'granted' | 'denied'>;
};

export default class MotionController {
    private lastAcceleration: {
        x: number;
        y: number;
        z: number;
    } | null = null;

    private lastTrigger = 0;
    private listener: ((event: DeviceMotionEvent) => void) | null = null;

    // Adjust these after testing on a real phone
    private readonly linearThreshold = 18;
    private readonly changeThreshold = 10;
    private readonly cooldown = 700;

    async start(onMovement: MotionCallback) {
        const MotionEvent = window.DeviceMotionEvent as
            | MotionEventConstructor
            | undefined;

        console.log('DeviceMotionEvent:', window.DeviceMotionEvent);
        console.log('Secure context:', window.isSecureContext);

        if (!MotionEvent) {
            throw new Error('Motion sensors are not supported.');
        }

        // Some browsers, particularly iOS Safari,
        // require permission through a user interaction.
        if (MotionEvent.requestPermission) {
            const permission = await MotionEvent.requestPermission();

            if (permission !== 'granted') {
                throw new Error('Motion permission was denied.');
            }
        }

        this.stop();

        this.lastAcceleration = null;

        this.listener = (event: DeviceMotionEvent) => {
            const acceleration = event.acceleration;

            // Prefer linear acceleration when available.
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

                if (magnitude > this.linearThreshold) {
                    this.trigger(onMovement);
                }

                return;
            }

            // Fallback: compare changes in acceleration
            // including gravity.
            const raw = event.accelerationIncludingGravity;

            if (
                raw?.x == null ||
                raw.y == null ||
                raw.z == null
            ) {
                return;
            }

            const current = {
                x: raw.x,
                y: raw.y,
                z: raw.z,
            };

            if (this.lastAcceleration) {
                const dx = current.x - this.lastAcceleration.x;
                const dy = current.y - this.lastAcceleration.y;
                const dz = current.z - this.lastAcceleration.z;

                const change = Math.sqrt(
                    dx ** 2 + dy ** 2 + dz ** 2
                );

                if (change > this.changeThreshold) {
                    this.trigger(onMovement);
                }
            }

            this.lastAcceleration = current;
        };

        window.addEventListener('devicemotion', this.listener);
    }

    private trigger(callback: MotionCallback) {
        const now = Date.now();

        if (now - this.lastTrigger < this.cooldown) {
            return;
        }

        this.lastTrigger = now;
        callback();
    }

    stop() {
        if (this.listener) {
            window.removeEventListener(
                'devicemotion',
                this.listener
            );

            this.listener = null;
        }

        this.lastAcceleration = null;
    }
}
