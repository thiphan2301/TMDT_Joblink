
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

            message.setSubject(
                    "JobLink - Mã xác thực đăng ký",
                    StandardCharsets.UTF_8.name()
            );

            message.setText(
                    "Xin chào!\n\n"
                    + "Mã xác thực JobLink của bạn là: " + otp
                    + "\n\nMã có hiệu lực trong 5 phút."
                    + "\nKhông chia sẻ mã này với bất kỳ ai.",
                    StandardCharsets.UTF_8.name()
            );

            Transport.send(message);

        } catch (MessagingException e) {
            throw new IllegalStateException(
                    "Không gửi được OTP. Kiểm tra Gmail và App Password.",
                    e
            );
        }
    }
}
