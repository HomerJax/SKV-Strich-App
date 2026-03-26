#!/usr/bin/env bash
set -euo pipefail

set -a
source .env.local
set +a

PASSWORD="${BULK_TEMP_PASSWORD:-Strikr2026!}"

user_ids=(
  "8288bc7c-5bbb-4a00-be4a-f701bc1cb739"
  "2c21f861-0c16-42f1-aed8-3244e042fa1a"
  "b981547c-74d1-4dd7-bd96-897760a13714"
  "634ea5d8-e73c-48e4-9a77-d822cc055e32"
  "d2ae94db-1973-484f-ab0b-03b8cec74c3b"
  "a6c23f29-9410-454e-8c6c-d086c8a207bc"
  "2b3df53d-32c0-434a-8583-61db8c222a3a"
  "b3c11862-4b2f-488f-8fd6-92d5decebb2a"
  "4903c19c-4de5-4400-90f3-01f5900e723c"
  "187fdcc9-70df-4338-82c2-bdc0a88b9df3"
  "3f09f680-e70d-422d-b7df-fa4d3d8cf201"
  "8c8e1057-cf13-4080-b281-048876574cf4"
  "bdf23820-bba4-4fc5-aab3-a23710741c7c"
  "60a68ac0-c372-470e-b4c0-819c9e7457a5"
  "a8968c7a-117b-4fcb-b5a2-b33c4148156b"
  "4ebce5d0-c01e-421a-b18b-e8ff596d4261"
  "8147a78f-31c3-4049-aca0-6b7abf48c94e"
  "49309b17-ffc3-4b71-b0ab-ec710c2aa3a4"
  "ef405eef-e6f3-4180-a766-65ee565244e6"
  "2e5a54c3-6e8e-41ab-872d-865db79646ad"
  "9b88a2ce-c81d-42d8-9261-3f62076644a5"
  "755b5447-051a-4834-8705-ac35aa64b327"
  "2ccb8d80-de2c-4acc-8378-bf4087892065"
  "d43dd2c8-646c-4ef1-b202-41f0f741dd2a"
  "f1354dd6-f2b0-47ba-8e8a-732cd543e789"
  "be381bf2-0b42-4753-826a-9b342bd053a6"
  "3629b404-30d9-4832-b6da-73938896d075"
  "98c2c62f-8bc9-43ab-8de1-fa7bb48baf33"
  "f7a701a3-58d4-48fe-b368-17ea12996f13"
  "a80fffad-7d82-4b66-b552-88a6a26c17a9"
  "f4923fb0-15f0-4965-bc3b-8d4123af56f6"
  "8d25d17c-cbfc-4c69-b904-965495f53a5a"
  "cd9368eb-165a-4391-b7b9-f89db66b62f0"
  "19d16e6d-7da9-4277-8a17-d4fe6cfe7eec"
  "3da04b8e-a3cf-4fc2-bd63-234b127cbcbf"
  "41a59774-de6d-4549-9dff-d0858f7511ae"
  "dff59657-e45a-46c5-b1ad-17ea12996f13"
  "add040e1-1eda-4e12-b84b-b4915dcf5b4c"
  "116e3a98-f6e9-45aa-bbe2-055b5bcea7ae"
  "3620d0ef-c73d-4f24-a638-3016e9b90877"
  "0a769bad-2b7c-46f7-9603-5683ec4b0773"
  "e089b66a-e26f-4fe8-9659-627949f1bfe2"
  "b0ad6b05-7a0f-43a9-b0aa-705207b6a7aa"
  "59d9deb5-94c9-4cad-af87-062a3b490487"
  "a7646094-9c81-49b8-9b97-2591a65c160e"
)

ok=0
fail=0

for user_id in "${user_ids[@]}"; do
  status=$(
    curl -sS -o /tmp/strikr_pw_resp.json -w "%{http_code}" \
      -X PUT \
      "${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${user_id}" \
      -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" \
      --data "{\"password\":\"${PASSWORD}\",\"email_confirm\":true}"
  )

  if [[ "$status" == "200" ]]; then
    echo "✅ OK: ${user_id}"
    ok=$((ok+1))
  else
    echo "❌ FEHLER: ${user_id} (HTTP ${status})"
    cat /tmp/strikr_pw_resp.json
    echo
    fail=$((fail+1))
  fi
done

echo "Fertig. OK=${ok}, FEHLER=${fail}"
