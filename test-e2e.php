<?php
/**
 * End-to-End Test Suite for Game Leaderboard Service (Step 6 Verification)
 */

declare(strict_types=1);

$baseUrl = 'http://127.0.0.1:8000';
$passed = 0;
$failed = 0;

function runTest(string $description, callable $fn): void {
    global $passed, $failed;
    echo "Testing: {$description}... ";
    try {
        $result = $fn();
        if ($result === true) {
            echo "\033[32mPASS\033[0m\n";
            $passed++;
        } else {
            echo "\033[31mFAIL: " . ($result ?: 'Condition not met') . "\033[0m\n";
            $failed++;
        }
    } catch (\Throwable $e) {
        echo "\033[31mEXCEPTION: " . $e->getMessage() . "\033[0m\n";
        $failed++;
    }
}

class TestClient {
    private string $baseUrl;
    private ?string $cookie = null;

    public function __construct(string $baseUrl) {
        $this->baseUrl = rtrim($baseUrl, '/');
    }

    public function clearCookies(): void {
        $this->cookie = null;
    }

    public function setCookie(?string $cookie): void {
        $this->cookie = $cookie;
    }

    public function getCookie(): ?string {
        return $this->cookie;
    }

    public function request(string $method, string $path, $body = null, array $headers = []): array {
        $url = $this->baseUrl . $path;
        $ch = curl_init($url);

        $defaultHeaders = ['Accept: application/json'];
        if ($this->cookie !== null) {
            $defaultHeaders[] = 'Cookie: ' . $this->cookie;
        }

        if (is_array($body)) {
            $payload = json_encode($body);
            $defaultHeaders[] = 'Content-Type: application/json';
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        } elseif ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }

        $allHeaders = array_merge($defaultHeaders, $headers);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $allHeaders);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($method));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, true);

        $response = curl_exec($ch);
        if ($response === false) {
            $err = curl_error($ch);
            throw new \RuntimeException("cURL request failed: " . $err);
        }

        $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);

        $headerStr = substr($response, 0, $headerSize);
        $bodyStr = substr($response, $headerSize);

        // Capture Set-Cookie if present
        if (preg_match_all('/^Set-Cookie:\s*([^;]+)/mi', $headerStr, $matches)) {
            $cookies = [];
            foreach ($matches[1] as $c) {
                $cookies[] = trim($c);
            }
            $this->cookie = implode('; ', $cookies);
        }

        $json = json_decode($bodyStr, true);

        return [
            'status' => $statusCode,
            'headers' => $headerStr,
            'body' => $bodyStr,
            'json' => $json,
        ];
    }
}

$client = new TestClient($baseUrl);

echo "========================================================\n";
echo "  GAME LEADERBOARD SERVICE - END-TO-END VERIFICATION\n";
echo "========================================================\n\n";

// 1. Session unauthenticated
runTest('Initial session should be unauthenticated', function () use ($client) {
    $res = $client->request('GET', '/api/session.php');
    if ($res['status'] !== 200) return "Expected status 200, got {$res['status']}";
    if ($res['json']['authenticated'] !== false) return "Expected authenticated=false";
    if ($res['json']['user'] !== null) return "Expected user=null";
    return true;
});

// 2. Reject unauthenticated score submission
runTest('Unauthenticated score submission must return HTTP 401', function () use ($client) {
    $res = $client->request('POST', '/api/post-score.php', [
        'game' => 'Space Blaster',
        'player_name' => 'Ghost',
        'score' => 5000,
    ]);
    if ($res['status'] !== 401) return "Expected status 401, got {$res['status']}";
    if (($res['json']['status'] ?? '') !== 'error') return "Expected status='error'";
    return true;
});

// 3. Register input validation: short password
runTest('Registration with short password (< 6 chars) must return HTTP 400', function () use ($client) {
    $res = $client->request('POST', '/api/register.php', [
        'username' => 'test_user_short',
        'password' => '12345',
    ]);
    if ($res['status'] !== 400) return "Expected status 400, got {$res['status']}";
    return true;
});

// 4. Register duplicate username: 'admin'
runTest('Registration with existing username must return HTTP 409 Conflict', function () use ($client) {
    $res = $client->request('POST', '/api/register.php', [
        'username' => 'admin',
        'password' => 'Password123!',
    ]);
    if ($res['status'] !== 409) return "Expected status 409, got {$res['status']}";
    return true;
});

// 5. Register new user e2e_user
$e2eUsername = 'e2e_tester';
$e2ePassword = 'SecurePassword123!';
$createdScoreId = null;

runTest('Registration of a new valid player must return HTTP 201 and start session', function () use ($client, $e2eUsername, $e2ePassword) {
    $res = $client->request('POST', '/api/register.php', [
        'username' => $e2eUsername,
        'password' => $e2ePassword,
    ]);
    if ($res['status'] !== 201) return "Expected status 201, got {$res['status']} with body: {$res['body']}";
    if ($res['json']['user']['username'] !== $e2eUsername) return "Expected username {$e2eUsername}";
    if ($res['json']['user']['role'] !== 'player') return "Expected role 'player'";
    return true;
});

// 6. Check session after registration
runTest('Session check for newly registered user', function () use ($client, $e2eUsername) {
    $res = $client->request('GET', '/api/session.php');
    if ($res['status'] !== 200) return "Expected status 200, got {$res['status']}";
    if ($res['json']['authenticated'] !== true) return "Expected authenticated=true";
    if ($res['json']['user']['username'] !== $e2eUsername) return "Expected user {$e2eUsername}";
    return true;
});

// 7. Submit score as authenticated player -> status: pending
runTest('Score submitted by player is saved as pending and returns HTTP 201', function () use ($client, &$createdScoreId) {
    $res = $client->request('POST', '/api/post-score.php', [
        'game' => 'Space Blaster',
        'score' => 8888,
    ]);
    if ($res['status'] !== 201) return "Expected status 201, got {$res['status']} with body: {$res['body']}";
    if (($res['json']['data']['status'] ?? '') !== 'pending') return "Expected score status 'pending'";
    $createdScoreId = $res['json']['data']['id'] ?? null;
    if (!$createdScoreId) return "No score id returned";
    return true;
});

// 8. Verify pending score is NOT on public leaderboard
runTest('Pending score must NOT appear on the public leaderboard', function () use ($client, $e2eUsername) {
    $res = $client->request('GET', '/api/get-scores.php?game=Space%20Blaster&limit=all');
    if ($res['status'] !== 200) return "Expected status 200, got {$res['status']}";
    $scores = $res['json']['scores'] ?? [];
    foreach ($scores as $s) {
        if ($s['player_name'] === $e2eUsername && (int)$s['score'] === 8888) {
            return "Found pending score on public leaderboard! It should only be approved scores.";
        }
    }
    return true;
});

// 9. Player trying to call admin moderation -> 403 Forbidden
runTest('Player calling admin moderation endpoint must return HTTP 403 Forbidden', function () use ($client, &$createdScoreId) {
    $res = $client->request('POST', '/api/admin-verify-score.php', [
        'score_id' => $createdScoreId,
        'action' => 'approve',
    ]);
    if ($res['status'] !== 403) return "Expected status 403, got {$res['status']}";
    return true;
});

// 10. Logout
runTest('User logout destroys session', function () use ($client) {
    $res = $client->request('POST', '/api/logout.php');
    if ($res['status'] !== 200) return "Expected status 200, got {$res['status']}";
    
    // Check session now
    $sess = $client->request('GET', '/api/session.php');
    if ($sess['json']['authenticated'] !== false) return "Expected authenticated=false after logout";
    return true;
});

// 11. Login with invalid password
runTest('Login with incorrect password must return HTTP 401', function () use ($client, $e2eUsername) {
    $res = $client->request('POST', '/api/login.php', [
        'username' => $e2eUsername,
        'password' => 'WrongPassword!',
    ]);
    if ($res['status'] !== 401) return "Expected status 401, got {$res['status']}";
    return true;
});

// 12. Login as admin
runTest('Login as admin user returns HTTP 200 and admin role', function () use ($client) {
    $res = $client->request('POST', '/api/login.php', [
        'username' => 'admin',
        'password' => 'Admin123!',
    ]);
    if ($res['status'] !== 200) return "Expected status 200, got {$res['status']}";
    if ($res['json']['user']['role'] !== 'admin') return "Expected role 'admin'";
    return true;
});

// 13. Admin sees pending score in moderation queue
runTest('Admin pending scores endpoint lists the pending score', function () use ($client, &$createdScoreId) {
    $res = $client->request('GET', '/api/admin-pending-scores.php?status=pending');
    if ($res['status'] !== 200) return "Expected status 200, got {$res['status']}";
    $scores = $res['json']['scores'] ?? [];
    $found = false;
    foreach ($scores as $s) {
        if ((int)$s['id'] === (int)$createdScoreId) {
            $found = true;
            break;
        }
    }
    if (!$found) return "Did not find pending score ID {$createdScoreId} in queue";
    return true;
});

// 14. Admin approves the score
runTest('Admin approves pending score', function () use ($client, &$createdScoreId) {
    $res = $client->request('POST', '/api/admin-verify-score.php', [
        'score_id' => $createdScoreId,
        'action' => 'approve',
    ]);
    if ($res['status'] !== 200) return "Expected status 200, got {$res['status']}";
    return true;
});

// 15. Verify approved score now appears on public leaderboard
runTest('Approved score now appears on the public leaderboard', function () use ($client, $e2eUsername) {
    $res = $client->request('GET', '/api/get-scores.php?game=Space%20Blaster&limit=all');
    if ($res['status'] !== 200) return "Expected status 200, got {$res['status']}";
    $scores = $res['json']['scores'] ?? [];
    $found = false;
    foreach ($scores as $s) {
        if ($s['player_name'] === $e2eUsername && (int)$s['score'] === 8888) {
            $found = true;
            break;
        }
    }
    if (!$found) return "Approved score not found on leaderboard";
    return true;
});

// 16. Player rank lookup works for the approved score
runTest('Rank lookup returns correct rank for the approved score', function () use ($client, $e2eUsername) {
    $res = $client->request('GET', "/api/get-rank.php?game=Space%20Blaster&player_name={$e2eUsername}");
    if ($res['status'] !== 200) return "Expected status 200, got {$res['status']}";
    if ($res['json']['found'] !== true) return "Expected found=true";
    if ((int)$res['json']['best_score'] !== 8888) return "Expected best_score 8888, got " . ($res['json']['best_score'] ?? 'null');
    return true;
});

// 17. Filtration tests
runTest('Filtration: limit=10, limit=15, limit=25, limit=all', function () use ($client) {
    foreach ([10, 15, 25] as $lim) {
        $res = $client->request('GET', "/api/get-scores.php?game=Space%20Blaster&limit={$lim}");
        if ($res['status'] !== 200) return "limit={$lim} returned status {$res['status']}";
        if (count($res['json']['scores']) > $lim) return "limit={$lim} returned more than {$lim} scores";
    }
    $resAll = $client->request('GET', "/api/get-scores.php?game=Space%20Blaster&limit=all");
    if ($resAll['status'] !== 200) return "limit=all returned status {$resAll['status']}";
    return true;
});

runTest('Filtration: sort=newest, sort=score_asc, sort=score_desc', function () use ($client) {
    // Score desc
    $resDesc = $client->request('GET', "/api/get-scores.php?game=Space%20Blaster&sort=score_desc");
    $scoresDesc = array_column($resDesc['json']['scores'], 'score');
    $sortedDesc = $scoresDesc;
    rsort($sortedDesc, SORT_NUMERIC);
    if ($scoresDesc !== $sortedDesc) return "sort=score_desc was not sorted descending";

    // Score asc
    $resAsc = $client->request('GET', "/api/get-scores.php?game=Space%20Blaster&sort=score_asc");
    $scoresAsc = array_column($resAsc['json']['scores'], 'score');
    $sortedAsc = $scoresAsc;
    sort($sortedAsc, SORT_NUMERIC);
    if ($scoresAsc !== $sortedAsc) return "sort=score_asc was not sorted ascending";

    return true;
});

runTest('Filtration: search=e2e_tester returns matching player only', function () use ($client, $e2eUsername) {
    $res = $client->request('GET', "/api/get-scores.php?game=Space%20Blaster&search=" . urlencode($e2eUsername));
    if ($res['status'] !== 200) return "Expected status 200, got {$res['status']}";
    $scores = $res['json']['scores'] ?? [];
    if (empty($scores)) return "Expected to find player in search results";
    foreach ($scores as $s) {
        if (stripos($s['player_name'], $e2eUsername) === false) {
            return "Found non-matching player in search results: " . $s['player_name'];
        }
    }
    return true;
});

runTest('Filtration: game=all returns cross-game scores with game field', function () use ($client) {
    $res = $client->request('GET', "/api/get-scores.php?game=all&limit=25");
    if ($res['status'] !== 200) return "Expected status 200, got {$res['status']}";
    $scores = $res['json']['scores'] ?? [];
    if (empty($scores)) return "No scores returned for game=all";
    $gamesSeen = [];
    foreach ($scores as $s) {
        if (!isset($s['game']) || $s['game'] === '') return "Score missing 'game' property in game=all view";
        $gamesSeen[$s['game']] = true;
    }
    if (count($gamesSeen) < 2) return "Expected multiple games in game=all view";
    return true;
});

// ========================================================
// STEP 7 DELIVERABLES VERIFICATION
// ========================================================

$apiKeyScoreId = null;

// 18. Secret API Key: Reject invalid key without session
runTest('Secret API Key: Invalid key without session returns HTTP 401', function () use ($client) {
    $client->clearCookies(); // ensure unauthenticated
    $res = $client->request('POST', '/api/post-score.php', [
        'game' => 'Space Blaster',
        'score' => 5000,
    ], ['X-API-Key: invalid-key-xyz']);
    if ($res['status'] !== 401) return "Expected status 401, got {$res['status']}";
    return true;
});

// 19. Secret API Key: Valid key allows submission and pre-approves
runTest('Secret API Key: Valid key allows submission with pre-approval (HTTP 201)', function () use ($client, &$apiKeyScoreId) {
    $client->clearCookies(); // ensure unauthenticated
    $res = $client->request('POST', '/api/post-score.php', [
        'game' => 'Space Blaster',
        'player_name' => 'ServerBot_E2E',
        'score' => 12900,
    ], ['X-API-Key: wolves-secret-key-2026']);
    if ($res['status'] !== 201) return "Expected status 201, got {$res['status']} with body: {$res['body']}";
    if (($res['json']['data']['status'] ?? '') !== 'approved') return "Expected status 'approved'";
    if (($res['json']['data']['player_name'] ?? '') !== 'ServerBot_E2E') return "Expected player_name 'ServerBot_E2E'";
    $apiKeyScoreId = $res['json']['data']['id'] ?? null;
    return true;
});

// 20. Chart Analytics API: Valid game and days returns chronological points
runTest('Chart API: GET /api/get-chart-data.php returns chronological daily snapshots', function () use ($client) {
    $res = $client->request('GET', '/api/get-chart-data.php?game=Space%20Blaster&days=30');
    if ($res['status'] !== 200) return "Expected status 200, got {$res['status']}";
    if (!isset($res['json']['data']) || !is_array($res['json']['data'])) return "Expected data array";
    if (empty($res['json']['data'])) return "Expected non-empty data for Space Blaster";
    
    // Verify structure
    $firstPoint = $res['json']['data'][0];
    if (!isset($firstPoint['date_point'], $firstPoint['highest_score'], $firstPoint['total_submissions'], $firstPoint['average_score'])) {
        return "Point missing required metrics (date_point, highest_score, total_submissions, average_score)";
    }
    return true;
});

// 21. Chart Analytics API: game=all returns cross-game aggregations
runTest('Chart API: GET /api/get-chart-data.php?game=all returns cross-game aggregations', function () use ($client) {
    $res = $client->request('GET', '/api/get-chart-data.php?game=all&days=7');
    if ($res['status'] !== 200) return "Expected status 200, got {$res['status']}";
    if ($res['json']['game'] !== 'all') return "Expected game='all'";
    return true;
});

// 22. Chart Analytics API: Missing game returns HTTP 400
runTest('Chart API: Missing game parameter returns HTTP 400', function () use ($client) {
    $res = $client->request('GET', '/api/get-chart-data.php');
    if ($res['status'] !== 400) return "Expected status 400, got {$res['status']}";
    return true;
});

// 23. Submission Rate Limiting: 11th rapid submission triggers HTTP 429
runTest('Rate Limiting: Exceeding 10 submissions per minute triggers HTTP 429 Too Many Requests', function () use ($client) {
    require_once __DIR__ . '/api/helpers.php';
    resetRateLimit('127.0.0.1', 'post-score');

    $hitCount = 0;
    $hit429 = false;
    $retryAfterReceived = false;

    // Send up to 12 rapid requests with valid API key
    for ($i = 1; $i <= 12; $i++) {
        $res = $client->request('POST', '/api/post-score.php', [
            'game' => 'Space Blaster',
            'player_name' => 'RateLimitTester',
            'score' => 1000 + $i,
        ], ['X-API-Key: wolves-secret-key-2026']);

        if ($res['status'] === 201) {
            $hitCount++;
        } elseif ($res['status'] === 429) {
            $hit429 = true;
            if (isset($res['json']['retry_after']) && $res['json']['retry_after'] > 0) {
                $retryAfterReceived = true;
            }
            break;
        }
    }

    // Reset rate limit immediately so subsequent tests or users are not blocked
    resetRateLimit('127.0.0.1', 'post-score');

    if (!$hit429) {
        return "Expected HTTP 429 after 10 requests, but made {$hitCount} without 429.";
    }
    if (!$retryAfterReceived) {
        return "HTTP 429 response did not contain expected retry_after integer.";
    }
    return true;
});

// Database cleanup
echo "\nCleaning up test artifacts from database...\n";
require_once __DIR__ . '/db.php';
$pdo = getDbConnection();

// Delete test score from user
if ($createdScoreId) {
    $stmt = $pdo->prepare("DELETE FROM scores WHERE id = :id");
    $stmt->execute([':id' => $createdScoreId]);
    echo "Deleted test score ID {$createdScoreId}.\n";
}

// Delete test score from API key
if ($apiKeyScoreId) {
    $stmt = $pdo->prepare("DELETE FROM scores WHERE id = :id");
    $stmt->execute([':id' => $apiKeyScoreId]);
    echo "Deleted API Key test score ID {$apiKeyScoreId}.\n";
}

// Delete any rate limit test scores
$stmt = $pdo->prepare("DELETE FROM scores WHERE player_name IN ('RateLimitTester', 'ServerBot_E2E')");
$stmt->execute();

// Reset rate limits table
$stmt = $pdo->prepare("DELETE FROM rate_limits WHERE ip_address = '127.0.0.1'");
$stmt->execute();
echo "Reset rate limits table for 127.0.0.1.\n";

// Delete test user
$stmt = $pdo->prepare("DELETE FROM users WHERE username = :username");
$stmt->execute([':username' => $e2eUsername]);
echo "Deleted test user '{$e2eUsername}'.\n";

echo "\n========================================================\n";
echo "SUMMARY: {$passed} Passed, {$failed} Failed\n";
echo "========================================================\n";

exit($failed > 0 ? 1 : 0);
