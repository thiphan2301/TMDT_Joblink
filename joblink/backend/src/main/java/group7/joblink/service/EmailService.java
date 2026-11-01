
package group7.joblink.service;

import jakarta.mail.Authenticator;
import jakarta.mail.Message;
import jakarta.mail.MessagingException;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Properties;

@Service
public class EmailService {

    private final String username;
    private final String password;
    private final String host;
    private final int port;

    public EmailService(
            @Value("${spring.mail.username}") String username,
            @Value("${spring.mail.password}") String password,
            @Value("${spring.mail.host:smtp.gmail.com}") String host,
            @Value("${spring.mail.port:587}") int port
    ) {
        this.username = username;
        this.password = password;
        this.host = host;
        this.port = port;
    }

    public void sendOtp(String email, String otp) {
        sendText(email, "JobLink - Mã xác thực đăng ký",
                "Mã xác thực JobLink của bạn là: " + otp
                + "\nMã có hiệu lực trong 5 phút. Không chia sẻ mã này.");
    }

    public void sendPasswordReset(String email, String link) {
        sendText(email, "JobLink - Đặt lại mật khẩu",
                "Bạn đã yêu cầu đặt lại mật khẩu JobLink.\n\n" + link
                + "\n\nLiên kết có hiệu lực trong 15 phút và chỉ dùng được một lần."
                + "\nNếu không phải bạn yêu cầu, hãy bỏ qua email này.");
    }

    private void sendText(String email, String subject, String body) {

        Properties props = new Properties();

        props.put("mail.smtp.host", host);
        props.put("mail.smtp.port", String.valueOf(port));
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");

        props.put("mail.smtp.connectiontimeout", "5000");
        props.put("mail.smtp.timeout", "5000");
        props.put("mail.smtp.writetimeout", "5000");

        Session session = Session.getInstance(
                props,
                new Authenticator() {
                    @Override
                    protected PasswordAuthentication
                    getPasswordAuthentication() {
                        return new PasswordAuthentication(
                                username,
                                password
                        );
                    }
                }
        );

        try {
            MimeMessage message = new MimeMessage(session);

            message.setFrom(new InternetAddress(username));

            message.setRecipients(
                    Message.RecipientType.TO,
                    InternetAddress.parse(email)
            );

            message.setSubject(subject, StandardCharsets.UTF_8.name());
            message.setText(body, StandardCharsets.UTF_8.name());

            Transport.send(message);

        } catch (MessagingException e) {
            throw new IllegalStateException(
                    "Không gửi được email. Kiểm tra cấu hình SMTP.",
                    e
            );
        }
    }
}
