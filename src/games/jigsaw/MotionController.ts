type MotionCallback = () => void;

export default class MotionController {
    private restingOrientation: {
        beta: number;
        gamma: number;
    } | null = null;

    private listener: ((event: DeviceOrientationEvent) => void) | null = null;
    private lastTrigger = 0;

    private readonly angleThreshold = 10;
    private readonly cooldown = 1200;

    async start(onMovement: MotionCallback) {
        if (!('DeviceOrientationEvent' in window)) {
            throw new Error('Orientation sensors are not supported.');
        }

        this.stop();
        this.restingOrientation = null;
        this.lastTrigger = 0;

        this.listener = (event: DeviceOrientationEvent) => {
            if (event.beta === null || event.gamma === null) return;

            const current = {
                beta: event.beta,
                gamma: event.gamma,
            };

            // Capture the initial resting position.
            if (!this.restingOrientation) {
                this.restingOrientation = current;
                return;
            }

            const betaChange = Math.abs(
                current.beta - this.restingOrientation.beta
            );

            const gammaChange = Math.abs(
                current.gamma - this.restingOrientation.gamma
            );

            const totalChange = Math.sqrt(
                betaChange ** 2 + gammaChange ** 2
            );

            // Compare against the original resting position,
            // not the previous sensor reading.
            if (totalChange >= this.angleThreshold) {
                const now = Date.now();

                if (now - this.lastTrigger >= this.cooldown) {
                    this.lastTrigger = now;
                    onMovement();
                }
            }
        };

        window.addEventListener('deviceorientation', this.listener);
    }

    stop() {
        if (this.listener) {
            window.removeEventListener('deviceorientation', this.listener);
            this.listener = null;
        }

        this.restingOrientation = null;
    }
}