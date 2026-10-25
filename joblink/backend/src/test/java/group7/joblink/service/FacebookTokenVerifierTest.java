package group7.joblink.service;

import group7.joblink.service.FacebookTokenVerifier.FacebookProfile;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class FacebookTokenVerifierTest {

    private static final String APP_ID = "1234567890";
    private static final String TOKEN = "user-access-token";

    private MockRestServiceServer server;
    private FacebookTokenVerifier verifier;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        verifier = new FacebookTokenVerifier(APP_ID, "app-secret", builder);
    }

    @Test
    void tokenHopLeTraVeThongTinNguoiDung() {
        givenDebugToken(true, APP_ID, "fb-42");
        server.expect(requestTo(startsWith("https://graph.facebook.com/me?fields=")))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer " + TOKEN))
                .andExpect(queryParam("appsecret_proof", matchesPattern("[0-9a-f]{64}")))
                .andRespond(withSuccess("""
                        {"id":"fb-42","name":"Lê Lan Anh","email":"lan.anh@gmail.com",
                         "picture":{"data":{"url":"https://fb-pic","is_silhouette":false}}}
                        """, MediaType.APPLICATION_JSON));

        FacebookProfile profile = verifier.verify(TOKEN);

        assertThat(profile.facebookId()).isEqualTo("fb-42");
        assertThat(profile.email()).isEqualTo("lan.anh@gmail.com");
        assertThat(profile.name()).isEqualTo("Lê Lan Anh");
        assertThat(profile.picture()).isEqualTo("https://fb-pic");
        server.verify();
    }

    @Test
    void khongCoEmailVanTraVeProfile() {
        givenDebugToken(true, APP_ID, "fb-43");
        // Graph API có lúc trả JSON với Content-Type text/javascript.
        server.expect(requestTo(startsWith("https://graph.facebook.com/me")))
                .andRespond(withSuccess("{\"id\":\"fb-43\",\"name\":\"No Email\"}",
                        MediaType.parseMediaType("text/javascript; charset=UTF-8")));

        FacebookProfile profile = verifier.verify(TOKEN);

        assertThat(profile.email()).isNull();
        assertThat(profile.picture()).isNull();
    }

    @Test
    void tuChoiTokenCuaAppKhac() {
        givenDebugToken(true, "other-app", "fb-42");

        assertStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void tuChoiTokenHetHan() {
        givenDebugToken(false, APP_ID, "fb-42");

        assertStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void facebookTraLoi4xxThiTokenKhongHopLe() {
        server.expect(requestTo(startsWith("https://graph.facebook.com/debug_token")))
                .andRespond(withBadRequest()
                        .body("{\"error\":{\"message\":\"Invalid OAuth access token\",\"code\":190}}")
                        .contentType(MediaType.APPLICATION_JSON));

        assertStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void facebookLoiMayChuThiBaoKhongKetNoiDuoc() {
        server.expect(requestTo(startsWith("https://graph.facebook.com/debug_token")))
                .andRespond(withServerError());

        assertStatus(HttpStatus.SERVICE_UNAVAILABLE);
    }

    @Test
    void chuaCauHinhAppSecretThiKhongGoiFacebook() {
        FacebookTokenVerifier notConfigured =
                new FacebookTokenVerifier(APP_ID, "", RestClient.builder());

        assertThatThrownBy(() -> notConfigured.verify(TOKEN))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception ->
                        assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
    }

    private void givenDebugToken(boolean valid, String appId, String userId) {
        server.expect(requestTo(startsWith("https://graph.facebook.com/debug_token?input_token=" + TOKEN)))
                .andExpect(method(HttpMethod.GET))
                .andExpect(queryParam("access_token", APP_ID + "%7Capp-secret"))
                .andRespond(withSuccess("""
                        {"data":{"is_valid":%s,"app_id":"%s","user_id":"%s","scopes":["email"]}}
                        """.formatted(valid, appId, userId), MediaType.APPLICATION_JSON));
    }

    private void assertStatus(HttpStatus status) {
        assertThatThrownBy(() -> verifier.verify(TOKEN))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception ->
                        assertThat(exception.getStatusCode()).isEqualTo(status));
    }
}
