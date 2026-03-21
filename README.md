# Digital Space Lab / 数字空间实验室

A WeChat Mini Game featuring a collection of classic number and logic puzzles, all rendered on Canvas with cloud-based leaderboards and multiplayer PK battles.

> **WeChat Mini Game Name**: 数字空间实验室

## Games Included

- **2048** — Swipe to merge tiles and reach the 2048 tile (and beyond).
- **Klotski (Huarong Dao)** — Slide blocks to free the target piece in the fewest moves.
- **Sudoku** — Fill the 9×9 grid following standard Sudoku rules, with a progressive challenge mode.
- **Survival Mode** — Race against time in an endless number challenge.
- **Tile Match** — Match and clear numbered tiles before they pile up.

![f6e818e9d12ec5ce7d67f2fa72602ca2](https://github.com/user-attachments/assets/64974c42-6cce-46a7-8bdc-0f880dc85134)
![6b33f263160a46c845581eb0a9dc024e](https://github.com/user-attachments/assets/3b305f8d-6ecd-454a-88d7-1cbbd3b0a7b9)
![d766ff446d99628d19ed3b2e76cab2d0](https://github.com/user-attachments/assets/64778a78-8e6c-4c0d-a582-1add55506454)

## Features

- **Multiplayer PK** — Real-time 1v1 battles across all game modes via WeChat cloud functions.
- **Leaderboards** — Global and friend rankings powered by WeChat Cloud Base.
- **Achievements & Shop** — Unlock achievements and spend coins on themes.
- **Theme System** — Customizable visual themes for the game interface.
- **Sound & BGM** — Sound effects and background music with toggle controls.

## Tech Stack

- **Platform**: WeChat Mini Game (Canvas-based)
- **Backend**: WeChat Cloud Base (cloud functions + cloud database)
- **Language**: JavaScript (ES6)
- **Rendering**: 2D Canvas API

## Project Structure

```
├── game.js                  # Entry point — module loading & screen routing
├── game.json                # Mini game configuration
├── project.config.json      # WeChat DevTools project config
├── js/
│   ├── layout.js            # Canvas setup, sizing, colors, drawing utilities
│   ├── gameLogic.js         # 2048 core game logic
│   ├── render.js            # 2048 rendering
│   ├── huarongLogic.js      # Klotski puzzle logic
│   ├── huarongRender.js     # Klotski rendering
│   ├── sudokuLogic.js       # Sudoku generator & solver
│   ├── sudokuRender.js      # Sudoku rendering
│   ├── sudokuChallenge.js   # Sudoku challenge mode logic
│   ├── sudokuChallengeRender.js
│   ├── survivalLogic.js     # Survival mode logic
│   ├── survivalRender.js    # Survival mode rendering
│   ├── tileMatchLogic.js    # Tile match logic
│   ├── tileMatchRender.js   # Tile match rendering
│   ├── pk.js                # PK multiplayer logic
│   ├── pkRender.js          # PK UI rendering
│   ├── pk2048Render.js      # PK mode for 2048
│   ├── pkHuarongRender.js   # PK mode for Klotski
│   ├── pkSudokuRender.js    # PK mode for Sudoku
│   ├── rank.js              # Leaderboard logic
│   ├── profile.js           # User profile
│   ├── achieveShop.js       # Achievements & shop logic
│   ├── achieveShopRender.js # Achievements & shop UI
│   ├── themeSystem.js       # Theme management
│   ├── sound.js             # Audio manager
│   ├── timer.js             # Game timer
│   ├── ad.js                # Ad integration
│   ├── adminRender.js       # Admin panel
│   └── layout.js            # Layout & drawing utilities
├── cloudfunctions/
│   ├── leaderboard/         # Leaderboard cloud function
│   ├── pk/                  # PK matchmaking cloud function
│   ├── checkNickname/       # Nickname validation
│   ├── migrateUsers/        # User data migration
│   └── adminAPI/            # Admin operations
```

## Getting Started

1. Install [WeChat DevTools](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html).
2. Open this project folder in WeChat DevTools.
3. Replace `YOUR_WECHAT_APPID` in `project.config.json` with your own App ID.
4. Replace `YOUR_CLOUD_ENV_ID` in `game.js` with your Cloud Base environment ID.
5. Deploy the cloud functions under `cloudfunctions/`.
6. Preview or upload from DevTools.

## License

**All Rights Reserved.** This code is provided for viewing and educational reference only. No copying, modification, distribution, or commercial use is permitted. See [LICENSE](LICENSE) for details.
