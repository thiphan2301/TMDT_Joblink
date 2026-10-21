package group7.joblink.controller;

import group7.joblink.entity.User;
import group7.joblink.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

// Cổng kiểm tra quyền cho khu vực nhà tuyển dụng (/api/employer/**):
// người dùng phải đăng nhập (session do AuthController lưu) và có vai
// trò employer — vai trò đọc tươi từ database ở mỗi request, đổi vai
// trò là có hiệu lực ngay, không cần đăng nhập lại.
@Component
public class EmployerAccess {

    private final UserRepository userRepository;

    public EmployerAccess(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // Trả về id nhà tuyển dụng đang đăng nhập; 401 nếu chưa đăng nhập,
    // 403 nếu tài khoản không phải nhà tuyển dụng.
    public int requireEmployerId(HttpServletRequest request) {
        int userId = CurrentUser.requireId(request);
        User user = userRepository.findById(userId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bạn chưa đăng nhập."));
        if (user.getRole() != User.Role.employer) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Khu vực này chỉ dành cho nhà tuyển dụng.");
        }
        return userId;
    }
}
