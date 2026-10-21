package group7.joblink.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

// Lưu ảnh tải lên từ máy tính (logo công ty) — làm theo đúng khuôn
// của CvStorageService của project: file nằm trên ổ đĩa ở thư mục
// ${user.home}/joblink-data/images (đổi được qua cấu hình
// app.storage.image-dir), tên file là UUID, database chỉ giữ đường
// dẫn API /api/employer/company-images/<tên file> để tải ảnh về.
@Service
public class EmployerImageStorageService {

    private static final long MAX_SIZE = 5L * 1024 * 1024;
    private static final Set<String> EXTENSIONS = Set.of("png", "jpg", "jpeg", "gif", "webp");
    private static final Map<String, String> CONTENT_TYPES = Map.of(
            "png", "image/png",
            "jpg", "image/jpeg",
            "jpeg", "image/jpeg",
            "gif", "image/gif",
            "webp", "image/webp");

    private final Path root;

    public EmployerImageStorageService(
            @Value("${app.storage.image-dir:${user.home}/joblink-data/images}")
            String directory) {
        this.root = Path.of(directory).toAbsolutePath().normalize();
    }

    // Kiểm tra + lưu ảnh, trả về tên file trên đĩa (UUID + đuôi).
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw error(HttpStatus.BAD_REQUEST, "Vui lòng chọn file ảnh.");
        }
        if (file.getSize() > MAX_SIZE) {
            throw error(HttpStatus.BAD_REQUEST, "Ảnh không được vượt quá 5 MB.");
        }
        String original = file.getOriginalFilename() == null
                ? "" : file.getOriginalFilename();
        int dot = original.lastIndexOf('.');
        String ext = dot < 0 ? "" : original.substring(dot + 1).toLowerCase(Locale.ROOT);
        if (!EXTENSIONS.contains(ext)) {
            throw error(HttpStatus.BAD_REQUEST,
                    "Chỉ hỗ trợ ảnh PNG, JPG, GIF hoặc WEBP.");
        }

        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException e) {
            throw error(HttpStatus.INTERNAL_SERVER_ERROR, "Không đọc được file ảnh.");
        }
        if (!matchesMagicBytes(content, ext)) {
            throw error(HttpStatus.BAD_REQUEST,
                    "Nội dung file không đúng định dạng ảnh đã chọn.");
        }

        String storageName = UUID.randomUUID() + "." + ext;
        try {
            Files.createDirectories(root);
            Files.write(root.resolve(storageName), content,
                    StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
            return storageName;
        } catch (IOException e) {
            throw error(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Không lưu được ảnh. Vui lòng thử lại.");
        }
    }

    // Đọc ảnh đã lưu (chỉ chấp nhận tên file do store() tạo ra).
    public Resource load(String storageName) {
        if (storageName == null
                || !storageName.matches("[0-9a-f-]{36}\\.(png|jpg|jpeg|gif|webp)")) {
            throw error(HttpStatus.NOT_FOUND, "Ảnh không có trên máy chủ.");
        }
        Path path = root.resolve(storageName).normalize();
        if (!Files.isRegularFile(path)) {
            throw error(HttpStatus.NOT_FOUND, "Ảnh không có trên máy chủ.");
        }
        return new FileSystemResource(path);
    }

    public String contentTypeOf(String storageName) {
        String ext = storageName.substring(storageName.lastIndexOf('.') + 1)
                .toLowerCase(Locale.ROOT);
        return CONTENT_TYPES.getOrDefault(ext, "application/octet-stream");
    }

    // Đối chiếu chữ ký đầu file theo từng định dạng (như cách
    // CvStorageService kiểm tra đầu "%PDF-").
    private boolean matchesMagicBytes(byte[] c, String ext) {
        return switch (ext) {
            case "png" -> c.length >= 4
                    && (c[0] & 0xFF) == 0x89 && c[1] == 'P' && c[2] == 'N' && c[3] == 'G';
            case "jpg", "jpeg" -> c.length >= 3
                    && (c[0] & 0xFF) == 0xFF && (c[1] & 0xFF) == 0xD8 && (c[2] & 0xFF) == 0xFF;
            case "gif" -> c.length >= 4
                    && c[0] == 'G' && c[1] == 'I' && c[2] == 'F' && c[3] == '8';
            case "webp" -> c.length >= 12
                    && c[0] == 'R' && c[1] == 'I' && c[2] == 'F' && c[3] == 'F'
                    && c[8] == 'W' && c[9] == 'E' && c[10] == 'B' && c[11] == 'P';
            default -> false;
        };
    }

    private ResponseStatusException error(HttpStatus status, String message) {
        return new ResponseStatusException(status, message);
    }
}
