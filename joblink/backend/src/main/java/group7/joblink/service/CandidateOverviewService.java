package group7.joblink.service;

import group7.joblink.dto.response.PublicResponses.CandidateOverview;
import group7.joblink.dto.response.PublicResponses.OverviewApplication;
import group7.joblink.dto.response.PublicResponses.OverviewInterview;
import group7.joblink.repository.CandidateOverviewRepository;
import group7.joblink.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

// Trang Tổng quan của ứng viên: mọi con số (đơn đã nộp, được mời
// phỏng vấn, lượt xem hồ sơ, đơn gần đây, lịch sắp tới) đều đếm
// và lấy thật từ database của chính ứng viên đang đăng nhập.
@Service
public class CandidateOverviewService {

    private final CandidateOverviewRepository overviewRepository;
    private final UserRepository userRepository;

    public CandidateOverviewService(
            CandidateOverviewRepository overviewRepository,
            UserRepository userRepository) {
        this.overviewRepository = overviewRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public CandidateOverview getOverview(int userId) {
        userRepository.findById(userId)
            .filter(u -> "candidate".equals(u.getRole()))
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.FORBIDDEN, "Chỉ ứng viên mới xem được tổng quan này."));

        List<OverviewApplication> recent = overviewRepository
            .findRecentApplications(userId).stream()
            .map(r -> new OverviewApplication(
                toInt(r[0]), str(r[1]), str(r[2]), str(r[3]),
                str(r[4]), toTime(r[5])))
            .toList();

        List<OverviewInterview> upcoming = overviewRepository
            .findUpcomingInterviews(userId).stream()
            .map(r -> new OverviewInterview(
                toTime(r[0]), str(r[1]), str(r[2]), str(r[3]), str(r[4])))
            .toList();

        return new CandidateOverview(
            overviewRepository.countApplications(userId),
            overviewRepository.countInvited(userId),
            overviewRepository.countProfileViews(userId),
            recent,
            upcoming);
    }

    private static String str(Object v) {
        return v == null ? null : v.toString();
    }

    private static Integer toInt(Object v) {
        return v == null ? null : ((Number) v).intValue();
    }

    private static LocalDateTime toTime(Object v) {
        if (v instanceof LocalDateTime t) return t;
        if (v instanceof Timestamp t) return t.toLocalDateTime();
        return null;
    }
}
