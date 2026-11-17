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


## PROMPT #17: ĐIỀU CHỈNH GIAO DIỆN CHẤM CÔNG VÀ XÂY DỰNG QUY TRÌNH ĐĂNG KÝ – SẮP XẾP CA TRỰC CTV
- **Ngày thực hiện:** 10/11/2026
- **Mục tiêu:**
  1. Hạng mục 1: Điều chỉnh tên 2 mục giao diện: `Bảng chấm công tháng (Sheet1)` → `Bảng chấm công tháng`; `Bảng thống kê công việc (T10.2026)` → `Bảng thống kê công việc`.
  2. Hạng mục 2: Kiểm soát chặt chẽ ký hiệu `SV` trong Bảng chấm công (chỉ cho phép chọn khi ngày đó có công việc `COMPLETED` của đúng CTV; khi không có thì disabled và cảnh báo lỗi chuẩn; backend API kiểm tra và ném lỗi 400).
  3. Hạng mục 3: Sắp xếp lại bộ lọc (nhóm logic) và bố cục responsive.
  4. Hạng mục 4 & 5: Đổi tên menu thành `Quản lý ca trực` (`/admin/duty`), tách riêng khỏi bảng thù lao; xây dựng quy trình đăng ký ca trực 3 giai đoạn (Nhân sự mở đợt -> CTV đăng ký thời gian có thể trực -> Nhân sự phân công & chốt lịch CONFIRMED); bảng CSDL `DutyPeriods`, `ShiftRegistrations`, `Notifications`; chuông thông báo in-app `NotificationBell.tsx`.
  5. Hạng mục 6: Kiểm thử bắt buộc theo 21 tiêu chí.
- **Kết quả thực hiện:**
  - **Database Migration (SQL Server):**
    * Tạo bảng `DutyPeriods` (id, month, year, status: OPEN/CLOSED/ARRANGING/CONFIRMED, registration_deadline, note, created_by_user_id, confirmed_by_user_id, confirmed_at, UQ_DutyPeriods_MonthYear).
    * Tạo bảng `ShiftRegistrations` (id, period_id, user_id, date, session: S/C/T, note, UQ_ShiftRegistrations_Slot).
    * Tạo bảng `Notifications` (id, user_id, title, message, type, link, is_read).
    * Bổ sung cột `period_id` vào bảng `StudioShifts` (FK liên kết `DutyPeriods.id`).
    * Áp dụng kiểu dữ liệu `DATETIMEOFFSET` đồng bộ và an toàn múi giờ Việt Nam (+07:00).
  - **Backend Services, Models, Controllers & Routes:**
    * Models: `DutyPeriod.js`, `ShiftRegistration.js`, `Notification.js`, cập nhật `StudioShift.js` và `models/index.js`.
    * `payroll.service.js`: Cập nhật `updateAttendanceCell` kiểm soát độc lập ký hiệu `SV` (chặn 400 nếu không có task `COMPLETED` trong ngày của CTV); cập nhật `getTimesheetData` loại trừ bản ghi `SV` thủ công cũ nếu công việc không còn hợp lệ.
    * `duty.service.js`: Triển khai đầy đủ 3 giai đoạn: `createDutyPeriod` (chặn trùng tháng, gửi notif `DUTY_PERIOD_OPEN`), `registerAvailability` (CTV đăng ký rảnh nhiều slot, chặn khi `CLOSED`), `getPeriodRegistrationsSummary` (ma trận rảnh S-C-T), `assignShifts` (phân công ca, chặn trùng ca), `confirmPeriodSchedule` (chốt `CONFIRMED`, đồng bộ `StudioShift` và `AttendanceRecord` ghi `LV`, gửi notif `DUTY_SCHEDULE_CONFIRMED`).
    * `notification.service.js`, `notification.controller.js`, `notification.routes.js`: Hỗ trợ lấy danh sách thông báo và đánh dấu đã đọc.
    * Gắn route `/api/notifications` vào `server.js`.
  - **Frontend UI/UX:**
    * `TN-Frontend/src/app/admin/payroll/page.tsx`:
      + Đổi tên tab: `Bảng chấm công tháng` và `Bảng thống kê công việc`.
      + Bộ lọc thiết kế lại logic: Tháng/Năm, Dropdown chọn CTV, ô tìm kiếm tên/mã CTV, nút làm mới và các nút xuất Excel.
      + Nút `SV` ở modal bị disabled khi ngày đó CTV không có task `COMPLETED`, kèm thông báo lỗi chuẩn: *"Không hợp lệ vì không có công việc tương ứng trong Bảng thống kê công việc."*
      + Nút chuyển hướng sang `/admin/duty`.
    * `TN-Frontend/src/app/admin/duty/page.tsx`: Trang Quản lý ca trực 3 giai đoạn cho Admin (mở đợt, xem ma trận rảnh S-C-T của tất cả CTV, phân công ca trực, chốt lịch chính thức).
    * `TN-Frontend/src/app/tasks/page.tsx`: Ma trận đăng ký thời gian có thể trực (Availability) cho CTV theo tháng và 3 buổi S-C-T; cho phép lưu/hủy rảnh; theo dõi ca trực chính thức.
    * `TN-Frontend/src/components/NotificationBell.tsx`: Chuông thông báo in-app có badge unread, popup danh sách thông báo và đánh dấu đã đọc.
    * `TN-Frontend/src/components/Navbar.tsx`: Tích hợp chuông thông báo trên thanh điều hướng.
    * `TN-Frontend/src/components/AdminLayout.tsx`: Menu sidebar thêm mục "Quản lý Ca trực" (`/admin/duty`).
  - **Kiểm thử tự động:**
    * **Backend Unit Tests:** Bổ sung Suite 11 -> **66/66 tests PASS 100%**.
    * **Kiểm thử 21 Tiêu chí Bắt buộc:** Script `test_21_criteria.js` chạy thực tế trên SQL Server đạt **21/21 tiêu chí PASS 100%**.
    * **Frontend Compilation:** TypeScript 0 lỗi, Next.js build (`next build`) thành công 25/25 routes.
  - **Cập nhật tài liệu:** `QUY_TAC.md`, `CHUC_NANG.md`, `KE_HOACH_TRIEN_KHAI.md`.
- **Trạng thái:** `COMPLETED`

---

## PROMPT #18: KHẮC PHỤC LỖI XÓA TÀI KHOẢN DO RÀNG BUỘC KHÓA NGOẠI – LHU MEDIA STUDIO
- **Ngày thực hiện:** 10/11/2026
- **Mục tiêu:**
  1. Khảo sát nguyên nhân lỗi xóa tài khoản: `The DELETE statement conflicted with the REFERENCE constraint "FK__Tasks__assigned___04E4BC85"`.
  2. Triển khai quy tắc nghiệp vụ: Tài khoản đã có dữ liệu hoạt động/lịch sử không được xóa vật lý; chuyển sang trạng thái `Disabled` (`isActive: false`), giữ nguyên `user_id` và toàn bộ công việc, ca trực, chấm công...
  3. Phân biệt rõ 3 trạng thái tài khoản: `Active` (hoạt động), `Locked` (tạm khóa), `Disabled` (vô hiệu hóa, giữ toàn bộ lịch sử).
  4. Nếu tài khoản chưa từng phát sinh dữ liệu: cho phép xóa vật lý (DELETE) an toàn khỏi CSDL.
  5. Chặn đăng nhập đối với tài khoản `Disabled` (HTTP 403: *"Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Quản trị viên."*).
  6. Kiểm thử 8 trường hợp bắt buộc (Mục 5) và kiểm thử hồi quy 21 tiêu chí chấm công & ca trực.
- **Kết quả thực hiện:**
  - **Khảo sát hệ thống:**
    * Phát hiện 8 bảng trong CSDL `TN_Database` đang tham chiếu khóa ngoại đến `Users(id)` với quy tắc `NO ACTION`: `Tasks`, `AttendanceRecords`, `StudioShifts`, `ShiftRegistrations`, `DutyPeriods`, `MonthlyPayrolls`, `BorrowRequests`, `StudioBookings`.
    * Thao tác `await user.destroy()` trước đó thực hiện xóa vật lý trực tiếp, dẫn đến vi phạm ràng buộc toàn vẹn dữ liệu SQL Server.
  - **Database Migration (SQL Server):**
    * Thêm cột `status` (`NVARCHAR(20)`: `'Active'`, `'Locked'`, `'Disabled'`, mặc định `'Active'`) vào bảng `Users` kèm ràng buộc CHECK `CK_Users_Status`.
    * Đồng bộ dữ liệu hiện có trong CSDL: các tài khoản đang hoạt động chuyển sang `status: 'Active'`.
  - **Backend Services & Routes:**
    * Model `User.js`: Bổ sung trường `status` với validator enum `['Active', 'Locked', 'Disabled']`.
    * Service `user.service.js` *(Mới)*:
      + `checkUserHasRelatedData`: Kiểm tra toàn diện trên 8 bảng tham chiếu xem user đã phát sinh dữ liệu hay chưa.
      + `deleteOrDisableUser`: Nếu có dữ liệu -> cập nhật `status: 'Disabled'`, `isActive: false`, thông báo rõ ràng cho Admin; Nếu chưa có dữ liệu -> thực hiện `user.destroy()` an toàn; Bắt ngoại lệ FK làm fallback an toàn.
      + `toggleUserActiveStatus`: Khóa / Mở khóa tài khoản (`Active` <-> `Locked`).
    * Routes: Cập nhật `DELETE /api/dashboard/users/:id` và `DELETE /api/admin/users/:id`.
    * Xác thực & Phân quyền: Cập nhật `auth.service.js` (login) và `auth.middleware.js`: Chặn đăng nhập tài khoản `Disabled` (HTTP 403) và `Locked` (HTTP 403) với thông điệp riêng biệt chuẩn xác.
  - **Frontend UI/UX:**
    * `TN-Frontend/src/app/admin/users/page.tsx`:
      + Cập nhật badge hiển thị rõ 3 trạng thái: `Hoạt động` (Active, xanh lá), `Tạm khóa` (Locked, vàng cam), `Vô hiệu hóa` (Disabled, đỏ/xám).
      + Modal xác nhận xóa được cập nhật giải thích rõ quy tắc bảo toàn dữ liệu lịch sử.
      + Hiển thị thông báo toast chi tiết dựa trên phản hồi của backend.
    * `TN-Frontend/src/lib/constants.ts` *(Mới)*: Tách `TASK_TYPES` thành hằng số dùng chung, loại bỏ named export khỏi `page.tsx` giúp Next.js App Router biên dịch chuẩn 100%.
  - **Kiểm thử tự động:**
    * **Backend Unit Tests:** Đạt **71/71 Tests PASS 100%** (mở rộng Suite 8 thêm 5 test cases kiểm thử các quy tắc xóa, vô hiệu hóa, phân biệt 3 trạng thái).
    * **Kiểm thử 8 trường hợp bắt buộc (Mục 5):** Script `test_user_delete_fix.js` đạt **8/8 Cases PASS 100%** trên SQL Server database thực tế.
    * **Kiểm thử hồi quy 21 Tiêu chí ca trực & chấm công:** Đạt **21/21 Tiêu chí PASS 100%**.
    * **Frontend Compilation:** TypeScript 0 lỗi, Next.js build webpack biên dịch thành công 25/25 routes.
  - **Cập nhật tài liệu:** `QUY_TAC.md` (Mục 9), `CHUC_NANG.md` (FR-06), `KE_HOACH_TRIEN_KHAI.md`.
- **Trạng thái:** `COMPLETED`

---

## PROMPT #19: ĐỒNG BỘ DANH SÁCH CTV TRONG CÁC BỘ LỌC VÀ DROPDOWN – LHU MEDIA STUDIO
- **Ngày thực hiện:** 10/11/2026
- **Mục tiêu:**
  1. Rà soát và chuẩn hóa toàn bộ các dropdown, bộ lọc, modal và ô chọn CTV tại các phân hệ:
     - **Quản lý ca trực (`/admin/duty`)**: Bảng tổng hợp ca trực, ma trận đăng ký rảnh, dropdown phân công ca trực, popup phân công nhanh.
     - **Chấm công – Thù lao (`/admin/payroll`)**: Bộ lọc CTV tại Bảng chấm công tháng, Bảng thống kê công việc, modal chỉnh sửa ô chấm công.
     - **Quản lý công việc (`/admin/tasks`)**: Bộ lọc CTV công việc, modal tạo và chỉnh sửa nhiệm vụ phân công CTV.
  2. Triển khai chặt chẽ **Quy tắc phân định 2 mục đích sử dụng danh sách CTV**:
     - **Mục đích phân công mới / tạo mới (`purpose='assign'` / `status='Active'`)**: CHỈ hiển thị và cho phép chọn CTV đang có trạng thái `Active`. Tuyệt đối không phân công tài khoản `Locked` hoặc `Disabled`. Backend từ chối mọi yêu cầu phân công cho tài khoản không hoạt động.
     - **Mục đích tìm kiếm, lọc dữ liệu lịch sử hoặc xem báo cáo (`purpose='filter'` / `status='ALL'`)**: Cho phép tìm kiếm và xem dữ liệu của TẤT CẢ CTV đã từng phát sinh dữ liệu (kể cả `Disabled` hoặc `Locked`) để không bao giờ bị mất lịch sử công việc, chấm công hay thù lao của CTV cũ/nghỉ việc.
  3. **Ràng buộc vai trò (Role)**: Chỉ chứa tài khoản có vai trò `COLLABORATOR`, tuyệt đối không lẫn lộn `USER` hoặc `ADMIN`.
  4. **Tiêu chuẩn hiển thị & UX**:
     - Hiển thị đầy đủ: Họ và tên, kèm Email hoặc Mã nhân viên (phân biệt trùng tên).
     - Đối với bộ lọc lịch sử: Hiển thị thêm nhãn `[Đã nghỉ việc]` đối với tài khoản `Disabled`.
     - Sắp xếp A–Z theo Họ tên tiếng Việt.
     - Có tùy chọn 'Tất cả CTV' tại các bộ lọc lịch sử/báo cáo.
     - Hỗ trợ tìm kiếm nhanh theo Họ tên, Email, Mã nhân viên.
     - Giữ nguyên giá trị CTV đã chọn khi chuyển đổi tháng/năm hoặc chuyển tab.
  5. Đạt 100% 14 tiêu chí kiểm thử bắt buộc tại Mục 7 và kiểm thử hồi quy toàn bộ hệ thống.
- **Kết quả thực hiện:**
  - **Backend Services & API Endpoints:**
    * `TN-Backend/src/services/user.service.js`: Bổ sung hàm `getCollaborators(query)` chuẩn hóa:
      + Phân định mục đích `purpose='assign'` (chỉ CTV `Active`) và `purpose='filter'` (tất cả CTV kể cả `Disabled`/`Locked`).
      + Ràng buộc cứng `role: 'COLLABORATOR'`, loại bỏ hoàn toàn `USER` và `ADMIN`.
      + Tìm kiếm LIKE theo `fullName`, `email`, `employeeCode`.
      + Sắp xếp A-Z theo `order: [['fullName', 'ASC']]`.
    * `TN-Backend/src/routes/admin.routes.js`: Bổ sung endpoint RESTful `GET /api/admin/collaborators` phục vụ phân hệ Admin.
    * `TN-Backend/src/services/duty.service.js`: Thêm bước kiểm tra nghiệp vụ trong `assignShifts`: Chặn phân công ca trực nếu người nhận không phải `COLLABORATOR` hoặc có trạng thái không hoạt động (`Locked`/`Disabled`).
    * `TN-Backend/src/services/task.service.js`: Chuẩn hóa gán nhiệm vụ chỉ dành cho CTV `Active`.
    * `TN-Backend/src/services/auth.service.js`: Hỗ trợ lọc theo `status` trong `getAllUsers`.
  - **Frontend Components & UI/UX:**
    * `TN-Frontend/src/components/common/CollaboratorSelect.tsx` *(Component Mới)*: Dropdown CTV chuẩn hóa dùng chung, hỗ trợ 2 chế độ `purpose="assign"` và `purpose="filter"`, tự động tải từ API, có loading indicator và xử lý nhãn trạng thái `[Đã nghỉ việc]`.
    * `TN-Frontend/src/app/admin/duty/page.tsx`:
      + Sửa hàm `fetchCollaborators` gọi `/admin/collaborators?purpose=assign` lấy đúng danh sách CTV Active.
      + Thêm thanh Toolbar bộ lọc CTV (Dropdown Lọc CTV, Input tìm kiếm, nút Đặt lại bộ lọc).
      + Ma trận ca trực tương tác thông minh: highlight nổi bật các ca của CTV được chọn, làm mờ các ô không liên quan để Admin dễ quan sát.
      + Dropdown "+ Phân công CTV..." ở từng slot hiển thị đầy đủ Họ tên, Mã nhân viên/Email, sắp xếp A-Z.
      + Thêm Modal "Phân công nhanh ca trực" tích hợp `CollaboratorSelect purpose="assign"`.
    * `TN-Frontend/src/app/admin/payroll/page.tsx`:
      + Sửa hàm `fetchCollaborators` gọi `/admin/collaborators?purpose=filter&status=ALL` nạp đầy đủ danh sách CTV (kể cả Disabled để lọc lịch sử).
      + Dropdown Lọc CTV hiển thị: `{c.fullName} ({c.employeeCode || c.email})` kèm `[Đã nghỉ việc]` nếu status là `Disabled`.
      + Modal Sửa ô chấm công: hiển thị chi tiết tên CTV, email, mã NV và badge trạng thái hoạt động.
      + Bộ lọc CTV giữ nguyên giá trị khi chuyển đổi qua lại giữa 2 tab hoặc đổi tháng/năm.
    * `TN-Frontend/src/app/admin/tasks/page.tsx`:
      + Tách riêng `collaborators` (cho bộ lọc lịch sử) và `activeCollaborators` (cho modal tạo/sửa nhiệm vụ).
      + Loại bỏ vai trò ADMIN khỏi danh sách người nhận việc, chỉ cho phép phân công CTV Active.
      + Dropdown lọc nhiệm vụ hiển thị đầy đủ tên, email/mã NV và nhãn `[Đã nghỉ việc]` đối với CTV cũ.
  - **Kiểm thử tự động & Xác minh toàn diện:**
    * **Backend Unit Tests:** Bổ sung Suite 12 -> **77/77 tests PASS 100%**.
    * **Kiểm thử 14 Tiêu chí Bắt buộc (Mục 7):** Script `test_collaborator_sync.js` chạy trên CSDL SQL Server đạt **19/19 checks PASS 100%**.
    * **Kiểm thử hồi quy 21 Tiêu chí ca trực & chấm công:** Script `test_21_criteria.js` đạt **21/21 tiêu chí PASS 100%**.
    * **Kiểm thử hồi quy 8 Trường hợp xóa an toàn tài khoản:** Script `test_user_delete_fix.js` đạt **8/8 cases PASS 100%**.
    * **Frontend & Backend Servers:** Cả 2 server đang chạy live: Backend (port 5000, PID 2710) và Frontend (port 3000, PID 2720) phản hồi HTTP 200.
  - **Cập nhật tài liệu:** `QUY_TAC.md` (Mục 13), `KE_HOACH_TRIEN_KHAI.md` (TC-09), `PROMPT_HISTORY.md`.
- **Trạng thái:** `COMPLETED`

---


## PROMPT #20: KHẮC PHỤC RUNTIME TYPEERROR TẠI TRANG MYTASKSPAGE – LHU MEDIA STUDIO
- **Ngày thực hiện:** 10/11/2026
- **Mục tiêu:**
  1. Khảo sát nguyên nhân lỗi: `Runtime TypeError: Cannot read properties of undefined (reading 'id') at Array.find at MyTasksPage`.
  2. Xác định chính xác nguyên nhân gốc:
     * Dòng 575 `TN-Frontend/src/app/tasks/page.tsx`: `const myTimesheetRow = timesheet?.rows.find((r) => r.user.id === user?.id);`.
     * API `GET /api/payroll/timesheet` do `payroll.service.js` trước đó trả về mỗi phần tử hàng có thuộc tính `ctv` (`rows.push({ stt, ctv: { id, fullName... }, sessions, summary })`), hoàn toàn không có `r.user`.
     * Khi duyệt mảng `timesheet.rows`, `r.user` là `undefined` -> dẫn tới `r.user.id` ném `TypeError`.
     * Ngoài ra, backend trả về `daysHeader` thay vì `daysMeta`, và summary dùng uppercase (`sumLV`, `gioLV`, `gioSV`) trong khi `page.tsx` đọc camelCase (`sumLv`, `gioLv`, `gioSv`, `gioOt`, `gioSunday`).
  3. Xử lý triệt để nguyên nhân gốc ở cả 2 đầu Backend và Frontend:
     * **Backend (`payroll.service.js`):** Cung cấp song song cả `ctv` và `user` trong `timesheet.rows`; cung cấp đồng thời cả `daysMeta` và `daysHeader`; cung cấp cả 2 chuẩn camelCase và UPPERCASE trong `summary`.
     * **Frontend (`tasks/page.tsx`):**
       + Cập nhật interface `TimesheetRowItem` và `TimesheetData`.
       + `myTimesheetRow` chuyển sang `useMemo` an toàn hỗ trợ `r?.user?.id || r?.ctv?.id`.
       + `activePeriod` và `openPeriod` bọc kiểm tra an toàn `Array.isArray` và `p && p.id`.
       + Ma trận chấm công và summary hỗ trợ linh hoạt cả 2 định dạng, bảo vệ chống crash khi dữ liệu null/rỗng.
  4. Xác minh chuyên sâu 9 trường hợp biên bắt buộc:
     * CTV có nhiều nhiệm vụ.
     * CTV chưa có nhiệm vụ nào.
     * Nhiệm vụ đầy đủ thông tin `creator` và `assignee`.
     * Nhiệm vụ thiếu `creator` hoặc `assignee` (fallback an toàn sang "Admin" / "Chưa phân công").
     * Nhiệm vụ có `creator` / `assignee` bị `Locked` hoặc `Disabled`.
     * API `timesheet` trả về `null` hoặc `undefined`.
     * `timesheet.rows` là mảng rỗng `[]`.
     * `timesheet.rows` có phần tử `null` / `undefined` hoặc chỉ có `ctv`.
     * CTV chưa có dòng chấm công trong tháng (`myTimesheetRow` trả về `null` an toàn).
  5. Chạy kiểm thử hồi quy toàn bộ hệ thống (77 Backend unit tests, 19 Collaborator sync tests, Next.js dev server HTTP 200).
- **Kết quả thực hiện:**
  - **Backend (`TN-Backend/src/services/payroll.service.js`):**
    * Cập nhật `rows.push(...)`: Trả về cả `ctv: { id, fullName, email, employeeCode, status }` VÀ `user: { id, fullName, email, employeeCode, status }`.
    * Cung cấp cả `daysHeader` VÀ `daysMeta` trong đối tượng trả về của `getTimesheetData`.
    * Chuẩn hóa `summary` chứa cả `sumLv` / `sumLV`, `gioLv` / `gioLV`, `gioSv` / `gioSV`, `gioOt`, `gioSunday`, `tongGio`, `tien`.
  - **Frontend (`TN-Frontend/src/app/tasks/page.tsx`):**
    * Sửa dòng 575 với `useMemo` an toàn, tìm theo `r.user?.id || r.ctv?.id`.
    * Bọc an toàn `activePeriod` với `useMemo` và kiểm tra `Array.isArray(dutyPeriods)`.
    * Sửa `openPeriod` kiểm tra `p && p.status === 'OPEN'`.
    * Phần thống kê và ma trận chấm công sử dụng fallback toán tử `??` đa tầng và kiểm tra mảng ngày `timesheet.daysMeta || timesheet.daysHeader || []`.
  - **Kiểm thử tự động & Xác minh:**
    * Script `verify_my_tasks_fix.js`: **9/9 Trường hợp biên PASS 100%**.
    * Next.js dev server (port 3000): Compile thành công trong 164ms, các yêu cầu `GET /tasks` trả về HTTP 200 OK liên tục, console sạch sẽ 100% không còn runtime TypeError.
    * Suite unit test backend: **77/77 tests PASS 100%**.
    * Suite collaborator sync: **19/19 checks PASS 100%**.
  - **Cập nhật tài liệu:** `QUY_TAC.md` (Mục 14), `KE_HOACH_TRIEN_KHAI.md` (TC-10), `PROMPT_HISTORY.md`.
- **Trạng thái:** `COMPLETED`


---

### PROMPT #18
- **Thời gian tiếp nhận:** 16/11/2026 - Bổ sung chức năng Xóa đợt đăng ký ca trực theo tháng
- **Nội dung câu lệnh:**
```markdown
### BỔ SUNG: CHỨC NĂNG XÓA ĐỢT ĐĂNG KÝ CA TRỰC THEO THÁNG

Tại mục **Các đợt đăng ký ca trực theo tháng** trong module Quản lý ca trực (theo giao diện hình ảnh tham chiếu), bổ sung quyền cho ADMIN xóa các khung lịch đăng ký của từng tháng.

Yêu cầu:
- Mỗi khung lịch tháng có nút hoặc biểu tượng Xóa, chỉ ADMIN được nhìn thấy và sử dụng.
- Khi nhấn Xóa, hiển thị hộp thoại xác nhận, nêu rõ tháng/năm của đợt đăng ký sắp xóa.
- Sau khi xác nhận, cập nhật danh sách ngay lập tức, không cần tải lại trang.
- Kiểm tra các dữ liệu liên quan như đăng ký nguyện vọng của CTV, ca đã phân công, lịch trực đã xác nhận và bảng chấm công trước khi xóa.
- Không xóa vật lý các dữ liệu lịch trực đã xác nhận hoặc đã phát sinh chấm công. Nếu có dữ liệu lịch sử, phải áp dụng cơ chế lưu trữ hoặc hủy đợt có lưu lịch sử phù hợp.
- Không làm mất dữ liệu công việc, chấm công hoặc thù lao liên quan.
- Nếu đợt đăng ký không thể xóa do đã phát sinh dữ liệu quan trọng, hiển thị lý do cụ thể và hướng xử lý cho ADMIN.

Kiểm tra quyền ở cả Frontend và Backend, bảo đảm CTV không thể gọi API để xóa đợt đăng ký.

Chỉ bổ sung chức năng còn thiếu, không viết lại module Quản lý ca trực. Kiểm thử với các trường hợp: đợt chưa có đăng ký, đợt đã có CTV đăng ký, đợt đã phân công ca và đợt đã xác nhận lịch trực.
```
- **Mục tiêu chính:**
  1. Thêm nút Xóa (Trash2 icon) tại từng thẻ đợt tháng trong danh sách "CÁC ĐỢT ĐĂNG KÝ CA TRỰC THEO THÁNG" trên `/admin/duty`, chỉ hiển thị cho ADMIN.
  2. Khi nhấn Xóa, mở modal xác nhận hiển thị chính xác Tháng/Năm (ví dụ: `Tháng 11/2026`), đồng thời gọi API kiểm tra an toàn dữ liệu thời gian thực (`/api/duty/periods/:id/deletion-check`).
  3. Cơ chế kiểm tra an toàn toàn diện:
     - Kiểm tra nguyện vọng đăng ký (`ShiftRegistration`).
     - Kiểm tra ca trực (`StudioShift`), phân định ca quá khứ vs ca tương lai.
     - Kiểm tra bản ghi chấm công thực tế (`AttendanceRecord`).
     - Kiểm tra bảng thanh toán thù lao tháng (`MonthlyPayroll`).
  4. Quy tắc bảo vệ lịch sử & dữ liệu thù lao tuyệt đối:
     - **Trường hợp đợt trống, đợt chỉ có nguyện vọng nháp, hoặc đợt tương lai chưa phát sinh chấm công/thù lao:** Cho phép xóa vật lý an toàn (`action: 'DELETED'`), giải phóng hoàn toàn bản ghi và ca nháp.
     - **Trường hợp đợt đã có dữ liệu lịch sử (đã có ca quá khứ, chấm công hoặc thù lao):** Nghiêm cấm xóa vật lý; chuyển sang cơ chế **Lưu trữ & Hủy đợt (`action: 'ARCHIVED'`)** với `status: 'CANCELLED'` (hoặc `ARCHIVED`), ghi log kiểm toán (audit trail), gỡ khung lịch khỏi danh sách hiển thị, nhưng bảo toàn 100% dữ liệu chấm công, công việc và thù lao của CTV.
     - Hiển thị lý do và hướng dẫn rõ ràng cho Admin ngay trên giao diện modal.
  5. Cập nhật giao diện tức thì không cần reload trang; phát sóng đồng bộ đa tab (`BroadcastChannel` & `CustomEvent`).
  6. Bảo mật RBAC 2 đầu: Chặn triệt để CTV gọi API xóa (trả về 403 Forbidden).
- **Hành động & Kết quả thực hiện:**
  1. **Database & Backend Models:**
     - `TN-Backend/src/models/DutyPeriod.js`: Mở rộng enum validation cho cột `status`: `['OPEN', 'CLOSED', 'ARRANGING', 'CONFIRMED', 'CANCELLED', 'ARCHIVED']`.
  2. **Backend Services & Controllers (`duty.service.js`, `duty.controller.js`):**
     - `getDutyPeriods`: Mặc định lọc bỏ các đợt `CANCELLED` và `ARCHIVED` để danh sách đợt hoạt động luôn sạch sẽ và cập nhật tức thì.
     - `createDutyPeriod`: Tích hợp logic tái kích hoạt (reactivate) nếu đợt tháng/năm đó trước đó đã bị `CANCELLED`/`ARCHIVED`, tránh lỗi vi phạm ràng buộc Unique `UQ_DutyPeriods_MonthYear` trong MSSQL.
     - `checkPeriodDeletionSafety(periodId)`: Trả về phân tích chi tiết: số lượng nguyện vọng, ca trực tổng, ca quá khứ, ca tương lai, chấm công, thù lao, cờ `hasHistoricalData`, `isHardDeletable`, cùng `reason`, `guidance` và `recommendedAction`.
     - `deleteDutyPeriod(adminUserId, periodId, options)`: Thực hiện xóa vật lý (transaction Sequelize an toàn) hoặc lưu trữ an toàn (hủy ca tương lai, giữ nguyên ca quá khứ, chấm công và thù lao, ghi log ghi chú kiểm toán).
     - `duty.routes.js`: Định nghĩa các route được bảo vệ bởi middleware `authenticate` và `authorize('ADMIN')`:
       + `GET /api/duty/periods/:id/deletion-check`
       + `DELETE /api/duty/periods/:id`
  3. **Frontend UI/UX (`TN-Frontend`):**
     - `TN-Frontend/src/lib/api.ts`: Bổ sung tham số `body` tùy chọn cho `api.delete`.
     - `TN-Frontend/src/app/admin/duty/page.tsx`:
       - Thêm icon thùng rác (`Trash2`) tại góc phải mỗi thẻ đợt tháng (bảo đảm `e.stopPropagation()` để không trigger chọn đợt).
       - Modal xác nhận xóa đợt phong cách dark theme hiện đại: Hiển thị tiêu đề rõ ràng `Xác nhận xóa đợt đăng ký - Tháng M/YYYY`.
       - Hiển thị thẻ tóm tắt an toàn dữ liệu: Báo cáo số CTV đăng ký, số ca trực, số bản ghi chấm công và thù lao.
       - Hiển thị badge động: "Xóa an toàn" (Màu xanh lá) cho đợt trống/nháp, hoặc "Lưu trữ bảo toàn dữ liệu" (Màu vàng cam/đỏ) kèm cảnh báo chi tiết và hướng xử lý cụ thể cho đợt có dữ liệu lịch sử.
       - Cập nhật state nội bộ ngay lập tức sau khi xóa/lưu trữ thành công, tự động chuyển selection sang đợt kế tiếp nếu đợt đang chọn bị xóa, đồng thời phát `BroadcastChannel` và CustomEvent `duty_schedule_updated`.
  4. **Kiểm thử tự động toàn diện:**
     - Tạo kịch bản kiểm thử tích hợp `TN-Backend/scripts/test_delete_duty_period_feature.js` bao quát 6 ca kiểm thử:
       + Test 1: Kiểm tra phân quyền RBAC (CTV bị chặn 403 Forbidden). -> **PASS**
       + Test 2: Đợt chưa có đăng ký (Xóa vật lý hoàn toàn). -> **PASS**
       + Test 3: Đợt đã có CTV đăng ký nguyện vọng (Xóa sạch nguyện vọng & đợt). -> **PASS**
       + Test 4: Đợt đã phân công ca nháp (Xóa sạch ca nháp & đợt). -> **PASS**
       + Test 5: Đợt đã xác nhận lịch trong tương lai (Xóa an toàn). -> **PASS**
       + Test 6: Đợt đã có dữ liệu lịch sử quan trọng (Tháng 11/2026: Chặn xóa vật lý, áp dụng Lưu trữ / Hủy đợt, bảo toàn 100% 59 bản ghi chấm công và 7 bảng thù lao). -> **PASS**
     - Backend Unit Tests: **89/89 tests PASS 100%**.
     - TypeScript Compilation (`tsc --noEmit`): **0 lỗi (0 errors)**.
     - Next.js Production Build: **26/26 routes hoàn tất thành công**.
- **Trạng thái:** `COMPLETED`


---

### PROMPT #19
- **Thời gian tiếp nhận:** 16/11/2026 - Tinh chỉnh chức năng Xóa toàn bộ dữ liệu khi xóa đợt đăng ký và Làm mới / Để trống hoàn toàn khi tạo đợt mới
- **Nội dung câu lệnh:**
```markdown
khi xoá đợt đăng ký toàn bộ dữ liệu sẽ bị xoá, khi tạo đợt mới dữ liệu sẽ hoàn toàn dc làm mới và để trống, hãy fix lại
```
- **Mục tiêu chính:**
  1. Loại bỏ hoàn toàn cơ chế "Lưu trữ / Hủy đợt (Archive / Soft cancel)" gây giữ lại dữ liệu lịch sử hoặc ca cũ.
  2. Khi ADMIN xóa một đợt đăng ký ca trực (`DELETE /api/duty/periods/:id`):
     - Xóa vật lý sạch sẽ 100% (Hard Delete) toàn bộ dữ liệu liên quan trong transaction:
       * Toàn bộ nguyện vọng đăng ký của CTV (`ShiftRegistration`) của đợt và trong toàn bộ tháng.
       * Toàn bộ ca trực Studio (`StudioShift`) thuộc đợt và trong tháng.
       * Toàn bộ bản ghi chấm công ca trực (`AttendanceRecord` mang ký hiệu `LV`, `sourceType: 'DUTY_SHIFT'/'STUDIO_SHIFT'`) của tháng.
       * Toàn bộ lịch sử chỉnh sửa (`DutyScheduleHistory`) của đợt và trong tháng.
       * Xóa vĩnh viễn bản ghi `DutyPeriod` chính nó khỏi Database MSSQL.
       * Tự động reset và đồng bộ lại bảng thù lao tháng (`MonthlyPayroll`: `totalShiftCount = 0, shiftHours = 0`).
  3. Khi tạo đợt mới (`POST /api/duty/periods`):
     - Dữ liệu hoàn toàn được làm mới và để trống 100%:
       * Dọn sạch mọi dữ liệu ca trực, nguyện vọng hoặc chấm công còn sót lại của tháng đó.
       * Khởi tạo `DutyPeriod` hoàn toàn mới với trạng thái `OPEN`, `confirmedByUserId = null`, `confirmedAt = null`.
       * Dữ liệu phân công và ma trận ca trực hoàn toàn sạch và để trống 100% (`0 CTV đăng ký, 0 ca phân công`, các slot ngày đều trống).
  4. Tinh chỉnh giao diện & Modal xác nhận:
     - Loại bỏ hoàn toàn cảnh báo chặn "Không thể xóa vật lý" và nút "Lưu trữ & Hủy đợt".
     - Hộp thoại xác nhận thống nhất: "Xác nhận xóa toàn bộ dữ liệu đợt này", nêu rõ số lượng đăng ký và ca phân công sẽ bị xóa.
     - Sau khi xóa, cập nhật state tức thì, tự động chuyển chọn đợt tiếp theo và phát sóng đa tab qua `BroadcastChannel` và CustomEvent `duty_schedule_updated`.
- **Hành động & Kết quả thực hiện:**
  1. **Backend (`duty.service.js`):**
     - `createDutyPeriod`: Hỗ trợ linh hoạt cả 2 kiểu tham số `(adminUserId, data)` và `(adminUserId, month, year, ...)`. Tự động dọn sạch mọi dữ liệu dư thừa của tháng đó trước khi tạo bản ghi mới để đảm bảo đợt mới hoàn toàn trống 100%. Nếu đợt cũ ở trạng thái CANCELLED/ARCHIVED, xóa đợt cũ hoàn toàn để tạo đợt mới tinh.
     - `checkPeriodDeletionSafety`: Báo cáo số lượng bản ghi liên quan (nguyện vọng, ca trực, chấm công), đặt `isHardDeletable = true` luôn luôn cho phép xóa toàn bộ.
     - `deleteDutyPeriod`: Thực hiện xóa vật lý triệt để toàn bộ `ShiftRegistration`, `StudioShift`, `AttendanceRecord` ca trực, `DutyScheduleHistory`, `DutyPeriod` trong transaction; reset `MonthlyPayroll` và tự động đồng bộ lại bảng thù lao.
  2. **Frontend UI/UX (`TN-Frontend/src/app/admin/duty/page.tsx`):**
     - Cập nhật `handleCreatePeriod`: Sau khi tạo thành công, tự động chọn đợt mới, tải summary trống, thông báo rõ ràng "Dữ liệu đã được làm mới và để trống" và phát sự kiện đồng bộ lịch.
     - Cập nhật `handleConfirmDeletePeriod`: Thực hiện gọi API DELETE trực tiếp không thông qua archive, thông báo thành công và cập nhật tức thì danh sách.
     - Cập nhật Modal Xóa đợt: Giao diện cảnh báo màu đỏ tinh gọn, xác nhận xóa toàn bộ dữ liệu, loại bỏ hoàn toàn nút và thông báo lưu trữ.
  3. **Kiểm thử tự động:**
     - Script kiểm thử `test_delete_duty_period_feature.js`: **PASS 100%** (Test 1: CTV bị chặn 403; Test 2: Đợt phong phú dữ liệu bị xóa sạch hoàn toàn từ DB; Test 3: Tạo đợt mới cho tháng đó có 0 CTV đăng ký, 0 ca phân công, 0 bản ghi chấm công, các slot đều rỗng).
     - Backend unit tests: **89/89 tests PASS 100%**.
     - TypeScript Compilation: **0 errors**.
     - Next.js Production Build: **26/26 routes hoàn tất thành công**.
- **Trạng thái:** `COMPLETED`


---

### PROMPT #28
- **Thời gian tiếp nhận:** 17/11/2026 - Cập nhật chức năng Đăng ký phòng Studio: Gợi ý khung giờ còn trống & Tự nhập giờ & Đặc quyền ADMIN
- **Nội dung câu lệnh:**
```markdown
Cập nhật chức năng Đăng ký phòng Studio: cho phép người dùng nhập khung giờ mong muốn hoặc chọn từ các khung giờ còn trống được hệ thống gợi ý. Tự động kiểm tra lịch phòng và áp dụng đúng quy tắc đặt phòng hiện tại: thứ Hai–thứ Bảy, 07:30–11:30 và 13:30–16:30, có thời gian đệm 30 phút; không cho USER đặt ngoài khung giờ hoặc vào thời gian không hợp lệ. Riêng tài khoản ADMIN được phép tạo đặt phòng ngoài khung giờ quy định và không bị giới hạn bởi quy tắc này, nhưng vẫn phải kiểm tra xung đột với các lịch đã xác nhận. Đồng bộ giao diện, API và Database; phân quyền đúng vai trò, giữ nguyên quy trình duyệt và các chức năng hiện có. Chỉ bổ sung hoặc sửa phần cần thiết, không ảnh hưởng các nghiệp vụ đã hoạt động đúng.
```
- **Mục tiêu chính:**
  1. **Hai phương thức chọn khung giờ trực quan trên giao diện Đặt phòng Studio (`/studio`):**
     - **Tab 1 - Gợi ý khung giờ còn trống:** Tự động tính toán các khung giờ trống khả dụng trong Ca sáng (07:30–11:30), Ca chiều (13:30–16:30) và Ca tối (17:30–21:30 dành cho Admin). Tự động loại trừ các lịch đã xác nhận (`CONFIRMED`/`COMPLETED`) và tính khoảng đệm an toàn 30 phút. Người dùng chỉ cần nhấp chuột 1 lần vào khung giờ để chọn.
     - **Tab 2 - Tự nhập khung giờ:** Cho phép người dùng tự do nhập ngày, giờ bắt đầu và giờ kết thúc tùy ý (`time` picker step 30 phút).
     - Giữ nguyên FullCalendar và tính năng chọn nhiều dải giờ cách quãng (multi-range).
  2. **Quy tắc khung giờ nghiêm ngặt cho Người dùng thường (USER / CTV):**
     - Chỉ được đặt từ Thứ Hai đến Thứ Bảy, trong khung giờ hành chính: Ca sáng 07:30–11:30 hoặc Ca chiều 13:30–16:30.
     - Studio đóng cửa vào Chủ nhật; chặn đặt ngoài khung giờ hoặc đặt xuyên trưa.
     - Bắt buộc khoảng đệm 30 phút trước và sau mỗi ca đã duyệt.
  3. **Đặc quyền tài khoản Quản trị viên (ADMIN):**
     - Được phép tạo đặt phòng ngoài khung giờ quy định (sáng sớm, buổi tối, Chủ nhật, sự kiện cấp trường).
     - Bỏ qua ràng buộc giờ hành chính 07:30–11:30 & 13:30–16:30 và cấm Chủ nhật.
     - Vẫn bắt buộc kiểm tra xung đột lịch và khoảng đệm 30 phút với các lịch đã xác nhận (`CONFIRMED`/`COMPLETED`) để tránh trùng phòng.
  4. **Backend API mới & Phân quyền bảo mật:**
     - Endpoint mới: `GET /api/studio-bookings/available-slots?date=YYYY-MM-DD&studioName=...` tính toán các khoảng trống thực tế và trả về danh sách slot khả dụng.
     - Cập nhật `POST /api/studio-bookings` và `reschedule` nhận diện `req.user.role` từ JWT token để cho phép Admin bypass giờ hành chính, bảo vệ an toàn từ phía server.
- **Hành động & Kết quả thực hiện:**
  - `TN-Backend/src/services/studioBooking.service.js`:
    * Hàm `validateOperatingHours(start, end, role)`: Nhận tham số role; nếu `role === 'ADMIN'` -> cho phép đặt ngoài giờ và Chủ nhật (chỉ yêu cầu cùng ngày và end > start); nếu không phải Admin -> áp dụng nghiêm ngặt giờ hành chính T2–T7.
    * Hàm `getAvailableSlots(dateString, studioName, role)`: Quét các booking đã duyệt, tính khoảng khóa (kèm đệm 30 phút ở cả 2 đầu), lọc theo ca (Sáng, Chiều, Tối), tự động phát hiện khoảng trống liên tục (gaps >= 30 phút), lọc bỏ các slot quá khứ nếu là hôm nay, trả về danh sách có cấu trúc `{ isOpen, date, shifts: [{ id, name, operatingHours, availableSlots }] }`.
    * Cập nhật `create` và `reschedule`: Tự động truyền `currentUser.role` vào `validateOperatingHours`.
  - `TN-Backend/src/controllers/studioBooking.controller.js` & `routes`:
    * Thêm controller action `getAvailableSlots(req, res)` và đăng ký route `GET /api/studio-bookings/available-slots`.
  - `TN-Frontend/src/app/studio/page.tsx`:
    * Bổ sung component "Khung Đăng Ký Đặt Phòng" với 2 tab "Gợi ý khung giờ còn trống" và "Tự nhập khung giờ".
    * Tích hợp gọi API `/api/studio-bookings/available-slots` tự động nạp slot khi đổi ngày.
    * Badge "Đặc quyền ADMIN" hiển thị rõ ràng khi Quản trị viên đăng nhập.
    * Xử lý click chọn slot gợi ý (`handleSelectSuggestedSlot`) và áp dụng giờ tự nhập (`handleApplyCustomTime`).
    * Cập nhật `validateOperatingHours` client-side cho phép Admin đặt mọi khung giờ.
  - `TN-Backend/test/unit.test.js`:
    * Bổ sung Suite 21: Kiểm thử phân quyền User vs Admin, thuật toán `getAvailableSlots`, kiểm tra xung đột lịch và khoảng đệm 30 phút.
    * Đạt **122/122 Unit Tests PASS 100%** (21 suites).
  - TypeScript Compilation: `tsc --noEmit` đạt **0 lỗi (0 errors)**.
  - Cả hai daemon server Backend (5000) và Frontend (3000) hoạt động ổn định.
- **Trạng thái:** `COMPLETED`


---

### PROMPT #29
- **Thời gian tiếp nhận:** 17/11/2026 - Ràng buộc tuyệt đối: Gợi ý khung giờ không được trùng với khung giờ đã có lịch
- **Nội dung câu lệnh:**
```markdown
khi gợi ý khung giờ phải ràng buộc không được để trùng với khung giờ đã có lịch
```
- **Mục tiêu & Nguyên nhân:**
  1. **Nguyên nhân cốt lõi (Root Cause):**
     - Trước đó, `getAvailableSlots` chỉ truy vấn các đơn có trạng thái `['CONFIRMED', 'COMPLETED']`, bỏ sót các đơn `PENDING` (chờ duyệt). Do đó, khi một người dùng đã đặt phòng và đơn đang chờ duyệt, hệ thống vẫn tiếp tục gợi ý khung giờ đó cho người khác.
     - Ngoài ra, trên FullCalendar của Frontend, các đơn `CANCELLED` trước đây bị gán mặc định nhãn `✓ Đã Duyệt` màu xanh (do điều kiện kiểm tra chỉ check `isApproved` và `REJECTED`, bỏ sót trạng thái `CANCELLED`), dẫn đến việc trên giao diện lịch có ô "✓ Đã Duyệt" nhưng hệ thống vẫn gợi ý khung giờ đó.
     - Ở chế độ `calendar=true`, người dùng thông thường trước đây chỉ lấy về booking của chính mình do phân quyền `where.userId = currentUser.id`, khiến họ không thấy được các ca đã duyệt của người khác trên lịch Studio dùng chung.
  2. **Giải pháp khắc phục toàn diện:**
     - **Backend (`studioBooking.service.js`):**
       + Mở rộng điều kiện khóa lịch: Truy vấn tất cả các đơn `status IN ('CONFIRMED', 'COMPLETED', 'PENDING', 'APPROVED')` kèm khoảng đệm 30 phút ở cả 2 đầu.
       + Chuẩn hóa múi giờ Việt Nam UTC+7 cho biên ngày (`vnStartOfDay` và `vnEndOfDay`).
       + Bổ sung bước hậu kiểm lọc (`verifiedSlots`) bằng `isSlotAvailable(sMin, eMin)` cho 100% các slot trước khi trả về client.
       + Cập nhật `findAll`: Khi `query.calendar === 'true'`, cho phép tất cả người dùng xem toàn bộ lịch `CONFIRMED`/`COMPLETED`/`PENDING` trên phòng Studio để thấy được thời gian bận.
     - **Frontend (`TN-Frontend/src/app/studio/page.tsx`):**
       + Mở rộng type `status: 'PENDING' | 'CONFIRMED' | 'APPROVED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED'`.
       + Sửa hiển thị `calendarEvents`: Nhận diện chuẩn xác `CONFIRMED`/`APPROVED` (xanh), `PENDING` (vàng chờ duyệt), `CANCELLED`/`REJECTED` (đỏ đã hủy).
       + Cập nhật `isOverlappingOrBufferViolation`: Xem tất cả các lịch chưa hủy (`!= CANCELLED` và `!= REJECTED`) là đang chiếm dụng phòng và có khoảng đệm 30 phút.
       + Thêm bộ lọc `validAvailableSlots` trực tiếp trên UI trước khi render danh sách nút slot gợi ý: Chỉ hiển thị các slot vượt qua kiểm tra `!isOverlappingOrBufferViolation(s, e)`.
       + Bổ sung kiểm tra trùng với danh sách dải giờ đã chọn (`confirmedRanges`) trong chế độ multi-range.
  3. **Kiểm thử tự động:**
     - Bổ sung Test case 21.5 trong `TN-Backend/test/unit.test.js`: Kiểm thử ràng buộc tuyệt đối loại bỏ trùng lặp với cả lịch `CONFIRMED` và `PENDING`.
     - Đạt **123/123 Unit Tests PASS 100%** (21 suites).
     - TypeScript Compilation: `tsc --noEmit` đạt **0 lỗi**.
- **Trạng thái:** `COMPLETED`


---

### PROMPT #30
- **Thời gian tiếp nhận:** 17/11/2026 - Kiểm tra và sửa lỗi giao diện tại mục Lịch sử thao tác (FR-09) & NotificationBell
- **Nội dung câu lệnh:**
```markdown
Kiểm tra và sửa lỗi giao diện tại mục Lịch sử thao tác (FR-09) theo ảnh đính kèm:
- Khắc phục tình trạng các thành phần bị chồng lấn, đặc biệt giữa khung thông báo, thẻ thống kê, thanh tìm kiếm và bộ lọc.
- Điều chỉnh vị trí, kích thước, z-index và cơ chế hiển thị của popup thông báo để không che khuất hoặc làm vỡ bố cục trang.
- Đảm bảo popup có thể cuộn nội dung độc lập, không tràn khỏi màn hình và đóng/mở đúng cách.
- Sắp xếp lại các thẻ thống kê, bộ lọc, bảng lịch sử thao tác theo bố cục rõ ràng, cân đối; đảm bảo bảng không bị cắt nội dung.
- Kiểm tra hiển thị trên các kích thước màn hình khác nhau, đặc biệt ở độ phân giải desktop.

Lưu ý: Kiểm tra nguyên nhân từ CSS, positioning, overflow, stacking context và responsive layout. Chỉ sửa giao diện và lỗi bố cục liên quan, không thay đổi API, dữ liệu, logic thông báo hoặc chức năng ghi nhận lịch sử thao tác đang hoạt động đúng. Sau khi sửa, kiểm tra thực tế cả khi popup thông báo mở và đóng.
```
- **Mục tiêu & Phân tích nguyên nhân gốc (Root Cause):**
  1. **Nguyên nhân cốt lõi gây chồng lấn (CSS Stacking Context Issue):**
     - Trong `TN-Frontend/src/components/AdminLayout.tsx`, thanh bên `<aside>` chứa `<NotificationBell align="left" />` sử dụng class `backdrop-blur-xl`. Theo quy chuẩn CSS, các bộ lọc (filter/backdrop-filter) tự động tạo một Stacking Context mới.
     - Tuy nhiên, `<aside>` không có `z-index` (mang giá trị `auto`), và container nội dung chính `<div className="flex-1">` nằm sau `<aside>` trong cấu trúc DOM.
     - Bên trong trang `audit-logs/page.tsx`, các thẻ KPI có thuộc tính `relative backdrop-blur-md` và ô tìm kiếm có thuộc tính `relative md:col-span-2`.
     - Theo thứ tự vẽ của CSS Stacking Context: Các phần tử `relative` trong DOM node con của sibling phía sau (`flex-1`) được vẽ SAU và ĐÈ LÊN các phần tử con của `<aside>`. Do đó, khi popup thông báo mở rộng sang phải, thẻ "Tổng số thao tác (7)" và ô tìm kiếm bị vẽ xuyên thấu và nổi đè lên trên popup thông báo.
  2. **Vấn đề kích thước, cuộn và đóng mở popup thông báo (`NotificationBell.tsx`):**
     - Thiếu nút đóng trực tiếp `[X]` trong header popup.
     - Thiếu sự kiện bắt phím `Escape` để người dùng tiện đóng bằng bàn phím.
     - Chiều cao popup chưa giới hạn theo viewport `max-h-[min(580px,85vh)]` dẫn đến nguy cơ tràn màn hình trên các màn hình laptop độ phân giải dọc thấp.
  3. **Bố cục trang Lịch sử thao tác (`/admin/audit-logs/page.tsx`):**
     - Bảng dữ liệu chưa có `min-w-[1020px]`, dẫn đến khi mở trên màn hình desktop chuẩn hoặc khi sidebar mở, các cột bị co cụm và có thể cắt chữ.
     - Bộ lọc ngày `Từ ngày: [input]` bị bóp méo do chia grid 4 cột với nhãn inline.
- **Hành động & Kết quả thực hiện:**
  - `TN-Frontend/src/components/AdminLayout.tsx`:
    * Thêm `relative z-40` vào thẻ `<aside className="... relative z-40">` giúp toàn bộ thanh bên và popup con luôn có Stacking Context cao hơn nội dung trang chính `flex-1`.
    * Thêm `relative z-30` vào mobile `<header>` để bảo vệ popup thông báo trên giao diện di động.
  - `TN-Frontend/src/components/NotificationBell.tsx`:
    * Đặt z-index của container popup lên `z-[100]`, kết hợp `max-h-[min(580px,85vh)] flex flex-col`.
    * Thêm nút đóng `[X]` trực tiếp ở góc phải header popup bên cạnh nút "Đã đọc tất cả".
    * Thêm sự kiện bàn phím lắng nghe phím `Escape` để lập tức đóng popup khi người dùng bấm phím Esc.
    * Tăng cường vùng cuộn danh sách thông báo: `overscroll-contain overflow-y-auto max-h-[380px]`, các phần Header và Footer được gắn `shrink-0` đảm bảo không bị méo.
  - `TN-Frontend/src/app/admin/audit-logs/page.tsx`:
    * Thẻ thống kê KPI: Tối ưu grid responsive `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4` với padding chuẩn `p-5`, giúp các thẻ cân đối, không bị chèn ép chữ.
    * Khung bộ lọc tra cứu nâng cao: Thiết kế lại theo lưới `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5` với nhãn `label` phía trên rõ ràng, hỗ trợ `[color-scheme:dark]` cho 2 ô chọn ngày `Từ ngày` và `Đến ngày`, tránh tình trạng co giật hay cắt chữ trên các độ phân giải desktop.
    * Bảng lịch sử thao tác: Bổ sung `min-w-[1020px]` trong thẻ `overflow-x-auto` và định nghĩa độ rộng chuẩn cho từng cột (`Thời gian 170px`, `Người thực hiện 190px`, `Hành động 150px`, `Nội dung min-w-[320px]`, `Địa chỉ IP 120px`, `Trạng thái 120px`, `Chi tiết 80px`). Bảng hiển thị thông thoáng, không bao giờ bị cắt nội dung.
    * Modal xem chi tiết Audit Log: Nâng z-index lên `z-[100]` và bổ sung sự kiện phím `Escape` để đóng modal tiện lợi.
  - **Kiểm tra và xác nhận:**
    * TypeScript: `npx tsc --noEmit` đạt **0 lỗi (0 errors)**.
    * Unit Tests: `npm test` đạt **123/123 tests PASS 100%** (21 suites).
    * Hai tiến trình Backend và Frontend đang hoạt động bình thường.
- **Trạng thái:** `COMPLETED`


---

### PROMPT #31
- **Thời gian tiếp nhận:** 17/11/2026 - Tạo mục “Tổng công việc tháng” dành cho CTV (Read-only & Đồng bộ Bảng thống kê ADMIN)
- **Nội dung câu lệnh:**
```markdown
Tạo mục “Tổng công việc tháng” dành cho CTV, với giao diện bảng thống kê tương tự mục Bảng thống kê công việc của ADMIN.

- CTV chỉ được xem danh sách công việc của chính mình, không được xem dữ liệu của CTV khác.
- Hiển thị đầy đủ: STT, ngày thực hiện, nội dung công việc, nhiệm vụ, số giờ thực hiện, trạng thái duyệt và ghi chú.
- Bổ sung bộ lọc tháng/năm, mặc định là tháng hiện tại; cho phép xem lại dữ liệu các tháng trước.
- Hiển thị tổng số công việc, tổng giờ đã thực hiện và tổng giờ được Nhân sự xác nhận.
- Các công việc được nhân hệ số phải có ghi chú và highlight rõ số giờ ngoài giờ/Chủ nhật cùng hệ số áp dụng.
- Đồng bộ dữ liệu trực tiếp với Bảng thống kê công việc của ADMIN; khi ADMIN cập nhật hoặc xác nhận công việc, trang CTV phải cập nhật tương ứng.
- Chỉ cho phép CTV xem, không được tự ý chỉnh sửa hoặc xác nhận dữ liệu thống kê.

Kiểm tra API phân quyền và Database trước khi triển khai. Tận dụng dữ liệu và giao diện hiện có, không tạo nguồn dữ liệu trùng lặp, không ảnh hưởng chức năng của ADMIN và các nghiệp vụ tính công, tính lương đã hoàn thiện.
```
- **Mục tiêu & Thiết kế giải pháp:**
  1. **Bảo mật & Phân quyền RBAC Backend:**
     - Endpoint mới: `GET /api/payroll/collaborator-summary?month=M&year=Y` với quyền `authenticate, authorize('COLLABORATOR', 'ADMIN')`.
     - Chặn tuyệt đối rò rỉ dữ liệu giữa các CTV: Nếu người gọi là `COLLABORATOR`, controller tự động khóa cứng `ctvUserId = req.user.id`, ngăn chặn hoàn toàn việc CTV giả mạo query parameter để xem dữ liệu của CTV khác.
     - Cập nhật cả `GET /api/payroll/tasks-summary`: Bổ sung tham số `targetUserId`, nếu role là `COLLABORATOR` thì chỉ lấy nhóm của chính mình.
  2. **Dữ liệu & Logic Thống kê (Single Source of Truth):**
     - Hàm `getCollaboratorMonthlySummary(month, year, ctvUserId)` trong `payroll.service.js`:
       * Trích xuất toàn bộ nhiệm vụ của CTV trong tháng (theo `executionDate`, `completedAt`, `createdAt`).
       * Tính toán 4 chỉ số thống kê:
         - `totalTasks`: Tổng số công việc trong tháng.
         - `totalHoursWorked`: Tổng số giờ thực tế đã làm/nộp.
         - `confirmedHours`: Tổng số giờ được Nhân sự xác nhận nghiệm thu (`COMPLETED`).
         - `confirmedConvertedHours`: Tổng số giờ quy đổi sau hệ số (áp dụng cùng hàm `calculateTaskHoursAndMultiplier` như ADMIN).
         - `estimatedSalary`: `confirmedConvertedHours * 20.000 VNĐ`.
       * Chuẩn hóa từng dòng công việc: `stt`, `date`, `title`, `content`, `taskType`, `hours`, `convertedHours`, `status`, `multiplier`, `isHighlighted`, `multiplierNote`, `note`.
       * Công việc đủ điều kiện nhân hệ số (và đã duyệt hoàn thành): Được gắn `isHighlighted = true` và ghi chú chi tiết (`Ngoài giờ: X giờ × 1,5`, `Chủ nhật: Y giờ × 2`...).
       * Công việc chưa hoàn thành (`PENDING_APPROVAL`): Thể hiện rõ `Chờ Nhân sự duyệt để tính hệ số`, không cộng vào quỹ giờ xác nhận.
  3. **Giao diện Frontend (`/tasks/summary` & Điều hướng):**
     - Tạo trang chuyên biệt `TN-Frontend/src/app/tasks/summary/page.tsx`:
       * Read-only 100%: CTV chỉ xem dữ liệu, không có nút sửa/xóa/xác nhận.
       * Bộ lọc Tháng (1..12) và Năm (2025, 2026, 2027) kèm nút chuyển nhanh Tháng trước / Tháng sau và Về tháng hiện tại.
       * 4 Thẻ KPI: Tổng số công việc, Tổng giờ đã thực hiện, Tổng giờ được Nhân sự xác nhận, Giờ quy đổi & Thù lao dự tính.
       * Bảng thống kê chi tiết chuẩn mẫu: STT, Ngày thực hiện, Nội dung công việc, Nhiệm vụ, Số giờ thực hiện (kèm giờ quy đổi), Trạng thái duyệt (badge trực quan), Ghi chú & Hệ số (highlight vàng hổ phách), Nút xem chi tiết (modal).
       * Hàng tổng kết chân bảng (Footer row) hiển thị đầy đủ tổng giờ và tổng thù lao.
     - Cập nhật Điều hướng hệ thống:
       * `Navbar.tsx`: Bổ sung mục "Tổng công việc tháng" (`/tasks/summary`) với icon `FileSpreadsheet` cho CTV và Admin trên thanh điều hướng chính.
       * `tasks/page.tsx`: Bổ sung nút liên kết "Tổng công việc tháng" trong Mode Switcher đầu trang.
  4. **Kiểm thử tự động:**
     - Bổ sung Unit Test Suite 22 vào `TN-Backend/test/unit.test.js`:
       * 22.1. Trích xuất chính xác danh sách nhiệm vụ của CTV trong tháng và hệ số quy đổi.
       * 22.2. Phân biệt rõ Tổng giờ đã thực hiện (10.5h) và Giờ được Nhân sự xác nhận (7.0h).
       * 22.3. Ràng buộc bảo mật RBAC: Chặn rò rỉ dữ liệu chéo giữa các CTV.
       * 22.4. Xử lý an toàn khi không tìm thấy CTV.
     - Đạt **127/127 Unit Tests PASS 100%** (22 test suites).
     - TypeScript Compilation: `tsc --noEmit` đạt **0 lỗi**.
- **Trạng thái:** `COMPLETED`


---

### PROMPT #32
- **Thời gian tiếp nhận:** 17/11/2026 - Bổ sung chức năng xác nhận đến sử dụng Studio tại mục Phê duyệt yêu cầu đặt Studio
- **Nội dung câu lệnh:**
```markdown
Bổ sung chức năng **xác nhận đến sử dụng Studio** tại mục **Phê duyệt yêu cầu đặt Studio**:

- Khi đến ngày đặt phòng, người dùng được phép nhấn nút **“Xác nhận đã đến”** để thông báo đã có mặt và sử dụng Studio theo lịch đăng ký.
- Sau khi người dùng xác nhận, hệ thống gửi thông báo đến ADMIN và chuyển yêu cầu sang trạng thái **“Chờ xác nhận có mặt”**.
- ADMIN có thể kiểm tra và nhấn **“Xác nhận đã sử dụng”** để hoàn tất bước xác nhận.
- Hiển thị rõ trạng thái: Chưa đến ngày đặt, Chờ xác nhận người dùng, Chờ ADMIN xác nhận, Đã xác nhận sử dụng.
- Lưu thời gian người dùng xác nhận và thời gian ADMIN xác nhận để phục vụ tra cứu, thống kê và truy vết.
- Chỉ cho phép người dùng xác nhận trong ngày đặt phòng; ADMIN có quyền xử lý và xác nhận theo nghiệp vụ.
- Không cho phép xác nhận trùng lặp; xử lý trường hợp người dùng không đến hoặc ADMIN chưa xác nhận.

Kiểm tra và đồng bộ Frontend, Backend, Database, phân quyền và hệ thống thông báo. Tận dụng quy trình đặt phòng hiện có, không làm thay đổi trạng thái duyệt đặt phòng ban đầu, không tự động đánh dấu đã sử dụng khi yêu cầu mới được phê duyệt. Chỉ bổ sung phần còn thiếu, bảo toàn dữ liệu và chức năng đang hoạt động đúng.
```
- **Mục tiêu & Thiết kế giải pháp:**
  1. **Nâng cấp CSDL (Database Schema):**
     - Bổ sung 3 trường mới vào bảng `StudioBookings` trên SQL Server:
       * `user_check_in_at` (`DATETIMEOFFSET NULL`): Thời điểm người dùng nhấn "Xác nhận đã đến".
       * `admin_confirmed_at` (`DATETIMEOFFSET NULL`): Thời điểm Quản trị viên nhấn "Xác nhận đã sử dụng".
       * `attendance_status` (`NVARCHAR(30) NULL DEFAULT 'NOT_ARRIVED'`): Trạng thái điểm danh (`NOT_ARRIVED` | `USER_CHECKED_IN` | `ADMIN_CONFIRMED` | `ABSENT`).
     - Khai báo 3 trường tương ứng trong Sequelize Model `TN-Backend/src/models/StudioBooking.js`.
  2. **Trạng thái 4 cấp độ & Quy tắc nghiệp vụ (State Machine):**
     - Hàm `computeAttendanceInfo(booking)` trong `studioBooking.service.js`:
       * 1. **Chưa đến ngày đặt (`FUTURE_BOOKING`)**: Ngày đặt ở tương lai (`bookingDate > todayVN`).
       * 2. **Chờ xác nhận người dùng (`WAITING_USER_CHECKIN`)**: Đúng ngày đặt (`bookingDate === todayVN`), chưa check-in.
       * 3. **Chờ ADMIN xác nhận (`WAITING_ADMIN_CONFIRM`)**: Người dùng đã check-in (`userCheckInAt != null`), chờ Admin hoàn tất bước sử dụng.
       * 4. **Đã xác nhận sử dụng (`USAGE_CONFIRMED`)**: Admin đã xác nhận (`adminConfirmedAt != null` hoặc `status === 'COMPLETED'`).
       * *(Vắng mặt / Quá hạn - `ABSENT`)*: Quá hạn ngày đặt hoặc Admin đánh dấu vắng mặt.
  3. **Backend API & Nghiệp vụ:**
     - `PUT /api/studio-bookings/:id/check-in`:
       * Người đặt phòng xác nhận có mặt vào đúng ngày đặt phòng.
       * Chặn nếu chưa duyệt (`PENDING`), chặn nếu khác ngày (`bookingDate !== todayVN`).
       * Chống xác nhận trùng lặp: Báo lỗi nếu đã check-in.
       * Cập nhật `userCheckInAt = new Date()`, `attendanceStatus = 'USER_CHECKED_IN'`.
       * Gửi thông báo in-app đến toàn bộ ADMIN (`STUDIO_USER_CHECKED_IN`).
       * Ghi AuditLog thao tác `CHECK_IN`.
     - `PUT /api/studio-bookings/:id/confirm-usage`:
       * Quản trị viên (ADMIN) hoàn tất xác nhận sử dụng.
       * Cập nhật `adminConfirmedAt = new Date()`, `status = 'COMPLETED'`, `attendanceStatus = 'ADMIN_CONFIRMED'`.
       * Lưu vết lịch sử vào trường `notes`.
       * Gửi thông báo hoàn tất đến người đặt phòng (`STUDIO_USAGE_CONFIRMED`).
       * Ghi AuditLog thao tác `CONFIRM_USAGE`.
     - `PUT /api/studio-bookings/:id/mark-absent`:
       * Quản trị viên xử lý trường hợp người dùng không đến sử dụng (`attendanceStatus = 'ABSENT'`).
       * Ghi AuditLog thao tác `MARK_ABSENT`.
  4. **Giao diện Quản trị viên (`TN-Frontend/src/app/admin/requests/page.tsx`):**
     - Bổ sung cột **“Xác nhận sử dụng”** hiển thị badge 4 cấp độ kèm thời gian check-in/xác nhận.
     - Nút **“Xác nhận đã sử dụng”** hiển thị trực tiếp trên dòng danh sách khi yêu cầu ở trạng thái `Chờ ADMIN xác nhận`.
     - Modal chi tiết hiển thị đầy đủ thông tin: Người dùng xác nhận đến (HH:mm dd/MM/yyyy), Admin xác nhận sử dụng (HH:mm dd/MM/yyyy), nút "Xác nhận đã sử dụng" và nút "Đánh dấu vắng mặt".
  5. **Giao diện Người dùng (`TN-Frontend/src/app/history/page.tsx`):**
     - Bổ sung cột **“Xác nhận sử dụng”** hiển thị rõ ràng tiến trình sử dụng.
     - Nút **“Xác nhận đã đến”** tự động sáng lên vào đúng ngày đặt phòng.
     - Khi đã bấm, hiển thị badge "Chờ ADMIN xác nhận" kèm thời gian có mặt; khi Admin hoàn tất, hiển thị badge "Đã xác nhận sử dụng".
  6. **Kiểm thử tự động & Xác nhận chất lượng:**
     - Bổ sung Unit Test Suite 23 vào `TN-Backend/test/unit.test.js` với 6 kịch bản toàn diện (computeAttendanceInfo 4 cấp độ, check-in đúng ngày, chặn trước/sau ngày, chống trùng lặp, Admin xác nhận, đánh dấu vắng mặt).
     - Kết quả kiểm thử: **133/133 tests PASS 100%** (23 suites).
     - Frontend TypeScript: `tsc --noEmit` đạt **0 lỗi (0 errors)**.
- **Trạng thái:** `COMPLETED`
