# TMDT_Joblink

### Cấu hình và chạy backend

Yêu cầu: JDK 21 và server MySQL hoặc MariaDB đang chạy.

**1. Tạo file cấu hình cá nhân**

Tạo `joblink/backend/src/main/resources/application-local.properties`:

```properties
spring.datasource.username=root
spring.datasource.password=MAT_KHAU_DATABASE_CUA_BAN
app.jwt.secret=CHUOI_BI_MAT_RIENG_TOI_THIEU_32_BYTE
spring.mail.username=EMAIL_CUA_BAN
spring.mail.password=GMAIL_APP_PASSWORD
```

Nếu tài khoản database không có mật khẩu, để:

```properties
spring.datasource.password=
```

`app.jwt.secret` bắt buộc có ít nhất 32 byte. Có thể tạo chuỗi riêng cho máy
của bạn bằng PowerShell:

```powershell
[guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
```

`spring.mail.username` và `spring.mail.password` cần là tài khoản Gmail cùng
App Password nếu muốn dùng đăng ký/xác thực OTP. Không dùng mật khẩu Gmail
thông thường. Các giá trị trên chỉ lưu trong file local, không commit lên Git.

**2. Cấu hình theo loại database**

Nếu dùng **MariaDB** (ví dụ MariaDB trong XAMPP), thêm vào file trên:

```properties
spring.jpa.database-platform=org.hibernate.dialect.MariaDBDialect
```

Nếu dùng **MySQL**, không thêm dòng MariaDB này.

Có thể kiểm tra loại server bằng SQL:

```sql
SELECT VERSION();
```

**3. Chạy backend**

Mở PowerShell tại thư mục `joblink/backend`:

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
```

Hoặc trong IntelliJ, tạo cấu hình chạy `group7.joblink.JoblinkApplication`
và đặt **Program arguments**:

```text
--spring.profiles.active=local
```

Backend chạy tại `http://localhost:8080`.
Flyway tự áp dụng các migration chưa chạy khi ứng dụng khởi động.

**Lưu ý:** Không commit file `application-local.properties` chứa cấu hình
cá nhân hoặc mật khẩu lên GitHub.

### Cấu hình và chạy VNPay Sandbox

Luồng thanh toán dùng VNPay Sandbox. Mỗi thành viên cần cấu hình thông tin
merchant Sandbox riêng (hoặc theo tài khoản nhóm được cấp); không đưa TMN Code,
Hash Secret hay mật khẩu vào GitHub.

**1. Cấu hình biến môi trường trong PowerShell**

Lấy `TMN Code` và `Hash Secret` từ thông tin VNPay Sandbox, cấu hình env

```powershell
$env:VNPAY_TMN_CODE = "TMN_CODE_CUA_BAN"
$env:VNPAY_HASH_SECRET = "HASH_SECRET_CUA_BAN"
$env:VNPAY_PAYMENT_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
$env:VNPAY_RETURN_URL = "http://localhost:5173/vi-token"
$env:VNPAY_EMPLOYER_RETURN_URL = "http://localhost:5173/employer/plan?paymentFor=employer"
```

**2. Mở IPN để VNPay báo kết quả về backend**

Mở một terminal riêng và chạy:

```powershell
ngrok http 8080
```

Trong cấu hình Sandbox, đặt **IPN URL** thành địa chỉ HTTPS ngrok, nối với
đường dẫn:

```text
https://TEN-MIEN-NGROK-CUA-BAN.ngrok-free.dev/api/payments/vnpay/ipn
```

Giữ ngrok hoạt động trong lúc thử thanh toán. Nếu ngrok cấp tên miền mới, cập
nhật IPN URL trong Sandbox. VNPay cần gọi được endpoint này để backend xác nhận
giao dịch; chỉ việc trình duyệt quay về trang web không làm phát sinh Token hay
kích hoạt gói.

**3. Chạy ứng dụng**

Giữ các biến môi trường trên, chạy backend như hướng dẫn ở trên và chạy frontend
trong terminal khác tại `joblink/frontend`:

```powershell
npm run dev
```

Frontend mặc định chạy tại `http://localhost:5173`. Ứng viên thanh toán Token
quay về `/vi-token`; nhà tuyển dụng quay về `/employer/plan`. Backend chỉ ghi
nhận thanh toán khi nhận IPN có chữ ký hợp lệ, đúng mã merchant và đúng số tiền.

**4. Thử luồng nhà tuyển dụng**

- Tại **Ví Token** hoặc **Gói dịch vụ**, chọn gói và bấm thanh toán qua VNPay.
- Sau khi VNPay báo thành công, IPN sẽ cộng Token mua hoặc Token tặng kèm và
  kích hoạt thời hạn gói. Lịch sử gói và biến động ví được lưu trong database.
- Khi đăng tin, chọn số ngày hiển thị (1–365). Chi phí tự tính theo 20 Token
  mỗi 7 ngày, làm tròn phần lẻ lên: 1–7 ngày = 20 Token, 8–14 ngày = 40 Token.
  Số Token không thể tự nhập; backend tính lại và trừ Token khi tin được đăng.
  Lưu nháp chưa trừ Token; chuyển nháp sang hiển thị sẽ kiểm tra số dư và hạn
  mức tin của gói hiện tại.
- Dùng thông tin thẻ thử nghiệm do VNPay Sandbox cung cấp, không dùng thẻ thật.

Khi thành viên khác chạy dự án trên máy riêng, cần cấu hình tài khoản
Sandbox và mở IPN URL công khai của backend đang chạy trên máy đó (ví dụ ngrok).
Khi deploy ứng dụng có HTTPS công khai ổn định thì dùng URL backend đã deploy,
không cần ngrok.

### Chạy model Phân loại bình luận

Mở PowerShell tại thư mục `joblink/sentiment-service` và chạy:

```text
.\run.ps1
```