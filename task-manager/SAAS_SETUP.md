# TaskFlow SaaS Setup

## Phase 1: Auth + Multi-tenant ✅

### Để chạy LOCAL (không cần Clerk key)

**Backend** — thêm `AUTH_DISABLED=true` vào env khi start:
```powershell
$env:AUTH_DISABLED = "true"
$env:DATABASE_URL = "postgresql://..."   # Render URL của bạn
$env:AI_PLATFORM_API_KEY = "..."
uvicorn main:app --reload --port 8000
```

**Frontend** — edit `.env.local`:
```
VITE_AUTH_DISABLED=true
VITE_CLERK_PUBLISHABLE_KEY=pk_test_REPLACE_WITH_YOUR_KEY
```
Rồi `npm run dev`

---

### Để bật Clerk Auth (production)

**Bước 1 — Tạo Clerk app**
1. Vào https://dashboard.clerk.com → Sign up
2. Create Application → đặt tên "TaskFlow"
3. Bật Google + GitHub sign-in
4. Vào **API Keys** → copy:
   - Publishable key: `pk_live_...`
   - Secret key: `sk_live_...` (chỉ dùng ở backend, không commit vào git)

**Bước 2 — Cập nhật env**

Frontend `.env.local`:
```
VITE_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE
VITE_AUTH_DISABLED=false
```

Backend (khi start):
```powershell
$env:AUTH_DISABLED = "false"
$env:CLERK_PUBLISHABLE_KEY = "pk_live_YOUR_KEY_HERE"
```

**Bước 3 — Cấu hình Clerk dashboard**
- Allowed origins: thêm domain của app (http://localhost:5173 để dev, sau đó thêm domain production)
- JWT templates: giữ default (RS256)

---

### Architecture đã implement

```
organizations
  id, name, slug, owner_clerk_user_id, created_at

org_members
  id, org_id, clerk_user_id, role (owner|admin|member), created_at

tasks / meeting_notes / comments
  → thêm org_id (nullable để backward-compatible với data cũ)
```

**Auth flow:**
1. User login qua Clerk (Google/GitHub/email)
2. Clerk issue JWT (RS256)
3. Frontend đính token vào mọi API request: `Authorization: Bearer <token>`
4. Backend verify JWT qua Clerk JWKS, extract `sub` (clerk_user_id)
5. Backend auto-create org + member nếu user lần đầu login
6. Mọi query đều filter theo `org_id`

**Data isolation:**
- Data cũ (org_id = NULL) hiển thị cho tất cả users (backward-compatible)
- Data mới luôn có org_id
- Khi user PATCH/DELETE data cũ → tự động gán org_id

---

### Next steps (Phase 2)

- [ ] Team invite: `POST /org/members` với clerk_user_id của teammate
- [ ] Workspace rename: User Menu → click tên workspace → edit inline ✅
- [ ] Stripe billing integration
- [ ] Landing page
- [ ] Deploy: Render (backend) + Vercel (frontend)
