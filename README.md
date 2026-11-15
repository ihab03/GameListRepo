# Hyper Arena - Game Leaderboard & Telemetry Platform

A high-performance, modular Game Studio Dashboard, admin moderation suite, and REST API for tracking verified player rankings, match analytics, and live telemetry across multiple titles. Built with vanilla HTML5, modern CSS3 Glassmorphism, vanilla JavaScript (ES6+ `async`/`await`), PHP 8+, and MySQL 8.0+ (optimized for standalone environments and XAMPP).

---

## Table of Contents
- [Architecture & Directory Structure](#architecture--directory-structure)
- [Requirements](#requirements)
- [Default Demo Credentials & Roles](#default-demo-credentials--roles)
- [Step-by-Step Setup & Installation](#step-by-step-setup--installation)
- [Step 8 Studio Dashboard Architecture](#step-8-studio-dashboard-architecture)
  - [Collapsible Sidebar & Windowed Tabs Layout](#collapsible-sidebar--windowed-tabs-layout)
  - [Zero Hardcoded Values & Dynamic Configuration](#zero-hardcoded-values--dynamic-configuration)
  - [Live Telemetry KPI Cards](#live-telemetry-kpi-cards)
  - [Dynamic Game Registry](#dynamic-game-registry)
  - [Immutable Studio Audit Trail](#immutable-studio-audit-trail)
  - [Player Mini-Profile Modal (Window Functions)](#player-mini-profile-modal-window-functions)
  - [One-Click Data Export (CSV & JSON)](#one-click-data-export-csv--json)
- [REST API Documentation](#rest-api-documentation)
  - [1. Authentication Endpoints](#1-authentication-endpoints)
  - [2. Configuration & Telemetry Endpoints](#2-configuration--telemetry-endpoints)
  - [3. Public & Player Endpoints](#3-public--player-endpoints)
  - [4. Admin Moderation & Registry Endpoints](#4-admin-moderation--registry-endpoints)
  - [5. Analytics & Chart API](#5-analytics--chart-api)
- [Database Schema & Architecture](#database-schema--architecture)
- [Security & Performance Engineering](#security--performance-engineering)
- [Bug List & Verified Fixes](#bug-list--verified-fixes)
- [Automated Testing Suite (36 Tests)](#automated-testing-suite-36-tests)
- [Client UI & Simulator Pages](#client-ui--simulator-pages)

---

## Architecture & Directory Structure

The project strictly separates presentation, client controllers, business logic, configuration, and data persistence:

```text
.
├── .gitignore                   # Excludes config.php, environment files, IDE & OS artifacts
├── config-example.php           # Template database & studio configuration for handover
├── config.php                   # Local environment credentials & bounds (git-ignored)
├── db.php                       # Reusable singleton PDO database connection layer
├── schema.sql                   # Database definition (5 tables, composite indexes & seed data)
├── index.html                   # Game Studio Dashboard with collapsible sidebar & windowed tabs
├── test-simulator.html          # High-volume score generator & edge-case test battery
├── test-e2e.php                 # Automated CLI end-to-end verification suite (36 tests)
├── css/
│   ├── variables-theme.css      # CSS variables, dark/light theme tokens, and typography
│   ├── layout-shell.css         # App layout, collapsible sidebar, telemetry KPIs, window panels
│   ├── components-glass.css     # Glassmorphic cards, tables, badges, modals, and buttons
│   └── style.css                # Master stylesheet aggregating modular CSS via @import
├── js/
│   ├── app.js                   # Master application entrypoint (< 150 lines, ES modules)
│   ├── test-simulator.js        # High-volume simulation & edge-case validation controller
│   ├── core/
│   │   ├── state.js             # Reactive application state & localStorage persistence
│   │   ├── api-client.js        # Unified HTTP fetch wrappers with error handling
│   │   └── dom-utils.js         # XSS-immune DOM helpers, SVG icons, formatters, and navigation
│   └── modules/
│       ├── auth-account.js      # Session management, account modal, and authentication forms
│       ├── admin-panel.js       # Moderation queue, game registry, audit trail, and studio config
│       ├── leaderboard-view.js  # Leaderboard table, filtration, rank lookup, and CSV/JSON export
│       ├── score-submit.js      # Score submission engine and client-side boundary validation
│       ├── player-modal.js      # Player mini-profile modal and telemetry inspector
│       └── chart-view.js        # HTML5 Canvas 2D score analytics and high-DPI line chart
└── api/
    ├── helpers.php              # Aggregator loader linking modular backend core files
    ├── core/
    │   ├── response.php         # JSON response helpers, HTTP method validation, input parsers
    │   ├── session-auth.php     # Session lifecycle, RBAC checks, and API key validation
    │   ├── validators.php       # Parameter sanitizers and score/game/period validators
    │   ├── rate-limiter.php     # IP/Session database-backed rate limiter
    │   └── audit-logger.php     # Structured administrative audit logging
    ├── register.php             # POST: Registers user account with bcrypt password hashing
    ├── login.php                # POST: Authenticates user credentials and starts secure session
    ├── logout.php               # POST: Destroys session and clears auth cookies
    ├── session.php              # GET: Authentication state, role, personal stats & recent telemetry
    ├── get-config.php           # GET: Exposes dynamic studio configuration & allowed limits
    ├── get-dashboard-stats.php  # GET: Returns live telemetry KPIs and moderation audit history
    ├── get-games.php            # GET: Distinct active game titles & registry metadata
    ├── get-scores.php           # GET: Filtered public scores (limit, period, search, sort, game)
    ├── get-rank.php             # GET: Specific player's highest score and rank in a game
    ├── get-player-profile.php   # GET: Player profile, personal bests, and windowed ranks
    ├── get-chart-data.php       # GET: Daily aggregated stats for canvas trends visualization
    ├── post-score.php           # POST: Submits score (session or X-API-Key required; rate limited)
    ├── admin-pending-scores.php # GET: Admin-only moderation queue with summary statistics
    ├── admin-verify-score.php   # POST: Admin-only score moderation with audit logging
    └── admin-manage-games.php   # POST: Admin-only title registration and activation toggles
```

---

## Requirements
- **PHP**: 8.0 or newer (with `pdo`, `pdo_mysql`, `curl`, and `session` extensions enabled)
- **Database**: MySQL 8.0+ or MariaDB 10.4+ (default XAMPP or native service)
- **Web Server**: Apache (via XAMPP) or PHP Built-in CLI Server
- **Browser**: Any modern browser (Chrome, Firefox, Safari, Edge)

---

## Default Demo Credentials & Roles

The system comes pre-seeded with two accounts representing the supported user roles:

| Role | Username | Password | Privileges |
|---|---|---|---|
| **Admin** | `admin` | `Admin123!` | Full studio administrative access: Review & moderate submitted scores, manage registered titles in the Game Registry, inspect the immutable Audit Trail, reveal direct engine API keys, and submit pre-approved scores with custom handle overrides. |
| **Player** | `player1` | `Player123!` | Standard competitor access: View public leaderboards, filter and search scores, look up personal ranking, open player profile modals, export rankings, and submit scores (automatically routed to the moderation queue). |

> [!TIP]
> The workspace header includes one-click "Demo Credentials" chips to instantly sign in as either role.

---

## Step-by-Step Setup & Installation

### Step 1: Open the Project Directory
```bash
cd intern
```

### Step 2: Configure Environment Credentials
Copy `config-example.php` to `config.php`:
```bash
# Windows PowerShell
Copy-Item config-example.php config.php

# Unix / macOS
cp config-example.php config.php
```

Verify your local database settings in `config.php`:
```php
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'game_leaderboard');
define('DB_USER', 'root');
define('DB_PASS', '');            // Empty string for default XAMPP, or your MySQL root password
define('DB_CHARSET', 'utf8mb4');
define('API_SECRET_KEY', 'hyper-arena-secret-key-2026');

// Dynamic Application Bounds
define('APP_TITLE', 'Hyper Arena');
define('MIN_SCORE', 0);
define('MAX_SCORE', 2147483647);
define('DEFAULT_LIMIT', 10);
define('ALLOWED_LIMITS', [10, 15, 25, 50, 100, 'all']);
define('MAX_EXPORT_LIMIT', 500);
define('RATE_LIMIT_MAX_ATTEMPTS', 10);
define('RATE_LIMIT_WINDOW_SECONDS', 60);
```

### Step 3: Import Database Schema & Seed Data
Execute `schema.sql` to initialize the database, tables (`users`, `scores`, `rate_limits`, `games`, `audit_logs`), composite indexes, and demo seed data:

**Default XAMPP (blank password):**
```bash
mysql -u root < schema.sql
```

**Password-protected MySQL instance:**
```bash
mysql -u root -p < schema.sql
```

### Step 4: Run the Web Server

#### Option A: PHP Built-in Server (Recommended for Fast Local Testing)
```bash
php -S 127.0.0.1:8000
```
Open your browser and navigate to:
- Studio Dashboard: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- 100 Random Scores Simulator: [http://127.0.0.1:8000/test-simulator.html](http://127.0.0.1:8000/test-simulator.html)

#### Option B: XAMPP Apache
1. Copy or symlink the project folder into your XAMPP `htdocs` directory (e.g. `C:\xampp\htdocs\intern`).
2. Start Apache and MySQL from the **XAMPP Control Panel**.
3. Navigate to: `http://localhost/intern/`

---

## Step 8 Studio Dashboard Architecture

### Collapsible Sidebar & Windowed Tabs Layout
The application features a responsive sidebar and modular windowed panels:
- **Expanded Sidebar (260px)**: Displays studio crest, dynamic branding, section labels, and tab badges.
- **Collapsed Sidebar (72px Rail)**: Compact monogram rail for desktop multitasking; state persists in `localStorage`.
- **Clean Geometric SVG & Monogram Typographic Rail**: Zero emojis across the entire UI. Navigation items feature crisp geometric inline SVG icons and 2-letter typographic monogram badges (`LB`, `AN`, `SR`, `MQ`, `GR`, `AT`, `CF`) visible on both expanded and collapsed rails.
- **Anchored User Profile Pod (`#sidebarUserPod`)**: Fixed at the bottom of the sidebar (`margin-top: auto`). Displays user initials monogram badge, username, and role; clicking opens the Full-Screen Account Screen.
- **Mobile Off-Canvas Drawer**: On viewports `< 960px`, the sidebar becomes a slide-over drawer toggled via clean menu text with a frosted backdrop overlay.
- **7 Dedicated Workspace Panels**:
  1. `Leaderboard`: Filterable standings, metallic podium badges, and export options.
  2. `Analytics`: Interactive vanilla HTML5 Canvas performance chart.
  3. `Submit & Rank`: Dual-card layout for score submissions and personal rank lookups.
  4. `Moderation Queue` *(Admin)*: Pending score approvals, rejections, and bulk operations.
  5. `Game Registry` *(Admin)*: Dynamic title creation and visibility toggle management.
  6. `Audit Trail` *(Admin)*: Immutable chronological history of administrative actions.
  7. `Studio API & Config`: Live server constants, masked engine key with Reveal/Copy, and endpoint contracts.

### Full-Screen Account & Authentication View (Option A)
A dedicated, full-screen frosted glass overlay (`#fullScreenAccountView`) accessible via the bottom sidebar user pod, submit screen auth prompts, or `Esc` key navigation:
- **State A (Unauthenticated)**: Centered glass card with mode switcher (`Sign In` | `Create Account`), demo quick-fill chips, and real-time feedback.
- **State B (Authenticated)**: Full-page Competitor Dashboard featuring:
  - **Profile Banner**: Initials monogram avatar, username, role badge, public standing shortcut, and exclusive **Log Out** button (`#logoutBtn`).
  - **Personal Telemetry Strip**: 4 mini stat cards showing Approved Scores, Pending Review, Rejected Scores, and Personal Best Score.
  - **My Recent Submissions Table**: Displays the player's last 15 recorded submissions with game title, score, moderation status, and date.

### Zero Hardcoded Values & Dynamic Configuration
All limits, score ranges, rate-limit thresholds, and studio metadata originate in `config.php` and are exposed to the client via `GET /api/get-config.php`. The frontend dynamically renders:
- Studio titles in header and `<title>`.
- Dropdown options (`10`, `15`, `25`, `50`, `100`, `All Records`).
- Timeframe options (`all`, `week`, `today`).
- Numeric validation attributes (`min="0" max="2147483647"`).

### Live Telemetry KPI Cards
At the top of the workspace, 4 live telemetry cards update in real time:
1. **Total Verified Scores**: Count of all approved scores in the database.
2. **Active Competitors**: Count of unique players with verified records.
3. **Pending Moderation**: High-priority alert card highlighting scores awaiting admin review.
4. **Most Played Title**: Top title by submission volume.

### Dynamic Game Registry
Administrators can register new game titles directly through the dashboard via `POST /api/admin-manage-games.php` (action: `create`). Titles can be deactivated/activated at any time (action: `toggle`). Active titles dynamically populate all filter dropdowns and datalists.

### Immutable Studio Audit Trail
Every moderation decision (approval, rejection, bulk action) and title registry modification writes an audit record into the `audit_logs` table via `logAdminAction()`. Administrators can inspect the audit trail with timestamps, administrator handles, and detailed change summaries.

### Player Mini-Profile Modal (Window Functions)
Clicking any player handle opens an interactive modal querying `GET /api/get-player-profile.php`. Standings and ranks across all games are computed in a single prepared statement using MySQL 8.0 window functions (`DENSE_RANK() OVER (PARTITION BY game ORDER BY MAX(score) DESC)`), strictly avoiding N+1 queries in loops.

### One-Click Data Export (CSV & JSON)
Leaderboard data can be exported in one click:
- **Export CSV**: Generates RFC 4180-compliant CSV with escaped commas and quotation marks.
- **Export JSON**: Generates structured, pretty-printed JSON.
- Triggered client-side using `Blob` and dynamic anchor downloads (`URL.createObjectURL()`).

---

## REST API Documentation

### Master API Reference Table

The platform provides 15 structured JSON REST endpoints with strict HTTP status code semantics, prepared SQL statements, and RBAC enforcement:

| Method | Endpoint | Access Level | Description | Key Parameters / Payload |
|---|---|---|---|---|
| `POST` | `/api/register.php` | Public | Registers a new user account with bcrypt hashing | `username`, `password` |
| `POST` | `/api/login.php` | Public | Authenticates credentials and starts secure session | `username`, `password` |
| `POST` | `/api/logout.php` | Authenticated | Destroys current session and clears auth cookie | None |
| `GET` | `/api/session.php` | Public / Authenticated | Returns auth status, role, telemetry stats, and recent submissions | None |
| `GET` | `/api/get-config.php` | Public / Admin | Exposes studio config; reveals secret key & endpoints if Admin | None |
| `GET` | `/api/get-dashboard-stats.php` | Public / Admin | Returns 4 live telemetry KPIs; includes audit history if Admin | None |
| `GET` | `/api/get-games.php` | Public | Returns active game titles list and full registry metadata | None |
| `GET` | `/api/get-scores.php` | Public | Returns filtered, sorted, paginated approved rankings | `game`, `limit`, `period`, `sort`, `search` |
| `GET` | `/api/get-rank.php` | Public | Looks up a player's best score and calculated rank in a game | `game`, `player_name`, `period` |
| `GET` | `/api/get-player-profile.php` | Public | Returns deep player profile with per-game windowed ranks | `player_name` |
| `GET` | `/api/get-chart-data.php` | Public | Returns daily aggregated score telemetry for Canvas charts | `game`, `days` |
| `POST` | `/api/post-score.php` | Player / Admin / API Key | Submits score (rate limited; auto-approved with valid key) | `game`, `score` (optional: `player_name` if Admin) |
| `GET` | `/api/admin-pending-scores.php` | Admin Only | Lists moderation queue items with status aggregation counts | `status`, `game` |
| `POST` | `/api/admin-verify-score.php` | Admin Only | Moderates score status with audit trail recording | `action` (`approve` / `reject` / `approve_all_pending`), `score_id` |
| `POST` | `/api/admin-manage-games.php` | Admin Only | Registers new titles or toggles active state with audit logging | `action` (`create` / `toggle`), `title`, `game_id` |

---

### 1. Authentication Endpoints

#### Register User
- **URL**: `POST /api/register.php`
- **Body**: `{"username": "player2", "password": "Password123!"}`
- **Response (`201 Created`)**:
  ```json
  {
      "status": "success",
      "message": "User registered successfully.",
      "user": { "id": 3, "username": "player2", "role": "player" }
  }
  ```

#### Login User
- **URL**: `POST /api/login.php`
- **Body**: `{"username": "admin", "password": "Admin123!"}`
- **Response (`200 OK`)**:
  ```json
  {
      "status": "success",
      "message": "Login successful.",
      "user": { "id": 1, "username": "admin", "role": "admin" }
  }
  ```

#### Check Session & Personal Telemetry
- **URL**: `GET /api/session.php`
- **Description**: Returns current authentication status. When authenticated, includes personal telemetry stats (`approved_count`, `pending_count`, `rejected_count`, `best_score`) and the last 15 `recent_submissions`.
- **Response (`200 OK - Authenticated`)**:
  ```json
  {
      "status": "success",
      "authenticated": true,
      "user": {
          "id": 1,
          "username": "admin",
          "role": "admin",
          "stats": {
              "approved_count": 10,
              "pending_count": 0,
              "rejected_count": 1,
              "best_score": 469877
          },
          "recent_submissions": [
              {
                  "id": 214,
                  "game": "Tetris Effect",
                  "score": 5757,
                  "status": "approved",
                  "created_at": "2026-11-10 10:50:42"
              }
          ]
      },
      "stats": { ... },
      "recent_submissions": [ ... ]
  }
  ```

#### Logout User
- **URL**: `POST /api/logout.php`
- **Response (`200 OK`)**: `{"status": "success", "message": "Logged out successfully."}`

---

### 2. Configuration & Telemetry Endpoints

#### Get Studio Configuration
- **URL**: `GET /api/get-config.php`
- **Description**: Returns public configuration constants. If authenticated as admin, includes `admin_config` with the secret API key and full endpoints map.
- **Response (`200 OK - Public`)**:
  ```json
  {
      "status": "success",
      "config": {
          "app_title": "Hyper Arena",
          "min_score": 0,
          "max_score": 2147483647,
          "default_limit": 10,
          "allowed_limits": [10, 15, 25, 50, 100, "all"],
          "max_export_limit": 500,
          "allowed_periods": { "all": "All-Time", "week": "This Week", "today": "Today" },
          "rate_limit_max": 10,
          "rate_limit_window": 60
      }
  }
  ```

#### Get Studio Telemetry KPIs & Audit History
- **URL**: `GET /api/get-dashboard-stats.php`
- **Description**: Returns 4 core KPI statistics. If authenticated as admin, also includes the recent 50 entries from `audit_logs`.
- **Response (`200 OK`)**:
  ```json
  {
      "status": "success",
      "stats": {
          "total_verified_scores": 1250,
          "active_players": 1150,
          "pending_scores_count": 10,
          "most_played_game": "Tetris Effect"
      },
      "audit_logs": [
          {
              "id": 5,
              "admin_id": 1,
              "admin_username": "admin",
              "action": "add_game",
              "target_id": 6,
              "details": "Registered new studio game 'Geometry Dash'",
              "created_at": "2026-11-14 04:30:00"
          }
      ]
  }
  ```

---

### 3. Public & Player Endpoints

#### Get Games List
- **URL**: `GET /api/get-games.php`
- **Description**: Returns an array of active game title strings (`games`) and rich metadata objects (`data`).
- **Response (`200 OK`)**:
  ```json
  {
      "status": "success",
      "games": ["Pac-Man", "Subway Surfers", "Tetris Effect", "Trackmania", "Vampire Survivors"],
      "data": [
          {
              "id": 1,
              "title": "Tetris Effect",
              "slug": "tetris-effect",
              "genre": "Puzzle",
              "is_active": 1,
              "total_scores": 275
          }
      ]
  }
  ```

#### Get Filtered Leaderboard Scores
- **URL**: `GET /api/get-scores.php`
- **Query Parameters**:
  - `game` *(string, default: `all`)*: Target title or `all`.
  - `limit` *(string/int, default: `10`)*: `10`, `15`, `25`, `50`, `100`, or `all`.
  - `period` *(string, default: `all`)*: `all`, `week`, or `today`.
  - `sort` *(string, default: `score_desc`)*: `score_desc`, `score_asc`, or `newest`.
  - `search` *(string, optional)*: Substring match for player handle.
- **Response (`200 OK`)**:
  ```json
  {
      "status": "success",
      "filters": { "game": "Tetris Effect", "limit": "10", "period": "all", "sort": "score_desc", "search": "" },
      "total_returned": 1,
      "scores": [
          {
              "id": 212,
              "game": "Tetris Effect",
              "player_name": "ShadowFox455",
              "score": 469877,
              "created_at": "2026-11-10 10:50:41"
          }
      ]
  }
  ```

#### Get Player Rank Lookup
- **URL**: `GET /api/get-rank.php`
- **Query Parameters**:
  - `game` *(string, required)*: Specific game title (e.g. `Tetris Effect`).
  - `player_name` *(string, required)*: Target competitor handle.
  - `period` *(string, optional, default: `all`)*: `all`, `week`, or `today`.
- **Response (`200 OK`)**:
  ```json
  {
      "status": "success",
      "found": true,
      "game": "Tetris Effect",
      "period": "all",
      "player_name": "AcePilot",
      "best_score": 985000,
      "rank": 3,
      "attempts": 4
  }
  ```

#### Get Player Deep Profile & Standings
- **URL**: `GET /api/get-player-profile.php?player_name=AcePilot`
- **Description**: Computes overall summary, per-game personal bests with ranks via window functions, and recent submissions.
- **Response (`200 OK`)**:
  ```json
  {
      "status": "success",
      "player_name": "AcePilot",
      "summary": {
          "total_approved_submissions": 5,
          "highest_score_overall": 985000,
          "first_seen": "2026-10-15 08:00:00",
          "last_seen": "2026-11-12 14:20:00"
      },
      "games": [
          {
              "game": "Tetris Effect",
              "best_score": 985000,
              "submissions_count": 3,
              "rank": 1
          }
      ],
      "recent_scores": [
          {
              "id": 142,
              "game": "Tetris Effect",
              "score": 985000,
              "created_at": "2026-11-12 14:20:00"
          }
      ]
  }
  ```

#### Submit Score
- **URL**: `POST /api/post-score.php`
- **Headers**:
  - `Content-Type: application/json`
  - `X-API-Key: hyper-arena-secret-key-2026` *(optional for game engines)*
- **Body**: `{"game": "Tetris Effect", "score": 12500}`
- **Rate Limit**: 10 requests / 60 seconds per IP.
- **Response (`201 Created`)**:
  ```json
  {
      "status": "success",
      "message": "Score submitted successfully. Pending admin approval.",
      "data": { "id": 240, "game": "Tetris Effect", "player_name": "player1", "score": 12500, "status": "pending" }
  }
  ```

---

### 4. Admin Moderation & Registry Endpoints

#### List Pending Scores Queue
- **URL**: `GET /api/admin-pending-scores.php` *(Admin Only)*
- **Query Parameters**:
  - `status` *(string, optional, default: `pending`)*: `pending`, `approved`, or `rejected`.
  - `game` *(string, optional)*: Filter queue by title or `all`.
- **Response (`200 OK`)**:
  ```json
  {
      "status": "success",
      "filter": { "status": "pending", "game": "all" },
      "counts": { "pending": 10, "approved": 1250, "rejected": 4 },
      "scores": [
          {
              "id": 1260,
              "user_id": 2,
              "game": "Tetris Effect",
              "player_name": "player1",
              "score": 85000,
              "status": "pending",
              "reviewed_by": null,
              "reviewed_at": null,
              "created_at": "2026-11-15 08:30:00"
          }
      ]
  }
  ```

#### Verify Scores
- **URL**: `POST /api/admin-verify-score.php` *(Admin Only)*
- **Actions**:
  - Single: `{"action": "approve", "score_id": 240}`
  - Bulk: `{"action": "approve_all_pending"}`
- **Response (`200 OK`)**:
  ```json
  {
      "status": "success",
      "message": "Score approved successfully.",
      "score_id": 240,
      "new_status": "approved"
  }
  ```

#### Manage Game Registry
- **URL**: `POST /api/admin-manage-games.php` *(Admin Only)*
- **Actions**:
  - Create: `{"action": "create", "title": "Quantum Surge", "description": "Sci-Fi racer"}`
  - Toggle: `{"action": "toggle", "game_id": 4}`
- **Response (`201 Created` / `200 OK`)**:
  ```json
  {
      "status": "success",
      "message": "Game created successfully.",
      "game": { "id": 6, "slug": "quantum-surge", "title": "Quantum Surge", "is_active": 1 }
  }
  ```

---

### 5. Analytics & Chart API

#### Get Chart Aggregated Data
- **URL**: `GET /api/get-chart-data.php?game=all&days=30`
- **Response (`200 OK`)**:
  ```json
  {
      "status": "success",
      "game": "all",
      "days": 30,
      "data": [
          {
              "date": "2026-11-10",
              "highest_score": 469877,
              "average_score": 154210.5,
              "total_submissions": 8
          }
      ]
  }
  ```

---

## Database Schema & Architecture

The database consists of 5 normalized tables with composite indexing:

```sql
-- 1. Users Table (Bcrypt authentication & RBAC)
CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('player', 'admin') NOT NULL DEFAULT 'player',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Dynamic Games Registry Table
CREATE TABLE IF NOT EXISTS games (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(60) NOT NULL UNIQUE,
    title VARCHAR(100) NOT NULL UNIQUE,
    genre VARCHAR(50) DEFAULT 'Arcade',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Scores Table (Moderated rankings)
CREATE TABLE IF NOT EXISTS scores (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    game VARCHAR(100) NOT NULL,
    player_name VARCHAR(100) NOT NULL,
    score INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_scores_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status_game_created_score (status, game, created_at, score DESC),
    INDEX idx_status_created_score (status, created_at, score DESC),
    INDEX idx_status_player_score (status, player_name, score DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Rate Limiting Table (IP sliding window)
CREATE TABLE IF NOT EXISTS rate_limits (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    action_type VARCHAR(32) NOT NULL,
    attempts INT UNSIGNED NOT NULL DEFAULT 1,
    last_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ip_action (ip_address, action_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Immutable Studio Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_id INT UNSIGNED NOT NULL,
    admin_username VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    target_id INT UNSIGNED NULL,
    details TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at DESC),
    INDEX idx_admin_id (admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Security & Performance Engineering

1. **Window Functions Without Loops**: Per-game player rankings are generated with `DENSE_RANK() OVER (PARTITION BY game ORDER BY MAX(score) DESC)` in one prepared query. Zero queries in loops.
2. **Timing-Safe Secrets**: API keys are validated using timing-safe `hash_equals()` against keys stored in `config.php`.
3. **Sliding Window Rate Limiter**: 10 submissions per minute per IP returning HTTP `429 Too Many Requests` and `Retry-After` headers.
4. **XSS Immunity**: Dynamic text is injected strictly using `document.createElement()` and `textContent`. Zero `innerHTML` for dynamic content.
5. **SQL Injection Defense**: 100% prepared PDO statements with bound parameters.
6. **Numeric Overflow Protection**: Enforced bounds (`0` to `2,147,483,647`) to prevent MySQL signed 32-bit overflow (`SQLSTATE 22003`).
7. **Session Hardening**: Sessions configured with `cookie_httponly = true`, `cookie_samesite = 'Lax'`, and strict mode.

---

## Bug List & Verified Fixes

| Issue / Edge Case | Root Cause / Vulnerability | Solution / Fix Implemented |
|---|---|---|
| **Numeric Out of Range** (`score > 2147483647`) | MySQL signed 32-bit `INT` maximum is 2,147,483,647 (`0x7FFFFFFF`). Submissions exceeding this threshold triggered unhandled PDO exceptions with SQLSTATE `22003` ("Numeric value out of range"). | Checked raw score digit length and validated numerical value against `MAX_SCORE` constant before SQL execution; caught PDO SQLSTATE `22003` returning HTTP 400 Bad Request. |
| **Zero Score Rejection** (`score: 0`) | In PHP, loose `empty("0")` and `empty(0)` evaluate to `true`. When players legitimately achieved or submitted a score of `0` in survival titles, the backend validator rejected it with `"Score is required"`. | Replaced loose `empty()` with strict `!isset($input['score']) \|\| (is_string($input['score']) && trim($input['score']) === '')`, correctly accepting valid `0` and `"0"` integers. |
| **Float/Decimal Validation Bypass** | Loose numeric validation (`is_numeric("12.34")`) evaluated float strings as valid numbers, allowing fractional numbers into integer database columns and causing truncation inaccuracies. | Enforced strict integer validation via `filter_var($val, FILTER_VALIDATE_INT) !== false` and rejected any value containing decimal points or evaluated as `is_float()`. |
| **Theme Toggle ID Mismatch & Double-Toggle** | Header markup utilized `id="themeToggleBtn"` while legacy scripts queried `#themeToggle` or attached redundant event listeners during view updates, causing clicks to flip themes twice instantaneously (dark -> light -> dark). | Unified button selector to `#themeToggleBtn` across all HTML and JS files, attached a single idempotent listener in `dom-utils.js`, and synchronized `data-theme` on `<html>` with `localStorage`. |
| **Admin Secret Key Session Timing** | `api/get-config.php` invoked `getCurrentUser()` before `startSecureSession()` was executed. With no active session, the check evaluated as guest, hiding `admin_config` and displaying "Administrator access required". | Called `startSecureSession()` at the entry point of `api/get-config.php` before reading session data, added `Cache-Control: no-store` headers, and synchronized config fetches on login/registration. |
| **Stale `localStorage` Game Filter Reset** | When active game titles were updated or replaced in the database, `localStorage` retained obsolete slugs (e.g., deprecated titles), causing the leaderboard to query non-existent games and display empty results indefinitely. | Added runtime validation in `state.js` and `leaderboard-view.js` checking stored game slugs against the active list from `api/get-games.php`, automatically resetting to `'all'` if unrecognized. |
| **Cross-Game Score Scale Skew** | In cross-game leaderboards (`game=all`), titles with multi-million score loops (e.g. Subway Surfers reaching 18,000,000+) monopolized all top 25 positions, crowding out top scores from precision titles like Pac-Man and Tetris Effect. | Calibrated simulation and seeding tier distributions: 97% of Subway Surfers scores fall between 100k and 2.8M, with only the top 3% reaching 4M–18.5M, allowing Pac-Man (3.3M) and Tetris Effect (2.4M) to contest the podium. |
| **Whitespace-Only Inputs** | Inputs composed entirely of spaces (e.g., `"   "`) passed standard non-null string checks. | Enforced `trim()` validation for player handles and title strings, ensuring non-empty textual content. |
| **Oversized String Payloads** | Payloads exceeding 100 characters caused MySQL column truncation errors and layout overflows. | Enforced length validation (`mb_strlen(trim(...)) <= 100`) returning HTTP 400 Bad Request. |
| **Submission Flooding & DoS** | Malicious clients could hammer score submission endpoints with rapid-fire requests. | Implemented sliding-window rate limiting in `rate_limits` table, returning HTTP `429 Too Many Requests` with `Retry-After: 60` when exceeding 10 requests/minute. |
| **Unapproved Scores on Leaderboard** | Direct submissions without moderation could display offensive handles or fraudulent scores on public standings. | Architected a two-stage pipeline: submissions enter `status = 'pending'`, and public leaderboard queries filter strictly for `status = 'approved'`. |
| **Privilege Escalation** | Direct ID manipulation or crafted POST bodies could allow normal users to approve scores or register titles. | Enforced server-side `requireAdmin()` check returning HTTP 403 Forbidden with structured JSON error responses. |
| **XSS Payload Injection** | User handles containing HTML or JavaScript (e.g. `<script>alert(1)</script>`) could execute if rendered via `innerHTML`. | Strictly used `document.createElement()` and `textContent` across 100% of dynamic client-side rendering code. |

---

## Automated Testing Suite (36 Tests)

The repository includes a comprehensive CLI end-to-end test suite (`test-e2e.php`) verifying all platform capabilities against the live HTTP server:

```bash
php test-e2e.php
```

### Verified Test Cases (36/36 PASS):
1. Initial unauthenticated session check (`GET /api/session.php`).
2. Unauthenticated score submission rejection (`401 Unauthorized`).
3. Password validation on registration (`< 6 characters` returns `400 Bad Request`).
4. Duplicate username conflict prevention (`409 Conflict`).
5. Valid player registration and immediate session initiation (`201 Created`).
6. Session persistence verification for registered user.
7. Player score submission marked as `pending` (`201 Created`).
8. Verification that pending score does NOT appear on the public leaderboard.
9. Player attempt to access admin moderation blocked (`403 Forbidden`).
10. User logout and session destruction verification.
11. Invalid login credentials rejection (`401 Unauthorized`).
12. Admin login verification and admin role check (`200 OK`).
13. Admin moderation queue listing pending score.
14. Admin score approval (`200 OK`).
15. Verification that approved score is now visible on public leaderboard.
16. Player rank lookup accuracy against approved scores.
17. Full limit filtration (`10`, `15`, `25`, `all`).
18. Multi-directional sort ordering (`score_desc`, `score_asc`, `newest`).
19. Real-time player search matching.
20. Cross-game view (`game=all`) with multi-game row attribution.
21. Secret API Key: Invalid key without session returns HTTP 401.
22. Secret API Key: Valid key allows submission with pre-approval (HTTP 201).
23. Chart Analytics API: Valid game and days returns chronological daily snapshots (`GET /api/get-chart-data.php`).
24. Chart Analytics API: `game=all` returns cross-game aggregations.
25. Chart Analytics API: Missing game parameter returns HTTP 400.
26. Submission Rate Limiting: Exceeding 10 submissions per minute triggers HTTP 429 Too Many Requests with `Retry-After`.
27. Studio Config: `GET /api/get-config.php` (Public) returns dynamic bounds without secrets.
28. Studio Config: `GET /api/get-config.php` (Admin) exposes admin_config and endpoints map.
29. Telemetry KPIs: `GET /api/get-dashboard-stats.php` returns live KPI statistics.
30. Game Registry Security: Non-admin calling `/api/admin-manage-games.php` is blocked.
31. Game Registry: Admin creates new game title with audit logging (HTTP 201).
32. Game Registry: Admin deactivates game title with audit logging (HTTP 200).
33. Audit Trail: Admin actions are recorded in `GET /api/get-dashboard-stats.php`.
34. Player Profile API: Missing `player_name` returns HTTP 400.
35. Player Profile API: Non-existent player returns HTTP 404.
36. Player Profile API: Existing player returns complete standings and windowed ranks.

---

## Client UI & Simulator Pages

- **Main Studio Dashboard ([index.html](file:///c:/Users/Ihab-pc/Desktop/intern/index.html))**:
  - **Modular Studio Shell**: Collapsible sidebar (260px expanded / 72px rail / mobile drawer) with 8 dedicated windowed tabs.
  - **Glassmorphism Aesthetic**: Translucent frosted surfaces (`backdrop-filter: blur(16px)`), hairline borders, and radial mesh gradients across Dark and Light themes.
  - **Zero Emojis**: 100% clean UI with inline geometric SVG icons (`stroke-width="1.75"`).
  - **Live Telemetry Strip**: 4 real-time KPI cards reflecting global verified scores, active players, moderation alerts, and top title.
  - **Data Export**: One-click CSV and JSON export buttons in the leaderboard command bar.
  - **Interactive Player Modals**: Clickable player handles opening personal standing and match history.
  - **Admin Studio Windows**: Dedicated moderation queue, title registry management, and audit log history.

- **High-Volume Traffic Simulator ([test-simulator.html](file:///c:/Users/Ihab-pc/Desktop/intern/test-simulator.html))**:
  - Matched Glassmorphism UI with clean SVG navigation and theme switcher.
  - Batch generation of 100 randomized scores (`0` to `950,000`).
  - Secret API Key toggle (`hyper-arena-secret-key-2026`) for direct server-to-server stress testing.
  - 13-case automated out-of-range and malicious payload test battery.
  - Live progress track, real-time counters, and average network latency instrumentation.
