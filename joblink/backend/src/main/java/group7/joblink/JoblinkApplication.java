package group7.joblink;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.client.RestClient;

@SpringBootApplication
@EnableScheduling
public class JoblinkApplication {

	public static void main(String[] args) {
		SpringApplication.run(JoblinkApplication.class, args);
	}

    @Bean
    public RestClient.Builder restClientBuilder() {
        return RestClient.builder();
    }

}
