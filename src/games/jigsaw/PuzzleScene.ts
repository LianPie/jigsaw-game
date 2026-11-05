import Phaser from 'phaser';
import { drawPieceShape } from './PuzzleGeometry';
import MotionController from './MotionController';


export default class PuzzleScene extends Phaser.Scene {
    private completed = 0;
    private statusText!: Phaser.GameObjects.Text;

    private readonly tileSize = 75;
    private readonly gridSize = 4;
    private readonly boardX = 50;
    private readonly boardY = 55;

    private motionController = new MotionController();

    private clusters = new Map<
        number,
        Set<Phaser.GameObjects.Image>
    >();

    private nextClusterId = 0;

    private activeDrag: {
        piece: Phaser.GameObjects.Image;
        startX: number;
        startY: number;
        positions: Map<
            Phaser.GameObjects.Image,
            { x: number; y: number }
        >;
    } | null = null;

    constructor() {
        super('PuzzleScene');
    }

    preload() {
        console.log('PUZZLE PRELOAD');

        this.load.image('puzzle', '/images/puzzle.jpg');
        this.load.audio('yoink', '/sounds/yoink.m4a');
    }

    create() {
        console.log('PUZZLE CREATE');

        this.completed = 0;

        this.events.once(
            Phaser.Scenes.Events.SHUTDOWN,
            () => this.motionController.stop()
        );

        this.add.text(200, 25, 'Jigsaw Challenge', {
            fontSize: '25px',
            color: '#453e3a',
        }).setOrigin(0.5);

        this.statusText = this.add.text(200, 410, 'Arrange the pieces!', {
            fontSize: '17px',
            color: '#453e3a',
        }).setOrigin(0.5);

        this.statusText.setText('Motion detection active');

        this.motionController.start(() => {
            this.scatterConnectedPieces();
        }).catch((error) => {
            this.statusText.setText(
                error instanceof Error
                    ? error.message
                    : 'Motion detection unavailable'
            );
        });



        this.createPieces();
    }


    private createPieces() {
        const source = this.textures
            .get('puzzle')
            .getSourceImage() as HTMLImageElement;

        const size = this.tileSize;
        const margin = 25;
        const canvasSize = size + margin * 2;

        // Generate shared edges between neighboring pieces
        const verticalEdges = Array.from(
            { length: this.gridSize },
            () => Array.from(
                { length: this.gridSize - 1 },
                () => Math.random() < 0.5 ? 1 : -1
            )
        );

        const horizontalEdges = Array.from(
            { length: this.gridSize - 1 },
            () => Array.from(
                { length: this.gridSize },
                () => Math.random() < 0.5 ? 1 : -1
            )
        );

        const pieces: Phaser.GameObjects.Image[] = [];

        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {

                const edges = {
                    top: row === 0 ? 0 : -horizontalEdges[row - 1][col],
                    right: col === this.gridSize - 1
                        ? 0 : verticalEdges[row][col],
                    bottom: row === this.gridSize - 1
                        ? 0 : horizontalEdges[row][col],
                    left: col === 0
                        ? 0 : -verticalEdges[row][col - 1],
                };

                // Create individual piece canvas
                const canvas = document.createElement('canvas');
                canvas.width = canvasSize;
                canvas.height = canvasSize;

                const ctx = canvas.getContext('2d');

                if (!ctx) continue;

                // Clip the image to the jigsaw shape
                drawPieceShape(ctx, size, margin, edges);

                // Draw the correct portion of the original image
                ctx.drawImage(
                    source,
                    margin - col * size,
                    margin - row * size,
                    this.gridSize * size,
                    this.gridSize * size
                );

                const key = `piece-${row}-${col}`;

                this.textures.addCanvas(key, canvas);

                const piece = this.add.image(0, 0, key);

                piece.setInteractive({ draggable: true });

                const clusterId = this.nextClusterId++;

                piece.setData({
                    row,
                    col,
                    clusterId,
                });

                this.clusters.set(
                    clusterId,
                    new Set([piece])
                );

                pieces.push(piece);

            }
        }

        // Shuffle pieces
        Phaser.Utils.Array.Shuffle(pieces);

        pieces.forEach((piece, index) => {
            piece.setPosition(
                65 + (index % 3) * 130,
                470 + Math.floor(index / 3) * 65
            );
            piece.setDepth(index + 1);
        });

        this.input.setDraggable(pieces);

        // Start dragging an entire cluster
        this.input.on(
            'dragstart',
            (
                _pointer: Phaser.Input.Pointer,
                piece: Phaser.GameObjects.Image
            ) => {
                const clusterId = piece.getData('clusterId');
                const cluster = this.clusters.get(clusterId);

                if (!cluster) return;

                const positions = new Map<
                    Phaser.GameObjects.Image,
                    { x: number; y: number }
                >();

                cluster.forEach(member => {
                    positions.set(member, {
                        x: member.x,
                        y: member.y,
                    });

                    member.setDepth(100);
                });

                this.activeDrag = {
                    piece,
                    startX: piece.x,
                    startY: piece.y,
                    positions,
                };
            }
        );

        // Move every piece in the cluster together
        this.input.on(
            'drag',
            (
                _pointer: Phaser.Input.Pointer,
                piece: Phaser.GameObjects.Image,
                dragX: number,
                dragY: number
            ) => {
                const drag = this.activeDrag;

                if (!drag || drag.piece !== piece) return;

                const dx = dragX - drag.startX;
                const dy = dragY - drag.startY;

                drag.positions.forEach((position, member) => {
                    member.setPosition(
                        position.x + dx,
                        position.y + dy
                    );
                });
            }
        );

        // Try connecting clusters when released
        this.input.on(
            'dragend',
            (
                _pointer: Phaser.Input.Pointer,
                piece: Phaser.GameObjects.Image
            ) => {
                if (!this.activeDrag) return;

                this.tryConnect(piece);

                const cluster = this.clusters.get(
                    piece.getData('clusterId')
                );

                cluster?.forEach(member => {
                    member.setDepth(1);
                });

                this.activeDrag = null;

                this.updatePuzzleStatus();
            }
        );
    }

    private tryConnect(
        piece: Phaser.GameObjects.Image
    ) {
        const tolerance = 25;
        const size = this.tileSize;

        let connected = true;

        // Keep checking because one cluster may connect
        // to several other clusters.
        while (connected) {
            connected = false;

            const movingId = piece.getData('clusterId');
            const movingCluster = this.clusters.get(movingId);

            if (!movingCluster) return;

            outer:
            for (const [otherId, otherCluster] of this.clusters) {
                if (otherId === movingId) continue;

                for (const a of movingCluster) {
                    for (const b of otherCluster) {
                        const rowDiff =
                            b.getData('row') - a.getData('row');

                        const colDiff =
                            b.getData('col') - a.getData('col');

                        // Only connect actual neighboring pieces
                        if (
                            Math.abs(rowDiff) +
                            Math.abs(colDiff) !== 1
                        ) {
                            continue;
                        }

                        const expectedX = colDiff * size;
                        const expectedY = rowDiff * size;

                        const distance = Phaser.Math.Distance.Between(
                            b.x,
                            b.y,
                            a.x + expectedX,
                            a.y + expectedY
                        );

                        if (distance < tolerance) {
                            // Align the two clusters perfectly
                            const dx = b.x - expectedX - a.x;
                            const dy = b.y - expectedY - a.y;

                            movingCluster.forEach(member => {
                                member.x += dx;
                                member.y += dy;
                            });

                            // Merge the clusters
                            otherCluster.forEach(member => {
                                movingCluster.add(member);
                                member.setData('clusterId', movingId);
                            });

                            this.clusters.delete(otherId);

                            connected = true;
                            break outer;
                        }
                    }
                }
            }
        }
    }
    private scatterConnectedPieces() {
        // Don't interrupt an active drag
        if (this.activeDrag) return;

        let scattered = false;

        // Take a snapshot because we'll modify the clusters map
        const existingClusters = Array.from(this.clusters.entries());

        for (const [clusterId, cluster] of existingClusters) {
            // Only scatter clusters containing multiple pieces
            if (cluster.size < 2) continue;

            this.clusters.delete(clusterId);

            // Separate every piece into its own cluster
            cluster.forEach(piece => {
                const newId = this.nextClusterId++;

                piece.setData('clusterId', newId);

                this.clusters.set(newId, new Set([piece]));

                // Scatter the piece to a new position
                const targetX = Phaser.Math.Between(75, 325);
                const targetY = Phaser.Math.Between(455, 605);

                this.tweens.add({
                    targets: piece,
                    x: targetX,
                    y: targetY,
                    duration: 250,
                    ease: 'Cubic.Out',
                });

                piece.setDepth(10);
            });

            scattered = true;
        }

        if (scattered) {
            this.statusText.setText('YOINK! 💥');
            this.sound.play('yoink', { volume: 0.7 });
        }
    }
    private updatePuzzleStatus() {
        const largestCluster = Math.max(
            ...Array.from(
                this.clusters.values(),
                cluster => cluster.size
            )
        );

        this.statusText.setText(
            `Connected pieces: ${largestCluster} / 9`
        );

        if (largestCluster === 9) {
            this.statusText.setText('Puzzle completed! 🎉');
        }
    }

    shutdown() {
        this.motionController.stop();
    }


}
