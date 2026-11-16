const bcrypt = require('bcryptjs');
const { User, sequelize } = require('../src/models');

const BASE_URL = 'http://localhost:5000/api';
const FE_URL = 'http://localhost:3000';

async function runTest() {
  console.log('================================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ: LUỒNG ĐĂNG NHẬP USER DO ADMIN TẠO & XÁC THỰC OTP');
  console.log('================================================================\n');

  const testEmail = `test_otp_${Date.now()}@testflow.vn`;
  const testPassword = 'Password123@!';
  let createdUserId = null;

  try {
    // 1. Kiểm tra kết nối Database
    await sequelize.authenticate();
    console.log('✅ Bước 1: Kết nối Database thành công.');

    // 2. Giả lập Admin tạo User mới (mặc định isVerified = false theo schema User)
    console.log(`\n📋 Bước 2: Tạo tài khoản User mới do Admin khởi tạo: ${testEmail}`);
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    const employeeCode = `EMP${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;

    const newUser = await User.create({
      fullName: 'Test OTP User Flow',
      email: testEmail,
      password: hashedPassword,
      employeeCode,
      role: 'COLLABORATOR',
      isActive: true,
      isVerified: false, // Mặc định của User tạo bởi Admin
    });
    createdUserId = newUser.id;
    console.log(`✅ Tạo tài khoản thành công! ID: ${createdUserId}, isVerified: ${newUser.isVerified}`);

    // 3. User thực hiện Đăng nhập lần đầu khi chưa xác thực OTP
    console.log('\n🔐 Bước 3: User đăng nhập bằng Email và Password...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });

    const loginData = await loginRes.json();
    console.log(`-> Response Status: ${loginRes.status} (Kỳ vọng: 403)`);
    console.log('-> Response Data:', loginData);

    if (loginRes.status !== 403) {
      throw new Error(`Kỳ vọng Status 403 nhưng nhận được ${loginRes.status}`);
    }

    const { requireVerification, requiresActivation, email: responseEmail } = loginData;
    if (requireVerification !== true) {
      throw new Error(`Trường requireVerification phải là true (nhận: ${requireVerification})`);
    }
    if (requiresActivation !== true) {
      throw new Error(`Trường requiresActivation phải là true (nhận: ${requiresActivation})`);
    }
    if (responseEmail !== testEmail) {
      throw new Error(`Trường email phải là ${testEmail} (nhận: ${responseEmail})`);
    }
    console.log('✅ Bước 3 ĐẠT: Backend trả về 403 Forbidden kèm đầy đủ cờ requireVerification, requiresActivation và email!');

    // 4. Kiểm tra OTP sinh ra trong Database
    console.log('\n🔍 Bước 4: Kiểm tra mã OTP được tạo trong Database...');
    const refreshedUser = await User.findByPk(createdUserId);
    const generatedOtp = refreshedUser.otpCode;
    console.log(`-> OTP trong DB: "${generatedOtp}", Expiry: ${refreshedUser.otpExpiry}`);
    if (!generatedOtp || generatedOtp.length !== 6) {
      throw new Error(`OTP không hợp lệ: ${generatedOtp}`);
    }
    console.log('✅ Bước 4 ĐẠT: Mã OTP 6 chữ số đã được sinh và lưu trữ thành công.');

    // 5. Kiểm tra giao diện Frontend Verify có hoạt động không
    console.log('\n🌐 Bước 5: Kiểm tra trang Frontend /auth/verify...');
    const feRes = await fetch(`${FE_URL}/auth/verify?email=${encodeURIComponent(testEmail)}`);
    console.log(`-> Frontend Verify Page Status: ${feRes.status} (Kỳ vọng: 200)`);
    if (feRes.status !== 200) {
      throw new Error(`Frontend /auth/verify trả về status ${feRes.status}`);
    }
    console.log('✅ Bước 5 ĐẠT: Giao diện /auth/verify sẵn sàng tiếp nhận người dùng!');

    // 6. User nhập OTP để xác thực tài khoản qua API /auth/verify
    console.log(`\n🔑 Bước 6: Gửi yêu cầu xác thực OTP: email=${testEmail}, otp=${generatedOtp}...`);
    const verifyRes = await fetch(`${BASE_URL}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: generatedOtp }),
    });
    const verifyData = await verifyRes.json();
    console.log(`-> Verify Status: ${verifyRes.status} (Kỳ vọng: 200)`);
    console.log('-> Verify Data Success:', verifyData.success);
    console.log('-> Verify Token có tồn tại:', Boolean(verifyData.accessToken || verifyData.token));

    if (verifyRes.status !== 200 || !verifyData.success) {
      throw new Error(`Xác thực OTP thất bại! Data: ${JSON.stringify(verifyData)}`);
    }

    const verifiedUserInDb = await User.findByPk(createdUserId);
    if (!verifiedUserInDb.isVerified) {
      throw new Error('User trong DB chưa được chuyển sang isVerified = true!');
    }
    console.log(`-> User.isVerified trong DB sau khi verify: ${verifiedUserInDb.isVerified}`);
    console.log('✅ Bước 6 ĐẠT: Xác thực OTP thành công, tài khoản đã được kích hoạt chính thức!');

    // 7. User đăng nhập lại sau khi đã xác thực OTP thành công
    console.log('\n🚀 Bước 7: Thử đăng nhập lại sau khi tài khoản đã được kích hoạt...');
    const secondLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const secondLoginData = await secondLoginRes.json();
    const token = secondLoginData.accessToken || secondLoginData.data?.accessToken;
    const userRole = secondLoginData.user?.role || secondLoginData.data?.user?.role;
    console.log(`-> Đăng nhập lần 2 Status: ${secondLoginRes.status} (Kỳ vọng: 200)`);
    console.log('-> Token trả về:', token ? 'OK' : 'MISSING');
    console.log('-> User role:', userRole);

    if (secondLoginRes.status !== 200 || !token) {
      throw new Error(`Đăng nhập sau khi kích hoạt không thành công! Data: ${JSON.stringify(secondLoginData)}`);
    }
    console.log('✅ Bước 7 ĐẠT: Đăng nhập trơn tru và nhận token phiên làm việc!');

    console.log('\n================================================================');
    console.log('🎉 TẤT CẢ CÁC BƯỚC KIỂM THỬ ĐỀU ĐẠT 100%! HỆ THỐNG HOẠT ĐỘNG HOÀN HẢO.');
    console.log('================================================================');
  } catch (error) {
    console.error('\n❌ KIỂM THỬ THẤT BẠI:', error.message);
    process.exitCode = 1;
  } finally {
    // 8. Dọn dẹp dữ liệu test
    if (createdUserId) {
      console.log(`\n🧹 Dọn dẹp tài khoản test ID: ${createdUserId}...`);
      await User.destroy({ where: { id: createdUserId } });
      console.log('✅ Đã dọn dẹp tài khoản test.');
    }
    await sequelize.close();
  }
}

runTest();
