package group7.joblink.repository;

import group7.joblink.entity.CandidateProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

// Repository JPA dành riêng cho khu vực admin trên candidate_profiles
// (tách khỏi CandidateProfileRepository của project). Entity không có
// setter đổi tên nên admin cập nhật qua @Modifying; tạo hồ sơ mới vẫn
// dùng constructor sẵn có của entity.
public interface AdminCandidateProfileRepository
        extends JpaRepository<CandidateProfile, Integer> {

    // Admin sửa tên hiển thị của ứng viên. Trả số dòng đã sửa:
    // 0 nghĩa là ứng viên chưa có hồ sơ — service sẽ tạo hồ sơ mới.
    @Modifying(clearAutomatically = true)
    @Query("UPDATE CandidateProfile p SET p.fullName = :fullName WHERE p.userId = :userId")
    int updateFullName(@Param("userId") Integer userId,
                       @Param("fullName") String fullName);
}
