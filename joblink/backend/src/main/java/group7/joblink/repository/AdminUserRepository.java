package group7.joblink.repository;

import group7.joblink.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

// Repository JPA dành riêng cho khu vực admin trên bảng users — tách riêng
// khỏi UserRepository của project để phần admin không phải sửa file dùng
// chung. Spring Data cho phép nhiều repository trên cùng một entity,
// mỗi nơi inject đúng interface mình cần.
//
// Entity User của project không có setter nên các thao tác sửa của admin
// đi qua @Modifying (clearAutomatically để tránh đọc phải dữ liệu cũ
// trong cùng transaction sau khi cập nhật hàng loạt).
public interface AdminUserRepository extends JpaRepository<User, Integer> {

    // Danh sách người dùng ở trang quản lý: xếp theo id tăng dần.
    List<User> findAllByOrderByIdAsc();

    // Kiểm tra trùng email khi admin thêm / sửa tài khoản.
    boolean existsByEmail(String email);

    boolean existsByEmailAndIdNot(String email, Integer id);

    // Số tài khoản theo trạng thái (đếm tài khoản bị khóa cho thẻ
    // "Tài khoản cần xử lý" ở trang tổng quan).
    long countByStatus(User.Status status);

    // Số người dùng mới trong khoảng [from, to) — biểu đồ tăng trưởng.
    long countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(
        LocalDateTime from, LocalDateTime to);

    // Số người dùng theo từng vai trò — biểu đồ tròn phân bổ người dùng.
    // Trả các dòng [role, số lượng].
    @Query("SELECT u.role, COUNT(u) FROM User u GROUP BY u.role")
    List<Object[]> countByRole();

    // Admin sửa email và vai trò của tài khoản.
    @Modifying(clearAutomatically = true)
    @Query("UPDATE User u SET u.email = :email, u.role = :role WHERE u.id = :id")
    int updateEmailAndRole(@Param("id") Integer id,
                           @Param("email") String email,
                           @Param("role") User.Role role);

    // Admin khóa / mở khóa tài khoản.
    @Modifying(clearAutomatically = true)
    @Query("UPDATE User u SET u.status = :status WHERE u.id = :id")
    int updateStatus(@Param("id") Integer id,
                     @Param("status") User.Status status);

    // Admin đặt mật khẩu (nhận mật khẩu ĐÃ băm BCrypt ở tầng service).
    // Cũng dùng ngay sau khi tạo tài khoản, vì constructor của User
    // không nhận mật khẩu.
    @Modifying(clearAutomatically = true)
    @Query("UPDATE User u SET u.passwordHash = :passwordHash WHERE u.id = :id")
    int updatePasswordHash(@Param("id") Integer id,
                           @Param("passwordHash") String passwordHash);
}
