package group7.joblink.repository;

import group7.joblink.entity.TokenPackage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TokenPackageRepository
        extends JpaRepository<TokenPackage, Integer> {

    // Danh sách gói Token ở trang quản lý gói: ít Token trước.
    List<TokenPackage> findAllByOrderByTokensAsc();
}
