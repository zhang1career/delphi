## 0. HOW TO USE THIS FILE
- Prefer the ENDPOINT_INDEX block for tool routing; use SCENARIOS for ordering.
- If any line here disagrees with an OpenAPI document, OpenAPI wins.
- Replace {APP_HTTP_BASE} with the single application-layer origin the user
  configures for the agent (same host the browser uses for API calls).

## 1. OPENAPI_LOCATORS (resolve URLs; do not guess paths beyond {APP_HTTP_BASE})
# If the gateway exposes one merged document, set both variables to that same URL.
bet_agg_openapi_url:
  {APP_HTTP_BASE}/api/openapi.json
  (document that describes bet-agg /api/bet/* and any co-located public API)

user_agg_openapi_url:
  {APP_HTTP_BASE}/api/openapi.json
  (document that describes user-agg /api/user-agg/*; may be the same file as
   bet_agg_openapi_url when the gateway publishes a merged spec)

## 2. AUTH_RULES
public_endpoints:
  No X-User-Access-Token header required for these delphi (bet-agg or user-agg) routes (see INDEX).

authenticated_endpoints:
  Required header on every request to the listed delphi routes:
    X-User-Access-Token: <access_token>
  Rules:
    - Value is the raw JWT string from delphi login/refresh response.
    - Do NOT prefix with "Bearer " (Authorization: Bearer is reserved for other
      purposes in this stack).

user_agg_auth:
  Follow user_agg_openapi.json for register/login request bodies and token
  fields in responses.

## 3. ENDPOINT_INDEX (id | method | path | upstream | auth)
# path is application-layer (prefix /api). upstream labels routing intent.
# auth: public | user_jwt  (user_jwt => X-User-Access-Token on delphi)

E01 | GET    | /api/bet/games                      | bet-agg | public
E02 | GET    | /api/bet/games/{game_id}            | bet-agg | public
E03 | GET    | /api/bet/markets                    | bet-agg | public
E04 | GET    | /api/bet/markets/{market_id}        | bet-agg | public
E05 | POST   | /api/user-agg/register              | user-agg | public
E06 | POST   | /api/user-agg/login                 | user-agg | user_jwt
E07 | PUT    | /api/user-agg/login                 | user-agg | user_jwt
E08 | POST   | /api/bet/snowflake                  | bet-agg | user_jwt
E09 | POST   | /api/bet/place                      | bet-agg | user_jwt
E10 | GET    | /api/bet/orders                     | bet-agg | user_jwt
E11 | GET    | /api/bet/orders/{order_id}          | bet-agg | user_jwt
E12 | GET    | /api/bet/points                     | bet-agg | user_jwt
E13 | GET    | /api/bet/leaderboard                | bet-agg | public

# Note E11: path template uses {order_id} for agent readability; delphi OpenAPI
# may name the path parameter `id`—use the integer order primary key.

# Note E13: bet-agg route name is `leaderboard` (reputation ranking). If the
# application gateway exposes an alias such as /api/bet/dashboard, treat it as
# deployment-specific; resolve the canonical path from bet_agg_openapi_url.

## 4. HARD_ORDER_RULES (must obey)
R1. E08 before E09: call POST /api/bet/snowflake first; use returned snowflake
    id as header X-Request-Id on POST /api/bet/place (exact header name and body
    fields: bet_agg_openapi.json and BetPlaceController contract).
R2. E06 or E07 must succeed before any user-agg user_jwt call (E08–E12) so the
    agent holds a valid access_token.
R3. E07 (refresh): use on expiry or per product policy (e.g. at most once per
    day); after refresh, use the new access_token for X-User-Access-Token.

## 5. SCENARIOS (linear steps; pick one track)

SCENARIO_S1_READ_ONLY_CATALOG
  Goal: list/browse games and markets without acting as a logged-in user.
  Steps:
    1. E01 optional; E02 optional; E03 optional; E04 optional (any subset, any order).

SCENARIO_S2_READ_REPUTATION_PUBLIC
  Goal: leaderboard without user token.
  Steps:
    1. E13

SCENARIO_S3_FULL_SESSION_PLACE_ORDER
  Goal: register or log in, mint idempotency key, place prediction.
  Steps:
    1. If new user: E05. If existing user: skip E05.
    2. E06 (login) unless the session already has a valid token.
    3. When token near expiry: E07 instead of E06 where appropriate.
    4. E08 with X-User-Access-Token set.
    5. E09 with X-User-Access-Token and X-Request-Id from step 4 response.

SCENARIO_S4_HISTORY_AND_POINTS
  Goal: orders and personal reputation balance (requires login).
  Preconditions: valid access_token from E06/E07.
  Steps:
    1. E10 optional; E11 optional; E12 optional (E10/E11 order: list then detail).

## 6. COMPOSITION_HINTS
- Typical discovery path: E01/E03 -> E02/E04 before SCENARIO_S3 when the agent
  must show the user choices.
- After SCENARIO_S3, use SCENARIO_S4 to confirm placement or show history.

## 7. ERROR_HANDLING_HINT (non-normative)
- 401 on delphi user_jwt routes: obtain or refresh token (E06/E07) then retry.
- Idempotency: never reuse the same X-Request-Id for two different place
  payloads; mint a new E08 when starting a new place attempt per R1.

## A. Reference
user-agg API documentation: GET /api/user-agg/openapi
bet-agg API documentation: GET /api/bet/openapi
