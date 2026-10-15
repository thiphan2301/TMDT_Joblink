package group7.joblink.repository;

import group7.joblink.entity.Skill;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SkillRepository extends JpaRepository<Skill, Integer> {

    // Collation của database không phân biệt hoa thường/dấu:
    // "react" khớp "React" (cột name là UNIQUE nên tối đa 1 kết quả).
    Optional<Skill> findByName(String name);
}
