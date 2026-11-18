package group7.joblink.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

class EmployerJobPricingTest {

    @Test
    void roundsEachPartialSevenDayPeriodUp() {
        assertThat(EmployerService.tokensForJobDuration(1)).isEqualTo(20);
        assertThat(EmployerService.tokensForJobDuration(7)).isEqualTo(20);
        assertThat(EmployerService.tokensForJobDuration(8)).isEqualTo(40);
        assertThat(EmployerService.tokensForJobDuration(14)).isEqualTo(40);
        assertThat(EmployerService.tokensForJobDuration(15)).isEqualTo(60);
    }

    @Test
    void rejectsDurationsOutsideSupportedRange() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> EmployerService.tokensForJobDuration(0));
        assertThatIllegalArgumentException()
                .isThrownBy(() -> EmployerService.tokensForJobDuration(366));
    }
}
