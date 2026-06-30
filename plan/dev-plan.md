# Plan: Agent Management MVP

Mục tiêu là làm nhanh một bản MVP end-to-end cho feature Agent Management, ưu tiên phần core để có thể chạy được sớm trên cả backend lẫn frontend. Những phần không ảnh hưởng trực tiếp đến luồng chính sẽ để sau.

## Core scope

- Danh sách agent
- Xem chi tiết agent
- Tạo agent
- Cập nhật agent
- Xóa agent
- Shared types giữa backend và frontend
- Validation tối thiểu
- Kết nối UI với API thật

## Có thể skip tạm

Nếu thời gian không đủ, bỏ qua trước:

- Pagination
- Search/filter nâng cao
- Bulk actions
- Audit/history
- Realtime update
- Notification
- Analytics/dashboard
- Auth/role phức tạp nếu chưa bắt buộc cho demo MVP

## Checklist theo thứ tự

### 1. Chốt contract

- [ ] Xác định các field tối thiểu của Agent
- [ ] Chốt các trạng thái agent cần có
- [ ] Chốt request/response shape cho CRUD
- [ ] Dùng chung type cho cả be và fe để tránh lệch dữ liệu

### 2. Backend core

- [ ] Tạo route cho Agent Management
- [ ] Tách logic xử lý ra service/repository nếu cần
- [ ] Làm các API CRUD cơ bản
- [ ] Thêm validation cho input
- [ ] Chuẩn hóa error response

### 3. Frontend core

- [ ] Làm màn hình danh sách agent
- [ ] Làm form tạo/sửa agent
- [ ] Làm màn hình hoặc panel xem chi tiết agent
- [ ] Kết nối API thật
- [ ] Xử lý loading, empty state, error state

### 4. Ghép end-to-end

- [ ] Test flow create/update/delete từ UI
- [ ] Kiểm tra dữ liệu hiển thị đúng giữa list và detail
- [ ] Sửa các mismatch giữa contract và UI
- [ ] Dọn phần code để team khác merge sau này dễ hơn

## Ưu tiên khi thiếu thời gian

1. Shared types + API contract
2. Backend CRUD chạy được
3. Frontend list + create/edit
4. Detail view
5. Delete
6. Các phần mở rộng sau

Nói ngắn gọn: nếu kẹt thì giữ được luồng tạo/sửa/xem danh sách trước, còn các tính năng nâng cao làm sau.

## Kết quả mong muốn sau MVP

- Có API CRUD chạy được
- Có UI thao tác cơ bản
- Dùng chung type giữa be và fe
- Có thể tích hợp với phần còn lại của team mà không vỡ contract