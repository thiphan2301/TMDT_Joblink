package group7.joblink.repository;

import group7.joblink.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

// Hồ sơ công ty phía nhà tuyển dụng. Entity Company không map các cột
// website / legal_name / owner_id nên đọc-ghi các cột đó bằng SQL thuần.
public interface EmployerCompanyRepository extends JpaRepository<Company, Integer> {

    // Toàn bộ thông tin hồ sơ một công ty.
    // Trả [id, name, legal_name, tax_code, website, industry, size,
    //      address, description, logo, cover, verification_status]
    @Query(value = """
        SELECT id, name, legal_name, tax_code, website, industry, size,
               address, description, logo, cover, verification_status
        FROM companies WHERE id = :companyId
        """, nativeQuery = true)
    List<Object[]> findProfileRow(@Param("companyId") Integer companyId);

    // Chỉ đổi logo (khi tải ảnh lên từ máy tính).
    @Modifying
    @Query(value = """
        UPDATE companies SET logo = :logo
        WHERE id = :companyId AND owner_id = :employerId
        """, nativeQuery = true)
    int updateLogo(@Param("companyId") Integer companyId,
                   @Param("employerId") Integer employerId,
                   @Param("logo") String logo);

    // Chỉ đổi ảnh bìa (khi tải ảnh lên từ máy tính, hoặc xóa bìa =
    // truyền null). Cột cover do migration V12 thêm vào.
    @Modifying
    @Query(value = """
        UPDATE companies SET cover = :cover
        WHERE id = :companyId AND owner_id = :employerId
        """, nativeQuery = true)
    int updateCover(@Param("companyId") Integer companyId,
                    @Param("employerId") Integer employerId,
                    @Param("cover") String cover);

    // Cập nhật hồ sơ — WHERE kèm owner_id để không sửa được công ty người khác.
    @Modifying
    @Query(value = """
        UPDATE companies
        SET name = :name, legal_name = :legalName, tax_code = :taxCode,
            website = :website, industry = :industry, size = :size,
            address = :address, description = :description, logo = :logo,
            cover = :cover
        WHERE id = :companyId AND owner_id = :employerId
        """, nativeQuery = true)
    int updateProfile(@Param("companyId") Integer companyId,
                      @Param("employerId") Integer employerId,
                      @Param("name") String name,
                      @Param("legalName") String legalName,
                      @Param("taxCode") String taxCode,
                      @Param("website") String website,
                      @Param("industry") String industry,
                      @Param("size") String size,
                      @Param("address") String address,
                      @Param("description") String description,
                      @Param("logo") String logo,
                      @Param("cover") String cover);
}