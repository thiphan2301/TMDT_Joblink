package group7.joblink.service;

import group7.joblink.dto.response.CvResponse;
import group7.joblink.entity.CandidateProfile;
import group7.joblink.entity.Cv;
import group7.joblink.entity.User;

import group7.joblink.repository.CandidateProfileRepository;
import group7.joblink.repository.CvRepository;
import group7.joblink.repository.UserRepository;

import jakarta.persistence.EntityManager;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

// xử lý quyền, db và cv mặc định
@Service
public class CvService {

    private final UserRepository userRepository;
    private final CandidateProfileRepository profileRepository;
    private final CvRepository cvRepository;
    private final CvStorageService storageService;
    private final EntityManager entityManager;

    public CvService(
            UserRepository userRepository,
            CandidateProfileRepository profileRepository,
            CvRepository cvRepository,
            CvStorageService storageService,
            EntityManager entityManager) {

        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.cvRepository = cvRepository;
        this.storageService = storageService;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public List<CvResponse> getMyCvs(Integer userId) {
        requireCandidate(userId, false);

        return cvRepository
                .findByCandidate_UserIdOrderByUploadedAtDescIdDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public CvResponse upload(Integer userId, MultipartFile file) {
        // Khóa tài khoản: hai lần upload đồng thời không cùng thành CV đầu tiên.
        requireCandidate(userId, true);

        CandidateProfile candidate = profileRepository.findById(userId)
                .orElseThrow(() -> error(
                        HttpStatus.CONFLICT,
                        "Bạn cần lưu hồ sơ cá nhân trước khi tải CV."
                ));

        boolean firstCv = !cvRepository.existsByCandidate_UserId(userId);

        CvStorageService.StoredFile stored = storageService.store(file);

        // File trên ổ đĩa không tự rollback như database.
        // Nếu lưu DB thất bại thì dọn file vừa upload.
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCompletion(int status) {
                        if (status == STATUS_ROLLED_BACK) {
                            storageService.deleteQuietly(stored.storageName());
                        }
                    }
                }
        );

        Cv cv = new Cv(
                candidate,
                stored.storageName(),
                stored.originalName(),
                firstCv
        );

        cvRepository.saveAndFlush(cv);

        // uploaded_at do database gán, cần đọc lại.
        entityManager.refresh(cv);

        return toResponse(cv);
    }

    @Transactional
    public CvResponse setDefault(Integer userId, Integer cvId) {
        requireCandidate(userId, true);

        Cv target = findOwnedCv(userId, cvId);

        Cv current = cvRepository.findDefaultForUpdate(userId)
                .orElse(null);

        if (current != null && current.getId().equals(target.getId())) {
            return toResponse(target);
        }

        if (current != null) {
            current.changeDefault(false);

            // Ghi bỏ mặc định cũ trước để không vi phạm unique default_slot.
            cvRepository.flush();
        }

        target.changeDefault(true);
        cvRepository.flush();

        return toResponse(target);
    }

    @Transactional(readOnly = true)
    public Download download(Integer userId, Integer cvId) {
        requireCandidate(userId, false);

        Cv cv = findOwnedCv(userId, cvId);
        Resource resource = storageService.load(cv.getFileUrl());

        String fileName = cv.getFileName() == null
                ? "CV.pdf"
                : cv.getFileName();

        return new Download(resource, fileName);
    }

    private Cv findOwnedCv(Integer userId, Integer cvId) {
        return cvRepository.findByIdAndCandidate_UserId(cvId, userId)
                .orElseThrow(() -> error(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy CV của bạn."
                ));
    }

    private User requireCandidate(Integer userId, boolean lock) {
        var result = lock
                ? userRepository.findForUpdate(userId)
                : userRepository.findById(userId);

        User user = result.orElseThrow(() -> error(
                HttpStatus.UNAUTHORIZED,
                "Phiên đăng nhập không còn hợp lệ."
        ));

        if (user.getStatus() != User.Status.active) {
            throw error(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản của bạn đã bị khóa."
            );
        }

        if (user.getRole() != User.Role.candidate) {
            throw error(
                    HttpStatus.FORBIDDEN,
                    "Chỉ tài khoản ứng viên được quản lý CV."
            );
        }

        return user;
    }

    private CvResponse toResponse(Cv cv) {
        return new CvResponse(
                cv.getId(),
                cv.getFileName(),
                cv.isDefaultCv(),
                cv.getUploadedAt(),
                "/api/cvs/" + cv.getId() + "/file"
        );
    }

    private static ResponseStatusException error(
            HttpStatus status,
            String message) {

        return new ResponseStatusException(status, message);
    }

    public record Download(Resource resource, String fileName) {
    }
}