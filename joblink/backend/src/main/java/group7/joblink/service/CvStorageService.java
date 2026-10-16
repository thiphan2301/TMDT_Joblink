package group7.joblink.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

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
import java.util.UUID;

// xử lý đọc và ghi file PFD trên ổ đĩa
@Service
public class CvStorageService {

    private static final Logger log = LoggerFactory.getLogger(CvStorageService.class);
    private static final long MAX_SIZE = 5L * 1024 * 1024;
    private final Path root;
    public CvStorageService(
            @Value("${app.storage.cv-dir}") String directory) {
        this.root = Path.of(directory).toAbsolutePath().normalize();
    }
    public StoredFile store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw error(HttpStatus.BAD_REQUEST, "Vui lòng chọn file CV.");
        }
        if (file.getSize() > MAX_SIZE) {
            throw error(
                    HttpStatus.BAD_REQUEST,
                    "File CV không được vượt quá 5 MB."
            );
        }

        String originalName = cleanFileName(file.getOriginalFilename());

        if (!originalName.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            throw error(
                    HttpStatus.BAD_REQUEST,
                    "Hiện tại chỉ hỗ trợ CV định dạng PDF."
            );
        }

        byte[] content;

        try {
            content = file.getBytes();
        } catch (IOException exception) {
            throw error(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Không đọc được file CV."
            );
        }

        // Bỏ qua khoảng trắng hoặc xuống dòng trước chữ ký PDF.
        int start = 0;

        while (start < content.length && start < 1024) {
            byte value = content[start];

            if (value == ' ' || value == '\n'
                    || value == '\r' || value == '\t'
                    || value == '\f') {
                start++;
            } else {
                break;
            }
        }

        boolean hasPdfHeader =
                start < 1024
                        && content.length - start >= 5
                        && content[start] == '%'
                        && content[start + 1] == 'P'
                        && content[start + 2] == 'D'
                        && content[start + 3] == 'F'
                        && content[start + 4] == '-';

        if (!hasPdfHeader) {
            throw error(
                    HttpStatus.BAD_REQUEST,
                    "Nội dung file không có định dạng PDF hợp lệ."
            );
        }

        String storageName = UUID.randomUUID() + ".pdf";
        Path destination = root.resolve(storageName);

        try {
            Files.createDirectories(root);

            Files.write(
                    destination,
                    content,
                    StandardOpenOption.CREATE_NEW,
                    StandardOpenOption.WRITE
            );

            return new StoredFile(storageName, originalName);
        } catch (IOException exception) {
            deleteQuietly(storageName);
            log.error("Không lưu được CV vào {}", root, exception);

            throw error(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Không lưu được CV. Vui lòng thử lại."
            );
        }
    }

    public Resource load(String storageName) {
        // Chỉ đọc tên file do chức năng upload này tạo.
        if (storageName == null
                || !storageName.matches("[0-9a-f-]{36}\\.pdf")) {
            throw error(
                    HttpStatus.NOT_FOUND,
                    "File CV không có trên máy chủ."
            );
        }

        Path path = root.resolve(storageName).normalize();

        if (!path.startsWith(root)
                || !Files.isRegularFile(path)
                || !Files.isReadable(path)) {

            throw error(
                    HttpStatus.NOT_FOUND,
                    "File CV không có trên máy chủ."
            );
        }

        return new FileSystemResource(path);
    }

    // Dọn file nếu transaction database bị rollback.
    public void deleteQuietly(String storageName) {
        if (storageName == null
                || !storageName.matches("[0-9a-f-]{36}\\.pdf")) {
            return;
        }

        try {
            Files.deleteIfExists(root.resolve(storageName));
        } catch (IOException exception) {
            log.warn("Không dọn được file CV {}", storageName, exception);
        }
    }

    private String cleanFileName(String value) {
        if (value == null || value.isBlank()) {
            throw error(HttpStatus.BAD_REQUEST, "Tên file không hợp lệ.");
        }

        String name = value.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1);
        name = name.replaceAll("\\p{Cntrl}", "").trim();

        if (name.isBlank() || name.length() > 255) {
            throw error(
                    HttpStatus.BAD_REQUEST,
                    "Tên file phải có từ 1 đến 255 ký tự."
            );
        }

        return name;
    }

    private static ResponseStatusException error(
            HttpStatus status,
            String message) {

        return new ResponseStatusException(status, message);
    }

    public record StoredFile(
            String storageName,
            String originalName
    ) {
    }
}