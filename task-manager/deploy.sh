#!/usr/bin/env bash
# Deploy task-manager to AgentBase
# Usage: bash deploy.sh
# Requires: docker, docker login to nguyenngocgiathinh

set -e

IMAGE_REPO="nguyenngocgiathinh/greennode-task-manager"
CLIENT_ID="94ad5eca-8a8b-401c-b246-a66130975610"
CLIENT_SECRET="428e7273-f1ec-44dc-8a64-87018ec98c02"

# ── Set your task-manager runtime ID here ──
RUNTIME_ID="${TASK_MANAGER_RUNTIME_ID:-runtime-042f8586-02f1-4244-8740-91083a0f1afe}"

SHA=$(git -C "$(dirname "$0")/.." rev-parse HEAD)
IMAGE="${IMAGE_REPO}:${SHA}"
echo "Building image: $IMAGE"

# Build from task-manager directory
docker build -t "$IMAGE" "$(dirname "$0")"
docker push "$IMAGE"
echo "Pushed: $IMAGE"

# Get IAM token
PROXY_URL="http://103.196.239.110/api/proxy/token"
TOKEN=$(curl -s --max-time 10 -X POST "$PROXY_URL" \
  -H "Content-Type: application/json" \
  -H "X-Proxy-Secret: admin12345" \
  -d "{\"client_id\":\"${CLIENT_ID}\",\"client_secret\":\"${CLIENT_SECRET}\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "Proxy failed, trying IAM directly..."
  TOKEN=$(curl -s -X POST "https://iam.api.vngcloud.vn/accounts-api/v2/auth/token" \
    -u "${CLIENT_ID}:${CLIENT_SECRET}" \
    -d "grant_type=client_credentials" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")
fi

if [ -z "$TOKEN" ]; then
  echo "ERROR: Failed to get IAM token"
  exit 1
fi

DATABASE_URL="${DATABASE_URL:-postgresql://monitor_agent_user:qkUDHvjGnmrmuOnhSNSTV2Zj3RUAPSZU@dpg-d8sdesm7r5hc73fboca0-a.virginia-postgres.render.com/monitor_agent}"

PAYLOAD=$(python3 -c "
import json
body = {
  'imageUrl': '${IMAGE}',
  'flavorId': 'runtime-s2-general-2x4',
  'description': 'GreenNode Task Manager',
  'command': [],
  'args': [],
  'environmentVariables': {
    'DATABASE_URL': '${DATABASE_URL}',
  },
  'autoscaling': {'minReplicas': 1, 'maxReplicas': 1, 'cpuUtilization': 50, 'memoryUtilization': 50},
  'imageAuth': {'enabled': False}
}
print(json.dumps(body))
")

RESULT=$(curl -s -X PATCH "https://agentbase.api.vngcloud.vn/runtime/agent-runtimes/${RUNTIME_ID}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

STATUS=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','ERROR: '+d.get('message','unknown')))")
echo "Runtime status: $STATUS"

if [[ "$STATUS" == "ACTIVE" ]]; then
  echo "Deploy successful! SHA: $SHA"
else
  echo "Deploy may have issues. Full response:"
  echo "$RESULT"
fi
