# CHỨC NĂNG HỆ THỐNG – LHU MEDIA STUDIO

## 1. Tổng quan
Hệ thống LHU Media Studio gồm 09 nhóm chức năng chính, phục vụ quản lý hoạt động thiết bị và Studio của Bộ phận Truyền thông, Trường Đại học Lạc Hồng.

## 2. Danh sách chức năng

### FR-01 – Quản lý thiết bị
- Thêm mới thiết bị.
- Cập nhật thông tin thiết bị.
- Tìm kiếm và tra cứu thiết bị.
- Theo dõi trạng thái thiết bị.
- Lưu lịch sử bảo trì, sửa chữa, mất và thanh lý.

### FR-02 – Quản lý mượn – trả thiết bị
- Tạo yêu cầu mượn thiết bị.
- Kiểm tra điều kiện và số lượng có thể mượn.
- Nhân sự xử lý, duyệt hoặc từ chối yêu cầu.
- Ghi nhận việc bàn giao thiết bị thực tế.
- Ghi nhận việc trả và kiểm tra tình trạng thiết bị.
- Theo dõi các trường hợp trả trễ/quá hạn.

### FR-03 – Quản lý phòng Studio
- Gửi yêu cầu đặt phòng Studio.
- Kiểm tra lịch phòng.
- Kiểm tra thời gian hoạt động và xung đột lịch.
- Nhân sự duyệt hoặc từ chối yêu cầu.
- Thay đổi hoặc hủy lịch đặt.
- Xử lý xung đột lịch theo mức độ ưu tiên của hoạt động Nhà trường.

### FR-04 – Quản lý công việc
- Nhân sự giao việc cho CTV.
- Thiết lập thời hạn hoàn thành.
- CTV cập nhật tiến độ thực hiện.
- CTV gửi kết quả và minh chứng.
- Nhân sự yêu cầu chỉnh sửa hoặc xác nhận hoàn thành.
- Tự động ghi nhận công việc vào Bảng công việc tháng tại thời điểm giao.
- CTV khai báo công việc phát sinh ngoài hệ thống.

### FR-05 – Quản lý ca trực, chấm công và thù lao CTV
- **Quản lý ca trực Studio theo quy trình 3 giai đoạn**:
  * Giai đoạn 1: Nhân sự tạo đợt đăng ký ca trực tháng mới (trạng thái đợt: `OPEN`, `CLOSED`, `ARRANGING`, `CONFIRMED`), thiết lập hạn chót đăng ký, chặn tạo trùng tháng/năm, phát thông báo in-app cho toàn bộ CTV.
  * Giai đoạn 2: CTV xem ma trận lịch tháng 1..N x 3 buổi (Sáng: 07:30–11:30, Chiều: 13:00–17:00, Tối: 17:30–21:30), đăng ký/sửa/hủy thời gian có thể trực (Availability). Rõ ràng phân biệt đăng ký rảnh chưa phải lịch chính thức và chưa tính công.
  * Giai đoạn 3: Nhân sự xem bảng tổng hợp CTV rảnh, phân công ca trực (cảnh báo trùng ca), bấm Xác nhận lịch trực tháng (`CONFIRMED`), chốt lịch chính thức, đồng bộ ký hiệu `LV` vào Bảng chấm công và gửi thông báo in-app cho CTV.
- **Quản lý chấm công và kiểm soát ký hiệu SV**:
  * Hiển thị Bảng chấm công tháng ma trận 3 buổi/ngày (S, C, T) với ký hiệu chuẩn: `LV`, `SV`, `NL`.
  * Kiểm soát chặt chẽ ký hiệu `SV`: Chỉ cho phép chọn `SV` khi CTV có công việc `COMPLETED` trong Bảng thống kê công việc của đúng ngày đó. Nếu không có, nút `SV` bị disabled và cảnh báo: *"Không hợp lệ vì không có công việc tương ứng trong Bảng thống kê công việc."* Backend API từ chối trực tiếp (HTTP 400).
- **Tính toán thù lao và xuất Excel**:
  * Mức cơ bản: 20.000 đ/giờ, ca Studio tiêu chuẩn 4 giờ = 80.000 đ.
  * Hệ số 1.5 sau 16:30 các ngày T2–T7; Hệ số 2.0 cho sự kiện Chủ nhật (không nhân chồng hệ số).
  * Ca trực tương lai (`date > today`) dù `CONFIRMED` tuyệt đối không được tính tiền công (TC-04).
  * Xuất Excel chuẩn Bộ phận Truyền thông ĐH Lạc Hồng: `Bảng chấm công tháng` (Sheet1) và `Bảng thống kê công việc` (T10.2026).

### FR-06 – Quản lý tài khoản
- Đăng ký tài khoản và xác minh email bằng OTP 6 chữ số.
- Phân quyền theo vai trò (Admin, Collaborator, User).
- Khóa và mở khóa tài khoản (`Active` <-> `Locked`).
- Đặt lại mật khẩu qua email xác minh.
- Quản lý trạng thái tài khoản 3 cấp độ: `Active`, `Locked`, `Disabled`.
- Cơ chế xóa tài khoản thông minh bảo toàn dữ liệu:
  * Tự động kiểm tra dữ liệu liên quan (công việc, chấm công, ca trực, bảng lương, mượn trả, đặt phòng).
  * Nếu đã có dữ liệu: chuyển trạng thái sang `Disabled`, chặn đăng nhập, giữ nguyên `user_id` và toàn bộ lịch sử hoạt động.
  * Nếu chưa có dữ liệu: cho phép xóa vật lý (DELETE) an toàn khỏi CSDL.
  * Chặn Admin tự xóa/vô hiệu hóa chính mình. Không dùng `CASCADE DELETE` trên dữ liệu người dùng.

### FR-07 – Thông báo
- Gửi thông báo trên website.
- Gửi thông báo qua email.
- Theo dõi trạng thái đã đọc/chưa đọc.
- Thông báo các sự kiện nghiệp vụ như giao việc, yêu cầu chỉnh sửa, hoàn thành công việc, đặt phòng, mượn – trả và lịch trực.

### FR-08 – Thống kê, báo cáo
- Thống kê tình trạng thiết bị.
- Thống kê mượn – trả và thiết bị quá hạn.
- Thống kê lịch sử dụng phòng Studio.
- Thống kê công việc và tiến độ.
- Thống kê giờ công và dữ liệu tiền công CTV.
- Thống kê thông tin nhân sự/tài khoản.
- Xuất dữ liệu báo cáo Excel.

### FR-09 – Lịch sử thao tác
- Ghi nhận người thực hiện thao tác.
- Ghi nhận thời điểm thực hiện.
- Ghi nhận nội dung hành động.
- Ghi nhận đối tượng/dữ liệu liên quan.
- Lưu thông tin thay đổi cần thiết để phục vụ tra cứu và kiểm tra.

## 3. Nhóm chức năng theo vai trò

| Vai trò | Nhóm chức năng chính |
|---|---|
| Người dùng | Đăng ký/đăng nhập; gửi yêu cầu mượn thiết bị; đặt phòng Studio; theo dõi yêu cầu |
| CTV | Quản lý công việc được giao; cập nhật tiến độ; gửi kết quả/minh chứng; đăng ký lịch trực; khai báo công việc ngoài hệ thống |
| Nhân sự | Quản lý thiết bị; xử lý mượn – trả; duyệt lịch Studio; giao và xác nhận công việc; quản lý lịch trực/giờ công; quản lý tài khoản; thông báo; thống kê và lịch sử thao tác |

Trưởng phòng và Nhân sự là cùng nhóm quyền nghiệp vụ.

## 4. Các trạng thái nghiệp vụ chính

### 4.1 Trạng thái thiết bị
- Có sẵn
- Đang cho mượn
- Hư hỏng
- Đang sửa chữa
- Tạm ngưng sử dụng
- Hủy bỏ

### 4.2 Trạng thái công việc
- Chưa thực hiện
- Đang thực hiện
- Chờ duyệt
- Cần chỉnh sửa
- Hoàn thành

### 4.3 Trạng thái tài khoản
- Active
- Locked
- Disabled

### 4.4 Trạng thái đặt phòng
- Chờ duyệt
- Đã xác nhận
- Từ chối
- Đã hủy
- Hoàn thành

## 5. Phạm vi dữ liệu lương
Hệ thống tổng hợp dữ liệu và xuất Excel. Hệ thống không thực hiện quy trình chỉnh sửa, chốt hoặc phê duyệt bảng lương.

Dữ liệu được tính gồm:
- Công việc được Nhân sự xác nhận hoàn thành.
- Công việc ngoài hệ thống do CTV khai báo và được Nhân sự xác minh.
- Ca trực thực tế đã hoàn thành và được xác nhận.

Không tính:
- Công việc đang thực hiện, chờ duyệt hoặc cần chỉnh sửa.
- Ca trực tương lai dù đã được xác nhận.
