package group7.joblink.repository;

import group7.joblink.entity.SocialAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

// Repository JPA dành riêng cho khu vực admin trên social_accounts
// (tách khỏi SocialAccountRepository của project).
public interface AdminSocialAccountRepository
        extends JpaRepository<SocialAccount, Integer> {

    // Admin xóa tài khoản: gỡ các liên kết mạng xã hội của user trước
    // khi xóa dòng users (tránh lỗi khóa ngoại).
    @Modifying
    long deleteByUser_Id(Integer userId);
}
