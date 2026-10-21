package group7.joblink.service;

import group7.joblink.dto.response.CandidateResponses.AssistantJobCard;
import group7.joblink.dto.response.CandidateResponses.AssistantProfile;
import group7.joblink.dto.response.CandidateResponses.AssistantReply;
import group7.joblink.dto.response.CandidateResponses.SkillRow;
import group7.joblink.entity.User;
import group7.joblink.repository.AssistantRepository;
import group7.joblink.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

// Trợ lý tìm việc cho ứng viên: trợ lý tra cứu theo luật trên dữ
// liệu thật của hệ thống (tin đang mở, mức lương trung bình, hồ sơ
// và lịch phỏng vấn của chính ứng viên) — không bịa việc làm hay
// con số. Hiểu các nhóm câu hỏi: tìm việc, mức lương, phân tích
// CV/hồ sơ, lịch phỏng vấn; ngoài ra thì tìm việc theo nguyên văn
// câu hỏi rồi mới nới dần theo từng từ khóa.
@Service
public class AssistantService {

    private static final DateTimeFormatter TIME_FMT =
            DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
    private static final List<String> SALARY_STOP_WORDS = List.of(
            "lương", "mức", "trung bình", "của", "việc", "làm", "job",
            "là", "bao nhiêu", "ở", "tại", "cho", "mình", "tôi", "vị trí");

    private final AssistantRepository repository;
    private final UserRepository userRepository;

    public AssistantService(AssistantRepository repository,
                            UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public AssistantProfile getProfile(int userId) {
        requireCandidate(userId);
        AssistantProfile profile = buildProfile(userId);
        // Chưa tạo hồ sơ thì trả hồ sơ rỗng (độ hoàn thiện 0%) thay
        // vì null, để giao diện vẫn hiện khung thông tin và gợi ý
        // người dùng đi tạo hồ sơ.
        if (profile == null) {
            return new AssistantProfile(null, null, null, null,
                    List.of(), 0, 0);
        }
        return profile;
    }

    @Transactional(readOnly = true)
    public AssistantReply chat(int userId, String rawMessage) {
        requireCandidate(userId);
        String message = rawMessage == null ? "" : rawMessage.trim();
        if (message.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Nội dung câu hỏi đang trống.");
        }
        String lower = message.toLowerCase(Locale.ROOT);

        if (lower.contains("lương")) {
            return salaryReply(message);
        }
        if (lower.contains("cv") || lower.contains("hồ sơ")) {
            return profileReply(userId);
        }
        if (lower.contains("phỏng vấn")) {
            return interviewReply(userId);
        }
        if (lower.length() <= 30 && (lower.contains("xin chào")
                || lower.contains("hello") || lower.contains("chào")
                || lower.contains("trợ giúp") || lower.contains("help"))) {
            return new AssistantReply(introText(userId), List.of());
        }
        return jobSearchReply(message);
    }

    /* ---------------- Các nhóm trả lời ---------------- */

    private AssistantReply jobSearchReply(String message) {
        List<AssistantJobCard> jobs = searchJobs(message, 5);
        if (jobs.isEmpty()) {
            // Nới dần: thử từng từ dài nhất trong câu hỏi.
            List<String> words = new ArrayList<>();
            for (String w : message.split("\\s+")) {
                if (w.length() >= 3) words.add(w);
            }
            words.sort((a, b) -> b.length() - a.length());
            for (String w : words) {
                jobs = searchJobs(w, 5);
                if (!jobs.isEmpty()) break;
            }
        }
        if (jobs.isEmpty()) {
            List<AssistantJobCard> latest = searchJobs("", 3);
            String text = "Mình chưa tìm thấy tin nào khớp với \"" + message
                    + "\". Bạn thử gõ ngắn gọn theo tên vị trí hoặc địa điểm "
                    + "(ví dụ: \"Java\", \"Kế toán\", \"Đà Nẵng\") nhé. "
                    + "Trong lúc đó, đây là vài tin mới nhất đang mở:";
            return new AssistantReply(text, latest);
        }
        String text = "Tìm thấy " + jobs.size() + " tin đang mở khớp với \""
                + message + "\". Bấm vào từng tin để xem chi tiết và ứng tuyển:";
        return new AssistantReply(text, jobs);
    }

    private AssistantReply salaryReply(String message) {
        String keyword = message;
        for (String stop : SALARY_STOP_WORDS) {
            keyword = keyword.replaceAll("(?i)" + stop, " ");
        }
        keyword = keyword.replaceAll("[^\\p{L}\\p{N} ]", " ")
                .replaceAll("\\s+", " ").trim();

        var stats = repository.salaryStats(keyword);
        long count = stats.isEmpty() ? 0 : toLong(stats.get(0)[0]);
        if (count == 0 && !keyword.isEmpty()) {
            stats = repository.salaryStats("");
            count = stats.isEmpty() ? 0 : toLong(stats.get(0)[0]);
            keyword = "";
        }
        if (count == 0) {
            return new AssistantReply(
                    "Hiện chưa có tin tuyển dụng đang mở nào để thống kê lương.",
                    List.of());
        }
        double avgMin = toDouble(stats.get(0)[1]);
        double avgMax = toDouble(stats.get(0)[2]);
        String scope = keyword.isEmpty() ? "tất cả tin đang mở"
                : "vị trí \"" + keyword + "\"";
        String text = "Dựa trên " + count + " tin đang mở của " + scope
                + ": mức lương tối thiểu trung bình khoảng " + money(avgMin)
                + "/tháng và mức tối đa trung bình khoảng " + money(avgMax)
                + "/tháng. Đây là số liệu thật từ các tin đang đăng trên "
                + "hệ thống, chỉ mang tính tham khảo khi đàm phán.";
        return new AssistantReply(text, List.of());
    }

    private AssistantReply profileReply(int userId) {
        AssistantProfile profile = buildProfile(userId);
        if (profile == null) {
            return new AssistantReply(
                    "Bạn chưa có hồ sơ ứng viên. Hãy tạo hồ sơ ở mục "
                            + "\"Hồ sơ của tôi\" trước, sau đó quay lại đây mình "
                            + "sẽ phân tích chi tiết cho bạn.", List.of());
        }
        List<String> missing = new ArrayList<>();
        if (blank(profile.fullName())) missing.add("họ tên");
        if (blank(profile.address())) missing.add("địa chỉ");
        if (blank(profile.avatar())) missing.add("ảnh đại diện");
        if (blank(profile.summary())) missing.add("phần giới thiệu bản thân");
        if (profile.skills().isEmpty()) missing.add("kỹ năng");
        if (profile.cvCount() == 0) missing.add("CV tải lên");

        StringBuilder text = new StringBuilder();
        text.append("Hồ sơ của bạn đang hoàn thiện ").append(profile.completeness())
                .append("%. Bạn hiện có ").append(profile.skills().size())
                .append(" kỹ năng và ").append(profile.cvCount()).append(" CV.");
        if (!missing.isEmpty()) {
            text.append(" Để hồ sơ mạnh hơn, hãy bổ sung: ")
                    .append(String.join(", ", missing)).append(".");
        } else {
            text.append(" Mọi mục chính đã đầy đủ — rất tốt!");
        }
        if (!blank(profile.summary()) && profile.summary().length() < 100) {
            text.append(" Phần giới thiệu đang hơi ngắn (")
                    .append(profile.summary().length())
                    .append(" ký tự), nên viết từ 100 ký tự trở lên và nhắc tới "
                            + "kỹ năng nổi bật nhất của bạn.");
        }
        text.append(" Mẹo: đặt kỹ năng có nhiều năm kinh nghiệm nhất lên đầu, "
                + "và dùng một CV mặc định rõ ràng cho từng vị trí ứng tuyển.");
        return new AssistantReply(text.toString(), List.of());
    }

    private AssistantReply interviewReply(int userId) {
        var rows = repository.findNextInterview(userId);
        StringBuilder text = new StringBuilder();
        if (!rows.isEmpty()) {
            Object[] r = rows.get(0);
            text.append("Lịch phỏng vấn sắp tới của bạn: vị trí ")
                    .append(str(r[3])).append(" tại ").append(str(r[4]))
                    .append(", vào ").append(formatTime(r[0]));
            if (!blank(str(r[1]))) {
                text.append(", địa điểm/hình thức: ").append(str(r[1]));
            }
            text.append(". ");
        } else {
            text.append("Bạn chưa có lịch phỏng vấn nào sắp tới. ");
        }
        text.append("Gợi ý luyện tập: chuẩn bị phần giới thiệu bản thân trong "
                + "1–2 phút, xem lại mô tả công việc và chuẩn bị 2–3 câu hỏi "
                + "để hỏi nhà tuyển dụng ở cuối buổi. Chúc bạn tự tin!");
        return new AssistantReply(text.toString(), List.of());
    }

    private String introText(int userId) {
        AssistantProfile profile = buildProfile(userId);
        String name = profile != null && !blank(profile.fullName())
                ? profile.fullName() : "bạn";
        return "Xin chào " + name + "! Mình là Trợ lý AI của ViecLamViet. "
                + "Mình tra cứu trực tiếp trên dữ liệu của hệ thống nên có thể: "
                + "(1) tìm việc theo vị trí/địa điểm, (2) cho biết mức lương "
                + "trung bình của tin đang mở, (3) phân tích độ hoàn thiện hồ sơ "
                + "và CV của bạn, (4) nhắc lịch phỏng vấn sắp tới. Bạn cần gì hôm nay?";
    }

    /* ---------------- Dữ liệu hồ sơ ---------------- */

    private AssistantProfile buildProfile(int userId) {
        var rows = repository.findProfileRow(userId);
        if (rows.isEmpty()) {
            return null;
        }
        Object[] r = rows.get(0);
        List<SkillRow> skills = repository.findSkillRows(userId).stream()
                .map(s -> new SkillRow(str(s[0]), toInt(s[1])))
                .toList();
        int cvCount = (int) toLong(repository.countCvs(userId));

        int filled = 0;
        if (!blank(str(r[0]))) filled++;
        if (!blank(str(r[2]))) filled++;
        if (r[3] != null) filled++;
        if (!blank(str(r[4]))) filled++;
        if (!blank(str(r[1]))) filled++;
        if (!blank(str(r[5]))) filled++;
        if (!skills.isEmpty()) filled++;
        if (cvCount > 0) filled++;
        int completeness = Math.round(filled * 100f / 8f);

        return new AssistantProfile(str(r[0]), str(r[1]), str(r[4]),
                str(r[5]), skills, cvCount, completeness);
    }

    private List<AssistantJobCard> searchJobs(String keyword, int limit) {
        return repository.searchJobs(keyword.trim(), limit).stream()
                .map(r -> new AssistantJobCard(
                        toInt(r[0]), str(r[1]), str(r[2]),
                        toDecimal(r[3]), toDecimal(r[4]), str(r[5]), str(r[6])))
                .toList();
    }

    /* ---------------- Tiện ích ---------------- */

    private void requireCandidate(int userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Bạn cần đăng nhập."));
        if (user.getRole() != User.Role.candidate) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Trợ lý này dành cho ứng viên.");
        }
    }

    private String money(double value) {
        if (value <= 0) return "—";
        if (value >= 1_000_000) {
            double tr = value / 1_000_000d;
            return (tr == Math.floor(tr) ? String.valueOf((long) tr)
                    : String.format(Locale.ROOT, "%.1f", tr)) + " triệu đồng";
        }
        return String.format("%,.0f", value).replace(',', '.') + " đồng";
    }

    private String formatTime(Object value) {
        LocalDateTime time = toDateTime(value);
        return time == null ? "" : time.format(TIME_FMT);
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    private static Integer toInt(Object value) {
        return value == null ? null : ((Number) value).intValue();
    }

    private static long toLong(Object value) {
        return value == null ? 0L : ((Number) value).longValue();
    }

    private static double toDouble(Object value) {
        return value == null ? 0d : ((Number) value).doubleValue();
    }

    private static BigDecimal toDecimal(Object value) {
        if (value == null) return null;
        if (value instanceof BigDecimal bd) return bd;
        return new BigDecimal(value.toString());
    }

    private static String str(Object value) {
        return value == null ? null : value.toString();
    }

    private static LocalDateTime toDateTime(Object value) {
        if (value == null) return null;
        if (value instanceof LocalDateTime ldt) return ldt;
        if (value instanceof Timestamp ts) return ts.toLocalDateTime();
        return LocalDateTime.parse(value.toString().replace(' ', 'T'));
    }
}