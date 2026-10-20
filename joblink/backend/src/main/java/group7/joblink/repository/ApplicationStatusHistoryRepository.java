package group7.joblink.repository;

import group7.joblink.entity.ApplicationStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface ApplicationStatusHistoryRepository
        extends JpaRepository<ApplicationStatusHistory, Integer> {

    // Lịch sử đổi trạng thái của nhiều đơn, cũ trước mới sau.
    List<ApplicationStatusHistory> findByApplication_IdInOrderByChangedAtAscIdAsc(
            Collection<Integer> applicationIds);
}
