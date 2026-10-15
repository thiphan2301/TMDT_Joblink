package group7.joblink.repository;

import group7.joblink.entity.ApplicationStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationStatusHistoryRepository
        extends JpaRepository<ApplicationStatusHistory, Integer> {
}