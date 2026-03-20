#!/bin/bash
# E2E Test Script: Full flow test via API
# Usage: bash tools/scripts/e2e-test.sh

API="http://localhost:3000/api/v1"
PASSED=0
FAILED=0
TOTAL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

assert() {
  TOTAL=$((TOTAL + 1))
  local name=$1
  local expected=$2
  local actual=$3
  if [ "$expected" = "$actual" ]; then
    echo -e "${GREEN}✓${NC} $name"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗${NC} $name (expected: $expected, got: $actual)"
    FAILED=$((FAILED + 1))
  fi
}

extract() {
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);const v=eval('j.'+process.argv[1]);console.log(v===undefined?'undefined':v===null?'null':v)}catch(e){console.log('ERROR:'+e.message)}})" "$1"
}

echo "═══════════════════════════════════════"
echo "  日報 E2E Test Suite"
echo "═══════════════════════════════════════"
echo ""

# ─── Test 1: Login ───
echo "── Authentication ──"

# 1a. Login with valid lastNumber (no password)
RESPONSE=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" -d '{"lastNumber":495}')
TOKEN=$(echo "$RESPONSE" | extract "data.accessToken")
USER_NAME=$(echo "$RESPONSE" | extract "data.user.shainName")
assert "Login with lastNumber 495" "松村 雄司" "$USER_NAME"

# 1b. Login with invalid lastNumber
RESPONSE=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" -d '{"lastNumber":999999}')
STATUS=$(echo "$RESPONSE" | extract "success")
assert "Reject invalid lastNumber" "false" "$STATUS"

# 1c. Get current user
RESPONSE=$(curl -s "$API/auth/me" -H "Authorization: Bearer $TOKEN")
ME_NAME=$(echo "$RESPONSE" | extract "data.shainName")
assert "GET /auth/me returns user" "松村 雄司" "$ME_NAME"

echo ""

# ─── Test 2: Posts ───
echo "── Posts ──"

# 2a. Create post
RESPONSE=$(curl -s -X POST "$API/posts" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"content":"E2Eテスト投稿です。","postDate":"2026-03-21"}')
POST_ID=$(echo "$RESPONSE" | extract "data.id")
POST_CONTENT=$(echo "$RESPONSE" | extract "data.content")
assert "Create post" "E2Eテスト投稿です。" "$POST_CONTENT"

# 2b. Get posts by date
RESPONSE=$(curl -s "$API/posts?date=2026-03-21&page=1&limit=10" -H "Authorization: Bearer $TOKEN")
POST_COUNT=$(echo "$RESPONSE" | extract "data.meta.total")
assert "Get posts by date (has posts)" "true" "$([ "$POST_COUNT" -ge 1 ] 2>/dev/null && echo true || echo false)"

# 2c. Get date counts
RESPONSE=$(curl -s "$API/posts/dates?startDate=2026-03-01&endDate=2026-03-31" -H "Authorization: Bearer $TOKEN")
assert "Get date counts (is array)" "true" "$(echo "$RESPONSE" | extract "Array.isArray(data)")"

echo ""

# ─── Test 3: Like ───
echo "── Like ──"

if [ -n "$POST_ID" ] && [ "$POST_ID" != "undefined" ]; then
  # 3a. Like post
  RESPONSE=$(curl -s -X POST "$API/posts/$POST_ID/like" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"reactionType":"love"}')
  LIKED=$(echo "$RESPONSE" | extract "data.liked")
  assert "Like post" "true" "$LIKED"

  # 3b. Unlike post
  RESPONSE=$(curl -s -X DELETE "$API/posts/$POST_ID/like" -H "Authorization: Bearer $TOKEN")
  UNLIKED=$(echo "$RESPONSE" | extract "data.unliked")
  assert "Unlike post" "true" "$UNLIKED"
else
  echo -e "${RED}✗${NC} Skipping like tests (no post ID)"
  FAILED=$((FAILED + 2))
  TOTAL=$((TOTAL + 2))
fi

echo ""

# ─── Test 4: Comments ───
echo "── Comments ──"

if [ -n "$POST_ID" ] && [ "$POST_ID" != "undefined" ]; then
  # 4a. Create comment
  RESPONSE=$(curl -s -X POST "$API/posts/$POST_ID/comments" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"content":"E2Eテストコメント"}')
  COMMENT_CONTENT=$(echo "$RESPONSE" | extract "data.content")
  COMMENT_AUTHOR=$(echo "$RESPONSE" | extract "data.author.shainName")
  assert "Create comment" "E2Eテストコメント" "$COMMENT_CONTENT"
  assert "Comment has author" "松村 雄司" "$COMMENT_AUTHOR"

  # 4b. Get comments
  RESPONSE=$(curl -s "$API/posts/$POST_ID/comments" -H "Authorization: Bearer $TOKEN")
  assert "Get comments (is array)" "true" "$(echo "$RESPONSE" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(Array.isArray(j.data?.items)?'true':'false')})")"
else
  echo -e "${RED}✗${NC} Skipping comment tests (no post ID)"
  FAILED=$((FAILED + 3))
  TOTAL=$((TOTAL + 3))
fi

echo ""

# ─── Test 5: User Profile ───
echo "── User Profile ──"

RESPONSE=$(curl -s "$API/users/me" -H "Authorization: Bearer $TOKEN")
DEPARTMENT=$(echo "$RESPONSE" | extract "data.shainGroup")
assert "GET /users/me has department" "true" "$([ -n "$DEPARTMENT" ] && [ "$DEPARTMENT" != "undefined" ] && echo true || echo false)"

RESPONSE=$(curl -s "$API/users/me/stats" -H "Authorization: Bearer $TOKEN")
TOTAL_POSTS=$(echo "$RESPONSE" | extract "data.totalPosts")
assert "GET /users/me/stats has totalPosts" "true" "$([ "$TOTAL_POSTS" -ge 0 ] 2>/dev/null && echo true || echo false)"

echo ""

# ─── Test 6: Announcements ───
echo "── Announcements ──"

RESPONSE=$(curl -s "$API/announcements" -H "Authorization: Bearer $TOKEN")
assert "GET /announcements (no error)" "true" "$(echo "$RESPONSE" | extract "success")"

echo ""

# ─── Test 7: Surveys ───
echo "── Surveys ──"

RESPONSE=$(curl -s "$API/surveys" -H "Authorization: Bearer $TOKEN")
assert "GET /surveys (no error)" "true" "$(echo "$RESPONSE" | extract "success")"

echo ""

# ─── Test 8: Health Check ───
echo "── Health ──"

RESPONSE=$(curl -s "$API/health")
assert "Health check" "true" "$(echo "$RESPONSE" | extract "success")"

echo ""

# ─── Summary ───
echo "═══════════════════════════════════════"
echo -e "  Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}, $TOTAL total"
echo "═══════════════════════════════════════"

if [ $FAILED -gt 0 ]; then
  exit 1
fi
