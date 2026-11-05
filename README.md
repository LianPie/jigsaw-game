# Silly Jigsaw 🧩

A small experimental jigsaw puzzle game built with **Next.js and Phaser**, packaged as an Android application using **Capacitor**.

This project started as an experiment to explore building Android APKs from a Next.js application without using Android Studio, using GitHub Actions for automated builds.

## Features

- Interactive jigsaw puzzle gameplay
- Drag-and-drop puzzle pieces
- Automatic piece connection when correctly positioned
- Motion-based interactions using device orientation sensors
- Sound effects for motion-triggered interactions
- Mobile-friendly game layout

## Tech Stack

- **Next.js** – Application framework
- **TypeScript** – Application logic
- **Phaser** – 2D game engine
- **Capacitor** – Android application packaging
- **GitHub Actions** – Automated Android APK builds

## Running Locally

Clone the repository:

```bash
git clone YOUR_REPOSITORY_URL
cd jigsaw-game
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Building the Android APK

The project uses Next.js static export and Capacitor to package the web application for Android.

The APK build is automated through GitHub Actions.

Every push to the `main` branch triggers the Android build workflow.

To download the APK:

1. Open the repository on GitHub.
2. Navigate to **Actions**.
3. Select the latest successful Android build.
4. Download the `silly-jigsaw-apk` artifact.

The generated APK is a debug build intended for testing.

## Project Status

This is an experimental project and a learning exercise focused on:

- Integrating Phaser into a Next.js application.
- Packaging a Next.js application as an Android app using Capacitor.
- Automating Android APK builds with GitHub Actions.
- Exploring device motion and orientation sensors in Android WebView.

The project is still a work in progress.

---

*Built as an experiment in web-to-Android development.*
