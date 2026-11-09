# KIẾN TRÚC HỆ THỐNG – LHU MEDIA STUDIO

## 1. Tổng quan
- **Tên hệ thống:** Hệ thống Quản lý Thiết bị và Đặt phòng Studio – LHU Media Studio.
- **Đơn vị áp dụng:** Bộ phận Truyền thông, Trường Đại học Lạc Hồng.
- **Mục tiêu:** Hỗ trợ quản lý thiết bị, mượn – trả thiết bị, đặt phòng Studio, công việc, lịch trực, giờ công, dữ liệu lương, tài khoản, thông báo và báo cáo.

## 2. Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js |
| Backend | Node.js, Express.js |
| ORM | Sequelize |
| Database | Microsoft SQL Server |
| Xác thực | JWT |
| Hash mật khẩu | bcrypt/bcryptjs |
| Xác minh email | OTP qua email |
| Lưu trữ hình ảnh | Cloudinary ở các chức năng có sử dụng |
| Xuất dữ liệu | Excel |

Thông tin trên phản ánh nền tảng kỹ thuật hiện có của dự án. Không tự ý thay đổi công nghệ nếu chưa được phê duyệt.

## 3. Mô hình kiến trúc tổng thể
Hệ thống được tổ chức theo mô hình ứng dụng web Frontend – Backend – Database. Backend sử dụng các lớp xử lý theo trách nhiệm.

```text
              NGƯỜI DÙNG
                   |
                   v
           NEXT.JS FRONTEND
                   |
             HTTP / REST API
                   |
                   v
           EXPRESS.JS BACKEND
                   |
             ROUTES / MIDDLEWARE
                   |
                   v
               CONTROLLERS
                   |
                   v
                SERVICES
             (Business Logic)
                   |
                   v
          SEQUELIZE / DATA ACCESS
                   |
                   v
          MICROSOFT SQL SERVER

       Backend ------ Email Service
       Backend ------ Cloudinary
```

## 4. Trách nhiệm các thành phần

### 4.1 Frontend – Next.js
- Hiển thị giao diện theo vai trò Nhân sự, CTV và Người dùng.
- Thu thập dữ liệu từ biểu mẫu và gửi request đến REST API.
- Hiển thị dashboard, danh sách, bộ lọc, tìm kiếm, phân trang và trạng thái.
- Hiển thị lịch Studio, thiết bị, công việc và báo cáo.
- Không tự quyết định các quy tắc nghiệp vụ quan trọng.

### 4.2 Backend – Node.js/Express.js
- Cung cấp REST API cho frontend.
- Xác thực JWT và kiểm tra quyền.
- Tiếp nhận, kiểm tra và xử lý request.
- Điều phối các nghiệp vụ và truy cập dữ liệu.
- Gửi email OTP/thông báo khi chức năng tương ứng được triển khai.
- Tích hợp Cloudinary tại các chức năng cần lưu trữ hình ảnh.

### 4.3 Routes và Middleware
- Khai báo endpoint.
- Áp dụng xác thực.
- Kiểm tra quyền theo vai trò.
- Kiểm tra/validate request theo cấu trúc hiện có.
- Chuyển request đến controller.

### 4.4 Controllers
- Tiếp nhận request và thông tin người dùng đã xác thực.
- Gọi service phù hợp.
- Trả response và HTTP status.
- Không chứa toàn bộ logic nghiệp vụ phức tạp.

### 4.5 Services
- Xử lý business rule.
- Kiểm tra điều kiện và trạng thái trước khi cập nhật.
- Điều phối nhiều model trong một nghiệp vụ.
- Sử dụng transaction khi cần bảo đảm tính toàn vẹn dữ liệu.

### 4.6 Models/Data Access – Sequelize
- Định nghĩa model và ánh xạ dữ liệu.
- Khai báo quan hệ giữa các thực thể.
- Truy vấn SQL Server thông qua Sequelize theo convention hiện tại.

### 4.7 Database – Microsoft SQL Server
Các nhóm dữ liệu nghiệp vụ:
- Tài khoản, thông tin người dùng và vai trò.
- Thiết bị, danh mục, trạng thái và lịch sử xử lý.
- Yêu cầu mượn, chi tiết mượn, bàn giao và trả thiết bị.
- Phòng Studio và lịch đặt phòng.
- Công việc, phân công, tiến độ và minh chứng.
- Lịch trực, Bảng công việc tháng và dữ liệu tổng hợp lương.
- Thông báo và lịch sử thao tác.
- Dữ liệu thống kê, báo cáo.

Tên bảng và cấu trúc cột cụ thể phải căn cứ schema/model thực tế; các nhóm trên không khẳng định mọi bảng đã được triển khai.

## 5. Các module nghiệp vụ

| Module | Trách nhiệm |
|---|---|
| Authentication & Account | Đăng ký, OTP, đăng nhập, JWT, phân quyền, khóa/mở khóa, đặt lại mật khẩu |
| Equipment Management | Quản lý thiết bị, trạng thái và lịch sử |
| Equipment Borrowing | Yêu cầu mượn, duyệt, bàn giao, trả và theo dõi quá hạn |
| Studio Booking | Xem lịch, đặt phòng, kiểm tra xung đột, duyệt, thay đổi và hủy |
| Task Management | Giao việc, cập nhật tiến độ, gửi minh chứng, chỉnh sửa và xác nhận hoàn thành |
| Duty & Timesheet | Đăng ký lịch trực, xác nhận lịch, ghi nhận công việc tháng và tổng hợp giờ |
| Payroll Data | Tổng hợp dữ liệu đủ điều kiện tính công và xuất Excel |
| Notification | Thông báo hệ thống/email, đã đọc/chưa đọc |
| Statistics & Reports | Thống kê và xuất báo cáo |
| Audit Log | Ghi nhận lịch sử thao tác quan trọng |

Các module là nhóm chức năng trong cùng ứng dụng, không đồng nghĩa với các microservice độc lập.

## 6. Vai trò truy cập

### Người dùng
- Đăng ký, xác minh và đăng nhập.
- Gửi yêu cầu mượn thiết bị.
- Gửi yêu cầu đặt phòng Studio.
- Theo dõi trạng thái yêu cầu của mình.

### CTV
- Xem công việc được giao.
- Cập nhật tiến độ, gửi kết quả và minh chứng.
- Đăng ký thời gian có thể tham gia trực.
- Khai báo công việc thực hiện ngoài hệ thống theo quy trình.

### Nhân sự
- Quản lý thiết bị, mượn – trả.
- Duyệt và xử lý lịch Studio.
- Giao việc, theo dõi và xác nhận kết quả.
- Sắp xếp, xác nhận lịch trực.
- Kiểm tra dữ liệu công việc/giờ công.
- Quản lý tài khoản, thống kê và xuất báo cáo.

Trưởng phòng và Nhân sự dùng chung nhóm quyền nghiệp vụ.

## 7. Các luồng dữ liệu chính

### 7.1 Mượn – trả thiết bị
Người dùng gửi yêu cầu → Backend kiểm tra điều kiện/số lượng → Nhân sự duyệt toàn bộ hoặc một phần → Hệ thống giữ số lượng được duyệt → Nhân sự bàn giao thực tế → Cập nhật đang cho mượn → Người dùng trả thiết bị → Nhân sự kiểm tra tình trạng → Cập nhật số lượng/trạng thái và lịch sử.

### 7.2 Đặt phòng Studio
Người dùng chọn phòng/thời gian → Backend kiểm tra giờ hoạt động, ngày nghỉ, lịch đã xác nhận và khoảng đệm → Tạo yêu cầu chờ duyệt nếu hợp lệ → Nhân sự duyệt/từ chối → Backend kiểm tra xung đột lần nữa khi duyệt → Lịch được xác nhận và giữ phòng.

### 7.3 Giao việc
Nhân sự giao việc → Ghi vào Bảng công việc tháng → CTV cập nhật tiến độ và gửi kết quả/minh chứng → Nhân sự kiểm tra → Yêu cầu chỉnh sửa hoặc xác nhận hoàn thành → Cập nhật dữ liệu đủ điều kiện tổng hợp công/lương.

### 7.4 Lịch trực và dữ liệu lương
CTV đăng ký thời gian có thể trực → Nhân sự sắp xếp và xác nhận → Ghi ca trực vào Bảng công việc tháng → Ca trực thực tế hoàn thành và được xác nhận → Hệ thống tổng hợp giờ/tiền công → Xuất Excel để đối soát và phê duyệt bên ngoài hệ thống.

## 8. Nguyên tắc bảo mật và toàn vẹn
- Xác thực JWT và kiểm tra quyền ở backend.
- Mật khẩu được hash.
- OTP có thời hạn xác minh.
- Dùng transaction cho nghiệp vụ nhiều dữ liệu cần tính toàn vẹn.
- Không tin role, user ID hoặc trạng thái do client tự gửi.
- Giữ lịch sử cần thiết của thiết bị, mượn – trả, tài khoản và thao tác quan trọng.
- Không ghi token, mật khẩu, OTP hoặc secret vào log.

## 9. Giới hạn kiến trúc
- Ứng dụng web frontend/backend dùng chung database; không phải microservices.
- Không tự bổ sung message broker/event bus nếu chưa có nhu cầu và phê duyệt.
- Hệ thống tổng hợp và xuất dữ liệu lương; chỉnh sửa, chốt và phê duyệt bảng lương nằm ngoài hệ thống.
- Không sử dụng máy chấm công vào/ra.
