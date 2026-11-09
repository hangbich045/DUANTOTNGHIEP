# QUY TẮC NGHIỆP VỤ – LHU MEDIA STUDIO

## 1. Vai trò và phân quyền
1. Hệ thống có ba vai trò nghiệp vụ: **Nhân sự, CTV, Người dùng**.
2. Trưởng phòng và Nhân sự là cùng một nhóm quyền.
3. CTV không được thực hiện chức năng quản trị hoặc tự duyệt nghiệp vụ.
4. Người dùng chỉ được thao tác trong phạm vi chức năng dành cho người dùng.
5. Quyền phải được kiểm tra ở backend, không chỉ kiểm soát bằng giao diện.

## 2. Quy tắc quản lý thiết bị
1. Trạng thái thiết bị gồm: Có sẵn, Đang cho mượn, Hư hỏng, Đang sửa chữa, Tạm ngưng sử dụng, Hủy bỏ.
2. Thiết bị mất hoặc thanh lý vẫn phải giữ lịch sử.
3. Khi phát hiện hư hỏng, thiết bị phải được ghi nhận và chuyển sang quy trình xử lý phù hợp.
4. Lịch sử bảo trì, sửa chữa, mất và thanh lý phải được lưu để tra cứu.
5. Không xóa dữ liệu lịch sử chỉ để loại bỏ thiết bị khỏi danh sách đang sử dụng.

## 3. Quy tắc mượn – trả thiết bị
1. Yêu cầu mượn phải được kiểm tra điều kiện và số lượng khả dụng.
2. Nhân sự có thể duyệt toàn bộ hoặc một phần số lượng được yêu cầu.
3. Duyệt yêu cầu chỉ giữ chỗ số lượng; không có nghĩa thiết bị đã được bàn giao.
4. Trạng thái Đang cho mượn chỉ được ghi nhận sau khi bàn giao thiết bị thực tế.
5. Khi bàn giao và khi trả, cần ghi nhận thông tin xử lý/tình trạng thiết bị theo nghiệp vụ.
6. Nếu người mượn không đến nhận sau 2 giờ kể từ thời điểm dự kiến, hệ thống thông báo Nhân sự; Nhân sự quyết định giữ hay giải phóng số lượng đã giữ.
7. Hệ thống theo dõi và cảnh báo trường hợp trả quá hạn.
8. Thiết bị phải được trả ít nhất 1 ngày trước lượt đặt tiếp theo.
9. Khi trả, Nhân sự kiểm tra tình trạng: thiết bị bình thường được cập nhật về trạng thái phù hợp; thiết bị hư hỏng được chuyển sang Hư hỏng và quy trình xử lý sự cố/sửa chữa.
10. Không mặc định chặn yêu cầu mượn mới chỉ vì người dùng có thiết bị quá hạn, trừ khi có quy định bổ sung được phê duyệt.

## 4. Quy tắc đặt phòng Studio
1. Giờ hoạt động: Thứ Hai đến Thứ Bảy, 07:30–11:30 và 13:30–16:30.
2. Không cho đặt vào ngày nghỉ theo lịch của Nhà trường.
3. Có khoảng đệm 30 phút giữa hai lượt đặt.
4. Chỉ lịch đã xác nhận mới giữ phòng.
5. Trước khi tạo yêu cầu, hệ thống phải kiểm tra ngày nghỉ, giờ hoạt động, lịch đã xác nhận và khoảng đệm.
6. Nếu thời gian không hợp lệ hoặc bị trùng, yêu cầu phải được điều chỉnh; không chuyển yêu cầu không hợp lệ sang Nhân sự để duyệt.
7. Nhân sự duyệt hoặc từ chối yêu cầu hợp lệ.
8. Backend phải kiểm tra xung đột lại tại thời điểm duyệt để tránh xác nhận trùng lịch.
9. Nhân sự xử lý việc thay đổi/hủy lịch và các xung đột ưu tiên liên quan hoạt động cấp trường.

## 5. Quy tắc quản lý công việc
1. Nhân sự là người giao việc cho CTV.
2. Công việc có thông tin cần thiết như nội dung, thời hạn và người được giao.
3. Khi giao việc, hệ thống tự động ghi công việc vào Bảng công việc tháng.
4. CTV cập nhật tiến độ và gửi kết quả/minh chứng.
5. Nhân sự kiểm tra kết quả, có thể yêu cầu chỉnh sửa hoặc xác nhận hoàn thành.
6. Luồng trạng thái: Chưa thực hiện → Đang thực hiện → Chờ duyệt → Hoàn thành.
7. Nếu cần chỉnh sửa: Chờ duyệt → Cần chỉnh sửa → Đang thực hiện; quy trình có thể lặp lại.
8. Chỉ khi Nhân sự xác nhận Hoàn thành, công việc mới đủ điều kiện đưa vào dữ liệu tính lương.
9. CTV có thể khai báo công việc phát sinh ngoài hệ thống, kèm tên công việc, thời gian thực hiện và minh chứng.
10. Công việc ngoài hệ thống phải được Nhân sự xác minh trước khi tính lương.

## 6. Quy tắc lịch trực và Bảng công việc tháng
1. CTV đăng ký thời gian có thể tham gia trực.
2. Nhân sự sắp xếp/điều chỉnh và xác nhận lịch trực chính thức.
3. Chỉ lịch trực đã được Nhân sự xác nhận mới được ghi vào Bảng công việc tháng.
4. Lịch trực tương lai đã xác nhận chưa được tính vào dữ liệu lương.
5. Chỉ ca trực thực tế đã hoàn thành và được xác nhận mới được tính công.
6. Không sử dụng thiết bị chấm công vào/ra.
7. Bảng công việc tháng và Bảng lương tháng là hai dữ liệu riêng biệt.

## 7. Quy tắc tính tiền công
1. Mức tiền công cơ bản: **20.000 đồng/giờ**.
2. Một ca trực Studio tiêu chuẩn: **4 giờ**.
3. Công việc kỹ thuật chụp ảnh/quay phim sự kiện sau 16:30 từ Thứ Hai đến Thứ Bảy: áp dụng hệ số **1,5**.
4. Công việc kỹ thuật sự kiện vào Chủ nhật: áp dụng hệ số **2**.
5. Nếu công việc Chủ nhật đồng thời diễn ra sau 16:30, chỉ áp dụng hệ số 2, không nhân chồng hệ số.
6. Thời lượng công việc kỹ thuật sự kiện được tính theo thời gian thực tế.
7. Không tính trùng thời gian đã được tính trong ca trực phòng.
8. Chỉ công việc hoàn thành được Nhân sự xác nhận và ca trực thực tế hoàn thành/được xác nhận mới được đưa vào dữ liệu lương.

## 8. Quy tắc Bảng lương tháng
1. Bảng lương tháng được tổng hợp từ dữ liệu công đủ điều kiện.
2. Công việc đang thực hiện, chờ duyệt hoặc cần chỉnh sửa không được tính.
3. Ca trực tương lai không được tính dù đã xác nhận lịch.
4. Hệ thống thực hiện tổng hợp, tính toán và xuất Excel.
5. Việc chỉnh sửa, chốt và phê duyệt bảng lương thực hiện bên ngoài hệ thống.
6. Không xây dựng quy trình phê duyệt bảng lương bên trong hệ thống nếu chưa có yêu cầu mới.

## 9. Quy tắc tài khoản
1. Đăng ký tài khoản bằng email và mã nhân viên theo quy trình của hệ thống.
2. Người dùng thuộc Nhà trường sử dụng email trường; CTV có thể sử dụng email cá nhân hoặc email trường.
3. Tài khoản đầu tiên có quyền Nhân sự được tạo thủ công theo quy trình triển khai.
4. Xác minh tài khoản bằng OTP gửi email.
5. Đặt lại mật khẩu thông qua email theo quy trình xác minh.
6. Nhân sự có quyền khóa/mở khóa tài khoản.
7. Khi CTV kết thúc tham gia, tài khoản được vô hiệu hóa đăng nhập nhưng lịch sử hoạt động phải được giữ lại.
8. Trạng thái tài khoản gồm Active, Locked và Disabled.

## 10. Quy tắc thông báo
1. Hệ thống hỗ trợ thông báo trên website và email.
2. Thông báo có trạng thái đã đọc/chưa đọc.
3. Các sự kiện cần thông báo gồm giao việc, yêu cầu chỉnh sửa, xác nhận hoàn thành, đặt phòng, mượn – trả và lịch trực theo luồng nghiệp vụ.
4. Không tạo thông báo phê duyệt bảng lương trong hệ thống vì việc chốt/phê duyệt bảng lương nằm ngoài phạm vi hệ thống.

## 11. Quy tắc thống kê, báo cáo và lịch sử
1. Báo cáo gồm thiết bị, mượn – trả/quá hạn, lịch Studio, công việc/tiến độ, giờ công/dữ liệu tiền công và tài khoản/nhân sự.
2. Hệ thống hỗ trợ xuất Excel theo phạm vi dữ liệu báo cáo.
3. Lịch sử thao tác cần thể hiện người thực hiện, thời điểm, hành động và dữ liệu liên quan.
4. Không ghi mật khẩu, OTP, JWT hoặc secret vào lịch sử/log.

## 12. Quy tắc chi phí sửa chữa
Chi phí sửa chữa/bồi hoàn chỉ áp dụng trong trường hợp cụ thể thiết bị hư hỏng trong quá trình thực hiện nhiệm vụ truyền thông/sự kiện chính thức và có hóa đơn chứng từ phù hợp. Không áp dụng mặc định cho mọi trường hợp sửa chữa.
