
'use client';

import { useEffect, useRef } from 'react';

export default function PhaserGame() {
    const gameRef = useRef<HTMLDivElement>(null);

    useEffect(() => {

        console.log('PHASER COMPONENT MOUNTED');

        let game: import('phaser').Game | undefined;

        const initializeGame = async () => {

            console.log('LOADING PHASER');

            const Phaser = await import('phaser');

            console.log('PHASER LOADED');
            const { default: PuzzleScene } = await import('@/games/jigsaw/PuzzleScene');

            if (!gameRef.current) return;

            game = new Phaser.Game({
                type: Phaser.AUTO,
                width: 400,
                height: 850,
                backgroundColor: '#fff7cc',
                parent: gameRef.current,
                scene: [PuzzleScene],
                scale: {
                    mode: Phaser.Scale.FIT,
                    autoCenter: Phaser.Scale.CENTER_BOTH,
                },
            });
        };

        initializeGame();

        return () => {
            game?.destroy(true);
        };
    }, []);

    return <div ref={gameRef} />;
}
