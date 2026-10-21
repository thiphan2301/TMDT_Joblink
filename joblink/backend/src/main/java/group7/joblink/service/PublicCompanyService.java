package group7.joblink.service;

import group7.joblink.dto.response.PublicResponses.CompanyJobCard;
import group7.joblink.dto.response.PublicResponses.CompanyPageResponse;
import group7.joblink.dto.response.PublicResponses.CompanyReviewRow;
import group7.joblink.repository.PublicCompanyRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

// Trang công ty công khai theo thiết kế mới: hồ sơ công ty, tin
// đang tuyển, điểm đánh giá và nhận xét của ứng viên — tất cả
// đọc thật từ database. Các mục thiết kế không có dữ kiện (năm
// thành lập, phúc lợi, sự kiện) không được dựng lên ở đây; giao
// diện sẽ bỏ qua chúng.
@Service
public class PublicCompanyService {

    private final PublicCompanyRepository companyRepository;

    public PublicCompanyService(PublicCompanyRepository companyRepository) {
        this.companyRepository = companyRepository;
    }

    @Transactional(readOnly = true)
    public CompanyPageResponse getCompanyPage(int companyId) {
        List<Object[]> rows = companyRepository.findPublicRow(companyId);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Không tìm thấy công ty.");
        }
        Object[] c = rows.get(0);

        List<CompanyJobCard> jobs = companyRepository
            .findOpenJobs(companyId).stream()
            .map(r -> new CompanyJobCard(
                toInt(r[0]), str(r[1]), toDecimal(r[2]), toDecimal(r[3]),
                str(r[4]), str(r[5]), str(r[6]), str(r[7]), str(r[8]),
                toDate(r[9]), toTime(r[10]), toBool(r[11])))
            .toList();

        double average = 0;
        long reviewCount = 0;
        List<Object[]> summary = companyRepository.findRatingSummary(companyId);
        if (!summary.isEmpty() && summary.get(0)[1] != null) {
            average = summary.get(0)[0] == null
                ? 0 : ((Number) summary.get(0)[0]).doubleValue();
            reviewCount = ((Number) summary.get(0)[1]).longValue();
        }

        // Phân bổ sao theo thứ tự 5,4,3,2,1 để giao diện vẽ thanh.
        List<Integer> distribution = new ArrayList<>(List.of(0, 0, 0, 0, 0));
        for (Object[] r : companyRepository.countByRating(companyId)) {
            int rating = ((Number) r[0]).intValue();
            int count = ((Number) r[1]).intValue();
            if (rating >= 1 && rating <= 5) {
                distribution.set(5 - rating, count);
            }
        }

        List<CompanyReviewRow> reviews = companyRepository
            .findReviews(companyId).stream()
            .map(r -> new CompanyReviewRow(
                str(r[0]), str(r[1]), toInt(r[2]), str(r[3]),
                toTime(r[4]), str(r[5])))
            .toList();

        return new CompanyPageResponse(
            toInt(c[0]), str(c[1]), str(c[2]), str(c[3]), str(c[4]),
            str(c[5]), str(c[6]), str(c[7]), str(c[8]), str(c[9]),
            str(c[10]), toDecimal(c[11]), toDecimal(c[12]),
            Math.round(average * 10.0) / 10.0, reviewCount,
            distribution, jobs, reviews);
    }

    private static String str(Object v) {
        return v == null ? null : v.toString();
    }

    private static Integer toInt(Object v) {
        return v == null ? null : ((Number) v).intValue();
    }

    private static BigDecimal toDecimal(Object v) {
        if (v == null) return null;
        if (v instanceof BigDecimal d) return d;
        return new BigDecimal(v.toString());
    }

    private static boolean toBool(Object v) {
        if (v == null) return false;
        if (v instanceof Boolean b) return b;
        if (v instanceof Number n) return n.intValue() != 0;
        return Boolean.parseBoolean(v.toString());
    }

    private static LocalDate toDate(Object v) {
        if (v instanceof LocalDate d) return d;
        if (v instanceof java.sql.Date d) return d.toLocalDate();
        return null;
    }

    private static LocalDateTime toTime(Object v) {
        if (v instanceof LocalDateTime t) return t;
        if (v instanceof Timestamp t) return t.toLocalDateTime();
        return null;
    }
}
