package group7.joblink.controller;

import group7.joblink.entity.User;
import group7.joblink.repository.UserRepository;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;

// Cổng kiểm tra quyền cho mọi API /api/admin/**:
// - Bình thường: phải đăng nhập (HttpSession như AuthController) và có role = admin.
// - Demo trên máy dev: nếu bật app.admin.demo-access=true trong
//   application-local.properties VÀ đang chạy profile "local" thì cho qua
//   (giống cơ chế app.demo-applications có sẵn của project) — chỉ để demo
//   trên lớp khi chưa có tài khoản admin đăng nhập được bằng Google.
//   TUYỆT ĐỐI không bật ở môi trường thật.
@Component
public class AdminAccess {

    private final UserRepository userRepository;
    private final Environment environment;
    private final boolean demoAccess;

    public AdminAccess(
            UserRepository userRepository,
            Environment environment,
            @Value("${app.admin.demo-access:false}") boolean demoAccess) {
        this.userRepository = userRepository;
        this.environment = environment;
        this.demoAccess = demoAccess;
    }

    // Trả về id của admin đang đăng nhập; ném 401/403 nếu không đủ quyền.
    public Integer requireAdminId(HttpServletRequest request) {
        if (demoAccess && Arrays.asList(environment.getActiveProfiles()).contains("local")) {
            // Chế độ demo local: lấy admin đầu tiên trong database làm người thực hiện.
            return userRepository.findAll().stream()
                    .filter(u -> u.getRole() == User.Role.admin)
                    .map(User::getId)
                    .findFirst()
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.FORBIDDEN,
                            "Database chưa có tài khoản admin nào (kiểm tra seed data V4)."));
        }

        Integer userId = CurrentUser.requireId(request);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không còn hợp lệ."));

        if (user.getRole() != User.Role.admin) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Khu vực này chỉ dành cho quản trị viên.");
        }
        if (user.getStatus() == User.Status.locked) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Tài khoản của bạn đã bị khóa.");
        }
        return userId;
    }
}
