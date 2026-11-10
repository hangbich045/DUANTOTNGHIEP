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

## 6. Quy tắc lịch trực, chấm công và Bảng công việc tháng
1. **Quy trình đăng ký – sắp xếp ca trực Studio 3 giai đoạn**:
   - **Giai đoạn 1 (Nhân sự tạo đợt đăng ký tháng mới)**:
     * Nhân sự bấm "Tạo đợt trực mới", chọn tháng/năm, thiết lập hạn chót đăng ký (deadline) và ghi chú.
     * Hệ thống kiểm tra tính duy nhất: Chặn tạo trùng đợt đăng ký cho cùng một tháng/năm.
     * Khi đợt được tạo thành công ở trạng thái `OPEN`, hệ thống tự động phát thông báo in-app (`DUTY_PERIOD_OPEN`) đến toàn bộ CTV.
     * Trạng thái đợt gồm: `OPEN` (Đang mở đăng ký), `CLOSED` (Đã đóng đăng ký), `ARRANGING` (Đang xếp lịch), `CONFIRMED` (Đã chốt lịch chính thức).
   - **Giai đoạn 2 (CTV đăng ký thời gian có thể trực - Availability)**:
     * CTV nhận thông báo, truy cập ma trận lịch tháng 1..N x 3 buổi (S: 07:30–11:30, C: 13:00–17:00, T: 17:30–21:30).
     * CTV tick chọn nhiều ngày/buổi có thể tham gia trực Studio và lưu vào hệ thống (`ShiftRegistrations`).
     * Trong thời gian đợt còn `OPEN`, CTV có toàn quyền cập nhật hoặc hủy đăng ký. Khi đợt `CLOSED`, hệ thống khóa chức năng đăng ký/sửa đổi.
     * **Nguyên tắc phân biệt rạch ròi**: Đăng ký rảnh của CTV chỉ là thông tin nguyện vọng/khả năng có mặt, **chưa phải lịch chính thức và tuyệt đối chưa được tính công/thù lao**. Một ca có thể có nhiều CTV cùng đăng ký rảnh.
   - **Giai đoạn 3 (Nhân sự sắp xếp và xác nhận lịch trực chính thức)**:
     * Nhân sự xem bảng ma trận tổng hợp đăng ký rảnh của toàn bộ CTV theo từng ngày và từng buổi.
     * Nhân sự tiến hành phân công ca trực chính thức (StudioShifts). Hệ thống tự động kiểm tra và cảnh báo/chặn khi phân công 1 CTV trùng 2 ca trong cùng 1 buổi.
     * Nhân sự bấm "Xác nhận lịch trực tháng": Đợt trực chuyển sang trạng thái `CONFIRMED`, chốt danh sách ca trực chính thức, tự động đồng bộ ký hiệu `LV` vào Bảng chấm công tháng, và phát thông báo in-app (`DUTY_SCHEDULE_CONFIRMED`) đến từng CTV có ca trực.
2. **Quy tắc bảo vệ quỹ lương đối với ca trực Studio**:
   - Ca trực tương lai (`date > today`) dù đã ở trạng thái `CONFIRMED` **tuyệt đối không được tính trước vào dữ liệu thù lao** (Quy tắc TC-04).
   - Chỉ ca trực thực tế trong quá khứ/hiện tại đã hoàn thành (`status === 'COMPLETED'`) mới đủ điều kiện tính tiền công.
3. **Quy tắc kiểm soát ký hiệu SV (Làm sự vụ) trong Bảng chấm công**:
   - **Điều kiện cho phép chọn SV**: Chỉ cho phép chọn ký hiệu `SV` khi CTV có công việc tương ứng được ghi nhận trong Bảng thống kê công việc của đúng ngày đó và đã đạt trạng thái `COMPLETED`.
   - **Khi ngày đó không có công việc hợp lệ**:
     * Nút `SV` ở trạng thái **disabled**, bị làm mờ và không thể click chọn.
     * Khi người dùng cố gắng tương tác hoặc rê chuột, hệ thống hiển thị thông báo chuẩn: **"Không hợp lệ vì không có công việc tương ứng trong Bảng thống kê công việc."**
     * Không lưu ký hiệu `SV` vào cơ sở dữ liệu và không tính giờ/tiền sự vụ cho ngày đó.
   - **Kiểm tra chặt chẽ ở cả Frontend và Backend**: Backend API kiểm tra độc lập tại service `updateAttendanceCell`, chặn đứng mọi hành vi gọi API trực tiếp để ghi dữ liệu SV trái phép (trả về lỗi HTTP 400).
   - **Nguyên tắc cách ly CTV**: Tuyệt đối không cho phép sử dụng công việc của CTV khác làm căn cứ để ghi nhận ký hiệu `SV`.
   - **Xử lý hồi quy**: Khi công việc bị hủy, xóa hoặc chuyển khỏi trạng thái `COMPLETED`, hệ thống tự động loại trừ bản ghi `SV` thủ công tương ứng khỏi Bảng chấm công.
4. **Không sử dụng thiết bị chấm công vào/ra phần cứng**: Quản lý chấm công qua ma trận 3 ca (S - Sáng, C - Chiều, T - Tối) trên hệ thống.
5. **Đồng bộ đa tầng độc lập**: Bảng thống kê công việc tháng, Bảng chấm công tháng và Dữ liệu tính thù lao là ba phân hệ dữ liệu riêng biệt được đồng bộ tự động, không gộp thành một bảng dữ liệu phẳng duy nhất.
6. **Ký hiệu chấm công thống nhất**:
   - **LV**: Trực – làm việc tại Studio (ca tiêu chuẩn 4 giờ).
   - **SV**: Làm sự vụ (ghi nhận theo giờ thực tế của các công việc/nhiệm vụ COMPLETED).
   - **NL**: Nghỉ lễ (theo quy định của Nhà trường).
7. **Bảo vệ quyền hạn Nhân sự (TC-07)**: CTV không được tự ý duyệt hoàn thành ca trực hoặc tự ý sửa mức lương/giờ công ngoài quyền hạn.

## 7. Quy tắc tính tiền công và thù lao CTV
1. Mức tiền công cơ bản: **20.000 đồng/giờ**.
2. Một ca trực Studio tiêu chuẩn: **4 giờ** (tương đương 80.000 đồng/ca).
3. Công việc kỹ thuật chụp ảnh/quay phim sự vụ sau 16:30 từ Thứ Hai đến Thứ Bảy: áp dụng hệ số **1,5** (tính cho số giờ làm sau 16:30).
4. Công việc kỹ thuật sự kiện vào Chủ nhật: áp dụng hệ số **2,0** cho toàn bộ thời gian thực hiện trong ngày Chủ nhật.
5. Nếu công việc vào Chủ nhật đồng thời diễn ra sau 16:30, **chỉ áp dụng hệ số 2,0**, không nhân chồng hệ số (1.5 x 2.0 = 3.0 là vi phạm).
6. Thời lượng công việc kỹ thuật sự kiện được tính theo thời gian thực tế ghi nhận trên phiếu nhiệm vụ đã nghiệm thu.
7. Không tính trùng thời gian đã được tính trong ca trực Studio (nếu một buổi vừa trực Studio vừa làm sự vụ, chỉ tính giờ trực Studio hoặc tính giờ sự vụ không trùng lặp).
8. Chỉ công việc hoàn thành được Nhân sự xác nhận (COMPLETED) mới được đưa vào dữ liệu lương (Quy tắc TC-03).
9. Công việc chưa hoàn thành, đang thực hiện, chờ duyệt hoặc cần chỉnh sửa tuyệt đối không được đưa vào dữ liệu thù lao (Quy tắc TC-03).

## 8. Quy tắc Biểu mẫu Excel xuất báo cáo (Chuẩn BPTT ĐH Lạc Hồng)
1. **Bảng thống kê công việc tháng (Sheet chuẩn `T10.2026`)**:
   - Cột A: STT
   - Cột B: Họ và tên CTV
   - Cột C: Ngày thực hiện
   - Cột D: Nội dung sự vụ
   - Cột E: Nhiệm vụ (Loại công việc)
   - Cột F: Thực hiện (giờ) - Số giờ thực tế của từng đầu việc
   - Cột G: Tổng (giờ) - Tổng số giờ thực hiện của CTV trong tháng (sử dụng công thức `=SUM(...)`)
   - Cột H: Ghi chú
   - Dữ liệu được nhóm và phân loại rõ ràng theo từng CTV.
2. **Bảng chấm công tháng (Sheet chuẩn `Sheet1`)**:
   - Tiêu đề: TRƯỜNG ĐẠI HỌC LẠC HỒNG - BỘ PHẬN TRUYỀN THÔNG & BẢNG CHẤM CÔNG THÁNG [MM/YYYY].
   - Ma trận ngày: Bố trí từ ngày 1 đến ngày cuối tháng theo đúng lịch thực tế (thứ Hai đến Chủ nhật).
   - Mỗi CTV gồm 3 dòng tương ứng với 3 buổi: S (Sáng), C (Chiều), T (Tối).
   - Ô chấm công hiển thị ký hiệu chuẩn: `LV`, `SV`, `NL`.
   - Các cột tổng hợp cuối bảng:
     * Cột AI: **LV** (Tổng số ca trực theo từng buổi)
     * Cột AJ: **SV** (Tổng số ca sự vụ theo từng buổi)
     * Cột AK: **Sum LV** (Tổng cộng số ca trực trong tháng của cả 3 buổi S, C, T)
     * Cột AL: **Giờ LV** (Tổng giờ trực Studio = Sum LV * 4)
     * Cột AM: **Giờ SV** (Tổng giờ làm sự vụ thực tế từ các công việc COMPLETED)
     * Cột AN: **Tổng** (Tổng giờ quy đổi = Giờ LV + Giờ SV + Giờ OT*0.5 + Giờ CN*1.0)
     * Cột AO: **Tiền** (Thù lao nhận được = Tổng giờ quy đổi * 20.000 VNĐ)
   - Dòng tổng cộng tiền toàn bộ CTV ở cuối bảng tại cột AO.
   - Phần ghi chú giải thích ký hiệu (`LV`, `SV`, `NL`) và khối ký tên (LÃNH ĐẠO ĐƠN VỊ, NGƯỜI CHẤM CÔNG).

## 9. Quy tắc tài khoản
1. Đăng ký tài khoản bằng email và mã nhân viên theo quy trình của hệ thống.
2. Người dùng thuộc Nhà trường sử dụng email trường; CTV có thể sử dụng email cá nhân hoặc email trường.
3. Tài khoản đầu tiên có quyền Nhân sự được tạo thủ công theo quy trình triển khai.
4. Xác minh tài khoản bằng OTP gửi email.
5. Đặt lại mật khẩu thông qua email theo quy trình xác minh.
6. Nhân sự có quyền khóa/mở khóa tài khoản (`Active` <-> `Locked`).
7. **Phân biệt rõ 3 trạng thái tài khoản**:
   - **`Active`**: Tài khoản đang hoạt động bình thường, được phép đăng nhập và thao tác nghiệp vụ.
   - **`Locked`**: Tài khoản bị tạm khóa (ví dụ nhập sai mật khẩu nhiều lần hoặc Nhân sự tạm ngưng quyền truy cập). Có thể mở khóa lại (`Active`). Chặn đăng nhập với thông báo: *"Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên."* (HTTP 403).
   - **`Disabled`**: Tài khoản đã bị vô hiệu hóa (khi CTV kết thúc tham gia/nghỉ việc, hoặc khi Nhân sự thực hiện xóa tài khoản đã phát sinh dữ liệu). Chặn đăng nhập với thông báo: *"Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Quản trị viên."* (HTTP 403). Toàn bộ dữ liệu lịch sử và định danh `user_id` được giữ nguyên vẹn 100%.
8. **Quy tắc xử lý xóa tài khoản (Bảo toàn dữ liệu lịch sử)**:
   - **Tài khoản đã có dữ liệu liên quan**: Nếu tài khoản đã phát sinh bất kỳ dữ liệu hoạt động nào (công việc được giao/tạo `Tasks`, bản ghi chấm công `AttendanceRecords`, ca trực `StudioShifts`, đăng ký rảnh `ShiftRegistrations`, đợt trực `DutyPeriods`, bảng lương `MonthlyPayrolls`, đơn mượn `BorrowRequests`, lịch phòng `StudioBookings`), hệ thống **TUYỆT ĐỐI KHÔNG XÓA VẬT LÝ**. Thay vào đó, tự động chuyển tài khoản sang trạng thái **`Disabled`** (`isActive: false`).
   - Toàn bộ công việc đã giao (dù chưa làm, đang làm hay đã xong), lịch sử chấm công, lịch trực và dữ liệu liên quan được bảo toàn nguyên vẹn với đúng `assigned_to_user_id` ban đầu; không tự ý xóa hoặc chuyển người nhận việc sang tài khoản khác.
   - **Tài khoản chưa có dữ liệu liên quan**: Chỉ cho phép xóa vật lý (DELETE) khỏi CSDL khi tài khoản chưa từng phát sinh dữ liệu liên quan trong hệ thống.
   - **Chặn tự thao tác**: Nhân sự tuyệt đối không thể tự xóa hoặc vô hiệu hóa tài khoản của chính mình.
   - **Bảo vệ toàn vẹn dữ liệu**: Không sử dụng `ON DELETE CASCADE` trên các quan hệ dữ liệu người dùng để tránh rủi ro xóa dây chuyền và lỗi chu kỳ tham chiếu trong SQL Server.

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

## 13. Quy tắc đồng bộ danh sách CTV trong các bộ lọc và dropdown
1. **Phân định rõ 2 mục đích sử dụng danh sách CTV**:
   - **Mục đích phân công mới, chọn người nhận việc hoặc gán ca trực (`purpose = 'assign'` / `status = 'Active'`)**:
     * CHỈ hiển thị và cho phép chọn các CTV đang có trạng thái `Active` (`isActive = true`).
     * Tuyệt đối không hiển thị tài khoản `Locked` hoặc `Disabled`.
     * Backend từ chối mọi yêu cầu phân công ca trực hoặc nhiệm vụ mới cho tài khoản không hoạt động (Locked/Disabled).
   - **Mục đích tìm kiếm, lọc dữ liệu lịch sử hoặc xem báo cáo (`purpose = 'filter'` / `status = 'ALL'`)**:
     * Cho phép tìm kiếm và xem dữ liệu của TẤT CẢ CTV đã từng phát sinh dữ liệu trong hệ thống (bao gồm cả `Active`, `Locked`, `Disabled`).
     * Khi lọc theo CTV đã nghỉ việc (`Disabled`), hệ thống vẫn hiển thị đầy đủ: lịch sử ca trực đã hoàn thành, dữ liệu chấm công các tháng trước, danh sách công việc đã thực hiện và tiền công đã thanh toán.
     * Đảm bảo không xảy ra tình trạng CTV bị vô hiệu hóa thì mất toàn bộ lịch sử trong các bộ lọc hay báo cáo.
2. **Ràng buộc vai trò (Role)**:
   - Các dropdown và bộ lọc CTV CHỈ chứa người dùng có vai trò là CTV (`COLLABORATOR`).
   - Tuyệt đối không lẫn lộn với người dùng thông thường (`USER`) hoặc Quản trị viên (`ADMIN`).
   - Lấy dữ liệu thực tế từ Database thông qua Backend API (không hardcode dữ liệu mẫu).
3. **Tiêu chuẩn hiển thị danh sách CTV**:
   - Mỗi mục hiển thị đầy đủ: **Họ và tên**, kèm **Mã nhân viên** hoặc **Email** (để phân biệt chính xác khi trùng tên).
   - Đối với bộ lọc lịch sử, các tài khoản `Disabled` được bổ sung nhãn nhận diện `[Đã nghỉ việc]` để Nhân sự dễ phân biệt.
   - Luôn sắp xếp danh sách theo thứ tự bảng chữ cái **A–Z** theo Họ tên tiếng Việt.
4. **Trải nghiệm người dùng (UX)**:
   - Tuyệt đối không để các trường chọn CTV chỉ hiển thị ô nhập ID thủ công hoặc danh sách rỗng khi Database vẫn có CTV hợp lệ.
   - Có tùy chọn `'Tất cả CTV'` tại các bộ lọc lịch sử/báo cáo.
   - Hỗ trợ tìm kiếm nhanh theo Họ tên, Email, Mã nhân viên.
   - Giá trị CTV đã chọn được giữ nguyên vẹn khi chuyển đổi qua lại giữa các tháng/năm hoặc chuyển tab.


## 14. Quy tắc an toàn dữ liệu và đồng bộ Schema Frontend - Backend
1. **Tính nhất quán cấu trúc Payload giữa Backend và Frontend**:
   - Khi Backend trả về danh sách đối tượng người dùng hoặc CTV (như trong Bảng chấm công `payroll.timesheet`), API phải cung cấp đầy đủ cả `user` và `ctv` (chuẩn hóa song song) để tương thích với tất cả các trang quản trị (`admin/payroll`) lẫn trang cá nhân người dùng (`tasks`).
   - Mảng ngày (`daysMeta` và `daysHeader`) cũng như cấu trúc `summary` (cả camelCase `sumLv`, `gioLv`, `gioSv` lẫn UPPERCASE `sumLV`, `gioLV`, `gioSV`) phải được đồng bộ hóa đầy đủ.
2. **Nguyên tắc phòng thủ an toàn (Defensive Programming) tại Frontend**:
   - Khi tìm kiếm hoặc duyệt mảng (`Array.find`, `Array.filter`, `Array.map`), luôn kiểm tra tính hợp lệ của mảng (`Array.isArray`) và phần tử (`Boolean(r)`).
   - Khi truy cập thuộc tính định danh `.id`, phải dùng phương thức fallback an toàn: `r?.user?.id || r?.ctv?.id`, tuyệt đối không truy cập trực tiếp `r.user.id` khi phần tử hoặc quan hệ có thể vắng mặt.
   - Trường hợp người dùng không có bản ghi tương ứng (như CTV chưa phát sinh dòng chấm công trong tháng), hệ thống trả về `null` an toàn và hiển thị giao diện phù hợp thay vì để crash ứng dụng.
3. **Xử lý an toàn các quan hệ dữ liệu liên kết (Task - User - Assignee - Creator)**:
   - Nếu Task thiếu thông tin người giao việc (`creator = null`) hoặc người được giao (`assignee = null`), giao diện hiển thị giá trị mặc định rõ ràng (`'Admin'` hoặc `'Chưa phân công'`), không được làm crash trang và tuyệt đối không tự ý gán người dùng khác vào bản ghi.
   - Dữ liệu liên kết với tài khoản đã bị khóa (`Locked`) hoặc vô hiệu hóa (`Disabled`) vẫn được hiển thị nguyên vẹn thông tin lịch sử.
