type MotionCallback = () => void;

export default class MotionController {
    private lastOrientation: {
        beta: number;
        gamma: number;
    } | null = null;

    private listener: ((event: DeviceOrientationEvent) => void) | null = null;

    private readonly angleThreshold = 8;
    private readonly cooldown = 1200;

    private lastTrigger = 0;

    async start(onMovement: MotionCallback) {
        if (!('DeviceOrientationEvent' in window)) {
            throw new Error('Orientation sensors are not supported.');
        }

        this.stop();
        this.lastOrientation = null;

        this.listener = (event: DeviceOrientationEvent) => {
            if (event.beta === null || event.gamma === null) return;

            const current = {
                beta: event.beta,
                gamma: event.gamma,
            };

            if (!this.lastOrientation) {
                this.lastOrientation = current;
                return;
            }

            const betaChange = Math.abs(
                current.beta - this.lastOrientation.beta
            );

            const gammaChange = Math.abs(
                current.gamma - this.lastOrientation.gamma
            );

            const change = Math.sqrt(
                betaChange ** 2 + gammaChange ** 2
            );

            if (change >= this.angleThreshold) {
                const now = Date.now();

                if (now - this.lastTrigger >= this.cooldown) {
                    this.lastTrigger = now;
                    onMovement();
                }
            }

            this.lastOrientation = current;
        };

        window.addEventListener('deviceorientation', this.listener);
    }

    stop() {
        if (this.listener) {
            window.removeEventListener('deviceorientation', this.listener);
            this.listener = null;
        }

        this.lastOrientation = null;
    }
}