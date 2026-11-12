package group7.joblink.repository;

import group7.joblink.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

// Repository RIÊNG của khu vực admin cho bảng companies (entity Company gốc
// giữ nguyên, không sửa). Gồm:
//  - findAdminRows(): danh sách công ty cho trang "Quản lý công ty" — kèm
//    email chủ sở hữu (users) để admin biết công ty của ai; cột owner_id /
//    legal_name không có trên entity nên đọc bằng native query, sắp xếp
//    công ty "Chờ xác thực" lên đầu (hàng chờ duyệt của admin).
//  - updateVerificationStatus(): đổi trạng thái xác thực bằng JPQL
//    @Modifying, không cần setter trên entity gốc.
public interface AdminCompanyRepository extends JpaRepository<Company, Integer> {

    // Projection cho findAdminRows (khớp alias trong câu SQL).
    interface CompanyAdminRow {
        Integer getId();

        String getName();

        String getLegalName();

        String getTaxCode();

        String getIndustry();

        String getSize();

        String getVerificationStatus();

        Integer getOwnerId();

        String getOwnerEmail();
    }

    @Query(value = """
            SELECT c.id AS id, c.name AS name, c.legal_name AS legalName,
                   c.tax_code AS taxCode, c.industry AS industry, c.size AS size,
                   c.verification_status AS verificationStatus,
                   c.owner_id AS ownerId, u.email AS ownerEmail
            FROM companies c
            LEFT JOIN users u ON u.id = c.owner_id
            ORDER BY (c.verification_status = 'pending') DESC, c.name ASC
            """, nativeQuery = true)
    List<CompanyAdminRow> findAdminRows();

    @Modifying
    @Query("UPDATE Company c SET c.verificationStatus = :status WHERE c.id = :id")
    int updateVerificationStatus(@Param("id") Integer id,
                                 @Param("status") Company.VerificationStatus status);
}