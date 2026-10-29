package group7.joblink.service;

import group7.joblink.entity.Application;
import group7.joblink.entity.Cv;
import group7.joblink.repository.CompanyRepository;
import group7.joblink.repository.CvRepository;
import group7.joblink.repository.EmployerApplicationRepository;
import group7.joblink.repository.EmployerCandidateRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

// Nhà tuyển dụng xem file CV của ứng viên.
// API tải CV của ứng viên (/api/cvs/{id}/file) chỉ cho chính chủ, nên khu vực
// nhà tuyển dụng có đường riêng, kèm kiểm tra quyền:
//  - CV đính kèm đơn: đơn phải thuộc tin của chính nhà tuyển dụng.
//  - CV trong hồ sơ ứng viên: ứng viên đã ứng tuyển vào tin của mình,
//    hoặc nhà tuyển dụng đã mở hồ sơ này qua Tìm kiếm ứng viên (đã tính lượt xem).
@Service
public class EmployerCvService {

    private final EmployerApplicationRepository applicationRepository;
    private final EmployerCandidateRepository candidateRepository;
    private final CompanyRepository companyRepository;
    private final CvRepository cvRepository;
    private final CvStorageService storageService;

    public EmployerCvService(EmployerApplicationRepository applicationRepository,
                             EmployerCandidateRepository candidateRepository,
                             CompanyRepository companyRepository,
                             CvRepository cvRepository,
                             CvStorageService storageService) {
        this.applicationRepository = applicationRepository;
        this.candidateRepository = candidateRepository;
        this.companyRepository = companyRepository;
        this.cvRepository = cvRepository;
        this.storageService = storageService;
    }

    // Đường dẫn để frontend mở CV (trả trong chi tiết đơn / hồ sơ ứng viên).
    public static String applicationCvUrl(int applicationId) {
        return "/api/employer/applications/" + applicationId + "/cv";
    }

    public static String candidateCvUrl(int candidateId, int cvId) {
        return "/api/employer/candidates/" + candidateId + "/cvs/" + cvId + "/file";
    }

    // CV ứng viên đã chọn khi nộp đơn.
    @Transactional(readOnly = true)
    public CvService.Download applicationCv(int employerId, int applicationId) {
        // Đơn của công ty khác cũng báo "không tìm thấy" để không lộ dữ liệu.
        Application application = applicationRepository.findById(applicationId)
                .filter(app -> companyRepository
                        .findOwnerIdByCompanyId(app.getJob().getCompany().getId())
                        .filter(ownerId -> ownerId == employerId)
                        .isPresent())
                .orElseThrow(() -> notFound("Không tìm thấy đơn ứng tuyển."));

        if (application.getCv() == null) {
            throw notFound("Đơn này không đính kèm CV.");
        }

        return load(application.getCv());
    }

    // Một CV bất kỳ trong hồ sơ ứng viên.
    @Transactional(readOnly = true)
    public CvService.Download candidateCv(int employerId, int candidateId, int cvId) {
        boolean hasApplied = applicationRepository
                .countApplicationsFromCandidate(candidateId, employerId) > 0;
        boolean viewedProfile = hasApplied
                || candidateRepository.countViewsByEmployer(employerId, candidateId) > 0;

        if (!viewedProfile) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Hãy mở hồ sơ ứng viên trước khi xem CV.");
        }

        Cv cv = cvRepository.findByIdAndCandidate_UserId(cvId, candidateId)
                .orElseThrow(() -> notFound("Không tìm thấy CV."));

        return load(cv);
    }

    private CvService.Download load(Cv cv) {
        String fileName = cv.getFileName() == null ? "CV.pdf" : cv.getFileName();
        return new CvService.Download(storageService.load(cv.getFileUrl()), fileName);
    }

    private static ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }
}
