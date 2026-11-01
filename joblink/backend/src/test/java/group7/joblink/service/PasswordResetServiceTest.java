package group7.joblink.service;

import group7.joblink.entity.User;
import group7.joblink.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class PasswordResetServiceTest {
    UserRepository users;
    PasswordEncoder encoder;
    EmailService mail;
    PasswordResetService service;
    User user;
    String token = "a".repeat(43);

    @BeforeEach void setup() {
        users = mock(UserRepository.class);
        encoder = mock(PasswordEncoder.class);
        mail = mock(EmailService.class);
        service = new PasswordResetService(users, encoder, mail, "http://localhost:5173");
        user = new User("test@example.com", User.Role.candidate);
    }

    @Test void unknownEmailDoesNotSendMail() {
        service.request("unknown@example.com");
        verifyNoInteractions(mail);
        verify(users, never()).saveAndFlush(any());
    }

    @Test void requestNormalizesEmailAndStoresOnlyHash() {
        when(users.findLockedByEmail("test@example.com")).thenReturn(Optional.of(user));
        service.request(" TEST@example.com ");
        var link = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(mail).sendPasswordReset(eq("test@example.com"), link.capture());
        String raw = link.getValue().split("#token=")[1];
        assertThat(raw).hasSize(43);
        assertThat(user.getResetTokenHash()).isEqualTo(PasswordResetService.hash(raw));
        assertThat(user.getResetExpiresAt()).isAfter(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(14));
    }

    @Test void cooldownDoesNotRotateExistingLink() {
        when(users.findLockedByEmail(user.getEmail())).thenReturn(Optional.of(user));
        user.setResetRequestedAt(LocalDateTime.now(ZoneOffset.UTC));
        user.setResetTokenHash("existing");
        service.request(user.getEmail());
        verifyNoInteractions(mail);
        assertThat(user.getResetTokenHash()).isEqualTo("existing");
    }

    @Test void lockedAccountCannotRequest() {
        when(users.findLockedByEmail(user.getEmail())).thenReturn(Optional.of(user));
        user.setStatus(User.Status.locked);
        service.request(user.getEmail());
        verifyNoInteractions(mail);
    }

    @Test void resetHashesPasswordConsumesLinkAndRevokesSessions() {
        when(users.findLockedByResetTokenHash(PasswordResetService.hash(token))).thenReturn(Optional.of(user));
        user.setResetTokenHash(PasswordResetService.hash(token));
        user.setResetExpiresAt(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(15));
        when(encoder.encode("NewPass1!")).thenReturn("encoded");
        service.reset(token, "NewPass1!");
        assertThat(user.getPasswordHash()).isEqualTo("encoded");
        assertThat(user.getResetTokenHash()).isNull();
        assertThat(user.getResetExpiresAt()).isNull();
        assertThat(user.getSessionsInvalidBefore()).isPositive();
        verify(users).saveAndFlush(user);
    }

    @Test void expiredTokenDoesNotChangePassword() {
        when(users.findLockedByResetTokenHash(anyString())).thenReturn(Optional.of(user));
        user.setResetExpiresAt(LocalDateTime.now(ZoneOffset.UTC).minusSeconds(1));
        assertThatThrownBy(() -> service.reset(token, "NewPass1!")).isInstanceOf(ResponseStatusException.class);
        verifyNoInteractions(encoder);
    }

    @Test void consumedOrUnknownTokenFails() {
        assertThatThrownBy(() -> service.reset(token, "NewPass1!")).isInstanceOf(ResponseStatusException.class);
        verifyNoInteractions(encoder);
    }

    @Test void weakOrTooLongPasswordFailsBeforeTokenLookup() {
        for (String password : new String[]{"short", "lowercase1!", "NoNumber!", "NoSpecial1", "A1!" + "x".repeat(70)}) {
            assertThatThrownBy(() -> service.reset(token, password)).isInstanceOf(ResponseStatusException.class);
        }
        verifyNoInteractions(users);
    }
}
