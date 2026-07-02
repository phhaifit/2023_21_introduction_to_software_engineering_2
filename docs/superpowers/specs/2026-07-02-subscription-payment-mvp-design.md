# Subscription & Payment MVP Design

## Mục tiêu

Triển khai Feature 7 trong monorepo hiện tại dưới dạng MVP chạy local end-to-end. MVP bao phủ xem gói, mua mới, gia hạn, nâng cấp, hủy giao dịch, xử lý kết quả thanh toán, kích hoạt subscription, mock workspace provisioning và trang quản trị subscription.

MVP dùng local identity, mock payment gateway và mock workspace provisioner. Các mock được cô lập sau interface để khi Authentication, VietQR và Workspace API sẵn sàng, nhóm có thể thay adapter mà không sửa business rules.

## Tính tương thích với codebase

Thiết kế bám các conventions hiện có:

- Backend tiếp tục dùng module hàm trong `controllers`, `services`, `repositories`; không đưa class framework mới vào.
- Repository dùng Knex và PostgreSQL như Agent Management.
- API contracts nằm trong `packages/shared`.
- Frontend đặt trong `apps/frontend/src/features/subscription`.
- Routes được mount trong `apps/backend/src/app.ts` và frontend router hiện tại.
- Local identity dùng cùng `DEFAULT_WORKSPACE_ID` đang được Agent Management sử dụng.
- Error response giữ dạng JSON và đi qua Express error middleware.

## Phạm vi

### Có trong MVP

- Seed hai Plan Standard và Premium.
- Transaction type `NEW`, `RENEW`, `UPGRADE`.
- Transaction status `PENDING`, `COMPLETED`, `FAILED`, `CANCELLED`.
- Subscription status `ACTIVE`, `EXPIRED`, `CANCELLED`.
- Workspace status `NOT_PROVISIONED`, `PROVISIONING`, `ACTIVE`, `PROVISIONING_FAILED`.
- Pricing, checkout, payment result, subscription status và admin subscription list.
- Mock payment completion/failure/cancel endpoints chỉ bật ở local mode.
- Renewal formula `max(now, currentEndDate) + 30 ngày`.
- Idempotent payment fulfillment.
- Mock provisioning success/failure.
- Unit/service tests và HTTP integration tests.

### Không có trong MVP

- Authentication thật, password/JWT/session.
- VietQR network calls và production webhook signature contract.
- Container/OpenClaw provisioning thật.
- Annual billing, downgrade, refund, invoice và email.

## Kiến trúc

```text
React feature
  -> typed API client
  -> Express routes/controllers
  -> services
  -> repositories (Knex/PostgreSQL)
  -> mock payment/workspace adapters
```

### Local identity

Middleware `localIdentity` gắn vào request:

- `userId`: `DEFAULT_USER_ID`, mặc định `local-user`.
- `workspaceId`: `DEFAULT_WORKSPACE_ID`, mặc định `default-workspace`.
- `role`: `DEFAULT_USER_ROLE`, mặc định `admin` để demo cả user/admin flow.

Identity chỉ là development seam. Controllers lấy identity từ request thay vì hard-code user ID, nên Authentication thật có thể thay middleware sau này.

### Shared contracts

`packages/shared` xuất:

- Entity/response types: `Plan`, `Subscription`, `PaymentTransaction`.
- Enum unions cho status/type.
- Checkout input/output.
- Payment status response.
- Admin subscription query/response.
- Stable error codes dùng giữa frontend và backend.

## Data model

### plans

- `id`, `name`, `monthly_price`
- `cpu`, `ram_gb`, `storage_gb`, `max_agents`
- `support_level`, `active`
- timestamps

Tên Plan unique. Migration seed Standard `199000` và Premium `299000`.

### subscriptions

- `id`, `user_id`, `workspace_id`, `plan_id`
- `status`, `start_date`, `end_date`
- `workspace_status`
- timestamps

Partial unique index bảo đảm mỗi user chỉ có tối đa một subscription `ACTIVE`.

### payment_transactions

- `id`, `user_id`, `workspace_id`
- nullable `subscription_id`
- `plan_id`, `type`, `amount`, `status`
- `gateway_transaction_id`, `payment_url`
- `fulfillment_completed_at`
- timestamps

Gateway transaction ID unique. Fulfillment timestamp ngăn gia hạn/kích hoạt hai lần.

## Backend API

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | `/api/plans` | Danh sách Plan đang hoạt động |
| GET | `/api/subscriptions/me` | Subscription hiện tại |
| POST | `/api/payments/checkout` | Tạo hoặc tái sử dụng Transaction `PENDING` |
| GET | `/api/payments/:id` | Trạng thái giao dịch thuộc user |
| POST | `/api/payments/:id/cancel` | Hủy `PENDING` Transaction |
| POST | `/api/mock-payments/:id/complete` | Mock payment success |
| POST | `/api/mock-payments/:id/fail` | Mock payment failure |
| POST | `/api/mock-payments/:id/provisioning-failure` | Success payment, failed workspace |
| GET | `/api/admin/subscriptions` | Danh sách phân trang/filter |

Mock endpoints trả `404` khi `PAYMENT_PROVIDER` khác `mock` hoặc `NODE_ENV=production`.

## Business flow

### Checkout

1. Controller validate `planId` và requested action.
2. Service tải Plan từ database; amount không lấy từ client.
3. Service xác định `NEW`, `RENEW` hoặc `UPGRADE` dựa trên subscription hiện tại.
4. Pending duplicate gần nhất được tái sử dụng.
5. Nếu không có duplicate, tạo Transaction `PENDING`.
6. Mock gateway tạo URL `/subscription/mock-payment/:transactionId`.

### Complete payment

1. Mock endpoint gọi cùng payment-result service mà adapter thật sẽ dùng.
2. Repository transition có điều kiện từ `PENDING` sang `COMPLETED`.
3. Nếu transaction đã terminal, service trả trạng thái hiện tại mà không fulfillment lại.
4. `NEW`: tạo Subscription `ACTIVE`, end date = now + 30 ngày.
5. `RENEW`: end date = max(now, current end date) + 30 ngày.
6. `UPGRADE`: cập nhật plan và giữ end date hiện tại.
7. Mock provisioner:
   - `NEW` và `UPGRADE`: đặt `PROVISIONING`, sau đó `ACTIVE` hoặc `PROVISIONING_FAILED`.
   - `RENEW`: giữ workspace status, không provision lại.
8. Ghi `fulfillment_completed_at`.

### Cancel/fail

Chỉ Transaction `PENDING` được chuyển sang `CANCELLED` hoặc `FAILED`. Nếu payment completion thắng race, cancel/fail không thay đổi `COMPLETED`.

## Error handling

Service ném typed application errors gồm code, HTTP status và message. Error middleware map thành:

```json
{
  "error": {
    "code": "PLAN_NOT_FOUND",
    "message": "Plan not found"
  }
}
```

Các lỗi chính:

- `INVALID_INPUT`
- `PLAN_NOT_FOUND`
- `PLAN_NOT_ACTIVE`
- `SUBSCRIPTION_CONFLICT`
- `TRANSACTION_NOT_FOUND`
- `TRANSACTION_NOT_OWNED`
- `TRANSACTION_NOT_PENDING`
- `FORBIDDEN`

Database constraint violation được map thành business conflict thay vì trả raw database error.

## Frontend

Routes:

- `/app/subscription/plans`
- `/app/subscription/checkout/:planId`
- `/app/subscription/payments/:transactionId`
- `/app/subscription`
- `/app/admin/subscriptions`

UI dùng native fetch qua typed API client. Mỗi page có loading, empty, error và retry states. Mock payment page chỉ được đăng ký trong Vite development build, ghi rõ đây là developer tool, và cho phép giả lập success, failure, provisioning failure hoặc cancellation. Production build không đăng ký route này.

Khi workspace ở `PROVISIONING_FAILED`, trang payment result và subscription status phải nói rõ payment đã thành công, subscription vẫn active và workspace cần support/integration retry. Các use case yêu cầu retry dùng cùng idempotency key nhưng không yêu cầu endpoint retry cho user/admin trong MVP.

## Testing

Thêm Vitest và Supertest.

### Unit/service tests

- Checkout không tin amount từ client.
- Duplicate pending transaction được tái sử dụng.
- Renewal formula đúng khi active và expired.
- Fulfillment idempotent.
- Cancel/completion race giữ terminal state đầu tiên.
- Renewal không provision workspace.
- Provisioning failure giữ Subscription `ACTIVE`.

### HTTP integration tests

- Plan list.
- Checkout validation và ownership.
- Mock complete/fail/cancel.
- My subscription.
- Admin role enforcement.

### Frontend tests

MVP ưu tiên typecheck/build và API-client tests. Component test framework chỉ được thêm khi cần kiểm tra logic không thể giữ trong pure helpers.

## Migration và local run

1. `npm install`.
2. `docker compose up -d db`.
3. `npm run db:migrate --workspace @ai-agent-platform/backend`.
4. `npm run dev`.
5. Mở `/app/subscription/plans`.

## Khả năng thay adapter thật

- Authentication thật thay `localIdentity` nhưng giữ request identity contract.
- VietQR adapter implement cùng payment gateway interface và gọi payment-result service sau signature verification.
- Workspace adapter implement cùng provision/update interface.
- Không thay schema, use-case service hoặc frontend contract khi đổi adapter.

## Tiêu chí hoàn thành

- Migration chạy trên database sạch.
- Typecheck và build toàn workspace thành công.
- Backend tests pass.
- User hoàn thành được NEW, RENEW, UPGRADE, FAILED, CANCELLED và provisioning-failure flows local.
- Admin xem được danh sách subscription.
- Agent/Auth code hiện tại không bị thay đổi hành vi.
