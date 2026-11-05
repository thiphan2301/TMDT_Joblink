package group7.joblink.repository;

import group7.joblink.entity.InterviewInvitation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface InterviewInvitationRepository
        extends JpaRepository<InterviewInvitation, Integer> {

    // Lời mời phỏng vấn của nhiều đơn ứng tuyển (1 truy vấn cho cả danh sách).
    List<InterviewInvitation> findByApplication_IdIn(
            Collection<Integer> applicationIds);

    // Lời mời mới nhất của một đơn (gửi lại lịch thì lời mời mới thay lời mời cũ).
    Optional<InterviewInvitation> findFirstByApplication_IdOrderByIdDesc(
            Integer applicationId);
}
