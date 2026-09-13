<div align="center">
  <img src="public/tauri.svg" width="128" alt="DeskCharm Logo" />
  <h1>DeskCharm 🧿</h1>
  <p><strong>A beautifully unobtrusive, ambient desktop companion for macOS.</strong></p>
  <p>
    <a href="https://tauri.app/"><img src="https://img.shields.io/badge/Built%20with-Tauri%202.0-blue?style=flat-square&logo=tauri" alt="Tauri" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/UI-React-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" /></a>
    <img src="https://img.shields.io/badge/Platform-macOS-lightgrey?style=flat-square&logo=apple&logoColor=black" alt="macOS" />
    <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License" />
  </p>
</div>

---

## ✨ What is it?

DeskCharm is an ambient, zero-overhead desktop overlay that hangs a beautiful, physics-based cultural charm from the top of your macOS screen.

It runs in a completely native `nonactivating` overlay window, ensuring it **never** steals keyboard focus or interrupts your workflow. The entire window is click-through, meaning you can interact with your regular apps directly beneath it without any interference—only the physical charm itself responds to your mouse.

## 🪬 Available Charms & Rituals

Choose from 10 handcrafted cultural charms from around the world, each featuring unique physics and custom interaction "rituals":

- 🧿 **Nazar Boncuğu** (Turkey & the Levant) — Spin it once
- 🪬 **Hamsa** (Middle East & North Africa) — Give it a flick
- 🍀 **Four-Leaf Clover** (Ireland) — Rub for luck
- 🐱 **Maneki-neko** (Japan) — Tap its paw
- 🪲 **Scarab** (Egypt) — Turn it over
- 🐘 **Ganesha** (India) — Clear the path
- 福 **Fu** (China) — Flip it upside down
- 🌶️🍋 **Nimbu-mirchi** (India) — Hang a fresh garland
- 👺 **Drishti bommai** (India) — Stare it down
- 🪢 **Pánchángjié** (China) — Spin the tassel

## 🚀 Features

- **Ambient Physics:** A custom React-based rope physics engine that automatically enters "sleep mode" when idle, ensuring the app consumes **0% CPU** while running in the background.
- **Global Hotkey:** Press `Shift+Alt+K` anywhere in macOS to instantly hide or show the charm.
- **Smart Persistence:** The charm remembers exactly where you hung it! It also features safety boundary checks to automatically pull itself back into view if you disconnect an external 4K monitor.
- **Native Tray Menu:** Effortlessly swap out charms or enable "Launch at Login" directly from the macOS system menu bar.

## 🛠️ Tech Stack

DeskCharm is built for maximum performance and minimal footprint:
- **[Tauri](https://tauri.app/) (Rust)** handles the ultra-lightweight desktop shell and native macOS windowing APIs.
- **[React](https://react.dev/) + TypeScript** powers the frontend and physics simulations.
- **[Vite](https://vitejs.dev/)** provides lightning-fast bundling.

## 📦 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/), [Rust](https://www.rust-lang.org/tools/install), and the macOS [Tauri prerequisites](https://tauri.app/start/prerequisites/) installed.

### Installation

```bash
# Install dependencies
npm install

# Run the app in development mode
npm run tauri dev

# Build the standalone macOS app (.app and .dmg)
npm run tauri build
```

Once built, you can find your double-clickable application inside `src-tauri/target/release/bundle/macos/`.

## 🤝 Contributing

Issues and Pull Requests are welcome! Feel free to contribute new charms, new rituals, or performance improvements. 

All major changes should go through a pull request to `main`.

## 📝 License

[MIT License](LICENSE) - Copyright (c) 2026 V.P.T.Abishek
