# NHẬT KÝ LỊCH SỬ CÁC CÂU LỆNH (PROMPT HISTORY)
## DỰ ÁN: HỆ THỐNG QUẢN LÝ THIẾT BỊ VÀ ĐẶT PHÒNG STUDIO – LHU MEDIA STUDIO

> **Ghi chú vận hành:**
> - File này ghi nhận toàn bộ các câu lệnh / yêu cầu (prompts) từ người dùng theo trình tự thời gian.
> - Mỗi khi tiếp nhận một câu lệnh mới, hệ thống/AI sẽ ghi nhận câu lệnh đó vào file này để đảm bảo tính liên tục, minh bạch và có thể truy vết toàn bộ quá trình phát triển dự án từ ngày 09/11/2026 đến hết ngày 30/11/2026.

---

## CẤU TRÚC GHI NHẬT KÝ
Mỗi mục prompt bao gồm:
1. **STT & Thời gian tiếp nhận**
2. **Nội dung câu lệnh gốc (User Prompt)**
3. **Mục tiêu chính**
4. **Hành động & Kết quả thực hiện**
5. **Trạng thái (COMPLETED / IN PROGRESS / PENDING)**

---

## DANH SÁCH LỊCH SỬ CÁC CÂU PROMPT

### PROMPT #01
- **Thời gian tiếp nhận:** 09/11/2026 - Phiên làm việc khởi động
- **Nội dung câu lệnh:**
```markdown
# PROMPT KIỂM TRA MỨC ĐỘ ĐÁP ỨNG YÊU CẦU CHỨC NĂNG HỆ THỐNG

Bạn hãy đóng vai trò là Chuyên gia phân tích nghiệp vụ (BA) và Kiểm thử phần mềm (QA), tiến hành kiểm tra toàn bộ mã nguồn dự án hiện tại để đánh giá mức độ đáp ứng các yêu cầu chức năng của hệ thống quản lý Studio tại Trường Đại học Lạc Hồng.

1. Mục tiêu kiểm tra: Đối chiếu chức năng thực tế đã triển khai trong mã nguồn với 9 nhóm yêu cầu chức năng:
- FR-01: Quản lý thiết bị
- FR-02: Quản lý mượn – trả thiết bị
- FR-03: Quản lý phòng Studio
- FR-04: Quản lý công việc
- FR-05: Quản lý lịch trực và giờ công (20.000 đ/h, ca 4h, hệ số 1.5 sau 16:30 T2-T7, hệ số 2 Chủ nhật, không cộng dồn, xuất Excel...)
- FR-06: Quản lý tài khoản
- FR-07: Thông báo
- FR-08: Thống kê, báo cáo
- FR-09: Lịch sử thao tác
```
- **Mục tiêu:** Rà soát toàn bộ source code `TN-Backend` và `TN-Frontend`, đối chiếu GAP giữa mã nguồn hiện tại với 9 nhóm chức năng FR-01 đến FR-09.
- **Kết quả thực hiện:**
  - Hoàn thành báo cáo đánh giá hiện trạng chi tiết phân loại theo 4 trạng thái (`COMPLETED`, `PARTIAL`, `NOT_IMPLEMENTED`, `NEEDS_VERIFICATION`).
  - Phát hiện các GAP lớn: FR-04 (Công việc) và FR-05 (Lịch trực, tính lương) chưa triển khai; FR-06 thiếu role `COLLABORATOR` ở Backend; FR-01/02 thiếu biên bản bàn giao và phân định duyệt vs bàn giao; FR-03 thiếu buffer 30 phút và khung giờ cố định.
- **Trạng thái:** `COMPLETED`

---

### PROMPT #02
- **Thời gian tiếp nhận:** 09/11/2026 - Phiên làm việc lập kế hoạch
- **Nội dung câu lệnh:**
```markdown
# NHIỆM VỤ: ĐỌC TÀI LIỆU, ĐÁNH GIÁ HIỆN TRẠNG VÀ LẬP KẾ HOẠCH HOÀN THIỆN LHU MEDIA STUDIO

Bạn đang đóng vai trò Senior Software Engineer, System Analyst và Technical Project Manager, chịu trách nhiệm hỗ trợ hoàn thiện dự án tốt nghiệp: Hệ thống Quản lý Thiết bị và Đặt phòng Studio – LHU Media Studio.
Thời gian thực hiện kế hoạch: Từ ngày 09/11/2026 đến hết ngày 30/11/2026.

Yêu cầu:
- PHẦN 1: Đọc và nắm vững 4 tài liệu (SKILL.md, ARCHITECTURE.md, SYSTEM_FUNCTIONS.md, BUSINESS_RULES.md).
- PHẦN 2: Khảo sát toàn bộ source code hiện tại theo 4 trạng thái (COMPLETED, PARTIAL, NOT_IMPLEMENTED, NEEDS_VERIFICATION).
- PHẦN 3: Nguyên tắc bảo vệ chức năng đã hoàn thành (Tuyệt đối không sửa đổi, refactor, viết lại các phần đã chạy đúng).
- PHẦN 4: Lập kế hoạch triển khai chi tiết từng giai đoạn từ 09/11/2026 đến 30/11/2026.
```
- **Mục tiêu:** Đọc kỹ 4 tài liệu nghiệp vụ, xác lập quy tắc bất khả xâm phạm đối với các chức năng đã hoàn thiện, xây dựng lộ trình hoàn thiện hệ thống 5 giai đoạn khả thi.
- **Kết quả thực hiện:**
  - Đọc và phân tích đầy đủ 4 tài liệu chuẩn tại thư mục gốc: `LHU_Media_Studio_Skill.md`, `LHU_Media_Studio_Kien_Truc_He_Thong.md`, `LHU_Media_Studio_Chuc_Nang_He_Thong.md`, `LHU_Media_Studio_Quy_Tac_Nghiep_Vu.md`.
  - Cam kết 9 nguyên tắc bảo vệ các chức năng đã hoàn thành (`COMPLETED`).
  - Thiết lập lộ trình 5 giai đoạn (GĐ 1: Hoàn thiện nền tảng & sửa lỗi tồn đọng; GĐ 2: Quản lý công việc FR-04; GĐ 3: Lịch trực & Chấm công FR-05; GĐ 4: Thông báo, Thống kê, Bàn giao; GĐ 5: Kiểm thử toàn diện & Đóng gói).
- **Trạng thái:** `COMPLETED`

---

### PROMPT #03
- **Thời gian tiếp nhận:** 09/11/2026
- **Nội dung câu lệnh:**
```markdown
hãy tạo cho tôi 1 file kế hoạch triển khai tại dự án này, sau nãy mỗi khi làm sẽ phải đọc lại kế hoạch, skill, kiến trúc, quy tắc và chức năng để tránh làm sai hướng
```
- **Mục tiêu:** Tạo file kế hoạch dự án chính thức lưu trữ trực tiếp trong workspace để phục vụ tra cứu và kiểm soát quá trình lập trình xuyên suốt từ 09/11/2026 đến 30/11/2026.
- **Kết quả thực hiện:**
  - Tạo thành công file `KE_HOACH_TRIEN_KHAI.md` tại `c:\STUDY\1. TOT_NGHIEP\CODE\KE_HOACH_TRIEN_KHAI.md`.
  - Tạo bản sao đồng bộ tại `c:\STUDY\1. TOT_NGHIEP\LHU_Media_Studio_Ke_Hoach_Trien_Khai.md`.
  - Định nghĩa rõ quy trình kiểm tra 4 tài liệu trước mỗi task, checklist chi tiết từng task, nguyên tắc bất biến bảo vệ code đã chạy.
- **Trạng thái:** `COMPLETED`

---

### PROMPT #04
- **Thời gian tiếp nhận:** 09/11/2026
- **Nội dung câu lệnh:**
```markdown
THỰC HIỆN TASK 1.1
```
- **Mục tiêu:** Triển khai Task 1.1 trong Giai đoạn 1: Sửa lỗi enum role `COLLABORATOR` trong Backend (`User.js`, validation, routes và Swagger), đồng bộ hóa với Frontend `admin/users/page.tsx`.
- **Hành động & Kết quả thực hiện:**
  - `TN-Backend/src/models/User.js`: Tăng độ dài cột `role` lên `DataTypes.STRING(20)` (thay vì 10 ký tự gây lỗi khi lưu 'COLLABORATOR') và bổ sung `'COLLABORATOR'` vào Sequelize validator `isIn`.
  - `TN-Backend/src/routes/dashboard.routes.js`: Cập nhật route `PUT /api/dashboard/users/:id/role` chấp nhận role `'COLLABORATOR'`, trả về thông báo phản hồi chính xác.
  - `TN-Backend/src/routes/admin.routes.js` & `TN-Backend/src/controllers/auth.controller.js`: Cập nhật Swagger documentation mô tả đầy đủ 3 roles `[ADMIN, USER, COLLABORATOR]`.
  - `TN-Backend/src/services/borrowRequest.service.js` & `TN-Backend/src/services/studioBooking.service.js`: Cập nhật kiểm tra quyền RBAC (`currentUser.role !== 'ADMIN'`) để tài khoản CTV và Người dùng chỉ xem đơn/lịch của chính mình, Admin xem tất cả.
  - `TN-Backend/src/routes/reports.routes.js`: Bổ sung đếm số lượng Cộng tác viên (CTV) vào file Excel báo cáo tổng hợp.
  - `TN-Backend/test/unit.test.js`: Bổ sung 3 test cases cho quyền truy cập và kiểm tra tính hợp lệ của role `COLLABORATOR`. Bộ test chạy thành công 20/20 tests (100% pass).
- **Trạng thái:** `COMPLETED`

---

### PROMPT #05
- **Thời gian tiếp nhận:** 09/11/2026
- **Nội dung câu lệnh:**
```markdown
hãy tạo 1 file lưu lịch sử các câu promt
```
- **Mục tiêu:** Tạo file lưu trữ lịch sử các prompt (`PROMPT_HISTORY.md`) để theo dõi tất cả các chỉ thị, yêu cầu của người dùng từ đầu dự án đến hiện tại và các prompt tương lai.
- **Hành động & Kết quả thực hiện:**
  - Khởi tạo file `c:\STUDY\1. TOT_NGHIEP\CODE\PROMPT_HISTORY.md` và `c:\STUDY\1. TOT_NGHIEP\PROMPT_HISTORY.md`.
  - Tổng hợp đầy đủ 5 prompt từ đầu phiên làm việc đến nay kèm mục tiêu, chi tiết thực hiện và trạng thái.
- **Trạng thái:** `COMPLETED`

---

### PROMPT #06
- **Thời gian tiếp nhận:** 09/11/2026 - 12:08
- **Nội dung câu lệnh:**
```markdown
THỰC HIỆN TASK 1.2 (Tích hợp nút Khóa/Mở khóa tài khoản trên Frontend kết nối API PATCH /admin/users/:id/toggle-active).
```
- **Mục tiêu:** Tích hợp nút Khóa/Mở khóa tài khoản người dùng trên giao diện Admin (`TN-Frontend/src/app/admin/users/page.tsx`), gọi API `PATCH /api/admin/users/:id/toggle-active` (FR-06.4).
- **Hành động & Kết quả thực hiện:**
  - `TN-Backend/src/routes/admin.routes.js`: Bổ sung điều kiện chặn Admin tự khóa tài khoản của chính mình (`req.params.id === req.user.id` trả về 400), sửa Swagger docs schema `id` kiểu `string` (UUID).
  - `TN-Frontend/src/app/admin/users/page.tsx`:
    * Mở rộng `interface User` thêm trường `isActive?: boolean`.
    * Xây dựng hàm `handleToggleActive` kết nối `api.patch('/admin/users/${targetUserId}/toggle-active', {})` kèm thông báo toast thành công/thất bại và reload dữ liệu.
    * Thêm cột "Trạng thái" trong bảng hiển thị badge "Hoạt động" (xanh lá) hoặc "Đã khóa" (đỏ).
    * Thêm nút chuyển đổi Khóa (`<Lock>`) / Mở khóa (`<Unlock>`) trong cột hành động, tự động vô hiệu hóa nếu là tài khoản của chính Admin đang đăng nhập.
  - Kiểm tra TypeScript (`tsc --noEmit`): 0 lỗi.
  - Kiểm tra bộ Unit Test Backend (`npm test`): 20/20 test cases vượt qua (100% pass).
- **Trạng thái:** `COMPLETED`

---

### PROMPT #07
- **Thời gian tiếp nhận:** 09/11/2026 - 12:15
- **Nội dung câu lệnh:**
```markdown
THỰC HIỆN TASK 1.3 (Khắc phục lỗi duyệt đè lịch Studio trong studioBooking.service.js, ràng buộc khung giờ 07:30–11:30 & 13:30–16:30 T2–T7 và buffer 30 phút giữa 2 ca đặt).
```
- **Mục tiêu:** 
  1. Khắc phục lỗi duyệt đè lịch Studio trong `studioBooking.service.js` khi Admin bấm duyệt (kiểm tra lại xung đột lúc duyệt theo FR-03.5 & Quy tắc nghiệp vụ Mục 4).
  2. Ràng buộc khung giờ hoạt động: Thứ Hai đến Thứ Bảy, Ca sáng (07:30–11:30), Ca chiều (13:30–16:30), Chủ nhật Studio đóng cửa.
  3. Bổ sung quy tắc khoảng đệm tối thiểu 30 phút (buffer) giữa 2 ca đặt phòng Studio.
- **Hành động & Kết quả thực hiện:**
  - `TN-Backend/src/services/studioBooking.service.js`:
    * Xây dựng `validateOperatingHours`: Ràng buộc giờ hành chính T2–T7, sáng 07:30–11:30, chiều 13:30–16:30, chặn Chủ nhật và đặt xuyên trưa/ngoài giờ.
    * Xây dựng `checkStudioConflict`: Thuật toán kiểm tra xung đột trùng lịch và khoảng đệm 30 phút (`[start - 30m, end + 30m]`).
    * Cập nhật `create`: Chặn tạo đơn nếu vi phạm giờ mở cửa hoặc vi phạm khoảng đệm 30 phút với lịch đã duyệt.
    * Cập nhật `processBooking`: Kiểm tra lại xung đột tại thời điểm Admin duyệt; trả về `{ status: 'warning' }` nếu trùng/vi phạm buffer khi chưa có cờ `force`, cho phép duyệt đè có kiểm soát (sự kiện cấp trường) khi `force: true`.
  - `TN-Backend/src/controllers/studioBooking.controller.js` & `routes`: Tích hợp cờ `force`, `adminNote` và cảnh báo xung đột đồng bộ với Frontend.
  - `TN-Frontend/src/app/studio/page.tsx`: Tích hợp kiểm tra giờ hoạt động, ngày nghỉ Chủ nhật và khoảng đệm 30 phút ngay trên giao diện đặt phòng.
  - `TN-Backend/test/unit.test.js`: Bổ sung 6 test cases cho giờ hoạt động và khoảng đệm 30 phút (tổng cộng 26/26 tests backend pass 100%).
  - Kiểm tra Frontend TypeScript compilation (`tsc --noEmit`): 0 lỗi.
- **Trạng thái:** `COMPLETED`

---

### PROMPT #08
- **Thời gian tiếp nhận:** 09/11/2026 - 12:33
- **Nội dung câu lệnh:**
```markdown
# NHIỆM VỤ: KIỂM TRA VÀ KHẮC PHỤC LỖI ROLE COLLABORATOR – TASK 1.1

Tôi đã triển khai xong Task 1.1 trong file KE_HOACH_TRIEN_KHAI.md, nhưng khi thực hiện thao tác liên quan đến vai trò CTV (COLLABORATOR), hệ thống phát sinh lỗi SQL Server:
String or binary data would be truncated in table 'TN_Database.dbo.Users', column 'role'. Truncated value: 'COLLABORAT'.
```
- **Mục tiêu:** Kiểm tra và khắc phục triệt để lỗi độ dài cột `Users.role` trong database SQL Server `TN_Database`, đảm bảo tương thích 100% với Model Sequelize và kiểm thử 10 test case bắt buộc.
- **Hành động & Kết quả thực hiện:**
  - Khảo sát trực tiếp schema SQL Server qua `INFORMATION_SCHEMA.COLUMNS`: Cột `Users.role` đang là `NVARCHAR(10)` (chỉ chứa được 10 ký tự, trong khi `'COLLABORATOR'` dài 12 ký tự dẫn đến lỗi cắt chuỗi `'COLLABORAT'`).
  - Thực thi câu lệnh migration an toàn trong transaction: `ALTER TABLE [dbo].[Users] ALTER COLUMN [role] NVARCHAR(20) NOT NULL;`.
  - Lưu trữ file migration SQL tại `TN-Backend/scripts/fix_role_column.sql`.
  - Thực hiện kiểm thử toàn diện 10 test case bắt buộc: Đạt 10/10 PASS (100%).
  - Chạy lại toàn bộ bộ kiểm thử Backend (`npm test`): 26/26 tests PASS (100%).
  - Kiểm tra Frontend TypeScript build (`tsc --noEmit`): 0 lỗi.
  - Cập nhật ghi chú nguyên nhân và giải pháp vào [KE_HOACH_TRIEN_KHAI.md](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/KE_HOACH_TRIEN_KHAI.md).
- **Trạng thái:** `COMPLETED`

---

### PROMPT #09
- **Thời gian tiếp nhận:** 09/11/2026 - 14:17
- **Nội dung câu lệnh:**
```markdown
THỰC HIỆN TASK 1.4 (Bổ sung trạng thái Bàn giao HANDED_OVER, nút "Bàn giao thiết bị" trên Admin Requests, ghi nhận tình trạng máy lúc giao/nhận, trạng thái Quá hạn OVERDUE).
```
- **Mục tiêu:** Hoàn thiện quy trình mượn - trả thiết bị theo FR-02.4 & FR-02.5 và Quy tắc nghiệp vụ Mục 3: Thêm trạng thái `HANDED_OVER`, nút "Bàn giao thiết bị", ghi nhận biên bản tình trạng máy lúc giao và nhận lại, tự động quét phát hiện đơn quá hạn `OVERDUE`.
- **Hành động & Kết quả thực hiện:**
  - **Cơ sở dữ liệu SQL Server:**
    - Viết và chạy script migration: `TN-Backend/scripts/add_handover_columns.sql`.
    - Thêm thành công 4 cột: `handed_over_at` (datetimeoffset), `handover_condition` (nvarchar(MAX)), `return_condition` (nvarchar(MAX)), `admin_note` (nvarchar(MAX)).
  - **Backend Model & Service:**
    - Cập nhật [BorrowRequest.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/models/BorrowRequest.js) bổ sung 4 trường mới và mở rộng validator `status`: `['PENDING', 'APPROVED', 'HANDED_OVER', 'OVERDUE', 'REJECTED', 'RETURNED']`.
    - Nâng cấp [borrowRequest.service.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/services/borrowRequest.service.js):
      * Thêm logic tự động quét và cập nhật trạng thái `OVERDUE` khi `findAll` cho các đơn `HANDED_OVER` có `returnDate < NOW`.
      * Thêm hàm `handoverEquipment(requestId, currentUserId, currentUserRole, handoverData)` chuyển trạng thái `APPROVED` -> `HANDED_OVER`, ghi nhận biên bản giao máy. Cập nhật thiết bị sang `BORROWED` nếu `availableQuantity === 0`.
      * Nâng cấp hàm `returnEquipment(requestId, currentUserId, currentUserRole, returnData)` hỗ trợ hoàn trả từ `HANDED_OVER`, `OVERDUE` và `APPROVED`. Tự động cập nhật thiết bị sang trạng thái `MAINTENANCE` (Bảo trì) nếu phát hiện hư hại (`isDamaged = true`) theo Quy tắc nghiệp vụ Mục 3.9 & 3.10.
  - **Backend Controller & Routes:**
    - Cập nhật [borrowRequest.controller.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/controllers/borrowRequest.controller.js), [borrowRequest.routes.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/routes/borrowRequest.routes.js), và [compat.routes.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/routes/compat.routes.js) với các endpoint `PUT/PATCH /:id/handover` và nâng cấp endpoint `PUT/PATCH /:id/return` tiếp nhận dữ liệu biên bản.
  - **Frontend:**
    - [admin/requests/page.tsx](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/app/admin/requests/page.tsx):
      * Nút "Bàn giao" khi đơn ở trạng thái `APPROVED` mở Handover Dialog nhập biên bản bàn giao máy.
      * Nút "Nhận trả" khi đơn ở trạng thái `HANDED_OVER` hoặc `OVERDUE` mở Return Dialog nhập biên bản kiểm tra máy và checkbox báo hỏng (chuyển sang bảo trì).
      * Badge trạng thái: `HANDED_OVER` (tím), `OVERDUE` (đỏ nhấp nháy animate-pulse).
      * Modal chi tiết hiển thị toàn bộ biên bản bàn giao và nhận trả.
    - [history/page.tsx](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/app/history/page.tsx):
      * Hiển thị badge trạng thái `HANDED_OVER` ("Đang mượn") và `OVERDUE` ("Quá hạn").
      * Hiển thị biên bản bàn giao, biên bản nhận trả và cảnh báo quá hạn hoàn trả màu đỏ.
  - **Kiểm thử & Đảm bảo chất lượng:**
    - Thêm Test Suite 7 vào [unit.test.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/test/unit.test.js): 34/34 Unit Tests PASS 100%.
    - Kiểm tra TypeScript Frontend (`tsc -p TN-Frontend/tsconfig.json --noEmit`): 0 lỗi.
    - Kiểm thử E2E tích hợp SQL Server: 6/6 test cases PASS 100%.
- **Trạng thái:** `COMPLETED`

---

### PROMPT #10
- **Thời gian tiếp nhận:** 09/11/2026 - 15:02
- **Nội dung câu lệnh:**
```markdown
Hãy kiểm tra và khắc phục lỗi khi tôi nhấn nút “Xác nhận bàn giao” trong chức năng Quản lý mượn – trả thiết bị.
Hiện tại, khi xác nhận bàn giao, hệ thống hiển thị thông báo: “Đã có lỗi xảy ra. Vui lòng thử lại.”
```
- **Mục tiêu:** Điều tra và xử lý triệt để lỗi khi bấm nút "Xác nhận bàn giao" trên giao diện Admin Requests. Kiểm tra luồng từ Frontend -> API -> Controller -> Service -> Model -> Database, xác định đúng nguyên nhân gốc, sửa chữa tối thiểu và kiểm thử toàn diện.
- **Hành động & Kết quả thực hiện:**
  - **Phân tích nguyên nhân gốc (Root Cause Analysis):**
    * Tiến trình Express Backend (`node src/server.js`, PID 27240) đang chạy liên tục từ lúc 14:15:31 (trước khi Task 1.4 được tích hợp các route bàn giao lúc 14:23).
    * Do backend Node.js chạy trực tiếp (không dùng nodemon / auto-reload), các route mới `PUT /api/borrow-requests/:id/handover` chưa được nạp vào bộ nhớ tiến trình đang chạy.
    * Khi người dùng bấm nút "Xác nhận bàn giao" trên giao diện, request gửi đến endpoint mới nhận về mã `404 Not Found` (HTML dạng `Cannot PUT /api/borrow-requests/.../handover`).
    * Frontend `ApiClient` (`handleResponse`) không parse được JSON và kích hoạt thông báo lỗi mặc định: *"Đã có lỗi xảy ra. Vui lòng thử lại."*.
  - **Biện pháp xử lý & Khắc phục:**
    * Dừng an toàn tiến trình Backend cũ (PID 27240) và khởi động lại Backend Express server với toàn bộ mã nguồn cập nhật mới nhất (đầy đủ các route `PUT/PATCH /:id/handover` và `PUT/PATCH /:id/return`).
    * Tái kiểm tra cấu hình Next.js proxy rewrite: các request từ trình duyệt gọi `/api/borrow-requests/...` qua cổng 3000 được chuyển tiếp trơn tru sang backend cổng 5000.
  - **Kiểm thử xác minh (Verification & Testing):**
    * Test gọi API trực tiếp với token Admin: Trả về HTTP 200 `{"message":"Bàn giao thiết bị thành công!","data":{...}}`. Đơn mượn chuyển `status: 'HANDED_OVER'`, ghi nhận `handedOverAt`, `handoverCondition`.
    * Test gọi API xuyên qua Next.js Proxy (Port 3000): Trả về HTTP 200, phản hồi thành công và dữ liệu cập nhật chuẩn xác.
    * Test chống trùng lặp / thao tác lặp lại: Thử gọi bàn giao lần 2 trên đơn đã `HANDED_OVER` -> Hệ thống chặn đúng chuẩn với HTTP 400 và thông báo: *"Chỉ có thể bàn giao thiết bị cho đơn đã được duyệt (APPROVED). Trạng thái hiện tại: 'HANDED_OVER'"*.
    * Kiểm thử hồi quy Backend (`npm test`): **34/34 Unit Tests PASS 100%** (7 suites).
- **Trạng thái:** `COMPLETED`

---

### PROMPT #11
- **Thời gian tiếp nhận:** 09/11/2026 - 15:13
- **Nội dung câu lệnh:**
```markdown
thực hiện task 1.5
```
- **Mục tiêu:** Thực hiện Task 1.5 trong Giai đoạn 1: Kiểm thử hồi quy toàn diện các chức năng liên quan thuộc FR-01 (Quản lý thiết bị), FR-02 (Mượn – trả thiết bị), FR-03 (Quản lý Studio), FR-06 (Tài khoản & Phân quyền), hoàn tất kiểm chứng Giai đoạn 1 trước khi chuyển sang Giai đoạn 2.
- **Hành động & Kết quả thực hiện:**
  - **Mở rộng bộ Unit Test Backend (`TN-Backend/test/unit.test.js`):**
    * Thêm Suite 8: *"Suite 8: Quản lý tài khoản & Bảo vệ phân quyền (FR-06)"*.
    * Kiểm thử chức năng khóa/mở khóa tài khoản người dùng (`toggle-active`), đảm bảo chỉ Admin mới có quyền thực hiện.
    * Kiểm thử cơ chế bảo vệ phân quyền: Chặn tuyệt đối hành vi Admin tự khóa tài khoản chính mình (`Cannot deactivate own account`).
    * Kiểm thử bảo mật đăng nhập: Tài khoản bị vô hiệu hóa (`isActive: false`) bị từ chối đăng nhập với thông báo lỗi rõ ràng.
    * Kết quả chạy Unit Test (`npm test`): **39/39 Unit Tests PASS 100%** (8/8 test suites).
  - **Kiểm thử tích hợp hồi quy E2E tự động trực tiếp trên SQL Server database (`regression_e2e_fr01_fr02_fr03_fr06.js`):**
    * Thiết kế kịch bản chạy xuyên suốt 26 test cases trên cơ sở dữ liệu thực tế `TN_Database`.
    * Bao quát toàn diện 4 nhóm chức năng cốt lõi:
      1. **FR-06 (Tài khoản & Phân quyền):** Kiểm tra 3 vai trò `ADMIN`, `COLLABORATOR`, `USER`; kiểm tra API khóa/mở khóa tài khoản và chặn tự khóa.
      2. **FR-01 (Quản lý thiết bị & Tồn kho):** Thêm mới danh mục, thiết bị, kiểm tra `availableQuantity` ban đầu và trạng thái `AVAILABLE`.
      3. **FR-02 (Quy trình mượn - trả, bàn giao, quá hạn & bảo trì):** Tạo đơn (`PENDING`) -> Duyệt đơn (`APPROVED`) -> Bàn giao (`HANDED_OVER` kèm biên bản) -> Quét quá hạn (`OVERDUE`) -> Trả máy (`RETURNED`) -> Trả máy hư hại chuyển bảo trì (`MAINTENANCE`).
      4. **FR-03 (Quản lý phòng Studio & Chống đè lịch):** Khung giờ hợp lệ T2–T7 (07:30–11:30 & 13:30–16:30); chặn đặt ngoài giờ; chặn đặt ngày Chủ nhật; kiểm tra buffer 30 phút giữa 2 ca đặt; tính năng cảnh báo chồng lấn khi cưỡng chế duyệt (`force = true`).
    * **Kết quả kiểm thử E2E: 26/26 Test Cases PASS 100%!**
  - **Chuẩn hóa quy tắc nghiệp vụ TC-02 trong `borrowRequest.service.js`:**
    * Phát hiện và khắc phục điểm không nhất quán: Khi phê duyệt (`approve`), hệ thống trước đây tự đổi trạng thái máy sang `BORROWED` nếu hết hàng khả dụng.
    * Đã chỉnh sửa đúng chuẩn TC-02: Khi phê duyệt chỉ trừ số lượng khả dụng (`availableQuantity`), thiết bị vẫn giữ nguyên trạng thái `AVAILABLE`. Thiết bị chỉ chuyển sang `BORROWED` khi có biên bản bàn giao thực tế (`handoverEquipment`).
  - **Kiểm tra chất lượng Frontend Next.js:**
    * Chạy kiểm tra tĩnh TypeScript (`tsc --noEmit`): **0 lỗi**.
    * Đảm bảo giao diện Admin Requests hiển thị đúng nút "Bàn giao" khi đơn `APPROVED`, nút "Nhận trả" khi đơn `HANDED_OVER` / `OVERDUE`.
  - **Cập nhật Kế hoạch triển khai:**
    * Đánh dấu hoàn thành Task 1.5 `[x]` trong `KE_HOACH_TRIEN_KHAI.md`.
    * Chính thức nghiệm thu và kết thúc **GIAI ĐOẠN 1 (09/11 – 12/11/2026)** với 100% yêu cầu đạt chuẩn.
- **Trạng thái:** `COMPLETED`

---


### PROMPT #12
- **Thời gian tiếp nhận:** 09/11/2026 - 15:28
- **Nội dung câu lệnh:**
```markdown
bước vào giai đoạn 2, thực hiện Task 2.1: Thiết kế Model Sequelize Task.js (Bảng Tasks trong SQL Server) với đầy đủ các trường: title, description, assignedToUserId, deadline, status (NOT_STARTED, IN_PROGRESS, PENDING_APPROVAL, REVISION_REQUESTED, COMPLETED), resultLink, proofFile, feedback, isExternal.
```
- **Mục tiêu:** Bước vào Giai đoạn 2 của dự án. Thiết kế và triển khai Model Sequelize `Task.js` (Bảng `Tasks` trong SQL Server) phục vụ phân hệ Quản lý công việc (FR-04) với đầy đủ các trường, quan hệ (associations) với bảng `Users`, validation nghiệp vụ và đồng bộ vào database thực tế.
- **Hành động & Kết quả thực hiện:**
  - **Thiết kế Model Sequelize `Task.js` (`TN-Backend/src/models/Task.js`):**
    * Định nghĩa đầy đủ các trường dữ liệu theo đúng đặc tả:
      + `id`: Khóa chính UUID v4 tự sinh.
      + `title`: NVARCHAR(255), bắt buộc, từ 3 đến 255 ký tự.
      + `description`: NVARCHAR(MAX), mô tả chi tiết nhiệm vụ.
      + `assignedToUserId`: UUID FK (`assigned_to_user_id`), trỏ tới bảng `Users(id)` (CTV được phân công).
      + `createdByUserId`: UUID FK (`created_by_user_id`), trỏ tới bảng `Users(id)` (Nhân sự giao việc hoặc CTV tự khai báo).
      + `deadline`: DATETIMEOFFSET, thời hạn hoàn thành.
      + `status`: NVARCHAR(30), mặc định `NOT_STARTED`, kiểm tra validator isIn: `['NOT_STARTED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'REVISION_REQUESTED', 'COMPLETED']`.
      + `resultLink`: NVARCHAR(MAX) (`result_link`), URL kết quả/sản phẩm (Drive, Figma, Youtube, v.v.).
      + `proofFile`: NVARCHAR(MAX) (`proof_file`), đường dẫn file minh chứng đính kèm.
      + `feedback`: NVARCHAR(MAX), đánh giá / yêu cầu chỉnh sửa từ Nhân sự.
      + `isExternal`: BIT (`is_external`), mặc định `false`, đánh dấu công việc phát sinh ngoài hệ thống do CTV tự khai báo.
      + `completedAt`: DATETIMEOFFSET (`completed_at`), thời điểm nghiệm thu hoàn thành (phục vụ FR-05 tính lương).
    * Bổ sung 5 index phục vụ tối ưu hóa truy vấn: `assigned_to_user_id`, `created_by_user_id`, `status`, `deadline`, `is_external`.
  - **Thiết lập quan hệ (Associations) trong `TN-Backend/src/models/index.js`:**
    * `User.hasMany(Task, { foreignKey: 'assigned_to_user_id', as: 'assignedTasks', onDelete: 'NO ACTION' })`
    * `Task.belongsTo(User, { foreignKey: 'assigned_to_user_id', as: 'assignee' })`
    * `User.hasMany(Task, { foreignKey: 'created_by_user_id', as: 'createdTasks', onDelete: 'NO ACTION' })`
    * `Task.belongsTo(User, { foreignKey: 'created_by_user_id', as: 'creator' })`
    * *Biện pháp an toàn:* Sử dụng `onDelete: 'NO ACTION'` để ngăn chặn lỗi chu trình hoặc nhiều đường dẫn xóa lan truyền (SQL Server Error 1785).
  - **Đồng bộ vào SQL Server `TN_Database`:**
    * Bảng `Tasks` được tạo thành công với 14 cột, 2 khóa ngoại hợp lệ liên kết đến bảng `Users`.
    * Đã kiểm thử thao tác CRUD mẫu (tạo nhiệm vụ, truy vấn kèm `include: ['assignee', 'creator']`, xóa dọn dẹp) thành công mỹ mãn.
  - **Bổ sung Unit Test Suite 9 (`TN-Backend/test/unit.test.js`):**
    * Thêm 7 test cases kiểm thử validation, vòng đời trạng thái công việc và quy tắc nghiệp vụ theo QUY_TAC.md Mục 5.
    * Tổng số Unit Test Backend tăng từ 39 lên **46/46 tests PASS 100%**.
  - **Cập nhật Kế hoạch triển khai:**
    * Đánh dấu hoàn thành Task 2.1 `[x]` trong `KE_HOACH_TRIEN_KHAI.md`.
- **Trạng thái:** `COMPLETED`

---


### PROMPT #13
- **Thời gian tiếp nhận:** 09/11/2026 - 16:00
- **Nội dung câu lệnh:**
```markdown
thực hiện task 2.2
```
- **Mục tiêu:** Thực hiện Task 2.2 trong Giai đoạn 2: Xây dựng tầng xử lý Backend bao gồm Service, Controller, Routes cho phân hệ Quản lý công việc (FR-04): Giao việc, cập nhật tiến độ, nộp bài, yêu cầu chỉnh sửa, nghiệm thu và khai báo việc ngoài hệ thống.
- **Hành động & Kết quả thực hiện:**
  - **Xây dựng `TN-Backend/src/services/task.service.js`:**
    * `createTask`: Admin giao việc cho CTV kèm kiểm tra tính hợp lệ của người nhận (role `COLLABORATOR`), hạn chót (deadline).
    * `createExternalTask`: CTV tự khai báo công việc phát sinh ngoài hệ thống kèm link sản phẩm hoặc file minh chứng (khởi tạo `PENDING_APPROVAL`, `isExternal: true`).
    * `findAll`: Phân quyền RBAC nghiêm ngặt (Admin xem tất cả; CTV chỉ xem việc được giao hoặc do mình khai báo; User bị chặn); hỗ trợ bộ lọc trạng thái, CTV, loại việc, tìm kiếm từ khóa và phân trang.
    * `findById`: Lấy chi tiết công việc kèm eager loading thông tin người nhận (`assignee`) và người giao (`creator`).
    * `updateProgress`: CTV bắt đầu làm (`IN_PROGRESS`), nộp sản phẩm/minh chứng (`PENDING_APPROVAL`); chặn nộp khi thiếu cả link lẫn minh chứng; chặn sửa việc đã hoàn thành.
    * `reviewTask`: Admin đánh giá nghiệm thu (`COMPLETED` kèm tự động ghi nhận thời điểm hoàn thành `completedAt`) hoặc yêu cầu chỉnh sửa (`REVISION_REQUESTED` bắt buộc kèm `feedback` giải thích).
    * `deleteTask`: Admin xóa task (chặn xóa task đã hoàn thành để bảo toàn lịch sử và dữ liệu tính lương).
    * `getStats`: Thống kê số lượng theo từng trạng thái phục vụ hiển thị Dashboard và bộ lọc giao diện.
  - **Xây dựng `TN-Backend/src/controllers/task.controller.js`:**
    * Chuẩn hóa API responses, xử lý linh hoạt các mã HTTP status 200, 201, 400, 403, 404, 500.
  - **Xây dựng `TN-Backend/src/routes/task.routes.js`:**
    * Khai báo toàn bộ các endpoints chuẩn RESTful có gắn middleware `authenticate` và `authorize('ADMIN')` / `authorize('COLLABORATOR', 'ADMIN')`.
  - **Đăng ký Route trong `TN-Backend/src/server.js`:**
    * Đăng ký tiền tố `app.use('/api/tasks', taskRoutes);`.
  - **Kiểm thử tích hợp E2E API thực tế (`test_task_api_flow.js`):**
    * 13/13 kịch bản gọi API qua HTTP thành công 100%:
      1. Chặn CTV giao việc trái quyền (403 Forbidden).
      2. Admin giao việc cho CTV (201 Created, `NOT_STARTED`).
      3. CTV truy vấn danh sách thấy nhiệm vụ được giao.
      4. API thống kê `/tasks/stats` hoạt động chuẩn xác.
      5. CTV cập nhật trạng thái `IN_PROGRESS`.
      6. Chặn nộp duyệt khi thiếu link và minh chứng (400 Bad Request).
      7. CTV nộp bài duyệt kèm link sản phẩm (`PENDING_APPROVAL`).
      8. Chặn Admin yêu cầu sửa khi thiếu feedback (400 Bad Request).
      9. Admin yêu cầu sửa kèm feedback (`REVISION_REQUESTED`).
      10. CTV sửa và nộp lại (`PENDING_APPROVAL`).
      11. Admin nghiệm thu hoàn thành (`COMPLETED`, ghi nhận `completedAt`).
      12. CTV khai báo công việc ngoài hệ thống (`isExternal: true`, `PENDING_APPROVAL`).
      13. Admin nghiệm thu công việc ngoài hệ thống (`COMPLETED`).
  - **Kiểm thử Hồi quy Unit Test Backend:**
    * 46/46 Unit Tests PASS 100% (9 suites).
  - **Cập nhật Kế hoạch triển khai:**
    * Đánh dấu hoàn thành Task 2.2 `[x]` trong `KE_HOACH_TRIEN_KHAI.md`.
- **Trạng thái:** `COMPLETED`

---


### PROMPT #14
- **Thời gian tiếp nhận:** 09/11/2026 - 16:22
- **Nội dung câu lệnh:**
```markdown
triển khai tast 2.3
```
- **Mục tiêu:** Thực hiện Task 2.3 trong Giai đoạn 2: Xây dựng toàn bộ giao diện Frontend cho phân hệ Quản lý công việc (FR-04): Trang Quản lý công việc Admin (`/admin/tasks`), Trang Nhiệm vụ của tôi cho CTV (`/tasks`), tích hợp các modals giao việc, nghiệm thu, nộp bài, khai báo việc ngoài hệ thống và bổ sung liên kết điều hướng trong Sidebar & Navbar.
- **Hành động & Kết quả thực hiện:**
  - **Xây dựng Trang Quản lý công việc Admin (`TN-Frontend/src/app/admin/tasks/page.tsx`):**
    * Thống kê số lượng tổng quan theo 6 thẻ trạng thái: Tổng nhiệm vụ, Chưa thực hiện, Đang thực hiện, Chờ nghiệm thu, Cần sửa, Đã hoàn thành.
    * Thanh tìm kiếm từ khóa và bộ lọc đa chiều: theo Trạng thái, theo CTV phụ trách, theo Loại việc nội bộ hoặc ngoài hệ thống.
    * Bảng danh sách công việc hiển thị chi tiết hạn chót deadline, cảnh báo đỏ khi quá hạn, link kết quả sản phẩm và minh chứng.
    * Modal "Giao nhiệm vụ mới cho CTV": Form nhập tiêu đề, mô tả, chọn CTV phụ trách từ danh sách và đặt hạn hoàn thành.
    * Modal "Nghiệm thu công việc": Xem xét link sản phẩm/minh chứng, 2 nút lựa chọn: Xác nhận nghiệm thu (`COMPLETED`) hoặc Yêu cầu chỉnh sửa (`REVISION_REQUESTED` bắt buộc kèm `feedback`).
    * Modal "Xem chi tiết nhiệm vụ" và Modal "Xác nhận xóa nhiệm vụ".
  - **Xây dựng Trang Nhiệm vụ của tôi cho CTV (`TN-Frontend/src/app/tasks/page.tsx`):**
    * Bảng điều khiển tiến độ công việc dành riêng cho CTV và Nhân sự.
    * Bộ lọc danh sách theo từng tab trạng thái trực quan.
    * Thẻ công việc chi tiết: Nút "Bắt đầu làm việc" (`IN_PROGRESS`), Nút "Nộp kết quả / Báo cáo hoàn thành" (`PENDING_APPROVAL`).
    * Hiển thị nổi bật cảnh báo phản hồi từ Quản trị viên khi công việc bị yêu cầu sửa đổi (`REVISION_REQUESTED`).
    * Modal "Nộp kết quả nhiệm vụ": Nhập link sản phẩm hoàn thành (Google Drive, Figma, Youtube) và file minh chứng đính kèm.
    * Modal "Khai báo công việc ngoài hệ thống": Form khai báo việc phát sinh kèm minh chứng theo Quy tắc 5.9 & 5.10.
  - **Cập nhật Điều hướng hệ thống:**
    * `AdminLayout.tsx`: Bổ sung mục "Quản lý Công việc" (`/admin/tasks`) trên thanh Sidebar với icon `CheckSquare`.
    * `Navbar.tsx`: Bổ sung mục "Nhiệm vụ của tôi" (`/tasks`) cho tài khoản CTV (`COLLABORATOR`) và Admin trên cả Desktop Navbar và Mobile Drawer.
    * `AuthContext.tsx`: Đồng bộ kiểu dữ liệu `role: 'ADMIN' | 'USER' | 'COLLABORATOR'`.
  - **Kiểm tra chất lượng & Biên dịch:**
    * Chạy kiểm tra tĩnh TypeScript (`tsc --noEmit`): **0 lỗi**.
    * Biên dịch Next.js production (`next build`): Thành công 100% với 23/23 routes được tạo.
    * Khởi động lại Next.js production server trên cổng 3000: Kiểm tra HTTP status của `/admin/tasks` và `/tasks` đều trả về mã 200 OK.
    * Chạy kiểm thử hồi quy Backend (`npm test`): **46/46 tests PASS 100%**.
  - **Cập nhật Kế hoạch triển khai:**
    * Đánh dấu hoàn thành Task 2.3 `[x]` trong `KE_HOACH_TRIEN_KHAI.md`.
- **Trạng thái:** `COMPLETED`

---

### PROMPT #16
- **Thời gian tiếp nhận:** 10/11/2026 - 08:30
- **Nội dung câu lệnh:**
```markdown
# NHIỆM VỤ: CẬP NHẬT CHỨC NĂNG CHẤM CÔNG, THỐNG KÊ CÔNG VIỆC VÀ TÍNH LƯƠNG CTV – LHU MEDIA STUDIO

Cập nhật hệ thống quản lý chấm công, thống kê công việc, tổng hợp tiền công và xuất Excel cho CTV theo biểu mẫu thực tế của Bộ phận Truyền thông – Trường Đại học Lạc Hồng dựa trên file Excel mẫu 1. BPTT_BẢNG THỐNG KÊ CÔNG VIỆC 2025-2026(1).xlsx.
- 2 sheet chuẩn: T10.2026 (Bảng thống kê công việc CTV) và Sheet1 (Bảng chấm công CTV).
- Phân biệt rõ 3 nghiệp vụ: Bảng thống kê công việc, Bảng chấm công, Dữ liệu tính tiền công.
- Áp dụng 7 quy tắc tính thù lao CTV bắt buộc: Đơn giá 20.000 đ/h; Ca trực tiêu chuẩn 4 giờ (80.000 đ/ca); Sự vụ sau 16:30 T2-T7: hệ số 1.5; Sự vụ Chủ nhật: hệ số 2.0; Chủ nhật sau 16:30: chỉ tính hệ số 2.0 (không nhân chồng 1.5 x 2.0 = 3.0); Thời gian thực tế; Khử trùng thời gian trực Studio và sự vụ; Không tính việc chưa COMPLETED (TC-03); Không tính ca trực tương lai (TC-04); Chặn CTV tự duyệt ca trực hoặc sửa lương (TC-07).
- Cập nhật quy tắc mới vào QUY_TAC.md.
```
- **Mục tiêu:** Hoàn thành toàn diện Giai đoạn 3 (Tasks 3.1 -> 3.6 và các quy tắc TC-03 -> TC-07): Lịch trực Studio (FR-05), Bảng thống kê công việc tháng, Bảng chấm công ma trận 3 ca (S-C-T), thuật toán tính thù lao CTV và xuất 2 file Excel riêng biệt bám sát 100% biểu mẫu thực tế của BPTT ĐH Lạc Hồng.
- **Hành động & Kết quả thực hiện:**
  - **Phân tích Biểu mẫu Excel:**
    * Sao chép và phân tích chi tiết file Excel mẫu `1. BPTT_BẢNG THỐNG KÊ CÔNG VIỆC 2025-2026(1).xlsx`:
      + Sheet `T10.2026`: 8 cột (STT, Họ tên, Ngày, Nội dung sự vụ, Nhiệm vụ, Thực hiện giờ, Tổng giờ, Ghi chú), nhóm theo từng CTV, cột Tổng giờ = sum(giờ) của CTV.
      + Sheet `Sheet1`: Ma trận 1..daysCount x 3 ca (`S`, `C`, `T`) cho từng CTV. Ký hiệu chuẩn: `LV` (Trực Studio), `SV` (Làm sự vụ), `NL` (Nghỉ lễ). Các cột tổng hợp chuẩn: AI (`LV`), AJ (`SV`), AK (`Sum LV`), AL (`Giờ LV` = Sum LV * 4), AM (`Giờ SV`), AN (`Tổng`), AO (`Tiền` = Tổng quy đổi * 20.000 đ), dòng tổng tiền toàn bộ CTV ở cuối bảng, legend ký hiệu và khối ký tên (Lãnh đạo đơn vị, Người chấm công).
  - **Database Migration SQL Server (`TN_Database`):**
    * Bổ sung cột vào bảng `Tasks`: `execution_date` (`DATE`), `actual_hours` (`DECIMAL(5,2)`), `shift_session` (`NVARCHAR(10)`), `note` (`NVARCHAR(MAX)`), `is_overtime` (`BIT`), `overtime_hours` (`DECIMAL(4,2)`), `is_sunday` (`BIT`).
    * Tạo mới bảng `StudioShifts`: `id` (`CHAR(36)` PK), `user_id` (`CHAR(36)` FK), `date` (`DATE`), `shift_type` (`NVARCHAR(20)`: `SANG`, `CHIEU`, `TOI`), `start_time`, `end_time`, `hours` (4.00), `status` (`REGISTERED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`), `attendance_symbol` (`LV`), `note`, `confirmed_by_user_id`.
    * Tạo mới bảng `AttendanceRecords`: `id`, `user_id`, `date`, `session` (`S`,`C`,`T`), `symbol` (`LV`,`SV`,`NL`), `hours`, `source_type`, `source_id`, `month`, `year`, `note`.
    * Tạo mới bảng `MonthlyPayrolls`: `id`, `user_id`, `month`, `year`, `total_shift_count`, `shift_hours`, `task_hours`, `overtime_hours`, `sunday_hours`, `total_standard_hours`, `total_calculated_hours`, `hourly_rate` (20000), `total_amount`, `status`, `note`, `calculated_at`.
  - **Backend Models & Associations:**
    * `Task.js`: Thêm 7 trường phục vụ chấm công & thống kê.
    * `StudioShift.js`: Quản lý ca trực Studio.
    * `AttendanceRecord.js`: Quản lý ô ma trận chấm công.
    * `MonthlyPayroll.js`: Lưu trữ bảng lương tháng CTV.
    * `TN-Backend/src/models/index.js`: Khai báo associations liên kết với bảng `Users`.
  - **Backend Services & Logic Nghiệp Vụ:**
    * `duty.service.js`: Đăng ký ca trực Studio, Admin xếp ca trực cho CTV vào bất kỳ ngày nào trong tháng, duyệt xác nhận (`CONFIRMED`), xác nhận hoàn thành (`COMPLETED` - chặn ca tương lai TC-04), hủy ca trực (`CANCELLED`).
    * `payroll.service.js`:
      + `getTimesheetData`: Tổng hợp ma trận chấm công 3 ca S-C-T của tháng, tính đúng các cột AI đến AO, hỗ trợ cập nhật cell thủ công (`updateAttendanceCell`).
      + `getTasksSummaryData`: Tổng hợp danh sách đầu việc chi tiết của tháng (các task COMPLETED) nhóm theo từng CTV.
      + `calculateMonthlyPayroll`: Thuật toán tính thù lao CTV áp dụng nghiêm ngặt 7 quy tắc bắt buộc: đơn giá 20.000 đ/h, ca 4h (80.000 đ), OT sau 16:30 T2-T7 x1.5, Chủ nhật x2.0, Chủ nhật sau 16:30 chỉ tính x2.0 (TC-06), khử trùng giờ trực và sự vụ (TC-05), loại trừ việc dang dở (TC-03) và ca tương lai (TC-04).
      + `exportTimesheetExcel`: Xuất file Excel Bảng chấm công bám sát 100% sheet `Sheet1`.
      + `exportTasksSummaryExcel`: Xuất file Excel Bảng thống kê công việc bám sát 100% sheet `T10.2026`.
    * `task.service.js`: Hỗ trợ lưu trữ `executionDate`, `actualHours`, `shiftSession`, `note`, `isOvertime`, `overtimeHours`, `isSunday` trong `createTask`, `createExternalTask`, `reviewTask`.
  - **Backend Controllers & Routes:**
    * `duty.controller.js` & `duty.routes.js`: Cung cấp `/api/duty/register`, `/api/duty/shifts`, `/api/duty/shifts/:id/confirm`, `/api/duty/shifts/:id/complete`, `/api/duty/shifts/:id`.
    * `payroll.controller.js` & `payroll.routes.js`: Cung cấp `/api/payroll/timesheet`, `/api/payroll/tasks-summary`, `/api/payroll/calculate`, `/api/payroll/timesheet/cell`, `/api/payroll/export-timesheet`, `/api/payroll/export-tasks-summary`.
  - **Frontend UI/UX:**
    * `TN-Frontend/src/app/admin/payroll/page.tsx`: Giao diện Admin quản trị chấm công & thù lao toàn diện gồm 3 tab:
      + Tab 1: Ma trận Bảng Chấm Công (3 ca S-C-T), xem chi tiết các cột AI -> AO, hỗ trợ click sửa nhanh ô chấm công.
      + Tab 2: Bảng Thống Kê Công Việc tháng (chuẩn `T10.2026`) nhóm theo từng CTV.
      + Tab 3: Quản Lý Ca Trực & Bảng Lương (Xếp ca trực mới cho CTV, duyệt ca trực, tính thù lao tự động).
      + 2 nút xuất 2 file Excel chuyên biệt.
    * `TN-Frontend/src/app/tasks/page.tsx`: Nâng cấp giao diện CTV với 2 tab:
      + Tab 1: Nhiệm vụ & Sự vụ (theo dõi việc, nộp kết quả, khai báo việc ngoài có ngày/giờ/buổi/OT/CN).
      + Tab 2: Lịch trực & Bảng chấm công (thẻ thù lao tạm tính của tháng x 20.000 VNĐ, nút Đăng ký ca trực Studio, danh sách ca trực cá nhân, bảng ma trận chấm công cá nhân theo 3 buổi).
    * `TN-Frontend/src/app/admin/tasks/page.tsx`: Modal nghiệm thu khi chọn `COMPLETED` cho phép Admin ghi nhận trực tiếp ngày thực hiện, số giờ thực tế, buổi làm, ngoài giờ OT (x1.5), làm Chủ nhật (x2.0).
    * `TN-Frontend/src/components/AdminLayout.tsx`: Thêm mục "Chấm công & Thù lao" (`/admin/payroll`).
  - **Kiểm thử chuyên sâu (Unit Test & E2E Integration):**
    * **Backend Unit Tests:** Mở rộng Suite 10 -> **58/58 Unit Tests PASS 100%** (bao quát TC-03 -> TC-07, công thức tính toán, số ngày trong tháng).
    * **E2E Integration Tests:** 13/13 kịch bản PASS 100% qua `scratch/test_phase3_e2e.js`:
      + Tạo ca trực hoàn thành (4h = 4h quy đổi).
      + Tạo sự vụ ngày thường (2h).
      + Tạo sự vụ ngoài giờ sau 16:30 (2h thực tế + 2h OT x1.5 = 3h quy đổi).
      + Tạo sự vụ Chủ nhật (4h x2.0 = 8h quy đổi).
      + Tạo sự vụ Chủ nhật sau 16:30 (3h thực tế + 3h OT -> chỉ tính x2.0 = 6h quy đổi, không nhân chồng).
      + Tạo ca trực tương lai và task chưa xong -> Kiểm tra bị loại trừ hoàn toàn (TC-03 & TC-04).
      + Tổng cộng tính chuẩn xác 26 giờ quy đổi = 520.000 VNĐ.
      + Xuất 2 file Excel thực tế và verify 100% cấu trúc dòng, cột, công thức so với file mẫu.
    * **Frontend Compilation:** TypeScript 0 lỗi, Next.js build (`next build`) thành công 24/24 routes.
  - **Tài liệu & Kế hoạch:**
    * Cập nhật `QUY_TAC.md` bổ sung chi tiết Mục 6, 7, 8 (ký hiệu `LV`, `SV`, `NL`, ma trận 3 buổi S-C-T, các cột AI->AO, cấu trúc 2 biểu mẫu Excel BPTT).
    * Cập nhật `KE_HOACH_TRIEN_KHAI.md` đánh dấu hoàn thành 100% Giai đoạn 3 (Tasks 3.1 -> 3.6 và TC-03 -> TC-07).
- **Trạng thái:** `COMPLETED`

---
