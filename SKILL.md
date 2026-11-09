# SKILL – LHU MEDIA STUDIO

## 1. Mục đích
Tài liệu này quy định cách AI hỗ trợ phân tích, thiết kế, lập trình, sửa lỗi, kiểm thử và hoàn thiện dự án **Hệ thống Quản lý Thiết bị và Đặt phòng Studio – LHU Media Studio**.

AI phải sử dụng tài liệu nghiệp vụ đã chốt làm căn cứ chính. Không tự ý thêm, bỏ hoặc thay đổi quy trình nghiệp vụ.

## 2. Thứ tự ưu tiên
Khi có thông tin mâu thuẫn, áp dụng thứ tự:
1. Yêu cầu mới nhất và rõ ràng của người dùng.
2. Tài liệu khảo sát, phân tích và đặc tả nghiệp vụ đã chốt.
3. Quy định bảo mật và các quy tắc bắt buộc của dự án.
4. Kiến trúc, convention và code hiện có trong repository.
5. Đề xuất cải tiến của AI.

Nếu yêu cầu mới có thể làm sai lệch nghiệp vụ, ảnh hưởng dữ liệu hoặc giảm bảo mật, AI phải nêu rủi ro và hỏi xác nhận trước khi triển khai.

## 3. Công nghệ của dự án
- Frontend: Next.js.
- Backend: Node.js, Express.js.
- ORM: Sequelize.
- Database: Microsoft SQL Server.
- Xác thực: JWT.
- Hash mật khẩu: bcrypt/bcryptjs theo code hiện tại.
- Xác minh email: OTP qua email.
- Lưu trữ hình ảnh: Cloudinary tại các chức năng có sử dụng.
- Xuất báo cáo: Excel.

Không tự ý chuyển đổi framework, ORM, hệ quản trị cơ sở dữ liệu hoặc kiến trúc nếu chưa được người dùng phê duyệt.

## 4. Nguyên tắc làm việc
AI MUST:
- Đọc tài liệu nghiệp vụ và code liên quan trước khi thay đổi.
- Xác định chức năng, vai trò, luồng xử lý, dữ liệu vào/ra và các module bị ảnh hưởng.
- Kiểm tra cấu trúc repository, package và convention hiện tại.
- Thay đổi đúng phạm vi, ưu tiên giải pháp nhỏ, dễ bảo trì.
- Kiểm tra quyền truy cập ở backend, không chỉ dựa vào giao diện.
- Dùng transaction cho nghiệp vụ cập nhật nhiều dữ liệu cần bảo đảm tính toàn vẹn.
- Cập nhật kiểm thử và tài liệu khi API, schema hoặc hành vi thay đổi.
- Chạy kiểm tra phù hợp sau khi sửa và báo cáo kết quả trung thực.
- Nêu rõ giả định, file/module đã sửa, kiểm tra đã chạy và vấn đề còn tồn tại.

AI MUST NOT:
- Tự tạo vai trò, trạng thái, quy tắc tính công hoặc quy trình duyệt chưa được xác nhận.
- Đặt business rule quan trọng chỉ ở frontend.
- Tự ý refactor diện rộng hoặc thay đổi công nghệ.
- Hard-code mật khẩu, token, OTP, secret hoặc thông tin môi trường.
- Xóa lịch sử nghiệp vụ cần được lưu giữ.
- Khẳng định chức năng đã hoàn thành nếu chưa kiểm chứng.

## 5. Quy tắc phân quyền
Hệ thống có ba vai trò nghiệp vụ:
- **Nhân sự:** quản lý và xử lý các nghiệp vụ quản trị.
- **CTV:** thực hiện công việc được giao, cập nhật tiến độ, gửi kết quả và đăng ký thời gian trực.
- **Người dùng:** gửi yêu cầu mượn thiết bị và đặt phòng Studio, theo dõi yêu cầu của mình.

Trưởng phòng và Nhân sự là cùng một nhóm quyền nghiệp vụ. Không tạo vai trò Trưởng phòng riêng nếu không có yêu cầu mới.

Mọi API cần kiểm tra danh tính và quyền ở backend. Không tin role, user ID hoặc trạng thái do client tự gửi.

## 6. Quy tắc nghiệp vụ AI phải ghi nhớ
- Duyệt mượn chỉ giữ chỗ số lượng; bàn giao thực tế mới xác lập tình trạng đang cho mượn.
- Có thể duyệt một phần số lượng yêu cầu mượn.
- Chỉ lịch Studio đã xác nhận mới giữ phòng.
- Kiểm tra xung đột lịch ở cả lúc tạo yêu cầu và lúc duyệt.
- Giao việc phải được ghi vào Bảng công việc tháng ngay khi giao.
- Lịch trực được ghi vào Bảng công việc tháng sau khi Nhân sự xác nhận.
- Công việc ngoài hệ thống do CTV khai báo phải được Nhân sự xác minh.
- Chỉ công việc hoàn thành được Nhân sự xác nhận và ca trực thực tế hoàn thành/được xác nhận mới được tính lương.
- Bảng công việc tháng và Bảng lương tháng là hai dữ liệu riêng.
- Hệ thống chỉ tổng hợp, tính toán và xuất Excel; chỉnh sửa, chốt và phê duyệt bảng lương thực hiện bên ngoài hệ thống.
- Không có máy chấm công vào/ra.

## 7. Quy trình xử lý yêu cầu
1. Xác định yêu cầu và nhóm chức năng FR-01 đến FR-09 liên quan.
2. Đọc đặc tả nghiệp vụ và code hiện tại.
3. Xác định vai trò, trạng thái, dữ liệu, ngoại lệ và ảnh hưởng liên module.
4. Đề xuất phương án phù hợp nhất, nêu tác động đến frontend, backend và database.
5. Chỉ triển khai phần được yêu cầu; không trộn thay đổi không liên quan.
6. Kiểm thử luồng thành công, lỗi, phân quyền và dữ liệu biên.
7. Báo cáo kết quả, giới hạn và phần chưa thực hiện.

## 8. Tiêu chí hoàn thành
- Đúng nghiệp vụ và phạm vi được giao.
- Phân quyền nhất quán giữa frontend, backend và database.
- Không phát sinh lỗi mới qua các kiểm tra phù hợp.
- Các luồng thành công, thất bại và dữ liệu biên đã được xem xét.
- Có cập nhật test/tài liệu/migration khi cần.
- Báo cáo rõ thay đổi và kết quả kiểm chứng.
