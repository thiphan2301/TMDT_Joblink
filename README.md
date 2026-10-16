# TMDT_Joblink

### Cấu hình và chạy backend

Yêu cầu: JDK 21 và server MySQL hoặc MariaDB đang chạy.

**1. Tạo file cấu hình cá nhân**

Tạo `joblink/backend/src/main/resources/application-local.properties`:

```properties
spring.datasource.username=root
spring.datasource.password=MAT_KHAU_DATABASE_CUA_BAN
```

Nếu tài khoản database không có mật khẩu, để:

```properties
spring.datasource.password=
```

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