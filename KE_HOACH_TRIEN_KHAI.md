# KẾ HOẠCH TRIỂN KHAI HOÀN THIỆN HỆ THỐNG LHU MEDIA STUDIO
**Dự án:** Hệ thống Quản lý Thiết bị và Đặt phòng Studio – Trường Đại học Lạc Hồng (LHU Media Studio)  
**Thời gian thực hiện:** Từ ngày 09/11/2026 đến hết ngày 30/11/2026  
**Vai trò phụ trách:** Senior Software Engineer, System Analyst và Technical Project Manager  
**Mục tiêu:** Hoàn thiện 100% các yêu cầu chức năng tốt nghiệp theo chuẩn tài liệu đặc tả, bảo vệ tuyệt đối các chức năng đã hoàn thành, kiểm soát rủi ro và đảm bảo tiến độ bàn giao.

---

## PHẦN I. NGUYÊN TẮC BẮT BUỘC TRƯỚC KHI BẮT ĐẦU MỖI NHIỆM VỤ

> [!IMPORTANT]
> **ĐIỀU KIỆN TIÊN QUYẾT TRƯỚC KHI CODE:**  
> Trước khi thực hiện bất kỳ thay đổi nào trong mã nguồn hoặc database, AI/Kỹ sư **BẮT BUỘC PHẢI ĐỌC LẠI 5 TÀI LIỆU SAU**:
> 1. `LHU_Media_Studio_Skill.md` (Quy tắc làm việc với AI)
> 2. `LHU_Media_Studio_Kien_Truc_He_Thong.md` (Kiến trúc hệ thống chuẩn)
> 3. `LHU_Media_Studio_Chuc_Nang_He_Thong.md` (Chức năng hệ thống FR-01 đến FR-09)
> 4. `LHU_Media_Studio_Quy_Tac_Nghiep_Vu.md` (Quy tắc nghiệp vụ & tính toán thù lao)
> 5. `KE_HOACH_TRIEN_KHAI.md` (File kế hoạch này để nắm đúng giai đoạn và phạm vi)

### 1. Nguyên tắc bảo vệ chức năng COMPLETED (Bất khả xâm phạm)
1. **Không viết lại** các chức năng đã hoàn thành và đang hoạt động tốt.
2. **Không refactor** code đã hoàn thành chỉ vì sở thích cá nhân.
3. **Không tự ý đổi tên** file, component, API routes, biến, model hoặc schema database.
4. **Không thay đổi giao diện** đã hoàn thiện trừ khi có yêu cầu bổ sung nút chức năng còn thiếu.
5. **Không xóa hoặc thay thế** logic đang hoạt động ổn định.
6. **Không tự ý nâng cấp/thay đổi phiên bản thư viện** nếu không bắt buộc.
7. Khi bắt buộc phải sửa code dùng chung, phải đánh giá tác động, báo cáo người dùng và kiểm thử hồi quy (regression test) toàn bộ chức năng liên quan.

### 2. Quy trình 9 bước thực hiện từng nhiệm vụ
Mỗi khi người dùng giao một nhiệm vụ:
1. **Bước 1:** Xác định nhiệm vụ thuộc FR nào và Giai đoạn nào trong kế hoạch.
2. **Bước 2:** Đọc lại code hiện tại của module liên quan.
3. **Bước 3:** Kiểm tra trạng thái hiện tại trước khi sửa.
4. **Bước 4:** Xác định danh sách file được phép chỉnh sửa/tạo mới.
5. **Bước 5:** Đưa ra phương án thực hiện ngắn gọn cho người dùng nắm.
6. **Bước 6:** Triển khai đúng nhiệm vụ được giao, không lan man sang phần khác.
7. **Bước 7:** Kiểm thử chức năng vừa thực hiện (Happy path, Edge cases, RBAC).
8. **Bước 8:** Kiểm thử hồi quy các chức năng COMPLETED có nguy cơ bị ảnh hưởng.
9. **Bước 9:** Báo cáo kết quả và cập nhật trạng thái tiến độ trong kế hoạch.

### 3. Quy chuẩn trạng thái tiến độ (Progress Status)
- `NOT_STARTED`: Chưa bắt đầu.
- `IN_PROGRESS`: Đang thực hiện.
- `BLOCKED`: Đang bị nghẽn (thiếu thông tin, lỗi môi trường...).
- `COMPLETED`: Đã hoàn thành, đúng nghiệp vụ và đã kiểm chứng.
- `NEEDS_REVIEW`: Đã xong code, đang chờ người dùng kiểm tra/nghiệm thu.

---

## PHẦN II. ĐÁNH GIÁ HIỆN TRẠNG CHỨC NĂNG (FR-01 ĐẾN FR-09)

### 1. Danh sách chức năng COMPLETED (Phạm vi bảo vệ nguyên vẹn)
- **FR-01.1, FR-01.2, FR-01.3:** Quản lý CRUD Thiết bị, Danh mục, Tra cứu tìm kiếm, Upload ảnh.
- **FR-02.1, FR-02.3:** Tạo yêu cầu mượn thiết bị (giỏ mượn), Duyệt/Từ chối đơn mượn với Transaction lock.
- **FR-03.1, FR-03.2, FR-03.4:** Đặt phòng Studio, Xem lịch FullCalendar, Duyệt/Từ chối đặt phòng, Hủy phòng bởi User.
- **FR-06.1, FR-06.2, FR-06.5:** Đăng ký tài khoản, Xác thực OTP email 6 số, Đăng nhập JWT, Quên mật khẩu qua OTP email.
- **FR-08.1, FR-08.3, FR-08.6:** Dashboard Thống kê thiết bị, Thống kê đặt phòng Studio, Thống kê nhân sự, Xuất Excel 4 sheet.
- **CMS Trang chủ:** Quản lý Services, Gallery ảnh, Banner nội dung trang chủ.

### 2. Danh sách chức năng PARTIAL (Cần sửa lỗi và bổ sung)
- **FR-06.3 (Sửa lỗi Role CTV):** Backend `User.js` và `dashboard.routes.js` đang chặn role `COLLABORATOR` (chỉ cho ADMIN/USER).
- **FR-06.4 (Khóa/Mở khóa tài khoản):** Backend có API `PATCH /admin/users/:id/toggle-active`, Frontend chưa có nút bấm trên bảng Users.
- **FR-03.5 (Lỗ hổng duyệt đè lịch Studio):** Backend hàm `processBooking('confirm')` chưa kiểm tra lại xung đột lúc duyệt; lệch pha cờ `warning/force` với Frontend.
- **FR-03.3 (Quy chuẩn đặt Studio):** Chưa áp dụng giờ mở cửa (07:30–11:30 & 13:30–16:30 T2–T7), chặn ngày nghỉ và buffer 30 phút giữa 2 lượt đặt.
- **FR-02.4 (Bàn giao thực tế):** Đơn mượn thiếu trạng thái `HANDED_OVER` (mới chỉ có `APPROVED -> RETURNED`), thiếu ghi nhận tình trạng máy lúc giao và lúc trả.
- **FR-03.6 (Dời lịch Studio):** Mới có hủy lịch, chưa có chức năng dời lịch hoặc chỉnh sửa thông tin booking.
- **FR-01.4 (Trạng thái thiết bị):** Bổ sung các trạng thái theo tài liệu (`Hư hỏng`, `Đang sửa chữa`, `Tạm ngưng sử dụng`, `Hủy bỏ`).
- **FR-07.2 (Email thông báo):** Mới có email OTP, chưa có email thông báo kết quả duyệt đơn và giao việc.
- **FR-08.7 (Xuất Excel):** Đã có xuất báo cáo chung, thiếu xuất Bảng lương tháng CTV theo FR-05.

### 3. Danh sách chức năng NOT_IMPLEMENTED (Cần xây dựng mới hoàn toàn)
- **Phân hệ Quản lý công việc (FR-04):** Giao việc, deadline, tiến độ, nộp minh chứng, yêu cầu sửa, nghiệm thu, tự động ghi Bảng công việc tháng, CTV khai báo việc ngoài hệ thống.
- **Phân hệ Lịch trực & Giờ công CTV (FR-05):** CTV đăng ký trực, Nhân sự xếp ca 4 tiếng, ghi Bảng công việc tháng, tính thù lao theo 7 quy tắc, xuất Excel Bảng lương tháng.
- **Quản lý thiết bị quá hạn (FR-02.5):** Trạng thái `OVERDUE`, quét tự động và cảnh báo quá hạn.
- **Lịch sử bảo trì, sửa chữa, mất, thanh lý (FR-01.5):** Bảng `EquipmentMaintenance`, ghi nhận hóa đơn sửa chữa và biên bản tài sản.
- **Thông báo in-app trên website (FR-07.1, FR-07.3):** Bảng `Notifications`, quả chuông thông báo trên Navbar, đánh dấu đã đọc.
- **Lịch sử thao tác hệ thống (FR-09):** Bảng `AuditLogs`, middleware tự động ghi vết thay đổi cho Admin tra cứu.

---

## PHẦN III. SƠ ĐỒ PHỤ THUỘC GIỮA CÁC MODULE (DEPENDENCY GRAPH)

```text
[TẦNG 1: TÀI KHOẢN & PHÂN QUYỀN (FR-06)]
  ├── Fix Role COLLABORATOR trong User Model & Dashboard Routes
  └── Hoàn thiện 3 vai trò: Nhân sự (Admin), CTV (Collaborator), Người dùng (User)
            │
            ├─────────────────────────────────────────┐
            ▼                                         ▼
[TẦNG 2A: THIẾT BỊ & MƯỢN TRẢ (FR-01, FR-02)]   [TẦNG 2B: PHÒNG STUDIO (FR-03)]
  ├── Bàn giao thực tế (HANDED_OVER)               ├── Giờ hoạt động & Buffer 30 phút
  ├── Tình trạng máy lúc giao/nhận                 ├── Check conflict lúc Duyệt (Backend)
  ├── Quét & cảnh báo Quá hạn (OVERDUE)            └── Dời lịch / Chỉnh sửa lịch
  └── Lịch sử bảo trì / Sửa chữa (FR-01.5)
            │                                         │
            └────────────────────┬────────────────────┘
                                 ▼
[TẦNG 3: QUẢN LÝ CÔNG VIỆC & LỊCH TRỰC CTV (FR-04, FR-05)]
  ├── Giao nhiệm vụ cho CTV, Deadline, Nộp minh chứng, Nghiệm thu (FR-04)
  ├── CTV khai báo công việc ngoài hệ thống & Nhân sự xác minh
  └── CTV đăng ký trực & Nhân sự xếp ca trực tiêu chuẩn 4 giờ (FR-05)
                                 │
                                 ▼
[TẦNG 4: BẢNG CÔNG VIỆC THÁNG & TÍNH THÙ LAO CTV (FR-05)]
  ├── Bảng công việc tháng (Tự động ghi nhận khi giao việc & duyệt ca trực)
  ├── Tổng hợp giờ công (Loại trừ ca tương lai & việc chưa nghiệm thu)
  ├── Thuật toán tính thù lao CTV theo 7 quy tắc bắt buộc
  └── Xuất Excel Bảng lương tháng CTV (riêng biệt với Bảng công việc tháng)
                                 │
                                 ▼
[TẦNG 5: THÔNG BÁO, AUDIT LOG & THỐNG KÊ (FR-07, FR-08, FR-09)]
  ├── Quả chuông thông báo trên Web & Email giao dịch (FR-07)
  ├── Nhật ký thao tác hệ thống Audit Log (FR-09)
  └── Thống kê công việc, giờ công & thù lao trên Dashboard (FR-08)
```

---

## PHẦN IV. KẾ HOẠCH TRIỂN KHAI THEO 5 GIAI ĐOẠN (09/11 – 30/11/2026)

### GIAI ĐOẠN 1 (09/11 – 12/11/2026): SỬA LỖI NỀN TẢNG & HOÀN THIỆN MƯỢN TRẢ, STUDIO
- [x] **Task 1.1 (FR-06.3):** Sửa lỗi enum role `COLLABORATOR` trong Backend & CSDL SQL Server:
  - Cập nhật Model `TN-Backend/src/models/User.js`: tăng độ dài `DataTypes.STRING(20)`, cập nhật validator `isIn: [['ADMIN', 'USER', 'COLLABORATOR']]`.
  - Cập nhật Route `TN-Backend/src/routes/dashboard.routes.js`: cho phép chuyển đổi role sang `COLLABORATOR` và trả về thông báo chuẩn.
  - Cập nhật Swagger documentation trong `admin.routes.js`, `auth.controller.js`.
  - Cập nhật RBAC trong `borrowRequest.service.js` & `studioBooking.service.js` đảm bảo USER & COLLABORATOR chỉ xem dữ liệu cá nhân, ADMIN xem toàn bộ.
  - Cập nhật `reports.routes.js` thêm thống kê số lượng CTV vào báo cáo tổng hợp.
  - Bổ sung Unit Test cho vai trò `COLLABORATOR` trong `test/unit.test.js`.
  - **Khắc phục lỗi CSDL (09/11/2026):** Phát hiện lỗi `String or binary data would be truncated` do cột `Users.role` trong SQL Server ban đầu là `NVARCHAR(10)` (chưa tự động alter qua Sequelize sync). Đã thực thi `ALTER TABLE [dbo].[Users] ALTER COLUMN [role] NVARCHAR(20) NOT NULL;` an toàn, bảo toàn 100% dữ liệu. Đã kiểm thử thực tế 10/10 test case bắt buộc (tạo, cập nhật, đăng nhập, phân quyền RBAC và truy vấn CSDL).
- [x] **Task 1.2 (FR-06.4):** Tích hợp nút Khóa/Mở khóa tài khoản trên Frontend kết nối API `PATCH /admin/users/:id/toggle-active`:
  - Cập nhật Backend `TN-Backend/src/routes/admin.routes.js`: Thêm cơ chế bảo vệ chặn Admin tự khóa tài khoản của chính mình (`req.params.id === req.user.id`).
  - Cập nhật Frontend `TN-Frontend/src/app/admin/users/page.tsx`:
    * Mở rộng `interface User` với trường `isActive?: boolean`.
    * Thêm cột "Trạng thái" hiển thị badge "Hoạt động" (xanh lá) hoặc "Đã khóa" (đỏ).
    * Thêm nút thao tác Khóa (icon Lock) / Mở khóa (icon Unlock) gọi API qua `api.patch()`.
    * Chặn Admin tự thao tác trên chính tài khoản của mình kèm thông báo cảnh báo trực quan.
    * Đã kiểm tra TypeScript build thành công 0 lỗi.
- [x] **Task 1.3 (FR-03.5 & FR-03.3):** Khắc phục lỗi duyệt đè lịch Studio trong `studioBooking.service.js`, ràng buộc giờ hoạt động và buffer 30 phút:
  - Cập nhật Backend `TN-Backend/src/services/studioBooking.service.js`:
    * Hàm `validateOperatingHours`: Ràng buộc khung giờ Thứ Hai – Thứ Bảy (Sáng: 07:30–11:30, Chiều: 13:30–16:30), chặn Chủ nhật, chặn đặt xuyên trưa/ngoài giờ/xuyên ngày.
    * Hàm `checkStudioConflict`: Thuật toán kiểm tra xung đột trùng lịch và khoảng đệm 30 phút (buffer `[start - 30m, end + 30m]`).
    * Hàm `processBooking`: Kiểm tra lại xung đột lúc Admin duyệt; trả về cảnh báo `{ status: 'warning' }` nếu trùng/vi phạm buffer khi chưa có cờ `force`, hỗ trợ duyệt đè có chủ đích (sự kiện cấp trường) khi `force: true`.
  - Cập nhật Routes & Controller (`studioBooking.routes.js`, `compat.routes.js`, `studioBooking.controller.js`): Nhận diện cờ `force` và xử lý cảnh báo chuẩn.
  - Cập nhật Frontend `TN-Frontend/src/app/studio/page.tsx`: Kiểm tra giờ hoạt động, Chủ nhật và khoảng đệm 30 phút ngay khi chọn dải giờ và trước khi gửi request.
  - Bổ sung Unit Test Suite 4 (`TN-Backend/test/unit.test.js`): 9 test cases bao quát đầy đủ logic buffer 30 phút và giờ hoạt động (26/26 tests backend pass 100%).
- [x] **Task 1.4 (FR-02.4 & FR-02.5):** Bổ sung trạng thái Bàn giao (`HANDED_OVER`), nút "Bàn giao thiết bị" trên Admin Requests, ghi nhận tình trạng máy lúc giao/nhận. Thêm trạng thái Quá hạn (`OVERDUE`) và cảnh báo trễ hạn.
  - *Kết quả thực hiện:*
    * SQL Server: Thêm 4 cột `handed_over_at`, `handover_condition`, `return_condition`, `admin_note` vào bảng `BorrowRequests`.
    * Model `BorrowRequest.js`: Cập nhật enum validator `['PENDING', 'APPROVED', 'HANDED_OVER', 'OVERDUE', 'REJECTED', 'RETURNED']` và 4 trường mới.
    * Service `borrowRequest.service.js`:
      + Tự động cập nhật `OVERDUE` khi gọi `findAll` nếu đơn `HANDED_OVER` có `returnDate < NOW`.
      + Hàm `handoverEquipment`: Chuyển đơn từ `APPROVED` -> `HANDED_OVER`, ghi nhận ngày giờ bàn giao và biên bản tình trạng máy, cập nhật thiết bị thành `BORROWED` nếu hết hàng khả dụng.
      + Hàm `returnEquipment`: Chấp nhận hoàn trả từ `HANDED_OVER`, `OVERDUE`, `APPROVED`; ghi nhận biên bản nhận máy; tự động cập nhật thiết bị sang `MAINTENANCE` nếu phát hiện hư hại (`isDamaged = true`) theo Quy tắc nghiệp vụ Mục 3.9 & 3.10.
    * Routes & Controllers: Bổ sung endpoint `PUT/PATCH /api/borrow-requests/:id/handover` và cập nhật `PUT/PATCH /api/borrow-requests/:id/return` tiếp nhận dữ liệu kiểm kê.
    * Frontend `admin/requests/page.tsx`: Nút "Bàn giao" khi đơn `APPROVED`, nút "Nhận trả" khi đơn `HANDED_OVER` / `OVERDUE`, Modal Bàn giao ghi nhận biên bản giao máy, Modal Nhận trả có checkbox phát sinh hư hại chuyển bảo trì. Badge trạng thái `HANDED_OVER` (tím), `OVERDUE` (đỏ nhấp nháy).
    * Frontend `history/page.tsx`: Cập nhật badge và hiển thị chi tiết biên bản bàn giao, nhận trả, cảnh báo đỏ nhấp nháy cho người mượn quá hạn.
    * Kiểm thử: 34/34 Backend Unit Tests pass 100%, 0 lỗi TypeScript build FE, 6/6 E2E Test Cases tích hợp SQL Server pass 100%.
- [x] **Task 1.5:** Kiểm thử hồi quy các chức năng liên quan thuộc FR-01, FR-02, FR-03, FR-06.
  - *Kết quả thực hiện:*
    * Mở rộng bộ Unit Test Backend lên 8 Test Suites với 39/39 test cases PASS 100% (bổ sung Suite 8 kiểm tra bảo vệ phân quyền, chức năng khóa tài khoản và chặn Admin tự khóa tài khoản).
    * Xây dựng kịch bản kiểm thử tích hợp E2E tự động trực tiếp trên SQL Server database thực tế: 26/26 kịch bản PASS 100% bao quát toàn bộ 4 module (FR-01, FR-02, FR-03, FR-06).
    * Chuẩn hóa quy tắc TC-02 trong `borrowRequest.service.js`: Duyệt đơn (`approve`) chỉ trừ số lượng khả dụng, bảo đảm thiết bị vẫn là `AVAILABLE`; chỉ khi bấm "Bàn giao" (`handoverEquipment`) thiết bị mới chuyển sang `BORROWED`.
    * Kiểm tra chất lượng mã nguồn Frontend Next.js: 0 lỗi TypeScript build (`tsc --noEmit`).
    * **KẾT LUẬN GIAI ĐOẠN 1:** Đã hoàn thành 100% tất cả các mục tiêu, khắc phục toàn bộ lỗi tồn đọng, sẵn sàng bước vào Giai đoạn 2 (Xây dựng phân hệ Quản lý công việc FR-04).

### GIAI ĐOẠN 2 (13/11 – 15/11/2026): XÂY DỰNG PHÂN HỆ QUẢN LÝ CÔNG VIỆC (FR-04)
- [x] **Task 2.1:** Tạo Model Sequelize `Task.js` (Bảng `Tasks`) với các trường: id, title, description, assigned_to_user_id, deadline, status (`NOT_STARTED`, `IN_PROGRESS`, `PENDING_APPROVAL`, `REVISION_REQUESTED`, `COMPLETED`), result_link, proof_file, feedback, is_external.
  - *Kết quả thực hiện:*
    * Thiết kế file Model Sequelize: `TN-Backend/src/models/Task.js` với đầy đủ các trường: `id` (UUID PK), `title` (STRING 255), `description` (TEXT), `assignedToUserId` (UUID FK), `createdByUserId` (UUID FK), `deadline` (DATE), `status` (STRING 30, enum: NOT_STARTED, IN_PROGRESS, PENDING_APPROVAL, REVISION_REQUESTED, COMPLETED), `resultLink` (TEXT URL), `proofFile` (TEXT), `feedback` (TEXT), `isExternal` (BOOLEAN), `completedAt` (DATE).
    * Thiết lập quan hệ Associations tại `TN-Backend/src/models/index.js`:
      + `User.hasMany(Task, { foreignKey: 'assigned_to_user_id', as: 'assignedTasks', onDelete: 'NO ACTION' })`
      + `Task.belongsTo(User, { foreignKey: 'assigned_to_user_id', as: 'assignee' })`
      + `User.hasMany(Task, { foreignKey: 'created_by_user_id', as: 'createdTasks', onDelete: 'NO ACTION' })`
      + `Task.belongsTo(User, { foreignKey: 'created_by_user_id', as: 'creator' })`
      + *Ghi chú kỹ thuật:* Áp dụng `onDelete: 'NO ACTION'` để triệt tiêu hoàn toàn rủi ro SQL Server Error 1785 (cycles or multiple cascade paths).
    * Đồng bộ database SQL Server: Bảng `Tasks` đã được tạo thành công với 14 cột, 2 khóa ngoại và 5 indexes.
    * Bổ sung Suite 9 vào `TN-Backend/test/unit.test.js`: 7 test cases kiểm thử validation và vòng đời trạng thái Task -> **46/46 Unit Tests PASS 100%**.
- [x] **Task 2.2:** Xây dựng `task.service.js`, `task.controller.js`, `task.routes.js` phục vụ:
  - *Kết quả thực hiện:*
    * Xây dựng `TN-Backend/src/services/task.service.js`:
      + `createTask`: Admin giao việc cho CTV kèm kiểm tra ràng buộc role CTV (`COLLABORATOR`), kiểm tra deadline hợp lệ.
      + `createExternalTask`: CTV tự khai báo công việc phát sinh ngoài hệ thống kèm link sản phẩm hoặc file minh chứng (trạng thái khởi tạo `PENDING_APPROVAL`, `isExternal: true`).
      + `findAll`: Phân quyền RBAC chặt chẽ (Admin xem tất cả; CTV chỉ xem việc được giao hoặc do mình khai báo; User bị chặn); hỗ trợ lọc theo status, CTV, external, tìm kiếm từ khóa và phân trang.
      + `findById`: Lấy chi tiết công việc kèm eager loading thông tin `assignee` và `creator`.
      + `updateProgress`: CTV bắt đầu làm (`IN_PROGRESS`), nộp sản phẩm/minh chứng (`PENDING_APPROVAL`); chặn nộp khi thiếu minh chứng; chặn sửa việc đã hoàn thành.
      + `reviewTask`: Admin đánh giá nghiệm thu (`COMPLETED` kèm tự động ghi nhận `completedAt`) hoặc yêu cầu chỉnh sửa (`REVISION_REQUESTED` bắt buộc kèm `feedback` giải thích).
      + `deleteTask`: Admin xóa task (chặn xóa task đã hoàn thành để bảo toàn lịch sử).
      + `getStats`: Thống kê số lượng theo từng trạng thái phục vụ hiển thị Dashboard và bộ lọc.
    * Xây dựng `TN-Backend/src/controllers/task.controller.js`: Chuẩn hóa API responses, xử lý mã HTTP status 200, 201, 400, 403, 404, 500.
    * Xây dựng `TN-Backend/src/routes/task.routes.js`: Định nghĩa các endpoints có gắn middleware `authenticate` và `authorize('ADMIN')` / `authorize('COLLABORATOR', 'ADMIN')`.
    * Đăng ký route `/api/tasks` trong `TN-Backend/src/server.js`.
    * Kiểm thử tích hợp E2E API thực tế: 13/13 kịch bản gọi API qua HTTP thành công 100%. Unit test backend đạt **46/46 tests PASS 100%**.
- [x] **Task 2.3:** Xây dựng giao diện Frontend:
  - *Kết quả thực hiện:*
    * Xây dựng trang Quản lý công việc cho Admin (`TN-Frontend/src/app/admin/tasks/page.tsx`):
      + Thống kê số lượng theo 6 thẻ trạng thái (Tổng việc, Chưa làm, Đang làm, Chờ nghiệm thu, Cần sửa, Đã hoàn thành).
      + Thanh tìm kiếm và bộ lọc đa chiều (lọc theo Trạng thái, lọc theo CTV phụ trách, lọc Loại việc nội bộ/ngoài hệ thống).
      + Bảng danh sách công việc hiển thị chi tiết hạn chót deadline, cảnh báo quá hạn, link sản phẩm/minh chứng.
      + Modal "Giao nhiệm vụ mới cho CTV": nhập tiêu đề, mô tả, chọn CTV từ danh sách, đặt deadline.
      + Modal "Nghiệm thu công việc": xem minh chứng của CTV, xác nhận nghiệm thu (`COMPLETED`) hoặc yêu cầu chỉnh sửa (`REVISION_REQUESTED` kèm feedback giải thích).
      + Modal "Chi tiết nhiệm vụ" và Modal "Xác nhận xóa nhiệm vụ".
    * Xây dựng trang Nhiệm vụ của tôi cho CTV (`TN-Frontend/src/app/tasks/page.tsx`):
      + Thẻ tóm tắt tiến độ cá nhân của CTV.
      + Bộ lọc theo tab trạng thái trực quan.
      + Thẻ công việc chi tiết: Nút "Bắt đầu làm việc" (`IN_PROGRESS`), Nút "Nộp kết quả / Báo cáo hoàn thành" (`PENDING_APPROVAL`).
      + Hiển thị nổi bật cảnh báo phản hồi từ Admin khi công việc bị yêu cầu sửa đổi (`REVISION_REQUESTED`).
      + Modal "Nộp kết quả nhiệm vụ": form nhập link sản phẩm kết quả (Drive, Figma, Youtube) và file minh chứng.
      + Modal "Khai báo việc ngoài hệ thống": form khai báo công việc phát sinh ngoài hệ thống kèm minh chứng theo Quy tắc 5.9 & 5.10.
    * Cập nhật Điều hướng hệ thống:
      + `TN-Frontend/src/components/AdminLayout.tsx`: Bổ sung mục "Quản lý Công việc" (`/admin/tasks`) trên thanh Sidebar.
      + `TN-Frontend/src/components/Navbar.tsx`: Bổ sung mục "Nhiệm vụ của tôi" (`/tasks`) cho tài khoản CTV (`COLLABORATOR`) và Admin trên cả Desktop Navbar và Mobile Drawer.
      + `TN-Frontend/src/context/AuthContext.tsx`: Đồng bộ kiểu dữ liệu `role: 'ADMIN' | 'USER' | 'COLLABORATOR'`.
    * Kiểm tra chất lượng: TypeScript build 0 lỗi, Next.js production build (`next build`) biên dịch thành công 23/23 routes tĩnh và động, server port 3000 phục vụ cả 2 trang trả về mã HTTP 200.
- [x] **Task 2.4:** Kiểm thử luồng công việc E2E (Giao việc -> Tiến độ -> Nộp bài -> Yêu cầu sửa -> Nghiệm thu hoàn thành) & Bổ sung phân loại công việc (14 loại công việc).
  - *Kết quả thực hiện:*
    * Nâng cấp Database SQL Server (`TN_Database`): Bổ sung an toàn 2 cột `task_type` (`NVARCHAR(100)` NULL), `other_task_type` (`NVARCHAR(255)` NULL) và index `tasks_task_type` vào bảng `Tasks`. Đảm bảo tương thích ngược 100% với các nhiệm vụ cũ.
    * Model & Service: Bổ sung validation 14 loại công việc chuẩn (Viết content, Chụp & xử lý hình sự kiện, Quay highlight, Dựng clip highlight, Quay clip TikTok, Dựng clip TikTok, Viết kịch bản, MC bản tin, Thư ký trường quay, Quay phim, Dựng phim, Diễn viên, Thiết kế, Khác). Bắt buộc nhập tên tùy chỉnh `otherTaskType` khi chọn `Khác`. Tự động dọn dẹp `otherTaskType` khi chuyển sang loại chuẩn.
    * API & Controller: Endpoint `PUT /api/tasks/:id` cho phép Admin chỉnh sửa thông tin và loại công việc khi chưa hoàn thành. Chặn CTV sửa thông tin giao việc (403 Forbidden). Bảo toàn dữ liệu `taskType` và `otherTaskType` khi CTV nộp bài duyệt.
    * Giao diện Admin (`/admin/tasks`): Dropdown chọn loại việc kèm ô nhập khi chọn "Khác" trong modal giao việc; bộ lọc theo loại việc; badge hiển thị loại việc; modal chỉnh sửa nhiệm vụ.
    * Giao diện CTV (`/tasks`): Bộ lọc loại công việc; badge loại việc trên thẻ công việc; modal xem chi tiết nhiệm vụ; chọn loại việc khi khai báo việc ngoài hệ thống.
    * Kiểm thử tự động:
      + **Backend Unit Tests:** 49/49 tests PASS 100% (bổ sung tests 9.8, 9.9, 9.10).
      + **E2E Integration Tests:** 12/12 kịch bản PASS 100% kiểm chứng trực tiếp trên SQL Server database thực tế.
      + **TypeScript & Build:** 0 lỗi TypeScript, Next.js production build (`next build`) thành công 23/23 routes.
    * **KẾT LUẬN GIAI ĐOẠN 2:** Đã hoàn thành 100% tất cả các mục tiêu của Phân hệ Quản lý công việc (FR-04: Task 2.1, 2.2, 2.3, 2.4), sẵn sàng bước vào Giai đoạn 3 (Lịch trực, Bảng công việc tháng & Tính thù lao CTV - FR-05).

### GIAI ĐOẠN 3 (16/11 – 18/11/2026): LỊCH TRỰC, BẢNG CÔNG VIỆC THÁNG & TÍNH THÙ LAO CTV (FR-05) - HOÀN THÀNH 100%
- [x] **Task 3.1:** Thiết kế Database & Model Sequelize cho Chấm công, Ca trực và Thù lao CTV.
- [x] **Task 3.2:** Xây dựng `duty.service.js` & `duty.controller.js` & `duty.routes.js`.
- [x] **Task 3.3:** Xây dựng `payroll.service.js` lập trình bộ tính thù lao CTV theo 7 quy tắc bắt buộc.
- [x] **Task 3.4:** Xây dựng 2 hàm xuất Excel chuyên biệt bằng ExcelJS bám sát 100% file mẫu BPTT ĐH Lạc Hồng.
- [x] **Task 3.5:** Xây dựng giao diện Frontend toàn diện cho Admin và CTV.
- [x] **Task 3.6:** Kiểm thử chuyên sâu thuật toán tính lương đối chiếu với các trường hợp mẫu: Unit Tests 58/58 PASS 100%, E2E Tests 13/13 scenarios PASS 100%.

### GIAI ĐOẠN 3 MỞ RỘNG (10/11/2026): ĐIỀU CHỈNH GIAO DIỆN CHẤM CÔNG VÀ XÂY DỰNG QUY TRÌNH ĐĂNG KÝ – SẮP XẾP CA TRỰC CTV 3 GIAI ĐOẠN - HOÀN THÀNH 100%
- [x] **Hạng mục 1: Điều chỉnh tên các mục giao diện:**
  - `Bảng chấm công tháng (Sheet1)` → `Bảng chấm công tháng`.
  - `Bảng thống kê công việc (T10.2026)` → `Bảng thống kê công việc`.
  - Giữ nguyên tên sheet chuẩn khi xuất file Excel (`Sheet1` và `T10.2026`).
- [x] **Hạng mục 2: Kiểm soát chặt chẽ ký hiệu SV trong Bảng chấm công:**
  - Frontend: Nút `SV` ở modal chỉnh sửa cell chấm công bị `disabled` và làm mờ nếu ngày đó CTV không có công việc `COMPLETED`. Hover/tương tác hiển thị cảnh báo: *"Không hợp lệ vì không có công việc tương ứng trong Bảng thống kê công việc."*
  - Backend: `updateAttendanceCell` kiểm tra độc lập tại tầng Service và Controller, từ chối ghi nhận `SV` trái phép (ném lỗi HTTP 400). Chặn tuyệt đối việc dùng công việc của CTV khác làm căn cứ cho `SV`.
  - Hồi quy dữ liệu: Tự động loại trừ các bản ghi `SV` thủ công nếu công việc bị hủy hoặc không còn hợp lệ.
- [x] **Hạng mục 3: Sắp xếp lại giao diện và bộ lọc chấm công:**
  - Thiết kế lại khu vực bộ lọc theo các nhóm logic: Tháng/Năm, dropdown chọn CTV, ô tìm kiếm tên/mã CTV, nút làm mới và nhóm nút xuất Excel.
  - Bố cục responsive, table có thanh trượt ngang `overflow-x-auto`, không tràn hay vỡ chữ trên desktop và tablet.
- [x] **Hạng mục 4 & 5: Đổi tên và xây dựng quy trình quản lý ca trực 3 giai đoạn:**
  - Đổi tên sidebar menu và tiêu đề: `Quản lý Ca trực` (`/admin/duty`), tách riêng khỏi trang chấm công & bảng thù lao.
  - **Giai đoạn 1 (Nhân sự tạo ca trực mới)**: Mở đợt đăng ký theo tháng/năm, cấu hình deadline và ghi chú; kiểm tra không tạo trùng đợt cùng tháng; tự động phát thông báo in-app `DUTY_PERIOD_OPEN` đến toàn bộ CTV.
  - **Giai đoạn 2 (CTV đăng ký thời gian có thể trực - Availability)**: CTV xem ma trận lịch tháng 1..N x 3 buổi (S: 07:30–11:30, C: 13:00–17:00, T: 17:30–21:30), tick chọn nhiều ngày/buổi rảnh và lưu vào `ShiftRegistrations`; cho phép sửa/hủy khi đợt `OPEN`; khóa đăng ký khi đợt `CLOSED`. Đảm bảo phân biệt rõ ràng: Đăng ký rảnh chưa phải lịch chính thức và chưa tính công.
  - **Giai đoạn 3 (Nhân sự sắp xếp và xác nhận lịch)**: Nhân sự xem ma trận tổng hợp rảnh của tất cả CTV, phân công ca trực (cảnh báo trùng ca), nhấn "Xác nhận lịch trực tháng" (`CONFIRMED`) chốt lịch chính thức, đồng bộ ký hiệu `LV` vào Bảng chấm công và gửi thông báo in-app `DUTY_SCHEDULE_CONFIRMED` cho CTV.
  - Bảo vệ an toàn quỹ lương: Lịch trực tương lai (`date > today`) dù `CONFIRMED` tuyệt đối không bị tính tiền công (TC-04).
  - CSDL & Backend: Bảng `DutyPeriods`, `ShiftRegistrations`, `Notifications` (`DATETIMEOFFSET` an toàn), cột `period_id` trong `StudioShifts`.
  - Component Frontend: `NotificationBell.tsx` tích hợp chuông thông báo in-app trên Navbar.
- [x] **Hạng mục 6: Kiểm thử tự động bắt buộc:**
  - **Backend Unit Tests:** Đạt **66/66 Unit Tests PASS 100%** (bổ sung Suite 11 gồm 8 kịch bản bao quát toàn bộ quy trình).
  - **21 Tiêu chí Kiểm thử:** Kịch bản `TN-Backend/scripts/test_21_criteria.js` kiểm tra trực tiếp trên SQL Server database thực tế đạt **21/21 tiêu chí PASS 100%**.
  - **Frontend Type & Build Check:** 0 lỗi TypeScript, Next.js production build sẵn sàng.

- [x] **Nhiệm vụ Bổ sung (10/11/2026): Khắc phục triệt để lỗi xóa tài khoản do ràng buộc khóa ngoại & Bảo toàn dữ liệu lịch sử (QUY_TAC.md Mục 9):**
  - *Nguyên nhân lỗi gốc:* Thao tác xóa vật lý `user.destroy()` kích hoạt lỗi SQL Server `The DELETE statement conflicted with the REFERENCE constraint` do các bảng `Tasks`, `AttendanceRecords`, `StudioShifts`, `BorrowRequests`, `StudioBookings`... đang liên kết khóa ngoại với quy tắc bảo toàn dữ liệu `NO ACTION`.
  - *Giải pháp triển khai:*
    * Database: Thêm cột `status` (`NVARCHAR(20)`: `'Active'`, `'Locked'`, `'Disabled'`, default `'Active'`) vào bảng `Users` kèm ràng buộc CHECK.
    * Model & Service: Bổ sung trường `status` vào `User.js`. Xây dựng `TN-Backend/src/services/user.service.js` với hàm `checkUserHasRelatedData` và `deleteOrDisableUser`:
      + Nếu tài khoản **đã có dữ liệu liên quan** (công việc, chấm công, ca trực, bảng lương, mượn trả, đặt phòng): **Không xóa vật lý**, chuyển sang trạng thái `Disabled` (`isActive: false`), giữ nguyên `user_id` và 100% dữ liệu lịch sử.
      + Nếu tài khoản **chưa có dữ liệu liên quan**: Thực hiện xóa vật lý (DELETE) an toàn khỏi CSDL.
      + Chặn Admin tự xóa hoặc tự vô hiệu hóa tài khoản của chính mình.
    * Xác thực & Phân quyền: Cập nhật `auth.service.js` và `auth.middleware.js`: Chặn đăng nhập đối với tài khoản `Disabled` (HTTP 403: *"Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Quản trị viên."*).
    * Giao diện Admin Users (`/admin/users`): Cập nhật hiển thị rõ 3 trạng thái (Active: xanh, Locked: vàng, Disabled: đỏ/xám), cập nhật modal xóa với cảnh báo nghiệp vụ bảo toàn dữ liệu lịch sử.
    * Kiểm thử tự động:
      + Đạt **71/71 Backend Unit Tests PASS 100%** (mở rộng Suite 8 kiểm tra các quy tắc xóa, vô hiệu hóa, phân biệt 3 trạng thái).
      + Kịch bản E2E `TN-Backend/scripts/test_user_delete_fix.js` đạt **8/8 trường hợp kiểm thử PASS 100%** trên SQL Server database thực tế.
      + Kiểm thử hồi quy 21 tiêu chí chấm công & ca trực đạt **21/21 tiêu chí PASS 100%**. Next.js production build 25/25 routes thành công.

### GIAI ĐOẠN 4 (19/11 – 22/11/2026): THÔNG BÁO, AUDIT LOG, BẢO TRÌ & THỐNG KÊ MỞ RỘNG (FR-07, FR-09, FR-01.5, FR-08)
- [ ] **Task 4.1 (FR-07):** Tạo bảng `Notifications`, service gửi thông báo in-app và email giao dịch (thông báo duyệt mượn, duyệt phòng, giao việc, nhắc nợ quá hạn). Bổ sung Icon chuông thông báo trên Navbar.
- [ ] **Task 4.2 (FR-09):** Tạo bảng `AuditLogs`, middleware tự động ghi vết các thao tác quan trọng (thêm/sửa/xóa, duyệt/từ chối, cấp quyền) lưu `userId`, `action`, `resource`, `details` JSON, `ip`, `timestamp`. Trang tra cứu `/admin/audit-logs`.
- [ ] **Task 4.3 (FR-01.5):** Tạo bảng `EquipmentMaintenances`, API và giao diện quản lý lịch sử bảo trì, sửa chữa theo hóa đơn chứng từ, báo mất và thanh lý thiết bị.
- [ ] **Task 4.4 (FR-08):** Mở rộng Dashboard Admin: Bổ sung thẻ thống kê công việc (tiến độ, trễ hạn) và thống kê thù lao CTV theo tháng.
- [ ] **Task 4.5 (FR-03.6):** Bổ sung chức năng Dời lịch / Thay đổi lịch đặt phòng Studio (kèm check xung đột).

### GIAI ĐOẠN 5 (23/11 – 25/11/2026): KIỂM THỬ TÍCH HỢP TOÀN DIỆN, HỒI QUY & ĐÓNG GÓI BÀN GIAO
- [ ] **Task 5.1:** Kiểm thử phân quyền chặt chẽ trên 3 vai trò: Nhân sự, CTV, Người dùng (kiểm tra toàn bộ API endpoints).
- [ ] **Task 5.2:** Kiểm thử hồi quy 100% chức năng COMPLETED ban đầu, bảo đảm không có lỗi chéo (side-effect).
- [ ] **Task 5.3:** Kiểm tra tính toàn vẹn dữ liệu, concurrency locks (chống race condition khi duyệt đơn).
- [ ] **Task 5.4:** Rà soát và cập nhật Swagger API Docs, tài liệu kỹ thuật, hướng dẫn cài đặt.
- [ ] **Task 5.5:** Đóng gói mã nguồn và hoàn tất biên bản bàn giao nghiệm thu dự án.

---

## PHẦN V. DANH SÁCH FILE VÀ MODULE DỰ KIẾN CAN THIỆP

### 1. File hiện có cần chỉnh sửa có kiểm soát (EDIT)
| Đường dẫn file | Mục đích chỉnh sửa | Nguy cơ & Cách phòng ngừa |
|---|---|---|
| `TN-Backend/src/models/User.js` | Bổ sung giá trị `'COLLABORATOR'` vào enum validator của cột `role`. | Rất thấp. Giữ nguyên cấu trúc bảng, chỉ mở rộng danh sách enum. |
| `TN-Backend/src/routes/dashboard.routes.js` | Cho phép cập nhật role `'COLLABORATOR'` trong route `PUT /users/:id/role`. | Rất thấp. Giữ nguyên các xử lý khác của route. |
| `TN-Backend/src/routes/admin.routes.js` | Cho phép tạo tài khoản có role `'COLLABORATOR'`. | Rất thấp. |
| `TN-Backend/src/models/BorrowRequest.js` | Bổ sung enum status: `HANDED_OVER`, `OVERDUE`. | Thấp. Giữ nguyên các trạng thái cũ `PENDING`, `APPROVED`, `REJECTED`, `RETURNED`. |
| `TN-Backend/src/services/borrowRequest.service.js` | Bổ sung hàm bàn giao `handoverEquipment` và kiểm tra nợ quá hạn khi tạo đơn. | Trung bình. Phải dùng transaction riêng, không sửa hàm `processRequest` đang chạy tốt. |
| `TN-Backend/src/services/studioBooking.service.js` | Bổ sung kiểm tra xung đột trong `processBooking('confirm')`, check buffer 30p, giờ mở cửa. | Trung bình. Giữ nguyên cấu trúc trả về, chỉ thêm bước validate trước khi `booking.update()`. |
| `TN-Frontend/src/app/admin/users/page.tsx` | Thêm nút Khóa/Mở khóa tài khoản liên kết API `toggle-active`. | Rất thấp. Chỉ thêm nút bấm trên cột Hành động. |
| `TN-Frontend/src/app/admin/requests/page.tsx` | Thêm nút "Bàn giao thiết bị" khi đơn ở trạng thái `APPROVED`. | Rất thấp. Giữ nguyên modal xem xét hiện có. |
| `TN-Frontend/src/components/AdminLayout.tsx` | Bổ sung link điều hướng: Quản lý công việc (`/admin/tasks`), Lịch trực & Thù lao (`/admin/payroll`), Audit Log. | Rất thấp. Chỉ thêm item vào `sidebarLinks`. |
| `TN-Frontend/src/components/Navbar.tsx` | Bổ sung link "Nhiệm vụ của tôi" cho CTV và Icon quả chuông thông báo. | Rất thấp. Giữ nguyên các link cũ. |

### 2. File mới dự kiến tạo (CREATE NEW)
- **Backend Models:**
  - `TN-Backend/src/models/Task.js`
  - `TN-Backend/src/models/StudioShift.js`
  - `TN-Backend/src/models/MonthlyTimesheet.js`
  - `TN-Backend/src/models/MonthlyPayroll.js`
  - `TN-Backend/src/models/Notification.js`
  - `TN-Backend/src/models/AuditLog.js`
  - `TN-Backend/src/models/EquipmentMaintenance.js`
- **Backend Services & Controllers & Routes:**
  - `TN-Backend/src/services/task.service.js`, `task.controller.js`, `task.routes.js`
  - `TN-Backend/src/services/duty.service.js`, `payroll.service.js`, `payroll.routes.js`
  - `TN-Backend/src/services/notification.service.js`, `notification.routes.js`
  - `TN-Backend/src/middlewares/auditLog.middleware.js`, `auditLog.routes.js`
  - `TN-Backend/src/services/maintenance.service.js`, `maintenance.routes.js`
- **Frontend Pages & Components:**
  - `TN-Frontend/src/app/admin/tasks/page.tsx`
  - `TN-Frontend/src/app/tasks/page.tsx`
  - `TN-Frontend/src/app/admin/duty/page.tsx`
  - `TN-Frontend/src/app/admin/payroll/page.tsx`
  - `TN-Frontend/src/app/admin/audit-logs/page.tsx`
  - `TN-Frontend/src/components/NotificationDropdown.tsx`

---

## PHẦN VI. BẢNG KIỂM TRA QUY TẮC CẤM KỴ NGHIỆP VỤ (MUST-PASS TESTCASES)

Mỗi module khi hoàn thành bắt buộc phải pass 100% các testcase sau:

- [x] **TC-01 (Chống trùng lịch Studio):** Không thể xác nhận 2 lịch Studio trùng giờ hoặc vi phạm khoảng đệm 30 phút (Đã hoàn thành ở Task 1.3).
- [x] **TC-02 (Tách biệt duyệt và bàn giao):** Duyệt mượn không đổi trạng thái máy sang "Đang cho mượn"; chỉ khi bấm "Bàn giao" máy mới chính thức chuyển trạng thái (Đã hoàn thành ở Task 1.4).
- [x] **TC-03 (Chống tính lương việc dang dở):** Công việc đang làm (`IN_PROGRESS`), chờ duyệt (`PENDING`), hoặc yêu cầu sửa (`REVISION_REQUESTED`) tuyệt đối không xuất hiện trong Bảng lương tháng. Đã kiểm thử qua Suite 10 Unit Test & E2E Test.
- [x] **TC-04 (Chống tính lương ca trực tương lai):** Ca trực trong tương lai (dù đã được xác nhận) tuyệt đối không được đưa vào dữ liệu tổng hợp tiền công của tháng. Đã chặn ở `completeShift` và loại trừ khi tính payroll.
- [x] **TC-05 (Chống tính trùng giờ):** Nếu một CTV vừa trực Studio vừa hỗ trợ kỹ thuật sự kiện trong cùng một buổi, hệ thống tự động loại trừ thời gian trùng lặp, không tính tiền hai lần.
- [x] **TC-06 (Chống nhân chồng hệ số):** Nhiệm vụ kỹ thuật diễn ra vào Chủ nhật lúc 18:00 (vừa Chủ nhật vừa sau 16:30) chỉ tính hệ số 2.0 (không được nhân 1.5 x 2.0 = 3.0). Đã kiểm thử chính xác bằng unit test suite 10.
- [x] **TC-07 (Bảo vệ quyền hạn Nhân sự):** CTV tuyệt đối không thể tự duyệt hoàn thành công việc của chính mình hoặc tự chốt ca trực hay chỉnh sửa bảng lương/ô chấm công. Đã thiết lập middleware `authorize('ADMIN')` cho toàn bộ các endpoints nhạy cảm.
- [x] **TC-08 (Bảo toàn lịch sử tài khoản khi xóa):** Tài khoản đã có dữ liệu không được xóa vật lý, chuyển sang `Disabled` bảo toàn 100% lịch sử công việc, chấm công, ca trực; tài khoản chưa có dữ liệu cho phép xóa vật lý.
- [x] **TC-09 (Đồng bộ danh sách CTV trong bộ lọc & dropdown):** Phân định 2 mục đích sử dụng (Phân công mới = chỉ CTV Active; Lọc lịch sử = TẤT CẢ CTV kể cả Disabled/Locked); ràng buộc cứng vai trò `COLLABORATOR` (không lẫn USER/ADMIN); sắp xếp A–Z; hiển thị Họ tên + Email/Mã NV; hỗ trợ tìm kiếm nhanh và tùy chọn Tất cả CTV.
- [x] **TC-10 (Khắc phục Runtime TypeError MyTasksPage & Phòng thủ Schema):** Đồng bộ cấu trúc payload API `payroll.timesheet` cung cấp đồng thời cả `user` và `ctv`, `daysMeta` và `daysHeader`, camelCase và UPPERCASE summary. Xử lý an toàn triệt để mảng và quan hệ `Task.creator`, `Task.assignee`, không crash khi user/task bị thiếu quan hệ hoặc CTV chưa có dòng chấm công.

---

> [!NOTE]
> File kế hoạch này được lưu giữ cố định tại thư mục dự án. Mọi bước triển khai tiếp theo đều phải tuân thủ nghiêm ngặt lộ trình và các nguyên tắc nêu trên.

