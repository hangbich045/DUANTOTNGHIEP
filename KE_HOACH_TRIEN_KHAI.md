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

- [x] **Nhiệm vụ Bổ sung (16/11/2026): Hoàn thiện Bộ lọc Tuần Date Picker, Ma trận tháng, Chặn chấm công trước nghiệm thu & Tự động xác định hệ số thù lao (QUY_TAC.md Mục 7):**
  - *Bộ lọc tuần Date Picker:* Tích hợp HTML5 Date Picker mở trực tiếp khi nhấp vào khối hiển thị tuần (`16/11 – 22/11/2026`) trên `WeeklyDutyScheduleTable.tsx`, tự động xác định ngày Thứ Hai đầu tuần qua `getMondayStr()` và chuyển tuần tương ứng.
  - *Ma trận phân công tháng:* Tách bạch tiêu đề `MONTHLY_MATRIX` khỏi bảng tuần; bổ sung dropdown chọn đợt tháng trực tiếp trên toolbar; ràng buộc dữ liệu ca trực, đăng ký và task nghiêm ngặt trong phạm vi tháng `[startDate, endDate]`.
  - *Chặn chấm công việc ngoài trước nghiệm thu:* Loại bỏ việc gọi `syncTaskAttendanceToDatabase` khi CTV khai báo việc ngoài (`PENDING_APPROVAL`). Chỉ khi Admin nghiệm thu `COMPLETED` mới tạo `AttendanceRecord` (ký hiệu `SV`) và tính vào Bảng chấm công; nếu `REVISION_REQUESTED`, tự động dọn sạch bản ghi chấm công.
  - *Tự động xác định hệ số thù lao:*
    * Xóa hoàn toàn khối checkbox chọn hệ số khỏi biểu mẫu khai báo việc ngoài của CTV (`tasks/page.tsx`). CTV không được tự chọn hoặc can thiệp hệ số.
    * Backend xây dựng thuật toán `evaluateTaskRateMultiplier`: Kỹ thuật sự kiện sau 16:30 T2-T7 tính 1.5x; Kỹ thuật sự kiện Chủ nhật tính 2.0x (không cộng dồn dù sau 16:30); Các trường hợp còn lại tính 1.0x.
    * Tự động gán hệ số khi Admin nghiệm thu `COMPLETED` và tự động tính lại khi Admin chỉnh sửa ngày/giờ/loại việc (`updateTask`).
    * Đồng bộ thống nhất giờ quy đổi (`tongGio`) và thù lao (`tien`) giữa Bảng chấm công (`getTimesheetData`), Bảng lương (`calculateMonthlyPayroll`) và Excel (`exportTimesheetExcel`).
  - *Kiểm thử tự động:*
    * Suite 89 Backend Unit Tests: **89/89 PASS 100%**.
    * Integration tests `test_prompt10_verification.js` và `test_auto_multiplier.js`: **PASS 100%**.
    * Next.js Production Build: **26/26 routes thành công 100%**.

### GIAI ĐOẠN 4 (19/11 – 22/11/2026): THÔNG BÁO, AUDIT LOG, BẢO TRÌ & THỐNG KÊ MỞ RỘNG (FR-07, FR-09, FR-01.5, FR-08)
- [x] **Task 4.1 (FR-07):** Tạo bảng `Notifications`, service gửi thông báo in-app và email giao dịch (thông báo duyệt mượn, duyệt phòng, giao việc, nhắc nợ quá hạn). Bổ sung Icon chuông thông báo trên Navbar.
  - *Kết quả thực hiện:*
    * Xây dựng `TN-Backend/src/services/notification.service.js`: Tạo thông báo in-app và email giao dịch tập trung (`createNotification`, `notifyAdmins`, `notifyCollaborators`, `checkAndNotifyOverdueBorrowRequests`).
    * Nâng cấp `TN-Backend/src/config/mailer.js`: Bổ sung `sendNotificationEmail` hỗ trợ HTML template giao dịch chuẩn thương hiệu LHU Media Studio kèm cơ chế fallback an toàn (non-blocking).
    * Tích hợp trigger thông báo tại 100% sự kiện nghiệp vụ: Giao việc (`TASK_ASSIGNED`), Yêu cầu sửa (`TASK_REVISION_REQUESTED`), Nghiệm thu việc (`TASK_COMPLETED`), CTV nộp bài (`TASK_SUBMITTED`), Yêu cầu mượn (`BORROW_REQUEST_CREATED`), Duyệt mượn (`BORROW_REQUEST_APPROVED`), Từ chối mượn (`BORROW_REQUEST_REJECTED`), Bàn giao máy (`EQUIPMENT_HANDED_OVER`), Trả máy (`EQUIPMENT_RETURNED`), Quá hạn (`BORROW_OVERDUE`), Yêu cầu đặt phòng (`STUDIO_BOOKING_REQUEST`), Duyệt phòng (`STUDIO_BOOKING_APPROVED`), Từ chối phòng (`STUDIO_BOOKING_REJECTED`), Mở đợt trực (`DUTY_PERIOD_OPEN`), Chốt lịch trực (`DUTY_SCHEDULE_CONFIRMED`).
    * Tuân thủ nghiêm ngặt QUY_TAC.md 10.4: Tuyệt đối không tạo thông báo phê duyệt bảng lương.
    * Giao diện Frontend: Nút "Quét nợ quá hạn" trên `/admin/requests`; Icon chuông `NotificationBell.tsx` trên Navbar hỗ trợ đếm badge chưa đọc, popup danh sách, đánh dấu đã đọc và điều hướng link chi tiết.
    * Kiểm thử tự động: Bổ sung Suite 13 -> **83/83 Backend Unit Tests PASS 100%**; Kịch bản kiểm thử Task 4.1 `test_task4_1_notifications.js` đạt **23/23 tiêu chí PASS 100%**.
- [x] **Task 4.2 (FR-09):** Tạo bảng `AuditLogs`, middleware tự động ghi vết các thao tác quan trọng (thêm/sửa/xóa, duyệt/từ chối, cấp quyền) lưu `userId`, `action`, `resource`, `details` JSON, `ip`, `timestamp`. Trang tra cứu `/admin/audit-logs`.
  - *Kết quả thực hiện:*
    * Xây dựng model `AuditLog.js` và đồng bộ CSDL MSSQL: Lưu `userId`, `action`, `resource`, `resourceId`, `details` JSON, `ip`, `userAgent`, `status` (`SUCCESS`/`FAILED`), `timestamp`.
    * Xây dựng `auditLog.service.js`:
      - Hàm `sanitizeDetails`: Tự động nhận diện và che mờ 100% dữ liệu nhạy cảm (`password`, `token`, `otp`, `secret`, `authorization`, `cookie`...) thành `[PROTECTED]`, tuân thủ nghiêm ngặt QUY_TAC.md 11.4.
      - Hàm `getClientIp`: Chuẩn hóa địa chỉ IP client sạch (bỏ tiền tố IPv6 `::ffff:`, trích xuất IP đầu từ x-forwarded-for).
      - Hàm `recordAudit`: Ghi vết bất đồng bộ an toàn, non-blocking.
      - Hàm `getAuditLogs`: Tra cứu phân trang, tìm kiếm từ khóa tổng hợp, lọc đa tiêu chí (Action, Resource, User, Status, Date range).
      - Hàm `getAuditLogStats` & `getAuditLogById`: Thống kê tổng quan và xem chi tiết JSON format.
    * Xây dựng middleware `auditLog.middleware.js`: Tự động bắt vết 100% các request thay đổi dữ liệu (POST, PUT, PATCH, DELETE, LOGIN, APPROVE, REJECT, ASSIGN_ROLE, HANDOVER, RETURN...), tự động ánh xạ Action & Resource, lấy IP và User-Agent khi response hoàn tất (`res.on('finish')`).
    * Backend API & Routes: `GET /api/audit-logs`, `GET /api/audit-logs/stats`, `GET /api/audit-logs/:id`, bảo vệ phân quyền nghiêm ngặt bằng middleware `authenticate` và `authorize('ADMIN')` (CTV/User bị chặn 403 Forbidden).
    * Giao diện Quản trị `/admin/audit-logs`:
      - Thẻ tóm tắt KPIs thời gian thực: Tổng số thao tác, thao tác hôm nay, phê duyệt/nghiệm thu, thêm/sửa/phân quyền.
      - Bộ lọc nâng cao: Tìm kiếm từ khóa, lọc theo Action (11 loại), lọc theo Resource (10 đối tượng), lọc Status, lọc khoảng ngày.
      - Bảng dữ liệu trực quan: Thời gian chuẩn Việt Nam, người thực hiện kèm role badge, action badge màu sắc, đối tượng & ID, IP, trạng thái.
      - Modal JSON Viewer cao cấp: Hiển thị đầy đủ metadata, syntax highlighted JSON, nút sao chép JSON vào clipboard chỉ với 1 click.
      - Tích hợp link điều hướng "Lịch sử thao tác" với icon `History` vào thanh Sidebar của `AdminLayout.tsx`.
    * Kiểm thử tự động:
      - Bổ sung Suite 15 vào `TN-Backend/test/unit.test.js`: **93/93 Unit Tests PASS 100%** (15 suites).
      - Script kiểm thử tích hợp `test_audit_logs.js`: **PASS 100%**.
      - Kiểm thử trực tiếp HTTP API thực tế: 401 unauthenticated, 403 CTV, 200 Admin -> **PASS 100%**.
      - TypeScript Compilation: **0 errors**.
      - Next.js Production Build: **27/27 routes hoàn tất thành công**.
- [x] **Task 4.3 (FR-01.5):** Tạo bảng `EquipmentMaintenances`, API và giao diện quản lý lịch sử bảo trì, sửa chữa theo hóa đơn chứng từ, báo mất và thanh lý thiết bị.
    * Model `EquipmentMaintenance.js` & đồng bộ CSDL MSSQL: Lưu `id`, `equipment_id`, `type` (`MAINTENANCE`, `REPAIR`, `LOST`, `DISPOSAL`), `title`, `description`, `start_date`, `end_date`, `status` (`IN_PROGRESS`, `COMPLETED`, `CANCELLED`), `cost`, `invoice_number`, `invoice_date`, `invoice_url`, `service_provider`, `performed_by`, `notes`.
    * Service `maintenance.service.js` & Controller `maintenance.controller.js`:
      - Tạo mới phiếu bảo trì, sửa chữa, báo mất, thanh lý; tự động chuyển trạng thái thiết bị sang `MAINTENANCE`, `LOST`, `DISPOSED`.
      - Nghiệm thu hoàn tất (`status: 'COMPLETED'`) -> Tự động khôi phục thiết bị về `AVAILABLE`.
      - Quản lý hóa đơn chứng từ, chi phí sửa chữa, đơn vị bảo dưỡng, hỗ trợ upload ảnh/file chứng từ.
      - Thống kê tổng quan (`getMaintenanceStats`): Tổng số, chi phí lũy kế, đang sửa, đã thanh lý, báo mất.
      - Tự động ghi vết vào `AuditLogs` (FR-09) bằng văn bản tiếng Việt chi tiết (kèm mã máy, tên máy, số hóa đơn, chi phí).
    * API Routes `maintenance.routes.js`: `POST /api/maintenances`, `GET /api/maintenances`, `GET /api/maintenances/stats`, `GET /api/maintenances/:id`, `PUT /api/maintenances/:id`, `DELETE /api/maintenances/:id`, `GET /api/equipments/:equipmentId/maintenances`. Bảo vệ phân quyền chặt chẽ bằng `authenticate` và `authorize('ADMIN')`.
    * Giao diện Quản trị `/admin/equipment/maintenance`:
      - Thẻ tóm tắt KPIs: Tổng chi phí sửa chữa, Đang bảo dưỡng, Đã thanh lý, Báo mất thiết bị.
      - Bộ lọc nâng cao: Tìm kiếm theo tên/mã máy/số HĐ/đơn vị sửa, lọc theo Loại, lọc theo Trạng thái, lọc theo thiết bị cụ thể, chọn khoảng ngày.
      - Bảng dữ liệu trực quan: Thông tin thiết bị kèm ảnh thumbnail, badge loại phiếu, thông tin hóa đơn chứng từ, chi phí VNĐ, đơn vị thực hiện, thời gian, trạng thái.
      - Modal Lập/Sửa phiếu: Hỗ trợ upload ảnh hóa đơn/chứng từ thực tế.
      - Modal Xem chi tiết & Hóa đơn chứng từ phóng to.
      - Modal Nghiệm thu hoàn tất: Đưa thiết bị về trạng thái Sẵn sàng 1-click.
      - Nút điều hướng nhanh "Bảo trì & Thanh lý" trên trang `/admin/equipment` và trên từng dòng thiết bị; cập nhật Sidebar `AdminLayout.tsx`.
    * Kiểm thử tự động:
      - Bổ sung Suite 16 vào `TN-Backend/test/unit.test.js`: **98/98 Unit Tests PASS 100%** (16 suites).
      - Script kiểm thử tích hợp `test_equipment_maintenance.js`: **PASS 100%** (6/6 kịch bản).
      - TypeScript Compilation: `tsc --noEmit` -> **0 errors**.
      - Next.js Production Build: **28/28 routes hoàn tất thành công**.
- [x] **Task 4.4 (FR-08):** Mở rộng Dashboard Admin: Bổ sung thẻ thống kê công việc (tiến độ, trễ hạn) và thống kê thù lao CTV theo tháng.
  - *Kết quả thực hiện:*
    * Backend API `TN-Backend/src/routes/dashboard.routes.js`:
      - Mở rộng endpoint `GET /api/dashboard/stats`: Thống kê tổng số công việc (`total`), chưa làm (`notStarted`), đang làm (`inProgress`), chờ nghiệm thu (`pendingApproval`), cần sửa (`revisionRequested`), đã hoàn thành (`completed`), công việc trễ hạn (`overdue`: `deadline < NOW` và chưa hoàn thành).
      - Thống kê thù lao tháng hiện tại (`MonthlyPayroll`): Tổng thù lao tạm tính/đã chốt (VNĐ), tổng giờ công quy đổi, số lượng CTV có phát sinh công việc, phân bổ trạng thái (`DRAFT`, `CONFIRMED`, `PAID`). Tự động tính toán fallback nếu tháng hiện tại chưa chạy chốt lương.
      - Trích xuất danh sách công việc khẩn cấp / trễ hạn (`urgentTasks`): Top 5 nhiệm vụ xếp theo hạn chót (`deadline ASC`) kèm cờ `isOverdue`, tiêu đề, thông tin CTV phụ trách (`id`, `fullName`, `email`, `avatarUrl`).
      - Mở rộng endpoint `GET /api/dashboard/reports`: Bổ sung thống kê công việc trong kỳ (`tasksCount`, `tasksCompletedCount`, `tasksInProgressCount`, `tasksPendingApprovalCount`, `tasksOverdueCount`); bổ sung cột công việc CTV vào biểu đồ thời gian (`chartData` gồm 3 chỉ số: Mượn máy, Đặt phòng, Công việc); trả về xu hướng chi trả thù lao qua các tháng (`payrollTrend`).
    * Giao diện Quản trị Frontend `TN-Frontend/src/app/admin/dashboard/page.tsx`:
      - Khu vực KPI Thống kê Công việc & Thù lao CTV (FR-08):
        + Thẻ Tiến độ công việc: Tổng số nhiệm vụ, phân loại chi tiết đang làm/chờ nghiệm thu, link nhanh sang `/admin/tasks`.
        + Thẻ Cảnh báo trễ hạn: Đổi màu đỏ cảnh báo (`rose-500/10`) kèm icon `Flame` nhấp nháy khi có việc trễ hạn; hiển thị xanh `CheckCircle2` "Đúng tiến độ" khi 0 việc trễ.
        + Thẻ Thù lao Tháng M/YYYY: Tổng số tiền (VNĐ format), số giờ công quy đổi, số lượng CTV tham gia, link nhanh sang `/admin/payroll`.
        + Thẻ Tỷ lệ hoàn thành: Hiển thị phần trăm nghiệm thu thành công kèm thanh progress bar sinh động.
      - Biểu đồ Hoạt động theo thời gian: Hiển thị thanh 3 cột (Mượn thiết bị - xanh dương, Đặt Studio - tím, Nhiệm vụ CTV - vàng hổ phách) kèm tooltip số lượng chi tiết.
      - Widget Công việc cần chú ý & Trễ hạn: Hiển thị top 5 công việc trễ hạn hoặc sắp tới hạn, avatar/tên CTV, deadline ngày giờ Việt Nam, badge trạng thái / cảnh báo Quá hạn, nút 1-click mở chi tiết nhiệm vụ tại `/admin/tasks`.
      - Widget Xu hướng Thù lao CTV theo tháng: Biểu đồ thanh ngang thể hiện tổng tiền thù lao, số giờ công, số CTV qua các tháng gần nhất.
    * Kiểm thử tự động:
      - Bổ sung Suite 17 vào `TN-Backend/test/unit.test.js`: **102/102 Unit Tests PASS 100%** (17 suites).
      - Kịch bản kiểm thử API thực tế: Đạt **100% PASS** với đầy đủ dữ liệu CSDL SQL Server.
      - TypeScript Compilation: `tsc --noEmit` -> **0 errors**.
      - Next.js Production Build: **28/28 routes hoàn tất thành công**.
- [x] **Task 4.5 (FR-03.6):** Bổ sung chức năng Dời lịch / Thay đổi lịch đặt phòng Studio (kèm check xung đột).
  - *Kết quả thực hiện:*
    * Backend `studioBooking.service.js` & `studioBooking.controller.js` & `studioBooking.routes.js`:
      - Xây dựng hàm `reschedule(bookingId, data, currentUser)`:
        + Hỗ trợ dời lịch (`startTime`, `endTime`), đổi phòng Studio (`studioName`), đổi mục đích (`purpose`), số người (`attendees`), kèm lý do dời lịch (`rescheduleReason`).
        + Ràng buộc phân quyền RBAC: Admin dời được mọi booking; User/CTV chỉ được dời booking của chính mình (`booking.userId === currentUser.id`), chặn người khác dời lịch (403 Forbidden).
        + Ràng buộc trạng thái: Chặn dời lịch booking đã hoàn thành (`COMPLETED`) hoặc đã hủy (`CANCELLED`) (400 Bad Request).
        + Ràng buộc thời gian & khung giờ hoạt động: Cấm dời về quá khứ; tuân thủ nghiêm ngặt giờ mở cửa Studio LHU (Thứ Hai đến Thứ Bảy, Ca sáng 07:30–11:30, Ca chiều 13:30–16:30, đóng cửa Chủ nhật, cùng ngày).
        + Kiểm tra xung đột & đệm 30 phút (`checkStudioConflict`): Tự động loại trừ chính booking đang dời (`excludeBookingId`); cảnh báo xung đột (warning) cho Admin với tùy chọn duyệt đè ưu tiên cấp trường (`force: true`); chặn 409 Conflict đối với User thường nếu bị trùng.
        + Tự động lưu vết lịch sử dời lịch vào `notes` (ghi rõ thời gian dời, người thực hiện, lịch cũ ➔ lịch mới, lý do).
        + Quy tắc chuyển trạng thái: Nếu User dời lịch khi booking đang `CONFIRMED`, tự động chuyển trạng thái về `PENDING` để Admin phê duyệt lại khung giờ mới. Nếu Admin dời lịch, bảo toàn trạng thái `CONFIRMED`.
        + Tự động gửi thông báo in-app & email giao dịch (FR-07): Gửi `STUDIO_BOOKING_RESCHEDULED` kèm bảng chi tiết cho người đặt khi Admin dời lịch; thông báo `STUDIO_BOOKING_REQUEST` cho Admin khi User xin dời lịch.
        + Tự động ghi vết vào `AuditLogs` (FR-09) với mô tả tiếng Việt chi tiết (kèm mã booking, lý do dời).
      - Đăng ký endpoints: `PUT /api/studio-bookings/:id/reschedule`, `PATCH /api/studio-bookings/:id/reschedule`, `PUT /api/studio-bookings/:id`.
    * Giao diện Quản trị Frontend (`TN-Frontend/src/app/admin/requests/page.tsx`):
      - Bổ sung nút "Dời lịch" (icon `CalendarClock`) trực tiếp trên từng dòng đặt phòng và trong Modal xem xét chi tiết.
      - Xây dựng Modal "Dời Lịch Đặt Phòng Studio": Hiển thị thông tin booking hiện tại, date picker chọn ngày mới (T2–T7), time picker chọn giờ bắt đầu/kết thúc (gợi ý ca sáng 07:30–11:30 & chiều 13:30–16:30), đổi phòng Studio, số người tham gia, ô nhập lý do dời lịch.
      - Hỗ trợ hộp thoại Overlap Warning Override: Cảnh báo khi khung giờ mới có xung đột, cho phép Admin xác nhận dời đè lịch ưu tiên cấp trường (`force: true`).
    * Giao diện Người dùng Frontend (`TN-Frontend/src/app/history/page.tsx`):
      - Bổ sung cột "Hành động" trong bảng lịch sử đặt Studio: Hiển thị nút "Dời lịch" (`CalendarClock`) và "Hủy lịch" (`XCircle`) cho các đơn `PENDING` và `APPROVED`.
      - Modal Dời lịch cho User: Cho phép chọn ngày và giờ mới hợp lệ, nhập lý do xin dời lịch, gửi yêu cầu dời lịch chuyển về trạng thái `PENDING` chờ duyệt.
      - Modal Xác nhận hủy đặt phòng an toàn với cảnh báo giải phóng khung giờ.
    * Kiểm thử tự động:
      - Bổ sung Suite 18 vào `TN-Backend/test/unit.test.js`: **107/107 Unit Tests PASS 100%** (18 suites).
      - Kịch bản kiểm thử E2E API thực tế `test_reschedule_studio_booking.js`: Đạt **100% PASS** bao quát tạo booking, chặn dời sang Chủ nhật (400), dời lịch hợp lệ (200), chặn user khác (403), Admin duyệt và dời lịch ưu tiên force (200).
      - Next.js Production Build: **28/28 routes hoàn tất thành công 100%**.
    * **KẾT LUẬN GIAI ĐOẠN 4:** Đã hoàn thành 100% tất cả 5 task của Giai đoạn 4 (Task 4.1, 4.2, 4.3, 4.4, 4.5), sẵn sàng bước vào Giai đoạn 5 (Kiểm thử tích hợp toàn diện, hồi quy & đóng gói bàn giao).

### GIAI ĐOẠN 5 (23/11 – 25/11/2026): KIỂM THỬ TÍCH HỢP TOÀN DIỆN, HỒI QUY & ĐÓNG GÓI BÀN GIAO — HOÀN THÀNH 100%
- [x] **Task 5.1:** Kiểm thử phân quyền chặt chẽ trên 3 vai trò: Nhân sự (`ADMIN`), CTV (`COLLABORATOR`), Người dùng (`USER`) & chưa đăng nhập (Anonymous) trên toàn bộ API endpoints.
  - *Củng cố bảo mật phát hiện qua rà soát:* Bổ sung `authorize('ADMIN')` cho `GET /api/equipments/:equipmentId/maintenances` ([equipment.routes.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/routes/equipment.routes.js)) và `authorize('COLLABORATOR', 'ADMIN')` cho `GET /api/tasks/stats`, `GET /api/tasks`, `GET /api/tasks/:id` ([task.routes.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/routes/task.routes.js)).
  - *Kết quả kiểm thử trực tiếp (`test_phase5_comprehensive.js`):* Anonymous bị chặn `401` trên **13/13** endpoint; `USER` bị chặn `403` trên **21/21** endpoint CTV/ADMIN & truy cập hợp lệ **6/6** endpoint cá nhân; `COLLABORATOR` bị chặn `403` trên **23/23** endpoint ADMIN-only, chặn xem chéo task CTV khác (`403`) & truy cập hợp lệ **6/6** endpoint CTV; `ADMIN` bị chặn tự khóa/tự xóa chính mình (`400`).
- [x] **Task 5.2:** Kiểm thử hồi quy 100% chức năng COMPLETED ban đầu & toàn bộ FR-01 → FR-09, bảo đảm không có lỗi chéo (side-effect).
  - *Kết quả:* **144/144 Backend Unit Tests PASS** (26 suites — bổ sung Suite 26 kiểm thử hardening Giai đoạn 5); **7/7 nhóm hồi quy E2E trực tiếp trên SQL Server PASS** (FR-01/FR-01.5 bảo trì khôi phục `AVAILABLE`, FR-02/TC-02 mượn-duyệt-bàn giao-trả, FR-03/TC-01 chặn Chủ nhật/buffer 30p/dời lịch, FR-04 giao việc-làm-nộp-sửa-nghiệm thu, FR-05/FR-08 Dashboard + lịch tuần + xuất Excel 6 sheet, FR-06/TC-27 lưu themePreference DB, FR-09 Audit Logs); **18/18 tuyến trang Frontend SSR trả 200 OK**; **0 lỗi TypeScript** (`tsc --noEmit`).
- [x] **Task 5.3:** Kiểm tra tính toàn vẹn dữ liệu, concurrency locks (chống race condition khi duyệt đơn).
  - *Nâng cấp chống Race Condition chuẩn SQL Server:*
    * [borrowRequest.service.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/services/borrowRequest.service.js): Khóa độc quyền theo thiết bị trong Transaction (`sp_getapplock` `@Resource = borrow_eq_<equipmentId>`) + khóa dòng `Equipment` trực tiếp + trừ tồn kho nguyên tử (`available_quantity >= quantity`).
    * [studioBooking.service.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/services/studioBooking.service.js): Bọc `processBooking` trong `sequelize.transaction` kèm khóa độc quyền theo phòng Studio (`sp_getapplock` `@Resource = studio_room_<studioName>`) và truyền `transaction` vào `checkStudioConflict`.
  - *Kết quả kiểm thử song song thực tế (`Promise.all`):* 2 lượt duyệt đơn mượn song song tranh 1 máy -> đúng 1 `200` + 1 `400`, `available_quantity = 0` (không âm kho); 2 lượt duyệt trùng lịch Studio song song -> đúng 1 `CONFIRMED` + 1 `warning` (không duyệt đè); kiểm tra toàn vẹn CSDL SQL Server thực tế: **0** thiết bị sai tồn kho, **0** ca trực tương lai `COMPLETED` sớm, **0** bản ghi `AuditLogs` rò rỉ mật khẩu.
- [x] **Task 5.4:** Rà soát và cập nhật Swagger API Docs, tài liệu kỹ thuật, hướng dẫn cài đặt.
  - *Swagger OpenAPI 3.0.0 ([swagger.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/config/swagger.js)):* Khắc phục đường dẫn POSIX glob trên Windows, cập nhật lên phiên bản `3.0.0` (3 vai trò RBAC), bổ sung đầy đủ `@swagger` JSDoc cho `task.routes.js`, `duty.routes.js`, `payroll.routes.js`, `notification.routes.js`, `maintenance.routes.js`, `auth.routes.js` (`/theme`), `studioBooking.routes.js` (`available-slots`, `check-in`, `confirm-usage`, `mark-absent`, `reschedule`), `borrowRequest.routes.js` (`handover`), `reports.routes.js` (các endpoint xuất Excel). Xác minh thực tế `GET /api-docs.json` sinh **92 API paths hợp lệ**.
  - *Hướng dẫn cài đặt & vận hành:* Khởi tạo hoàn chỉnh [README.md](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/README.md) ở thư mục gốc (cấu trúc dự án, danh sách biến `.env`, khởi tạo SQL Server, chạy dev/production, Swagger Docs và lệnh kiểm thử).
- [x] **Task 5.5:** Đóng gói mã nguồn và hoàn tất biên bản bàn giao nghiệm thu dự án.
  - *Hoàn thiện:* Bổ sung script `npm run test:phase5` trong [TN-Backend/package.json](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/package.json), dọn sạch 100% dữ liệu kiểm thử khỏi CSDL, xác minh tổng thể **21/21 PASS (0 FAIL)** trên `test_phase5_comprehensive.js`, và ban hành [BIEN_BAN_BAN_GIAO_NGHIEM_THU.md](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/BIEN_BAN_BAN_GIAO_NGHIEM_THU.md).
  - **KẾT LUẬN DỰ ÁN:** Hoàn thành **100% cả 5 Giai đoạn (FR-01 → FR-09, TC-01 → TC-27)** — Hệ thống LHU Media Studio `v3.0.0` sẵn sàng bàn giao và vận hành chính thức.

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
- [x] **TC-11 (Đồng bộ Công việc CTV và Bảng chấm công tháng - Tự động chuyển LV sang SV & Đồng bộ Real-time):**
  - Tự động chuyển ký hiệu chấm công từ `LV` sang `SV` tại ngày phát sinh khi CTV có công việc đã nghiệm thu thành công (`status = 'COMPLETED'`) hoặc công việc ngoài hệ thống vừa khai báo (`createExternalTask`).
  - Phân bổ buổi theo tổng thời gian làm việc thực tế trong ngày (`actualHours`):
    * **Dưới 5 tiếng (`0 < totalDayHours < 5`)**: Phân bổ vào **buổi sáng (S)** (bao gồm cả trường hợp từ 4 đến dưới 5 tiếng theo quy tắc chính thức).
    * **Từ 5 đến 8 tiếng (`5 <= totalDayHours <= 8`)**: Phân bổ vào cả **buổi sáng và chiều (S + C)**.
    * **Trên 8 tiếng (`totalDayHours > 8`)**: Phân bổ vào cả **sáng, chiều và tối (S + C + T)**.
  - Chuẩn hóa ngày toàn diện (`normalizeExecutionDate`): Tự động phát hiện và sửa lỗi date picker trình duyệt đảo ngày đầu tháng 11 (`01..09/11`) thành `YYYY-0M-11`, đồng thời bảo toàn ngày 11/10 (`2026-10-11`).
  - Cập nhật thời gian thực (Real-time sync): Ngay khi CTV gửi khai báo công việc ngoài, hệ thống tự động upsert CSDL và cập nhật Bảng chấm công tức thì không cần tải lại trang.
  - Khử trùng giờ tuyệt đối: Ca trực bị chuyển thành `SV` không bị tính trùng 4h trong thù lao ca trực (`shiftHours`).
  - Kiểm thử tự động: Đạt **89/89 Unit Tests PASS 100%** (Suite 14), kịch bản `test_task_timesheet_sync.js` và `test_realtime_external_task_sync.js` đều **PASS 100%**. Giao diện và API hoạt động ổn định.
- [x] **TC-12 (Cập nhật Lịch trực Studio & Đồng bộ Sự vụ CTV - Quản lý ca trực toàn diện):**
  - **1. Hiển thị sự vụ `SV` trên lịch trực Studio:**
    * Khi Nhân sự giao nhiệm vụ mới cho CTV trong tháng, trên ma trận lịch trực (`admin/duty` và `tasks`), tại ngày tương ứng của CTV tự động hiển thị ký hiệu `SV` màu tím.
    * Click/hover vào `SV` hiển thị popover/tooltip danh sách tên các nhiệm vụ, số giờ làm thực tế và trạng thái nghiệm thu.
    * Vẫn hiển thị đầy đủ ca trực phân công, không làm mất ký hiệu ca trực.
    * **Ràng buộc bảo vệ tối quan trọng:** Ký hiệu `SV` trên Quản lý ca trực chỉ mang ý nghĩa thông báo trực quan. Tuyệt đối KHÔNG tự động ghi nhận `SV` vào Bảng chấm công hoặc tính thù lao khi vừa giao việc; chỉ khi CTV gửi bài và Nhân sự nghiệm thu thành công (`status === 'COMPLETED'`) mới cập nhật `SV` vào Bảng chấm công theo quy tắc giờ làm việc.
  - **2. Quyền xem lịch trực toàn bộ CTV:**
    * Cả tài khoản `COLLABORATOR` và `ADMIN` đều có quyền xem toàn bộ lịch trực chính thức của tất cả CTV trong tháng (họ tên, ngày trực, buổi S-C-T) dạng bảng ma trận và danh sách trực quan.
    * CTV chỉ xem (read-only), không chỉnh sửa hoặc xóa lịch của người khác.
  - **3. Nhân sự chỉnh sửa & xóa lịch trực đã xác nhận (`CONFIRMED`):**
    * ADMIN được phép chỉnh sửa ca trực hoặc xóa các ca trực đã xác nhận trong tháng.
    * Cho phép thay đổi CTV, ngày trực, buổi trực; kiểm tra trùng ca và CTV phải Active.
    * Tự động ghi nhận lịch sử chỉnh sửa vào bảng `DutyScheduleHistories` (lưu changer, target CTV, date, session, action, oldValue, newValue, reason).
    * Tự động gửi thông báo in-app đến CTV bị ảnh hưởng (nêu rõ ngày, buổi và nội dung thay đổi).
  - **4. Hiển thị lịch trực sau khi đóng đăng ký tại Đăng ký thời gian có thể trực:**
    * Trong thời gian đăng ký: CTV xem và đăng ký các slot có thể trực.
    * Sau khi Nhân sự đóng đăng ký và chốt lịch (`CONFIRMED`): hiển thị toàn bộ lịch trực chính thức của tất cả CTV trong tháng. Phân biệt rõ lịch đăng ký nguyện vọng và lịch trực chính thức qua 2 tab rõ ràng.
  - **5. Quy tắc thiết lập hạn chót đăng ký khi Admin tạo đợt mới:**
    * Mặc định ngày hạn chót = ngày tạo bảng + 2 ngày.
    * Tháng/năm hạn chót = tháng/năm của đợt trực được chọn (độc lập ngày tạo và tháng đợt trực).
    * Cho phép Admin tùy chỉnh ngày/tháng/năm và không ghi đè khi Admin đã chọn.
    * Quá hạn thì tự động đóng quyền đăng ký.
  - **Kiểm thử tự động:** Script kiểm thử tích hợp E2E `test_duty_schedule_and_task_sync.js` đạt **PASS 100%**, suite kiểm thử Backend đạt **89/89 tests PASS 100%**, Frontend build Next.js thành công 26 routes.
- [x] **TC-13 (Tự động hoàn thành ca trực theo thời gian thực & Bỏ xác nhận thủ công từ CTV):**
  - **1. Bỏ nút/chức năng CTV tự xác nhận đã trực xong:**
    * Xóa bỏ hoàn toàn nút "Xác nhận đã trực xong" và hàm `handleCompleteShift` trên giao diện CTV (`/tasks`).
    * Chặn quyền CTV tự gọi API `PUT /duty/shifts/:id/complete` (trả về 403 Forbidden nếu không phải ADMIN).
  - **2. Cơ chế tự động hoàn thành theo thời gian thực:**
    * Khi thời gian ca trực kết thúc (`now >= shiftEndDate`), hệ thống tự động chuyển trạng thái ca trực từ `CONFIRMED` sang `COMPLETED`.
    * Khung giờ kết thúc tiêu chuẩn: Sáng = 11:30, Chiều = 17:00, Tối = 21:30.
    * Cơ chế kích hoạt kép (Dual Trigger): Background worker chạy ngầm mỗi 60 giây VÀ On-demand hooks kích hoạt ngay khi tải trang lịch trực (`getShifts`, `getPeriodRegistrationsSummary`) hoặc khi tải bảng chấm công / tính thù lao (`getTimesheetData`, `calculateMonthlyPayroll`).
  - **3. Ràng buộc bảo vệ tuyệt đối:**
    * Chỉ tự động hoàn thành những ca trực đã được Nhân sự xác nhận và phân công chính thức (`CONFIRMED`).
    * Tuyệt đối KHÔNG tự động hoàn thành ca trực bị hủy (`CANCELLED`).
    * Tuyệt đối KHÔNG tự động hoàn thành ca trực chưa đến thời gian kết thúc (ca trong tương lai hoặc ca trong ngày nhưng chưa hết giờ `endTime`).
    * Chống chạy trùng / Idempotency 100%: Quét nhiều lần không gây trùng lặp, không nhân đôi giờ công hoặc thù lao.
  - **4. Tác động đến Bảng chấm công và thù lao:**
    * Bảng chấm công chỉ xuất hiện ký hiệu `LV` và bảng lương chỉ tính 4.0 giờ / ca khi ca trực đã chuyển sang `COMPLETED`.
    * Ca chưa hết giờ hoặc ca hủy tuyệt đối không phát sinh giờ công hay tiền thù lao.
  - **Kiểm thử tự động:** Script `test_auto_complete_shift_realtime.js` đạt **PASS 100% cả 6 nhóm testcase**, Backend suite đạt **89/89 tests PASS**, Next.js build **26 routes thành công 100%**.
- [x] **TC-13.1 (Khắc phục triệt để lỗi ca trực tương lai bị đánh dấu hoàn thành trước hạn):**
  - **Nguyên nhân gốc (Root Cause):** Do script kiểm thử `test_auto_complete_shift_realtime.js` trước đó chạy với ngày giả lập năm 2029 (`2029-11-06`) khi chưa cô lập `periodId`, khiến hàm quét toàn cục chuyển nhầm 60 ca trực tương lai (từ 18/11/2026 trở đi) sang `COMPLETED`.
  - **Khắc phục CSDL (Data Recovery):**
    * Đã chạy script phục hồi toàn bộ 60 ca trực tương lai về trạng thái chuẩn xác `CONFIRMED`.
    * Đã xóa sạch toàn bộ các bản ghi `AttendanceRecord` loại `DUTY_SHIFT` phát sinh sớm ngoài ý muốn của các ngày từ 18/11/2026 trở đi.
    * Đảm bảo các ca trong quá khứ (từ 02/11 đến 13/11/2026) được bảo toàn nguyên vẹn `COMPLETED` và `LV`.
  - **Nâng cấp mã nguồn Backend (`TN-Backend/src/services/duty.service.js`):**
    * Bổ sung tham số `options.periodId` vào `autoCompletePastConfirmedShifts`: Cho phép cô lập quét theo từng đợt trực, tuyệt đối ngăn chặn việc kiểm thử hoặc thao tác ở đợt này ảnh hưởng tràn sang đợt trực khác.
    * Kiểm tra đối chiếu thời gian kép: Ràng buộc `date <= todayStr` VÀ so sánh chính xác từng phút với `now >= shiftEndDate`.
  - **Cập nhật script kiểm thử (`TN-Backend/scripts/test_auto_complete_shift_realtime.js`):**
    * Cô lập hoàn toàn môi trường mock test với `{ targetNow, periodId: testPeriod.id }`, không can thiệp vào các đợt thực tế.
  - **Frontend CTV (`TN-Frontend/src/app/tasks/page.tsx`):**
    * Các ca trực tương lai (`CONFIRMED`) hiển thị badge xanh dương *"Lịch chính thức"* và chú thích *"Tự động hoàn thành khi hết giờ"*.
    * Chỉ các ca đã thực sự diễn ra trong quá khứ (`COMPLETED`) mới hiển thị badge xanh lá *"Đã trực xong"* và *"Đã tính công"*.
  - **Xác minh thực tế:** Toàn bộ CSDL sạch 100% (0 ca tương lai bị COMPLETED), Backend & Frontend hoạt động ổn định trên cổng 5000 & 3000.
- [x] **TC-14 (Thiết kế Giao diện Lịch trực Studio dạng Bảng tuần chuẩn BPTT theo hình ảnh tham chiếu 1):**
  - **1. Cấu trúc Bảng phân công tuần chuẩn tham chiếu:**
    * Tiêu đề: `BẢNG PHÂN CÔNG LỊCH LÀM VIỆC NHÂN SỰ BPTT (Ngày dd/MM - dd/MM/YYYY)`.
    * Cột ma trận: `STT`, `NHÂN SỰ`, `Số lượng` (tổng ca/buổi làm việc trong tuần).
    * 7 ngày trong tuần từ Thứ Hai đến Chủ Nhật, mỗi ngày chia thành 3 buổi con: Sáng (S), Chiều (C), Tối (T).
    * Nhóm cột bên phải `Số lượng buổi làm`: `SC` (Studio ca), `SV` (Sự vụ), `D` (Đêm / Tối trực).
    * Nhóm cột `Tình trạng`: `DP` (Dự phòng), `NP` (Nghỉ phép), `SX` (Sản xuất / Sắp xếp).
    * Hàng `TỔNG` ở cuối: Tổng số lượng buổi làm và tổng từng buổi (S, C, T) của từng ngày trong tuần.
  - **2. Ký hiệu và Tooltip sự vụ SV:**
    * Hiển thị chuẩn xác các ký hiệu: `LV`, `SV`, `NL`, `DP`, `NP`, `SX`.
    * Tại ô có sự vụ (`SV`), hiển thị dấu tam giác chỉ báo note ở góc trên bên phải (Marker tương tự Excel Note).
    * Khi rê hoặc nhấp chuột vào ô `SV`, hiển thị popover thông tin chi tiết: Avatar + Tên người giao + thời gian giao (`Nguyễn Quang Huy • 09:20 12 thg 11`), Tên sự vụ + địa điểm (`CNTT - Workshop "Bán hàng đa kênh (Omnichannel) cùng SAPO" - A301`), trạng thái nghiệm thu và thời lượng thực tế.
    * Hỗ trợ hiển thị đầy đủ danh sách khi ngày có nhiều sự vụ.
  - **3. Thời gian thực và Highlight ngày hiện tại:**
    * Tự động nhận diện `todayStr` theo thời gian thực hệ thống.
    * Cột của ngày hiện tại được làm nổi bật với viền/nền hổ phách và badge `"Hôm nay"`.
    * Khi thời gian sang ngày mới, vị trí highlight tự động cập nhật. Cột Chủ Nhật có màu nền phân biệt.
  - **4. Quyền truy cập & Điều hướng:**
    * Cả ADMIN và COLLABORATOR đều có quyền xem toàn bộ nhân sự bộ phận trên cả `/tasks` và `/admin/duty`.
    * Bộ điều hướng linh hoạt: Tuần trước, Tuần này (Hôm nay), Tuần sau, tìm kiếm CTV nhanh, lọc theo vai trò.
    * Cho phép chuyển đổi linh hoạt giữa Bảng tuần BPTT và Danh sách chi tiết.
  - **5. Kiểm thử tự động:**
    * Script kiểm thử tích hợp `test_weekly_schedule_bptt.js` đạt **PASS 100% cả 6 test criteria**.
    * Backend Unit test suite đạt **89/89 tests PASS 100%**.
    * Frontend Next.js build Production thành công **26/26 routes (0 lỗi)**.
- [x] **TC-15 (Gộp Lịch Trực Studio và Phân Công Sự Vụ thành Lịch Trực Studio Thống Nhất):**
  - **1. Gộp tên và chức năng:**
    * Thống nhất một mục duy nhất có tên **Lịch trực Studio** trên toàn hệ thống (loại bỏ hoàn toàn cụm từ trùng lặp "Lịch Trực Studio & Phân Công Sự Vụ BPTT" và "Lịch Trực Studio & Đăng Ký Lịch Rảnh").
    * Loại bỏ hoàn toàn ma trận lịch tháng 31 ngày bị trùng lặp trên giao diện CTV `/tasks`, tránh gây rối mắt và nhầm lẫn giữa 2 lịch song song.
    * Đưa Bảng tuần chuẩn BPTT làm trung tâm hiển thị duy nhất cho phân hệ ca trực.
  - **2. Thiết kế lịch thống nhất cho CTV:**
    * Bảng tuần hiển thị 7 ngày (Thứ Hai -> Chủ Nhật) x 3 ca (Sáng - Chiều - Tối) cho toàn bộ nhân sự BPTT.
    * Kết hợp đầy đủ trong cùng một lịch:
      - Ca trực Studio đã xác nhận (`LV`).
      - Sự vụ/nhiệm vụ CTV được phân công (`SV` kèm marker tam giác và popover tooltip chi tiết người giao, thời gian, tiêu đề, địa điểm).
      - Nguyện vọng đăng ký thời gian có thể trực (`ĐK` với viền nét đứt màu hổ phách).
      - Các trạng thái khác: `NL` (Nghỉ lễ), `DP` (Dự phòng), `NP` (Nghỉ phép), `SX` (Sản xuất).
      - Hàng TỔNG và nhóm cột thống kê số lượng buổi làm (`SC`, `SV`, `D`) và tình trạng (`DP`, `NP`, `SX`).
  - **3. Tích hợp dữ liệu đăng ký ca trực của CTV:**
    * Lịch tuần lấy dữ liệu từ `ShiftRegistration` trong đợt trực tương ứng.
    * Phân biệt rõ buổi CTV đăng ký nguyện vọng (`ĐK`) và buổi trực chính thức được Nhân sự xác nhận (`LV`).
    * Nguyện vọng (`ĐK`) không tự động coi là ca trực chính thức và không tính vào cột tổng buổi làm `totalShifts` hay thù lao.
    * CTV đăng ký lịch rảnh thông qua nút và Modal "Đăng ký thời gian có thể trực Studio" tiện lợi, trực quan khi đợt trực ở trạng thái `OPEN`.
  - **4. Đồng bộ dữ liệu thời gian thực (Real-time Sync):**
    * Khi Admin giao việc, sửa, hủy nhiệm vụ tại `/admin/tasks`, hoặc xếp/chốt lịch tại `/admin/duty`, hoặc CTV lưu đăng ký lịch rảnh: Hệ thống phát sự kiện `duty_schedule_updated` và BroadcastChannel `lhu_media_duty_sync`.
    * `WeeklyDutyScheduleTable` tự động làm mới ngay lập tức mà không cần tải lại toàn bộ trang.
    * Cơ chế polling chạy ngầm mỗi 15 giây đảm bảo dữ liệu luôn mới nhất giữa các người dùng.
  - **5. Phân quyền:**
    * Cả `ADMIN` và `COLLABORATOR` đều được xem lịch trực thống nhất của toàn bộ bộ phận.
    * CTV chỉ được đăng ký ca trực trong đợt mở đăng ký (`OPEN`).
    * Chỉ `ADMIN` có quyền xếp lịch, chỉnh sửa và xác nhận lịch trực chính thức.
  - **6. Kiểm thử tự động:**
    * TypeScript check: `tsc --noEmit` đạt **0 lỗi (0 errors)**.
    * Script kiểm thử tích hợp `test_weekly_schedule_bptt.js` đạt **PASS 100% cả 6 test criteria**.
    * Backend Unit test suite đạt **89/89 tests PASS 100%**.
    * Frontend Next.js build Production thành công **26/26 routes (0 lỗi)**.
- [x] **TC-16 (Phân Công Công Việc Trực Tiếp Trên Lịch Trực Studio và Đồng Bộ Hai Chiều Với Quản Lý Công Việc):**
  - **1. Phân công trực tiếp từ Lịch trực Studio:**
    * ADMIN có thể nhấn trực tiếp vào bất kỳ ô ngày/buổi (S/C/T) nào của CTV trên `WeeklyDutyScheduleTable` để mở Modal giao việc.
    * Hệ thống tự động điền sẵn tên CTV, ngày thực hiện (`executionDate`) và ca/buổi (`shiftSession`: S/C/T).
    * Hỗ trợ nút `+ Giao nhiệm vụ cho CTV vào buổi này` trực tiếp trong popover ca trực rảnh hoặc ca làm việc.
  - **2. Form giao việc chuẩn hóa với Date Picker và Thời gian linh hoạt:**
    * Giao diện nhập trực quan: Tên nhiệm vụ, Loại công việc (`TASK_TYPES`), Mô tả, Địa điểm / Khu vực.
    * Trường Deadline được trang bị Date Picker dạng popup lịch trực quan (`showPicker()`) và tách riêng hai dropdown Giờ (`00`–`23`) và Phút (`00`–`59`), loại bỏ hoàn toàn trường giây.
    * Xem trước thời hạn deadline thời gian thực theo định dạng chuẩn `dd/MM/yyyy HH:mm`.
  - **3. Hiển thị ký hiệu SV và Quản lý sự vụ trên Lịch trực:**
    * Ký hiệu `SV` kèm marker chỉ báo ghi chú hiển thị lập tức tại ô tương ứng ngay sau khi tạo nhiệm vụ thành công.
    * Khi rê hoặc nhấp vào ô `SV`, hiển thị popover thông tin chi tiết: Tên sự vụ, địa điểm, thời gian, người giao.
    * ADMIN có đầy đủ bộ công cụ quản trị ngay tại popover:
      - Nút **"Quản lý"**: Mở trực tiếp trang Quản lý Công việc lọc theo nhiệm vụ (`/admin/tasks?search=...`).
      - Nút **"Sửa"**: Mở modal Chỉnh sửa nhiệm vụ ngay trên giao diện Lịch trực.
      - Nút **"Xóa"**: Mở modal Xác nhận xóa nhiệm vụ với cơ chế dọn sạch ký hiệu `SV`.
      - Nút **"+ Giao thêm nhiệm vụ (sự vụ) cho ca này"**: Cho phép giao thêm việc cho ca đã có SV.
  - **4. Đồng bộ hai chiều thời gian thực (Real-time Bi-directional Sync):**
    * Cả hai giao diện (`Lịch trực Studio` và `Quản lý Công việc & Phân Công CTV`) cùng quản lý một nguồn dữ liệu công việc duy nhất (`Task` model trong Database).
    * Khi tạo, sửa, hoặc xóa nhiệm vụ từ bất kỳ giao diện nào, hệ thống phát sự kiện `BroadcastChannel('lhu_media_duty_sync')` và CustomEvent (`duty_schedule_updated`, `task_updated`) để giao diện còn lại tự động cập nhật ngay mà không cần reload trang.
  - **5. Kiểm soát chấm công và Phân quyền RBAC:**
    * Nhiệm vụ mới giao (dù hiển thị SV trên lịch) tuyệt đối KHÔNG được ghi nhận vào Bảng chấm công (`AttendanceRecord` / `Payroll`) khi chưa được CTV báo cáo và Admin nghiệm thu `COMPLETED`.
    * Phân quyền RBAC nghiêm ngặt: Chỉ `ADMIN` mới có quyền giao việc, chỉnh sửa và xóa nhiệm vụ; `COLLABORATOR` không được tự giao việc cho bản thân hoặc người khác.
  - **6. Kiểm thử tự động:**
    * Kịch bản kiểm thử tích hợp `TN-Backend/scripts/test_duty_direct_task_assignment.js`: **PASS 6/6 kịch bản (100%)**.
    * Backend Unit test suite: **PASS 89/89 tests (100%)**.
    * TypeScript Compilation: **0 lỗi (0 errors)**.
    * Next.js Production Build: **26/26 routes hoàn tất thành công**.
- [x] **TC-17 (Bổ Sung Trường Địa Điểm Thực Hiện Khi Giao Nhiệm Vụ Cho CTV):**
  - **1. Điều kiện hiển thị thông minh:**
    * Chỉ tự động hiển thị trường Địa điểm thực hiện khi ADMIN chọn loại công việc thuộc các nhóm: Chụp ảnh, Quay phim/video, Diễn viên, Khác.
    * Các loại việc như Viết content, Dựng clip, Thiết kế, Kịch bản... tự động ẩn trường địa điểm.
  - **2. Cấu trúc trường địa điểm 2 thành phần:**
    * **Cơ sở:** Dropdown 6 cơ sở chuẩn Đại học Lạc Hồng (`Cơ sở 1`, `Cơ sở 2`, `Cơ sở 3`, `Cơ sở 5`, `Cơ sở 6`, `Cơ sở Dược`).
    * **Phòng:** Ô nhập văn bản để ADMIN nhập tên phòng hoặc địa điểm chi tiết (VD: `Phòng B502`, `Hội trường T`...).
    * Tự động tổng hợp và xem trước địa điểm: `Cơ sở - Phòng`.
  - **3. Quy tắc xử lý & Lưu trữ Database:**
    * Bổ sung các cột `campus`, `room`, `location` vào bảng `Tasks` trong Database MSSQL và Model Sequelize.
    * Khi thay đổi loại công việc sang nhóm không yêu cầu địa điểm, hệ thống tự động xóa sạch dữ liệu địa điểm cũ cả ở Frontend và Backend, bảo đảm không bị gắn nhầm vào nhiệm vụ.
  - **4. Đồng bộ hiển thị đa module:**
    * Hiển thị trong chi tiết công việc của CTV (`/tasks`) và ADMIN (`/admin/tasks`).
    * Đồng bộ lên ghi chú sự vụ SV và popover chi tiết trên Lịch trực Studio (`WeeklyDutyScheduleTable`).
    * Cập nhật tức thì khi chỉnh sửa địa điểm nhiệm vụ qua cơ chế BroadcastChannel và CustomEvent.
  - **5. Kiểm thử tự động:**
    * Script kiểm thử tích hợp `test_task_location_feature.js`: **PASS 6/6 kịch bản (100%)**.
    * Script kiểm thử hồi quy `test_duty_direct_task_assignment.js`: **PASS 6/6 kịch bản (100%)**.
    * Backend Unit Tests: **PASS 89/89 tests (100%)**.
    * TypeScript Typecheck: **0 lỗi (0 errors)**.
    * Next.js Production Build: **26/26 routes hoàn tất thành công**.
- [x] **TC-18 (Bổ Sung Thời Gian Thực Hiện Khi Giao Nhiệm Vụ Cho CTV):**
  - **1. Thay thế trường Deadline thành Thời gian bắt đầu theo nhóm công việc:**
    * Đối với 4 nhóm công việc: Chụp ảnh, Quay phim/video, Diễn viên, Khác: Thay thế trường Thời hạn hoàn thành (Deadline) bằng trường **Thời gian bắt đầu** (`startTime`).
    * Sử dụng Date Picker trực quan dạng lịch để chọn ngày; phần chọn giờ chỉ gồm 2 cột riêng biệt Giờ và Phút (loại bỏ hoàn toàn trường giây).
    * Giữ nguyên trường Thời hạn hoàn thành (Deadline) cho các nhóm công việc còn lại (Viết content, Dựng clip, Thiết kế, Kịch bản...).
    * Tự động làm sạch trường không sử dụng: Khi chuyển sang nhóm công việc tại chỗ thì xóa deadline và lưu startTime; khi chuyển sang nhóm việc khác thì xóa startTime và lưu deadline.
  - **2. Lưu trữ chính xác trong Database và Backend:**
    * Bổ sung cột `start_time DATETIMEOFFSET NULL` trong bảng `Tasks` MSSQL và model Sequelize `Task.js`.
    * Backend `task.service.js` tự động đồng bộ `executionDate` theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh`) dựa trên `startTime` của công việc.
  - **3. Hiển thị thông tin Thời gian thực hiện trên Popup Lịch trực Studio:**
    * Khi ADMIN giao nhiệm vụ, thời gian bắt đầu được đồng bộ lập tức vào dữ liệu sự vụ trên Lịch trực Studio (`WeeklyDutyScheduleTable`).
    * Popup tooltip khi rê chuột hoặc nhấp vào ký hiệu `SV` hiển thị thông tin **Thời gian thực hiện** theo định dạng dễ đọc chuẩn Việt Nam: `HH:mm, dd/MM/yyyy` (ví dụ: `08:30, 20/11/2026`).
    * Khi một buổi có nhiều nhiệm vụ, mỗi nhiệm vụ hiển thị độc lập đúng thời gian thực hiện tương ứng.
    * Fallback an toàn nếu chưa có thời gian bắt đầu (hiển thị hạn chót hoặc "Chưa xác định", không bị lỗi giao diện).
    * Khi ADMIN chỉnh sửa thời gian nhiệm vụ, popup cập nhật tự động tức thì.
  - **4. Đồng bộ trên Quản lý Công việc và Giao diện CTV:**
    * `/admin/tasks`: Cột thời gian hiển thị rõ ràng thời gian bắt đầu (badge xanh dương) hoặc hạn chót kèm cảnh báo quá hạn; Modal chi tiết hiển thị đúng nhãn.
    * `/tasks` (CTV): Thẻ nhiệm vụ và modal chi tiết hiển thị đúng `Bắt đầu: HH:mm, dd/MM/yyyy`.
    * Không ảnh hưởng đến quy tắc chấm công & thù lao: Thời gian được giao chỉ mang tính kế hoạch thực hiện, không tự động tính công khi chưa được nghiệm thu `COMPLETED`.
  - **5. Kiểm thử tự động:**
    * Script kiểm thử tích hợp `test_task_start_time_feature.js`: **PASS 100%**.
    * Backend Unit Tests: **PASS 89/89 tests (100%)**.
    * TypeScript Compilation: **0 lỗi (0 errors)**.
    * Next.js Production Build: **26/26 routes hoàn tất thành công**.
- [x] **TC-19 (Bổ Sung Chức Năng Xóa Đợt Đăng Ký Ca Trực Theo Tháng & Bảo Toàn Lịch Sử):**
  - **1. Giao diện & Nút xóa đợt đăng ký (Chỉ ADMIN):**
    * Thêm biểu tượng Thùng rác (`Trash2`) trên từng thẻ tháng tại mục **"CÁC ĐỢT ĐĂNG KÝ CA TRỰC THEO THÁNG"** (`/admin/duty`).
    * Phân quyền trực quan: Chỉ tài khoản `ADMIN` mới nhìn thấy và thao tác được nút này; ẩn hoàn toàn đối với `COLLABORATOR`.
    * Ngăn chặn nổi bọt sự kiện (`e.stopPropagation()`) để không kích hoạt chọn đợt khi nhấn xóa.
  - **2. Hộp thoại xác nhận thông minh (Smart Confirmation Modal):**
    * Nêu rõ Tháng/Năm của đợt sắp xóa (VD: `Tháng 11/2026`).
    * Tích hợp gọi API kiểm tra an toàn dữ liệu tự động (`GET /api/duty/periods/:id/deletion-check`) ngay khi mở modal.
    * Hiển thị bảng tóm tắt an toàn dữ liệu thời gian thực: Số lượng CTV đăng ký nguyện vọng, ca trực đã phân công, ca quá khứ, ca tương lai, số bản ghi chấm công thực tế và bảng thù lao.
  - **3. Cơ chế Xóa sạch (Hard Delete) vs Lưu trữ & Hủy đợt (Archive / Soft Delete):**
    * **Xóa vật lý an toàn (Hard Delete):** Áp dụng cho các đợt trống, đợt chỉ có nguyện vọng đăng ký nháp, hoặc đợt đã xác nhận trong tương lai chưa từng phát sinh buổi trực quá khứ, chấm công hoặc thù lao. Xóa sạch sẽ đợt và các bản ghi liên quan trong transaction Sequelize.
    * **Lưu trữ & Hủy đợt bảo toàn 100% dữ liệu (Archive / Cancel):** Nếu đợt đã có dữ liệu lịch sử quan trọng (ca trực đã qua, buổi chấm công đã ghi nhận, hoặc bảng thanh toán thù lao đã tạo), hệ thống **tuyệt đối không xóa vật lý**; chuyển đợt sang trạng thái `CANCELLED` / `ARCHIVED`, hủy các ca trong tương lai, gỡ khung lịch khỏi danh sách hiển thị đang hoạt động, đồng thời ghi log kiểm toán đầy đủ thời gian và người thao tác. Toàn bộ lịch sử chấm công, nhiệm vụ và thù lao CTV được bảo toàn 100%.
    * Hiển thị lý do cụ thể và hướng dẫn xử lý trực tiếp trên giao diện modal.
  - **4. Cập nhật tức thì không reload trang & Đồng bộ thời gian thực:**
    * Sau khi xóa hoặc lưu trữ thành công, cập nhật state `periods` trên giao diện tức thì.
    * Nếu đợt vừa bị xóa/lưu trữ đang được chọn (`selectedPeriodId`), hệ thống tự động chuyển sang chọn đợt khả dụng tiếp theo.
    * Phát sự kiện `BroadcastChannel('lhu_media_duty_sync')` và CustomEvent `duty_schedule_updated` để tất cả các tab và giao diện liên quan đồng bộ ngay lập tức.
  - **5. Bảo mật phân quyền RBAC Backend:**
    * Các endpoint `GET /periods/:id/deletion-check` và `DELETE /periods/:id` được bảo vệ nghiêm ngặt bởi middleware `authenticate` và `authorize('ADMIN')`.
    * CTV (`COLLABORATOR`) gọi API bị từ chối ngay lập tức với mã lỗi `403 Forbidden`.
  - **6. Kiểm thử tự động:**
    * Script kiểm thử tích hợp `TN-Backend/scripts/test_delete_duty_period_feature.js`: **PASS 6/6 kịch bản (100%)**.
    * Backend Unit Tests: **89/89 tests PASS 100%**.
    * TypeScript Compilation: **0 lỗi (0 errors)**.
    * Next.js Production Build: **26/26 routes hoàn tất thành công**.
- [x] **TC-20 (Kiểm Tra & Chuẩn Hóa Tính Lương, Hệ Số Nhân Giờ Và Ghi Chú Thống Kê Công Việc - Single Source of Truth):**
  - **1. Chuẩn hóa công thức tính lương và hệ số nhân:**
    * Mức đơn giá cơ bản: **20.000 VNĐ / giờ**.
    * Danh sách chính xác 7 nhóm công việc được nhân giờ: **Chụp & xử lý hình**, **Quay phim**, **Quay highlight**, **Quay clip TikTok**, **MC bản tin**, **Thư ký trường quay**, **Diễn viên**.
    * Các công việc thuộc 7 nhóm trên thực hiện sau 16:30 từ thứ Hai đến thứ Bảy: **nhân 1,5**. Tách rõ số giờ trong giờ (x1.0) và số giờ ngoài giờ (x1.5).
    * Các công việc thuộc 7 nhóm trên thực hiện vào Chủ nhật: **nhân 2,0**.
    * Nếu làm vào Chủ nhật kéo dài qua 16:30: chỉ nhân **2,0**, ưu tiên hệ số Chủ nhật, không cộng dồn hệ số (TC-06).
    * Các công việc còn lại (Viết content, Viết kịch bản, Dựng clip highlight, Dựng clip TikTok, Dựng phim, Thiết kế...): luôn áp dụng **hệ số 1,0** chuẩn, không nhân hệ số ngoài giờ hay Chủ nhật.
    * Tiền công tính theo số giờ thực tế được Nhân sự nghiệm thu hoàn thành (`actualHours` của task `COMPLETED`), không tính theo số dòng.
    * Loại trừ 100% công việc chưa duyệt (`NOT_STARTED`, `IN_PROGRESS`, `PENDING_APPROVAL`, `REVISION_REQUESTED`).
    * Khử trùng tuyệt đối giữa ca trực Studio và công việc sự vụ (TC-05).
  - **2. Bắt buộc ghi chú và highlight công việc được nhân hệ số:**
    * Bảng thống kê công việc (`/admin/payroll` - Tab 2): Highlight trực tiếp dòng công việc đủ điều kiện nhân hệ số (nền vàng hổ phách `bg-amber-500/10`, viền trái nổi bật `border-l-4 border-l-amber-400`, badge `Hệ số x...`).
    * Hiển thị ghi chú chuẩn hóa tiếng Việt:
      - `Ngoài giờ: 2,5 giờ × 1,5`
      - `Chủ nhật: 4 giờ × 2`
      - `Chủ nhật (ưu tiên hệ số Chủ nhật): 3 giờ × 2`
      - Tách rõ từng khoảng giờ khi có cả trong và ngoài giờ: `Trong giờ: 2,5 giờ × 1,0; Ngoài giờ: 2 giờ × 1,5`.
    * Cột Thực hiện (giờ): Hiển thị giờ thực tế và số giờ quy đổi (`➔ ...h quy đổi`).
    * Cột Tổng (giờ): Hiển thị tổng giờ quy đổi của CTV kèm tổng giờ thực tế và thành tiền dự tính.
    * File Excel xuất ra (`exportTasksSummaryExcel`): Áp dụng chuẩn xác màu nền pastel vàng hổ phách (`FFFFF3CD`), chữ cam đậm nổi bật (`FFB45309`), cột Thực hiện (Col 6), Tổng giờ quy đổi (Col 7) và Ghi chú (Col 8).
  - **3. Đồng bộ hiển thị toàn hệ thống:**
    * **Bảng chấm công (Tab 1):** Cột Giờ SV hiển thị chi tiết số giờ thường, giờ ngoài giờ x1.5 và giờ Chủ nhật x2.0.
    * **Bảng lương tháng (Tab 3):** Bổ sung tab quản trị chuyên sâu với 4 thẻ KPI (Tổng ngân sách, Tổng giờ quy đổi, Tổng giờ thực tế, Số CTV nhận lương) và bảng chi tiết thù lao từng CTV đối chiếu rõ ràng số ca trực Studio, giờ sự vụ từng hệ số, tổng giờ quy đổi, đơn giá và tổng thực nhận.
    * **Modal Chi tiết công việc (`/admin/tasks` & `/tasks`):** Hiển thị khối "Nghiệm thu & Thù lao" với thời lượng thực tế, giờ quy đổi, badge hệ số và lý do áp dụng.
    * **Lịch trực Studio (`WeeklyDutyScheduleTable`):** Popover ký hiệu `SV` hiển thị badge hệ số nhân kèm thời lượng quy đổi.
  - **4. Single Source of Truth & Kiểm thử tự động:**
    * Backend tự xác định hệ số từ loại việc, ngày, thứ và thời gian thực hiện trong CSDL; không phụ thuộc vào dữ liệu Frontend gửi lên.
    * Thống nhất 100% dữ liệu tính toán giữa Bảng thống kê công việc, Bảng chấm công, Bảng lương tháng và 2 file Excel xuất ra.
    * Bổ sung Suite 19 vào `TN-Backend/test/unit.test.js`: **113/113 Unit Tests PASS 100%** (19 suites).
    * Next.js Production Build: **28/28 routes hoàn tất thành công 100%**.
- [x] **TC-21 (Bổ Sung Trường "Số Giờ Thực Hiện" Khi CTV Nộp Kết Quả Nhiệm Vụ & Đồng Bộ Nghiệm Thu):**
  - **1. Phía CTV nộp kết quả công việc (`/tasks`):**
    * Thêm trường nhập **"Số giờ thực hiện"** (`actualHours`) vào Modal Nộp kết quả nhiệm vụ (`submitModalOpen`).
    * Hỗ trợ số giờ thực tế dạng số thập phân linh hoạt (step: 0.5h, min: 0.5h, max: 24h), tự động khởi tạo mặc định theo giờ của task hoặc 2 giờ.
    * Validate dữ liệu nghiêm ngặt phía giao diện: Bắt buộc số giờ hợp lệ lớn hơn 0 trước khi gửi request.
    * Payload gửi lên `PUT /api/tasks/:id/progress` bao gồm đầy đủ `{ status: 'PENDING_APPROVAL', resultLink, proofFile, actualHours }`.
    * Modal Chi tiết nhiệm vụ phía CTV (`detailModalOpen`): Hiển thị khối thông tin thời lượng đã nộp kèm trạng thái *"Chờ Nhân sự nghiệm thu"*.
  - **2. Phía Backend (`task.service.js` & CSDL MSSQL):**
    * Hàm `updateProgress`: Trích xuất, validate và chuẩn hóa `actualHours` (kiểm tra `parsedHours > 0`, làm tròn 2 chữ số thập phân).
    * Lưu trực tiếp vào cột `actual_hours` của bảng `Tasks` trong cơ sở dữ liệu MSSQL.
    * Gửi thông báo in-app cho Nhân sự (Admin) với chi tiết nhiệm vụ, tên CTV nộp bài, link kết quả và số giờ CTV đề xuất.
  - **3. Tuân thủ nghiêm ngặt quy tắc tính thù lao TC-03:**
    * Khi ở trạng thái `PENDING_APPROVAL`, số giờ đề xuất tuyệt đối **CHƯA** được ghi nhận vào Bảng thống kê công việc (`getTasksSummaryData`), Bảng chấm công (`getTimesheetData`) hay Bảng lương tháng (`calculateMonthlyPayroll`).
    * Chỉ sau khi Nhân sự bấm duyệt nghiệm thu thành công (`status === 'COMPLETED'`), số giờ thực tế mới chính thức được ghi nhận và áp dụng hệ số nhân giờ theo đúng quy định BPTT LHU Media.
  - **4. Phía Nhân sự nghiệm thu (`/admin/tasks`):**
    * Modal "Chi tiết công việc" (`detailModalOpen`): Hiển thị nổi bật khối *"Số giờ thực hiện do CTV đề xuất"* kèm thời lượng cụ thể và ghi chú hướng dẫn khi task ở trạng thái `PENDING_APPROVAL`.
    * Modal "Nghiệm thu công việc" (`reviewModalOpen`): Tự động điền số giờ mà CTV vừa nộp vào trường "Số giờ thực tế" để Nhân sự đối chiếu, cho phép Nhân sự giữ nguyên hoặc điều chỉnh trước khi hoàn tất nghiệm thu (`COMPLETED`).
  - **5. Kiểm thử tự động:**
    * Bổ sung Suite 20 trong `TN-Backend/test/unit.test.js`: **PASS 5/5 kịch bản (100%)**.
    * Toàn bộ Unit Test Backend: **118/118 tests PASS 100% (20 suites)**.
    * Kiểm tra TypeScript Frontend: `tsc --noEmit` đạt **0 lỗi (0 errors)**.

---

> [!NOTE]
> File kế hoạch này được lưu giữ cố định tại thư mục dự án. Mọi bước triển khai tiếp theo đều phải tuân thủ nghiêm ngặt lộ trình và các nguyên tắc nêu trên.


- [x] **TC-22 (Nâng Cấp Đăng Ký Phòng Studio - Gợi Ý Khung Giờ Còn Trống & Đặc Quyền ADMIN):**
  - **1. Phân quyền và Quy tắc hoạt động:**
    * USER: Tuân thủ nghiêm ngặt giờ hành chính T2–T7 (07:30–11:30 và 13:30–16:30), cấm Chủ nhật, cấm buổi tối, cấm giờ nghỉ trưa, kiểm tra đệm 30 phút.
    * ADMIN: Được đặc quyền tạo đặt phòng ngoài khung giờ quy định (buổi tối, Chủ nhật, ngoài giờ), phục vụ các sự kiện quan trọng cấp trường. Vẫn bắt buộc kiểm tra xung đột với lịch đã có (`CONFIRMED`/`COMPLETED`/`PENDING`) kèm khoảng đệm 30 phút.
  - **2. Thuật toán Gợi ý khung giờ còn trống (`getAvailableSlots`):**
    * Quét toàn bộ lịch bận bao gồm cả `CONFIRMED`, `COMPLETED`, `PENDING`, `APPROVED` kèm khoảng đệm 30 phút ở cả 2 đầu.
    * Chuẩn hóa múi giờ Việt Nam UTC+7 cho biên ngày (`vnStartOfDay` và `vnEndOfDay`).
    * Hậu kiểm `verifiedSlots` bằng thuật toán kiểm tra tính khả dụng của slot.
    * Ràng buộc tuyệt đối: Không gợi ý khung giờ trùng với lịch đã có.
  - **3. Giao diện Đăng ký phòng Studio (`/studio`):**
    * Tích hợp 2 tab "Gợi ý khung giờ còn trống" và "Tự nhập khung giờ".
    * Badge "Đặc quyền ADMIN" cho phép Quản trị viên dễ dàng nhận biết tính năng.
    * Calendar hiển thị đúng trạng thái: Đã duyệt (xanh), Chờ duyệt (vàng), Đã hủy (đỏ).
  - **4. Kiểm thử tự động:**
    * Bổ sung Suite 21 trong `unit.test.js`: Đạt **123/123 tests PASS 100%** (21 suites).
    * TypeScript: `tsc --noEmit` đạt 0 lỗi.

- [x] **TC-23 (Kiểm Tra Và Sửa Lỗi Giao Diện Tại Mục Lịch Sử Thao Tác FR-09 & NotificationBell):**
  - **1. Khắc phục triệt để lỗi chồng lấn giao diện (CSS Stacking Context):**
    * Nguyên nhân: `<aside>` trong `AdminLayout.tsx` có `backdrop-blur-xl` tạo Stacking Context nhưng thiếu `z-index`, khiến các phần tử `relative backdrop-blur-md` của container nội dung chính `flex-1` (thẻ "Tổng số thao tác", ô tìm kiếm) được vẽ đè lên popup thông báo.
    * Khắc phục: Gán `relative z-40` cho `<aside>` và `relative z-30` cho mobile header, đồng thời nâng container popup lên `z-[100]`. Popup thông báo giờ đây nổi hoàn toàn và che phủ sắc nét trên mọi thành phần giao diện.
  - **2. Tối ưu popup thông báo (`NotificationBell.tsx`):**
    * Thêm nút đóng `[X]` trực quan ở góc phải header popup.
    * Thêm lắng nghe sự kiện phím `Escape` để lập tức đóng popup khi người dùng nhấn Esc.
    * Thêm giới hạn chiều cao `max-h-[min(580px,85vh)] flex flex-col` và `overscroll-contain` cho vùng danh sách, giúp cuộn độc lập mượt mà và không bao giờ tràn khỏi màn hình.
  - **3. Chuẩn hóa bố cục trang Lịch sử thao tác (`/admin/audit-logs`):**
    * Thẻ thống kê KPI: Responsive dạng `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4` với padding chuẩn `p-5`, cân đối và đẹp mắt.
    * Bộ lọc tra cứu nâng cao: Sắp xếp lại lưới `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5` với nhãn `label` phía trên rõ ràng, áp dụng `[color-scheme:dark]` cho 2 ô chọn ngày `Từ ngày` / `Đến ngày`.
    * Bảng lịch sử thao tác: Bọc trong `overflow-x-auto` với `min-w-[1020px]`, quy định độ rộng chuẩn cho từng cột (Thời gian, Người thực hiện, Hành động, Nội dung, IP, Trạng thái, Chi tiết), đảm bảo bảng không bị co cụm hay cắt chữ.
    * Modal xem chi tiết Audit Log: Nâng `z-[100]` và hỗ trợ đóng bằng phím `Escape`.
  - **4. Kiểm thử:**
    * TypeScript: `tsc --noEmit` đạt **0 lỗi (0 errors)**.
    * Backend Tests: **123/123 tests PASS 100%**.

- [x] **TC-24 (Xây Dựng Mục “Tổng Công Việc Tháng” Dành Cho CTV - Read-Only & Đồng Bộ Bảng Thống Kê ADMIN):**
  - **1. Phân quyền và Bảo mật RBAC Backend:**
    * Endpoint `GET /api/payroll/collaborator-summary`: Phân quyền `COLLABORATOR, ADMIN`. Tự động gán cứng `ctvUserId = req.user.id` nếu người gọi là `COLLABORATOR`, chặn tuyệt đối việc xem dữ liệu của CTV khác.
    * Cập nhật `GET /api/payroll/tasks-summary`: Thêm tham số `targetUserId`, đảm bảo CTV chỉ lấy nhóm dữ liệu của chính mình.
  - **2. Logic Thống kê và Hệ số (Single Source of Truth):**
    * Dùng chung hàm `calculateTaskHoursAndMultiplier` trong `payroll.service.js`.
    * Phân biệt rõ ràng:
      - `Tổng giờ đã thực hiện`: Tổng số giờ thực tế đã làm cho toàn bộ công việc trong tháng.
      - `Tổng giờ được Nhân sự xác nhận`: Tổng số giờ thực tế của các công việc đã được nghiệm thu hoàn thành (`COMPLETED`).
      - `Tổng giờ quy đổi`: Số giờ sau khi áp dụng hệ số nhân (1.5 sau 16:30 T2-T7, 2.0 Chủ nhật).
      - `Thù lao dự tính`: `Tổng giờ quy đổi * 20.000 VNĐ`.
    * Highlight nổi bật (vàng hổ phách) kèm ghi chú hệ số cho công việc hoàn thành đủ điều kiện.
    * Công việc `PENDING_APPROVAL`: Ghi chú `Chờ Nhân sự duyệt để tính hệ số`, không tính vào giờ xác nhận cho đến khi hoàn tất nghiệm thu.
  - **3. Giao diện Frontend (`/tasks/summary`):**
    * Trang chuyên biệt [page.tsx](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/app/tasks/summary/page.tsx) hoàn toàn Read-only.
    * Bộ lọc Tháng (1..12), Năm (2025..2027) kèm nút chuyển nhanh Tháng trước/Tháng sau và Về tháng hiện tại.
    * 4 Thẻ KPI: Tổng số công việc, Tổng giờ đã thực hiện, Tổng giờ được xác nhận, Giờ quy đổi & Thù lao dự tính.
    * Bảng thống kê chi tiết chuẩn mẫu: STT, Ngày thực hiện, Nội dung công việc, Nhiệm vụ, Số giờ thực hiện (kèm giờ quy đổi), Trạng thái duyệt, Ghi chú & Hệ số, Nút xem chi tiết (modal).
    * Hàng tổng kết chân bảng hiển thị tổng giờ thực tế, tổng giờ quy đổi và tổng tiền thù lao.
    * Tích hợp điều hướng tại [Navbar.tsx](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/components/Navbar.tsx) và [page.tsx](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/app/tasks/page.tsx).
  - **4. Kiểm thử tự động:**
    * Bổ sung Suite 22 trong `unit.test.js`: Đạt **127/127 tests PASS 100%** (22 suites).
    * TypeScript: `tsc --noEmit` đạt **0 lỗi (0 errors)**.


- [x] **TC-25 (Bổ Sung Chức Năng Xác Nhận Đến Sử Dụng Studio Tại Mục Phê Duyệt Yêu Cầu Đặt Studio):**
  - **1. CSDL & Model:**
    * Bổ sung 3 trường `user_check_in_at` (DATETIMEOFFSET), `admin_confirmed_at` (DATETIMEOFFSET), `attendance_status` (NVARCHAR(30) DEFAULT 'NOT_ARRIVED') vào bảng `StudioBookings`.
    * Cập nhật Model Sequelize `StudioBooking.js`.
  - **2. Trạng thái 4 cấp độ (State Machine):**
    * `Chưa đến ngày đặt` (FUTURE_BOOKING)
    * `Chờ xác nhận người dùng` (WAITING_USER_CHECKIN)
    * `Chờ ADMIN xác nhận` / `Chờ xác nhận có mặt` (WAITING_ADMIN_CONFIRM)
    * `Đã xác nhận sử dụng` (USAGE_CONFIRMED)
    * Kèm trường hợp: `Không đến sử dụng` / `Quá hạn` (ABSENT)
  - **3. Backend API & Ràng buộc nghiệp vụ:**
    * `PUT /api/studio-bookings/:id/check-in`: Người dùng xác nhận đã đến trong ngày đặt, chống trùng lặp, chuyển trạng thái "Chờ xác nhận có mặt", gửi thông báo Admin, ghi AuditLog.
    * `PUT /api/studio-bookings/:id/confirm-usage`: Admin xác nhận đã sử dụng, chuyển `status = COMPLETED` và `attendanceStatus = ADMIN_CONFIRMED`, lưu vết ghi chú, gửi thông báo người dùng, ghi AuditLog.
    * `PUT /api/studio-bookings/:id/mark-absent`: Admin đánh dấu người dùng vắng mặt / không đến.
    * `computeAttendanceInfo(booking)`: Tự động tính toán trạng thái và quyền hạn check-in/xác nhận gửi kèm trong `getAll`.
  - **4. Giao diện Frontend Admin & User:**
    * Admin ([admin/requests/page.tsx](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/app/admin/requests/page.tsx)): Cột "Xác nhận sử dụng" hiển thị 4 cấp độ, nút "Xác nhận đã sử dụng" trực tiếp trên dòng danh sách và trong modal chi tiết, hiển thị mốc thời gian người dùng check-in và Admin xác nhận.
    * User ([history/page.tsx](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/app/history/page.tsx)): Cột "Xác nhận sử dụng", nút "Xác nhận đã đến" tự động sáng vào đúng ngày đặt phòng.
  - **5. Kiểm thử tự động:**
    * Bổ sung Unit Test Suite 23 trong `unit.test.js`: Đạt **133/133 tests PASS 100%** (23 suites).
    * TypeScript: `tsc --noEmit` đạt **0 lỗi (0 errors)**.

- [x] **TC-26 (Hoàn Thiện Toàn Bộ Chức Năng Xuất File Excel `.xlsx` Trong Hệ Thống LHU Media Studio - Prompt #37):**
  - **1. Sửa triệt để các lỗi nghiêm trọng ở luồng xuất file cũ:**
    * Khắc phục lỗi `401 Unauthorized` trên trang Chấm công & Thù lao (`/admin/payroll`) do trước đây dùng `window.open(...)` không gửi JWT `Authorization: Bearer`. Bổ sung hàm dùng chung `api.download(endpoint, fallbackFilename)` trong [api.ts](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/lib/api.ts) đi qua Next.js `/api` proxy, tự trích xuất tên file từ `Content-Disposition` và báo lỗi rõ ràng.
    * Khắc phục lỗi chọn **Tháng 1** bị xuất nhầm sang tháng hiện tại trong [reports.routes.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/routes/reports.routes.js) (`parseInt(month) - 1 || now.getMonth()`).
    * Khắc phục lỗi hardcode cột `A2:AO2` (lệch cột tháng 28/29/30 ngày) và thiếu công thức Excel thật trong `exportTimesheetExcel` ([payroll.service.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/services/payroll.service.js)).
  - **2. Hoàn thiện 9 API xuất Excel `.xlsx` phủ đầy đủ các phân hệ cần thiết & đồng bộ bộ lọc (không xuất Excel ở mục Quản lý Công việc & Phân công CTV theo yêu cầu):**
    * **Báo cáo tổng hợp Dashboard** (`GET /api/reports/export-excel` [ADMIN]): Nâng cấp đầy đủ **6 sheet** đồng bộ 100% với trang Thống kê tổng quan (`Tổng quan` 6 nhóm KPI gồm Công việc & Hiệu suất CTV, Thù lao & Ca trực, Mượn/trả, Studio 4 cấp độ, Thiết bị & Tỷ lệ sử dụng, Nhân sự; `Công việc & Thù lao CTV` gồm Công việc trễ hạn + Xu hướng lương theo tháng + Chi tiết thù lao CTV; `Hoạt động & Top thiết bị` gồm chuỗi thời gian 3 chỉ số + Top thiết bị mượn nhiều nhất; `Đơn mượn thiết bị`; `Đặt phòng Studio`; `Thiết bị` kèm công thức `SUM`). Hỗ trợ đủ 5 chế độ lọc (`week`, `month`, `year`, `month-year`, `custom`).
    * **Quản lý thiết bị** (`GET /api/reports/export-equipment` [ADMIN]): Đồng bộ `search`, `category`, `status`; có công thức `SUM` tổng SL & khả dụng.
    * **Mượn / Trả thiết bị** (`GET /api/reports/export-borrows` [ADMIN]): Đồng bộ `status`, `search`; đầy đủ biên bản bàn giao / nhận trả.
    * **Đặt phòng Studio** (`GET /api/reports/export-studio-bookings` [ADMIN]): Đồng bộ trạng thái chuẩn “Đã duyệt”, cột xác nhận sử dụng 4 cấp độ, mốc thời gian user check-in và Admin xác nhận.
    * **Lịch trực tuần BPTT** (`GET /api/duty/export-weekly` [ADMIN, COLLABORATOR]): 2 sheet (Ma trận lịch tuần 3 buổi S/C/T với công thức `COUNTA`/`COUNTIF`/`SUM` + Sheet Chi tiết sự vụ tuần highlight vàng hổ phách). RBAC: ADMIN xuất toàn bộ BPTT theo bộ lọc `date`/`role`/`search`; CTV chỉ xuất lịch cá nhân của chính mình.
    * **Bảng chấm công tháng** (`GET /api/payroll/export-timesheet` [ADMIN]): Tính cột động theo số ngày thực tế của tháng (28/29/30/31), công thức Excel thật (`SUM`, `*4`, `ROUND(*20000,0)`), đồng bộ bộ lọc `ctvId` & `search`.
    * **Bảng thống kê công việc** (`GET /api/payroll/export-tasks-summary` [ADMIN]): Giữ nguyên Sheet 1 chuẩn 8 cột BPTT (`T{m}.{y}`, highlight vàng hổ phách) + bổ sung Sheet 2 `Chi tiết giờ & hệ số` (tách giờ thường, ngoài giờ ×1,5, Chủ nhật ×2,0, công thức quy đổi & tiền công).
    * **Bảng lương tháng CTV** (`GET /api/payroll/export-payroll` [ADMIN]): 14 cột đầy đủ ca trực LV, giờ trực, giờ sự vụ thường, ngoài giờ ×1,5, Chủ nhật ×2,0, công thức tổng giờ quy đổi & thành tiền VNĐ, khối chữ ký.
    * **Tổng công việc tháng cá nhân CTV** (`GET /api/payroll/export-collaborator-summary` [COLLABORATOR, ADMIN]): RBAC khóa cứng `ctvUserId = req.user.id` cho CTV (chặn tuyệt đối xem chéo), đồng bộ tháng/năm & `status`.
  - **3. Tích hợp nút Xuất Excel trên 6 giao diện Frontend:**
    * [admin/dashboard/page.tsx](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/app/admin/dashboard/page.tsx), [admin/equipment/page.tsx](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/app/admin/equipment/page.tsx), [admin/requests/page.tsx](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/app/admin/requests/page.tsx), [admin/payroll/page.tsx](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/app/admin/payroll/page.tsx), [CollaboratorMonthlySummary.tsx](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/components/CollaboratorMonthlySummary.tsx), [WeeklyDutyScheduleTable.tsx](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/components/WeeklyDutyScheduleTable.tsx).
  - **4. Kiểm thử thực tế & Tự động hóa:**
    * Kiểm thử tải file `.xlsx` thực tế qua live Backend (`:5000`) & Next.js Proxy (`:3000`), đọc lại nội dung bằng `ExcelJS` đối chiếu trực tiếp với SQL Server (24 thiết bị, 8 đơn mượn, 6 lịch Studio, 33 công việc, 11 nhân sự lịch tuần, tháng rỗng `01/2025`, fix Tháng 1, kiểm tra chặn `401`/`403` RBAC): **17/17 kịch bản PASS 100%**.
    * Bổ sung Unit Test Suite 24 trong `TN-Backend/test/unit.test.js`: **137/137 tests PASS 100%** (24 suites).
    * TypeScript (`tsc --noEmit`): **0 lỗi**; Next.js Production Build: **28/28 routes** thành công.

- [x] **TC-27 (Bổ Sung Chức Năng Giao Diện Sáng/Tối — Light Mode / Dark Mode Toàn Hệ Thống - Prompt #38):**
  - **1. Lưu trữ & Đồng bộ lựa chọn giao diện theo từng tài khoản (đa thiết bị):**
    * CSDL MSSQL (`Users`): Tự động bổ sung cột `theme_preference NVARCHAR(10) NOT NULL DEFAULT 'dark'` (idempotent migration trong [models/index.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/models/index.js), không mất dữ liệu cũ) và cập nhật Model [User.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/models/User.js).
    * API Backend: Bổ sung `PATCH /api/auth/theme` (và đồng bộ qua `POST /api/auth/login`, `GET /api/auth/profile`, `PATCH /api/auth/profile`) trong [auth.routes.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/routes/auth.routes.js), [auth.controller.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/controllers/auth.controller.js), [auth.service.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/services/auth.service.js).
    * Frontend ([ThemeContext.tsx](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/context/ThemeContext.tsx) & [AuthContext.tsx](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/context/AuthContext.tsx)): Lưu theo tài khoản (`lhu_theme_user_${user.id}` + DB `themePreference`), tự động khôi phục khi đăng nhập lại, đồng bộ giữa nhiều thiết bị và nhiều tab trình duyệt (`storage` event).
  - **2. Hệ thống biến màu & Theme dùng chung, không nhấp nháy (FOUC-free):**
    * [layout.tsx](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/app/layout.tsx): Inline script đồng bộ `data-theme` trước khi React hydrate (`0ms` flicker), tích hợp `ThemeProvider`.
    * [globals.css](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/app/globals.css): Giữ nguyên **Dark Mode** chuẩn LHU Media Studio; xây dựng **Light Mode** nền sáng `#F4F7FC`, bề mặt trắng `#FFFFFF`, chữ tối `#0F172A`, màu nhấn xanh dương LHU `#284F9E`, vàng nhấn `#C28B0B`, hỗ trợ đầy đủ FullCalendar (`.fc`), bảng dữ liệu, dropdown `<select>/<option>`, modal, tooltip, biểu đồ, bảo toàn chữ trắng trên CTA & Hero nền tối, và hiệu ứng chuyển mượt `.theme-transition` (`220ms`).
  - **3. Nút chuyển đổi giao diện & Các thành phần dùng chung:**
    * Component [ThemeToggle.tsx](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/components/common/ThemeToggle.tsx) (biểu tượng Mặt trời / Mặt trăng, tooltip & aria-label rõ ràng) tích hợp nổi bật trên [Navbar.tsx](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/components/Navbar.tsx) (Desktop & Mobile), [AdminLayout.tsx](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/components/AdminLayout.tsx) (Sidebar & Mobile Header) và [auth/login/page.tsx](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/app/auth/login/page.tsx).
    * Hỗ trợ Light/Dark gốc cho [DatePickerVN.tsx](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/components/common/DatePickerVN.tsx), [NotificationBell.tsx](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/components/NotificationBell.tsx) và [ToastContext.tsx](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/context/ToastContext.tsx).
  - **4. Kiểm thử tự động & Thực tế:**
    * Unit Test Backend (thêm Suite 25): **140/140 PASS (100%)**.
    * Kiểm thử live DB + API + Proxy + 16 tuyến trang SSR: **5/5 PASS (100%)** (xác nhận cột `theme_preference`, chặn `401`/`400`, cô lập từng tài khoản ADMIN/CTV, 16/16 route trả `200 OK` kèm anti-flicker script).
    * **Tối ưu tương phản & phân tầng Light Mode toàn hệ thống (Prompt #39):** Quét 100% lớp màu trong `TN-Frontend/src`, khắc phục toàn bộ lỗi chữ trắng/nhạt biến thể opacity (`text-white/95..20`, `text-amber-*/80..90`, `text-rose-200..400/*`, `text-yellow-*`, `text-indigo-*`), chuẩn hóa phân tầng 3 cấp bề mặt (`#EEF3FA` canvas ➔ `#FFFFFF` card/modal ➔ `#F4F7FC` input/filter/header), chuẩn hóa toàn bộ badge pastel WCAG AA (`LV`, `SV`, `ĐK`, `NL`, `DP`, Chưa đọc/Đã đọc, Thành công/Cảnh báo/Lỗi), bảo toàn chữ `#FFFFFF` trên mọi nút đậm và trạng thái hover nền đậm, tách lớp phủ modal tối dịu `rgba(15,23,42,0.48)`, kiểm định **19/19 cặp màu WCAG 2.1 AA+ (4.51:1 – 17.85:1) PASS** và **14/14 kiểm tra độ phủ CSS PASS**.
    * TypeScript (`tsc --noEmit`): **0 lỗi**; Next.js Production Build: **28/28 routes** thành công.


- [x] **TC-28 (Bổ Sung Hệ Thống Gửi Thông Báo Qua Email Toàn Hệ Thống, Theo Dõi Trạng Thái & Hỗ Trợ Gửi Lại — FR-07):**
  - **1. Tái sử dụng cấu hình SMTP & Nâng cấp mẫu email ([mailer.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/config/mailer.js)):**
    * Tái sử dụng trực tiếp Nodemailer `transporter` và biến môi trường `.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `FRONTEND_URL`) dùng chung với luồng gửi OTP — không hardcode thông tin đăng nhập, không tạo dịch vụ trùng lặp.
    * Khắc phục lỗi bỏ qua `FRONTEND_URL`, xây dựng mẫu HTML responsive đầy đủ: tiêu đề rõ ràng, phân loại chức năng, **tên người gửi**, **tên người nhận**, **thời gian phát sinh (UTC+7)**, nội dung thông báo, bảng chi tiết liên quan và nút/đường dẫn chuyển trực tiếp đến trang chi tiết tương ứng.
    * Bổ sung hàm `getSmtpStatus()` kiểm tra cấu hình & kết nối SMTP thực tế (che mờ thông tin nhạy cảm).
  - **2. Lưu lịch sử trạng thái gửi email, chống gửi trùng & hỗ trợ gửi lại ([Notification.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/models/Notification.js), [models/index.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/models/index.js), [notification.service.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/services/notification.service.js)):**
    * Di chuyển idempotent thêm 8 cột theo dõi trên bảng `Notifications` (`sender_name`, `recipient_email`, `email_status`, `email_sent_at`, `email_error`, `email_retry_count`, `email_message_id`, `email_metadata`) mà không mất dữ liệu cũ.
    * Mặc định gửi email song song (`sendEmail = true`, bất đồng bộ non-blocking) cho mọi thông báo phát sinh; nếu SMTP lỗi chỉ ghi nhận `FAILED` + `emailError`, tuyệt đối không làm gián đoạn nghiệp vụ chính và vẫn giữ nguyên thông báo in-app trên website.
    * Cơ chế chống gửi trùng 3 lớp: cửa sổ chống lặp 10 giây theo `(userId, type, title, message)`, lọc trùng theo `userId` & địa chỉ `email` trong cùng đợt phát, và khóa `inFlightEmailIds` + trạng thái `SENT`.
    * Bổ sung 4 API quản trị email (`ADMIN`-only) tại [notification.routes.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/routes/notification.routes.js): `GET /api/notifications/email-logs`, `GET /api/notifications/email-status`, `POST /api/notifications/:id/resend-email`, `POST /api/notifications/resend-failed`.
  - **3. Phủ 100% sự kiện nghiệp vụ & chuẩn hóa liên kết trang đích:**
    * **Công việc CTV ([task.service.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/services/task.service.js)):** Giao việc (`TASK_ASSIGNED`), cập nhật tiến độ (`TASK_IN_PROGRESS` — mới bổ sung), nộp kết quả & khai báo việc ngoài (`TASK_SUBMITTED`), yêu cầu chỉnh sửa (`TASK_REVISION_REQUESTED`), nghiệm thu hoàn thành (`TASK_COMPLETED`).
    * **Đặt phòng Studio ([studioBooking.service.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/services/studioBooking.service.js)):** Đăng ký mới (sửa link `/admin/bookings` → `/admin/requests`), duyệt/từ chối, người dùng tự hủy (`STUDIO_BOOKING_CANCELLED` — mới bổ sung), dời lịch, check-in, xác nhận sử dụng, đánh dấu vắng mặt (`STUDIO_BOOKING_ABSENT` — mới bổ sung).
    * **Mượn / Trả thiết bị ([borrowRequest.service.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/services/borrowRequest.service.js)):** Tạo đơn mượn, duyệt/từ chối, bàn giao, hoàn trả, cảnh báo quá hạn (chuẩn hóa link người dùng `/profile` → `/history`).
    * **Lịch trực Studio ([duty.service.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/src/services/duty.service.js)):** Chuyển toàn bộ 6 điểm tạo thông báo (mở đợt trực, CTV gửi đăng ký rảnh, điều chỉnh ca trực, chốt lịch trực tháng, xác nhận ca đơn lẻ, hủy ca trực) đi qua `notificationService` để gửi email & ghi lịch sử đồng bộ.
  - **4. Giao diện quản lý lịch sử & gửi lại email ([notifications/page.tsx](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Frontend/src/app/notifications/page.tsx)):**
    * Giữ nguyên hộp thư thông báo cá nhân cho mọi người dùng (bổ sung badge `Đã gửi email` & tên người gửi).
    * Bổ sung tab **Lịch sử gửi Email** cho `ADMIN`: kiểm tra trạng thái kết nối SMTP, thẻ thống kê (`Tổng`, `Đã gửi`, `Thất bại`, `Đang chờ / Bỏ qua`), bộ lọc & tìm kiếm, nút **Gửi lại** từng dòng và **Gửi lại tất cả lỗi**.
  - **5. Kiểm thử tự động & Thực tế:**
    * Backend Unit Tests (thêm Suite 27): **148/148 PASS (27 suites, 0 lỗi)**.
    * Kiểm thử thực tế qua Gmail SMTP thật ([test_email_notifications_live.js](file:///c:/STUDY/1.%20TOT_NGHIEP/CODE/TN-Backend/scripts/test_email_notifications_live.js)) trên cả 3 vai trò `ADMIN`, `CTV`, `USER`: **11/11 PASS (100%)** — xác minh `messageId` thật từ Gmail, RBAC 403 cho CTV/USER, chống gửi trùng, gửi lại thành công khi `FAILED` → `SENT`, và `6/6` liên kết đích trả HTTP `200 OK`.
    * Frontend TypeScript (`tsc --noEmit`): **0 lỗi**; Production Build: **28/28 routes** thành công.
