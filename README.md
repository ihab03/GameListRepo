# Game Leaderboard Service (Option A)

A high-performance, modular web application and REST API for tracking and displaying top player scores across multiple games. Built with vanilla HTML5, modern CSS3, vanilla JavaScript (ES6+ `async`/`await`), PHP 8+, and MySQL/MariaDB (optimized for XAMPP and standalone PHP/MySQL environments).

---

## Table of Contents
- [Architecture & Directory Structure](#architecture--directory-structure)
- [Requirements](#requirements)
- [Step-by-Step Setup & Installation](#step-by-step-setup--installation)
- [REST API Documentation](#rest-api-documentation)
- [Security & Performance Engineering](#security--performance-engineering)
- [Bug List & Verified Fixes](#bug-list--verified-fixes)
- [Client UI Features](#client-ui-features)

---

## Architecture & Directory Structure

The project strictly separates presentation, business logic, configuration, and data persistence:

```text
.
├── .gitignore               # Excludes config.php, environment files, IDE & OS artifacts
├── config-example.php       # Template database configuration for repository handover
├── config.php               # Local environment credentials (excluded from version control)
├── db.php                   # Reusable singleton PDO database connection layer
├── schema.sql               # Database definition, composite performance index & seed data
├── index.html               # Semantic HTML5 single-page application
├── css/
│   └── style.css            # Responsive styles, theme variables, rank accents & UI states
├── js/
│   └── app.js               # Client controller (fetch, async/await, XSS-safe DOM rendering)
└── api/
    ├── helpers.php          # Centralized response formatting, parser & input validators
    ├── get-games.php        # GET: Returns distinct alphabetical game list
    ├── get-scores.php       # GET: Returns Top 10 scores for a selected game
    └── post-score.php       # POST: Validates and saves a new score submission
```

---

## Requirements
- **PHP**: 8.0 or newer (with `pdo` and `pdo_mysql` extensions enabled)
- **Database**: MySQL 8.0+ or MariaDB 10.4+ (default XAMPP or native service)
- **Web Server**: Apache (via XAMPP) or PHP Built-in CLI Server
- **Browser**: Any modern browser (Chrome, Firefox, Safari, Edge)

---

## Step-by-Step Setup & Installation

### Step 1: Clone or Open the Repository
Navigate to the project root directory:
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

Open `config.php` and verify your local database settings. The default configuration is tailored for XAMPP:
```php
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'game_leaderboard');
define('DB_USER', 'root');
define('DB_PASS', '');            // Leave empty for default XAMPP, or set your root password
define('DB_CHARSET', 'utf8mb4');
```

### Step 3: Import Database Schema & Seed Data
Run the following command to create the database, table, composite performance index, and 20 sample seed rows across 3 games:

**If using default XAMPP (blank password):**
```bash
mysql -u root < schema.sql
```

**If using a password-protected MySQL instance:**
```bash
mysql -u root -p < schema.sql
```

### Step 4: Run the Web Server

#### Option A: Built-in PHP Development Server (Quickest)
Run the following in the project root:
```bash
php -S 127.0.0.1:8000
```
Open your browser and navigate to:
```
http://127.0.0.1:8000/
```

#### Option B: XAMPP Apache
1. Copy or symlink the project folder into your XAMPP `htdocs` directory (e.g. `C:\xampp\htdocs\intern`).
2. Start Apache and MySQL from the **XAMPP Control Panel**.
3. Open your browser and navigate to:
```
http://localhost/intern/
```

---

## REST API Documentation

All API endpoints return JSON with UTF-8 encoding and appropriate HTTP status codes.

### 1. Get Games List
- **URL**: `/api/get-games.php`
- **Method**: `GET`
- **Headers**: None
- **Query Parameters**: None
- **Description**: Returns an alphabetical list of all distinct games that have scores recorded.

#### Success Response (`200 OK`)
```json
{
    "status": "success",
    "games": [
        "Drift King",
        "Dungeon Runner",
        "Space Blaster"
    ]
}
```

#### Error Responses
- `405 Method Not Allowed`: If called with `POST`, `PUT`, `DELETE`, etc.
- `500 Internal Server Error`: If database execution fails.

---

### 2. Get Top 10 Scores for a Game
- **URL**: `/api/get-scores.php`
- **Method**: `GET`
- **Query Parameters**:
  - `game` *(string, required)*: The name of the game (e.g. `?game=Space%20Blaster`).
- **Description**: Retrieves the top 10 highest scores for the specified game ordered by `score DESC, created_at ASC`.

#### Success Response (`200 OK`)
```json
{
    "status": "success",
    "game": "Space Blaster",
    "scores": [
        {
            "id": 1,
            "player_name": "AcePilot",
            "score": 9850,
            "created_at": "2026-11-01 10:15:00"
        },
        {
            "id": 2,
            "player_name": "NovaStar",
            "score": 9420,
            "created_at": "2026-11-01 11:30:00"
        }
    ]
}
```

#### Error Responses
- `400 Bad Request`: If `game` parameter is missing, empty, or only whitespace:
  ```json
  {
      "status": "error",
      "message": "Please provide a valid game name."
  }
  ```
- `405 Method Not Allowed`: If called with methods other than `GET`.
- `500 Internal Server Error`: Database query failure.

---

### 3. Submit New Score
- **URL**: `/api/post-score.php`
- **Method**: `POST`
- **Headers**:
  - `Content-Type: application/json` (or `application/x-www-form-urlencoded`)
- **Body Payload**:
```json
{
    "game": "Space Blaster",
    "player_name": "StarGazer",
    "score": 9900
}
```

#### Success Response (`201 Created`)
```json
{
    "status": "success",
    "message": "Score saved successfully.",
    "data": {
        "id": 21,
        "game": "Space Blaster",
        "player_name": "StarGazer",
        "score": 9900
    }
}
```

#### Error Responses
- `400 Bad Request`: Validation failure on missing, empty, invalid, or negative fields:
  ```json
  {
      "status": "error",
      "message": "Score must be a non-negative integer (0 or greater)."
  }
  ```
- `405 Method Not Allowed`: If accessed via `GET` or other HTTP methods:
  ```json
  {
      "status": "error",
      "message": "Method Not Allowed. Only POST requests are accepted."
  }
  ```
- `500 Internal Server Error`: Database insert failure.

---

## Security & Performance Engineering

1. **SQL Injection Prevention**:
   - Every database query uses PDO prepared statements with bound parameters (`:game`, `:player_name`, `:score`). Raw concatenation is never used.
2. **Cross-Site Scripting (XSS) Prevention**:
   - The frontend JavaScript never utilizes `innerHTML` for displaying user-supplied strings (`player_name`, `game`, or server messages). All DOM insertions use `document.createElement()` and assign text via `.textContent`.
3. **Database Performance Indexing**:
   - `schema.sql` defines a composite descending index on the query path:
     ```sql
     INDEX `idx_game_score` (`game`, `score` DESC)
     ```
     This allows MySQL to resolve `WHERE game = :game ORDER BY score DESC LIMIT 10` directly through an index range scan without temporary tables or filesort operations.
4. **Credential Isolation**:
   - `config.php` is ignored by `.gitignore`. `config-example.php` is provided as an anonymized template.
5. **Information Leakage Prevention**:
   - In `db.php`, connection failures log the detailed exception to server logs (`error_log`) while outputting a generic JSON 500 error to the client, concealing server paths and database passwords.

---

## Bug List & Verified Fixes

During automated edge-case and security verification (Step 3), the following critical edge cases and potential bugs were caught, hardened, and verified with 100% test coverage:

| Issue / Edge Case | Root Cause / Vulnerability | Solution / Fix Implemented |
|---|---|---|
| **Zero Score Rejection** (`score: 0` or `"0"`) | Standard PHP `empty($score)` evaluates `0` and `"0"` as empty, improperly rejecting valid scores of zero. | Replaced loose checks with `!isset($input['score']) \|\| (is_string($input['score']) && trim($input['score']) === '')` in `api/helpers.php`. |
| **Float/Decimal Score Permissibility** | Numeric strings with decimals (e.g. `12.34`) or float literals could bypass loose numeric checks. | Added explicit `is_float($input['score'])` guard and `FILTER_VALIDATE_INT` check to enforce integer-only scores. |
| **Whitespace-Only Inputs** | Inputs like `"   "` pass `isset()` and `!== ''` checks if not trimmed. | Added `trim()` validation for `player_name` and `game` to reject whitespace-only submissions with HTTP 400. |
| **Oversized String Payloads** | Payloads exceeding database column width (100 characters) could trigger unhandled database truncation errors. | Enforced string length validation (`mb_strlen(trim(...)) <= 100`) returning HTTP 400. |
| **JSON Output Type Inconsistency** | Certain MySQL PDO drivers return numeric columns as strings (`"score": "9850"`), which can break client-side numerical math. | Explicitly cast `id` and `score` to integers (`(int) $row['score']`) in both POST and GET responses. |
| **Dual Format Support** | Standard forms send `application/x-www-form-urlencoded`, while API clients send `application/json`. | `getRequestData()` inspects raw input from `php://input` and decodes JSON, falling back to `$_POST` form fields. |
| **XSS Payload Injection** | User handles containing HTML/JS tags (e.g. `<script>alert(1)</script>`) could execute if rendered via `innerHTML`. | Strictly used `document.createElement()` and `textContent` in `js/app.js` to ensure tags are rendered safely as plain text. |

---

## Client UI Features

- **Modern Glassmorphic Dark UI**: Custom CSS design with clean gradients, card containers, and distinct visual feedback.
- **Top 3 Podium Badges**: Gold (#1), Silver (#2), and Bronze (#3) badges subtly accent the highest scorers.
- **Dynamic Game Autocomplete**: Form game input features an HTML5 `<datalist>` synced with available games, allowing users to select an existing game or enter a new title.
- **Real-Time Loading & Error Feedback**: Animated spinners during asynchronous fetch calls and clear visual alerts for validation errors and success notices.
- **Mobile-Responsive**: Designed with Flexbox/Grid and responsive breakpoints down to narrow 375px mobile viewports without horizontal scrolling.

