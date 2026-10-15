package group7.joblink.controller;

import group7.joblink.service.AuthService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

// Lấy id người dùng đang đăng nhập từ HttpSession (AuthController lưu khi đăng nhập).
// Dùng trong controller: Integer userId = CurrentUser.requireId(request);
public final class CurrentUser {

    private CurrentUser() {
    }

    public static Integer requireId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        Object userId = session == null
                ? null
                : session.getAttribute(AuthService.SESSION_USER_ID);

        if (!(userId instanceof Integer id)) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Bạn chưa đăng nhập."
            );
        }

        return id;
    }
}
