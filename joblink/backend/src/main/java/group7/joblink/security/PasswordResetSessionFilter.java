package group7.joblink.security;

import group7.joblink.repository.UserRepository;
import group7.joblink.service.AuthService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

/** Thu hồi phiên cũ ở yêu cầu HTTP kế tiếp sau khi đặt lại mật khẩu. */
@Component
public class PasswordResetSessionFilter extends OncePerRequestFilter {
    private final UserRepository users;
    public PasswordResetSessionFilter(UserRepository users) { this.users = users; }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute(AuthService.SESSION_USER_ID) instanceof Integer id) {
            var user = users.findById(id);
            if (user.isEmpty() || session.getCreationTime() <= user.get().getSessionsInvalidBefore()) {
                session.invalidate();
            }
        }
        chain.doFilter(request, response);
    }
}
