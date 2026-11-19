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

### Chạy Trợ lý AI local (Ollama)

Chatbot dùng API local của Ollama, không cần Spring AI hay API AI thương mại.
Lệnh `ollama pull` tải model một lần; khi chat, backend chỉ gọi Ollama trên
loopback và không gửi câu hỏi/dữ liệu lên dịch vụ AI đám mây.
Backend giữ endpoint hiện có `/api/assistant/chat`; user ID được lấy từ phiên
đăng nhập, không nhận từ trình duyệt. RAG hiện tìm trên tin tuyển dụng công khai
đang còn hạn; câu hỏi về đơn ứng tuyển, lịch phỏng vấn, hồ sơ hoặc ví chỉ truy
vấn dữ liệu của ứng viên đang đăng nhập. Hiện chưa có nguồn FAQ để lập chỉ mục.

**1. Cài Ollama và tải model**

Cài Ollama cho Windows từ [ollama.com/download](https://ollama.com/download),
sau đó mở một PowerShell riêng và chạy:

```powershell
ollama pull qwen2.5:3b
ollama pull nomic-embed-text
ollama list
```

`qwen2.5:3b` dùng để tạo câu trả lời, `nomic-embed-text` dùng để biến tin tuyển
dụng và câu hỏi thành vector. Cần tải cả hai model; model `qwen2.5-coder` chỉ
được tinh chỉnh cho lập trình và không thay thế model chat nói trên. Máy ít RAM
có thể thử `qwen2.5:1.5b` và đổi cấu hình chat model bên dưới.

Ollama thường chạy nền sau khi cài. Nếu chưa hoạt động, chạy `ollama serve` ở
PowerShell riêng và giữ tiến trình đó mở.

**2. Chạy ứng dụng**

Đảm bảo Ollama đang chạy, sau đó khởi động backend và frontend theo hướng dẫn
ở trên rồi đăng nhập bằng tài khoản ứng viên. Backend mặc định gọi
`http://localhost:11434`; biến môi trường tùy chọn:

```powershell
$env:OLLAMA_BASE_URL = "http://localhost:11434"
$env:OLLAMA_CHAT_MODEL = "qwen2.5:3b"
$env:OLLAMA_EMBEDDING_MODEL = "nomic-embed-text"
$env:OLLAMA_TIMEOUT_SECONDS = "120"
```

Chỉ địa chỉ loopback (`localhost`, `127.0.0.1` hoặc `::1`) được chấp nhận. Khi
backend khởi động, Flyway áp dụng migration `V21` để tạo bảng chỉ mục. Chỉ mục
được đồng bộ nền sau 20 giây và làm mới mỗi giờ; lần đầu có thể tốn thời gian
do Ollama phải tạo embedding cho các tin đang mở. Thay đổi nội dung tin sẽ được
đưa vào chỉ mục ở lần đồng bộ kế tiếp.

Nếu chatbot báo không kết nối được Ollama, kiểm tra Ollama có chạy và hai model
đã xuất hiện trong `ollama list`. Nếu báo thiếu model, kiểm tra tên model trong
cấu hình. Chatbot không dùng ngrok; chỉ cần backend gọi được Ollama trên máy
đang chạy backend.

**Xem prompt và câu trả lời local**

Mặc định backend không ghi nội dung câu chat để tránh lưu dữ liệu cá nhân.
Khi cần kiểm tra luồng RAG trên máy, thêm vào `application-local.properties`:

```properties
logging.level.group7.joblink.service.OllamaAssistantClient=DEBUG
```

Sau đó khởi động lại backend. Terminal backend sẽ ghi system prompt, context
truy xuất, câu hỏi và câu trả lời ở mức DEBUG. Ollama thường không hiển thị
prompt/câu trả lời trong cửa sổ ứng dụng Ollama hay màn hình chat web; nhật ký
này nằm ở terminal backend. Không bật DEBUG trên server production nếu prompt
có thể chứa dữ liệu cá nhân.

### Chạy model Phân loại bình luận

Mở PowerShell tại thư mục `joblink/sentiment-service` và chạy:

```text
.\run.ps1
```