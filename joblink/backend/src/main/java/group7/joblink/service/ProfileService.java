package group7.joblink.service;

import group7.joblink.dto.request.UpdateProfileRequest;
import group7.joblink.dto.response.ProfileResponse;
import group7.joblink.entity.CandidateProfile;
import group7.joblink.entity.Skill;
import group7.joblink.entity.User;
import group7.joblink.repository.CandidateProfileRepository;
import group7.joblink.repository.SkillRepository;
import group7.joblink.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class ProfileService {

    private static final ZoneId VIETNAM_ZONE =
            ZoneId.of("Asia/Ho_Chi_Minh");

    // Số Việt Nam: bắt đầu bằng 0 hoặc +84, sau đó 9–10 chữ số.
    private static final Pattern PHONE_PATTERN =
            Pattern.compile("^(\\+84|0)\\d{9,10}$");

    private static final LocalDate MIN_DOB = LocalDate.of(1900, 1, 1);
    private static final int MIN_AGE = 15;
    private static final int MAX_SKILLS = 20;
    private static final int MAX_SKILL_LENGTH = 100;
    private static final int MAX_SUMMARY_LENGTH = 2000;

    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final SkillRepository skillRepository;

    public ProfileService(
            UserRepository userRepository,
            CandidateProfileRepository candidateProfileRepository,
            SkillRepository skillRepository) {
        this.userRepository = userRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.skillRepository = skillRepository;
    }

    // Lấy thông tin cá nhân của ứng viên đang đăng nhập.
    @Transactional(readOnly = true)
    public ProfileResponse getProfile(Integer userId) {
        User user = requireCandidate(userId);

        return candidateProfileRepository.findById(userId)
                .map(profile -> toResponse(user, profile))
                .orElseGet(() -> new ProfileResponse(
                        user.getId(), user.getEmail(),
                        null, null, null, null, null, null,
                        true, List.of()));
    }

    // Cập nhật thông tin cá nhân; chưa có hồ sơ thì tạo mới.
    @Transactional
    public ProfileResponse updateProfile(
            Integer userId,
            UpdateProfileRequest request) {

        User user = requireCandidate(userId);

        String fullName = trimToNull(request.fullName());
        if (fullName == null) {
            throw badRequest("Vui lòng nhập họ và tên.");
        }
        checkLength(fullName, 255, "Họ và tên tối đa 255 ký tự.");

        String phone = normalizePhone(request.phone());
        LocalDate dob = checkDob(request.dob());

        String address = trimToNull(request.address());
        checkLength(address, 500, "Địa chỉ tối đa 500 ký tự.");

        String summary = trimToNull(request.summary());
        checkLength(summary, MAX_SUMMARY_LENGTH,
                "Giới thiệu bản thân tối đa " + MAX_SUMMARY_LENGTH + " ký tự.");

        List<String> skillNames = normalizeSkills(request.skills());

        CandidateProfile profile = candidateProfileRepository.findById(userId)
                .orElseGet(() -> new CandidateProfile(userId, fullName, null));

        // Không gửi searchable thì giữ nguyên giá trị cũ.
        boolean searchable = request.searchable() == null
                ? profile.isSearchable()
                : request.searchable();

        profile.updateInfo(fullName, phone, dob, address, summary, searchable);
        profile.replaceSkills(findOrCreateSkills(skillNames));

        CandidateProfile saved = candidateProfileRepository.save(profile);

        return toResponse(user, saved);
    }

    private User requireCandidate(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Phiên đăng nhập không còn hợp lệ."
                ));

        if (user.getStatus() == User.Status.locked) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản của bạn đã bị khóa."
            );
        }

        if (user.getRole() != User.Role.candidate) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Chỉ tài khoản ứng viên mới có hồ sơ cá nhân."
            );
        }

        return user;
    }

    // Bỏ khoảng trắng, dấu chấm, gạch ngang trước khi kiểm tra.
    private String normalizePhone(String value) {
        String phone = trimToNull(value);
        if (phone == null) {
            return null;
        }

        phone = phone.replaceAll("[\\s.\\-()]", "");

        if (!PHONE_PATTERN.matcher(phone).matches()) {
            throw badRequest("Số điện thoại không hợp lệ (VD: 0901234567).");
        }

        return phone;
    }

    private LocalDate checkDob(LocalDate dob) {
        if (dob == null) {
            return null;
        }

        LocalDate today = LocalDate.now(VIETNAM_ZONE);

        if (dob.isBefore(MIN_DOB) || dob.isAfter(today)) {
            throw badRequest("Ngày sinh không hợp lệ.");
        }

        if (dob.isAfter(today.minusYears(MIN_AGE))) {
            throw badRequest("Bạn cần đủ " + MIN_AGE + " tuổi trở lên.");
        }

        return dob;
    }

    // Bỏ trống, bỏ trùng (không phân biệt hoa thường), giữ thứ tự nhập.
    private List<String> normalizeSkills(List<String> values) {
        if (values == null) {
            return List.of();
        }

        Map<String, String> skills = new LinkedHashMap<>();

        for (String value : values) {
            String name = trimToNull(value);
            if (name == null) {
                continue;
            }

            checkLength(name, MAX_SKILL_LENGTH,
                    "Tên kỹ năng tối đa " + MAX_SKILL_LENGTH + " ký tự.");
            skills.putIfAbsent(name.toLowerCase(Locale.ROOT), name);
        }

        if (skills.size() > MAX_SKILLS) {
            throw badRequest("Tối đa " + MAX_SKILLS + " kỹ năng.");
        }

        return List.copyOf(skills.values());
    }

    // Dùng kỹ năng có sẵn trong bảng skills, chưa có thì tạo mới.
    private List<Skill> findOrCreateSkills(List<String> names) {
        return names.stream()
                .map(name -> skillRepository.findByName(name)
                        .orElseGet(() -> skillRepository.save(new Skill(name))))
                .toList();
    }

    private ProfileResponse toResponse(User user, CandidateProfile profile) {
        List<String> skills = profile.getSkills().stream()
                .map(Skill::getName)
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();

        return new ProfileResponse(
                user.getId(),
                user.getEmail(),
                profile.getFullName(),
                profile.getPhone(),
                profile.getDob(),
                profile.getAddress(),
                profile.getAvatar(),
                profile.getSummary(),
                profile.isSearchable(),
                skills
        );
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static void checkLength(String value, int max, String message) {
        if (value != null && value.length() > max) {
            throw badRequest(message);
        }
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
