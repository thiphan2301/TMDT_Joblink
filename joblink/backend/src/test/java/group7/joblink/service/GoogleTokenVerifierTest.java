package group7.joblink.service;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GoogleTokenVerifierTest {

    @Test
    void baoLoiKhiChuaCauHinhClientId() {
        GoogleTokenVerifier verifier = new GoogleTokenVerifier("");

        assertThatThrownBy(() -> verifier.verify("abc.def.ghi"))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception ->
                        assertThat(exception.getStatusCode())
                                .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
    }

    @Test
    void tokenSaiDinhDangLaKhongHopLe() {
        GoogleTokenVerifier verifier =
                new GoogleTokenVerifier("test.apps.googleusercontent.com");

        for (String token : new String[] {"abc.def.ghi", "khong-phai-jwt", "a.b"}) {
            assertThatThrownBy(() -> verifier.verify(token))
                    .isInstanceOfSatisfying(ResponseStatusException.class, exception ->
                            assertThat(exception.getStatusCode())
                                    .isEqualTo(HttpStatus.UNAUTHORIZED));
        }
    }
}
