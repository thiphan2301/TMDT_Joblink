package group7.joblink.repository;

import group7.joblink.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

// Repository cho Company — trước đây project chưa có, bổ sung khi làm
// khu vực admin (dropdown chọn công ty khi đăng tin, tên hiển thị của
// nhà tuyển dụng...). Cột owner_id trong bảng companies chưa được map
// trong entity Company nên các truy vấn theo chủ sở hữu dùng SQL thuần.
public interface CompanyRepository extends JpaRepository<Company, Integer> {

    // Dropdown chọn công ty ở trang đăng tin: sắp xếp theo tên.
    List<Company> findAllByOrderByNameAsc();

    // Công ty đầu tiên của một chủ sở hữu (tên hiển thị của nhà tuyển dụng).
    @Query(value = """
        SELECT * FROM companies
        WHERE owner_id = :ownerId
        ORDER BY id
        LIMIT 1
        """, nativeQuery = true)
    Optional<Company> findFirstByOwnerId(@Param("ownerId") Integer ownerId);

    // Tên công ty của một tập chủ sở hữu (ghép tên hiển thị hàng loạt ở
    // trang quản lý người dùng). Trả [owner_id, name] xếp theo id công ty
    // tăng dần — service lấy tên đầu tiên của mỗi chủ sở hữu.
    @Query(value = """
        SELECT owner_id, name FROM companies
        WHERE owner_id IN :ownerIds
        ORDER BY id
        """, nativeQuery = true)
    List<Object[]> findNamesByOwnerIds(@Param("ownerIds") Collection<Integer> ownerIds);

    // Chủ sở hữu của một công ty (để biết tin đăng thuộc nhà tuyển dụng
    // nào, nhà đó đang dùng gói Basic hay Pro...).
    @Query(value = "SELECT owner_id FROM companies WHERE id = :companyId",
            nativeQuery = true)
    Optional<Integer> findOwnerIdByCompanyId(@Param("companyId") Integer companyId);

    // Ánh xạ công ty -> chủ sở hữu cho cả danh sách tin (trả [id, owner_id]).
    @Query(value = "SELECT id, owner_id FROM companies", nativeQuery = true)
    List<Object[]> findCompanyOwners();

    // Admin sửa tên hiển thị của nhà tuyển dụng = sửa tên công ty họ sở hữu.
    @Modifying
    @Query(value = "UPDATE companies SET name = :name WHERE owner_id = :ownerId",
            nativeQuery = true)
    int updateNameByOwnerId(@Param("ownerId") Integer ownerId,
                            @Param("name") String name);

    // Admin sửa ngành nghề của công ty ngay trong màn hình sửa tin đăng.
    @Modifying
    @Query("UPDATE Company c SET c.industry = :industry WHERE c.id = :companyId")
    int updateIndustryById(@Param("companyId") Integer companyId,
                           @Param("industry") String industry);
}
