package group7.joblink.service;

import group7.joblink.dto.response.CandidateResponses.TokenPackageCard;
import group7.joblink.dto.response.CandidateResponses.TransactionRow;
import group7.joblink.dto.response.CandidateResponses.WalletResponse;
import group7.joblink.entity.TokenPackage;
import group7.joblink.entity.TokenWallet;
import group7.joblink.entity.User;
import group7.joblink.repository.CandidateWalletRepository;
import group7.joblink.repository.EmployerTokenRepository;
import group7.joblink.repository.TokenPackageRepository;
import group7.joblink.repository.TokenWalletRepository;
import group7.joblink.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

// Ví Token phía ứng viên: số dư, tổng đã nhận/đã chi, lịch sử giao
// dịch và các gói Token đang bán — tất cả đọc từ database. Mua gói
// và thanh toán trực tuyến thuộc chức năng riêng nên service này
// chỉ đọc, không tạo giao dịch.
@Service
public class CandidateWalletService {

    private final UserRepository userRepository;
    private final TokenWalletRepository walletRepository;
    private final CandidateWalletRepository walletStatsRepository;
    private final EmployerTokenRepository tokenRepository;
    private final TokenPackageRepository tokenPackageRepository;

    public CandidateWalletService(UserRepository userRepository,
                                  TokenWalletRepository walletRepository,
                                  CandidateWalletRepository walletStatsRepository,
                                  EmployerTokenRepository tokenRepository,
                                  TokenPackageRepository tokenPackageRepository) {
        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
        this.walletStatsRepository = walletStatsRepository;
        this.tokenRepository = tokenRepository;
        this.tokenPackageRepository = tokenPackageRepository;
    }

    @Transactional(readOnly = true)
    public WalletResponse getWallet(int userId) {
        requireCandidate(userId);

        int balance = walletRepository.findById(userId)
                .map(TokenWallet::getBalance).orElse(0);

        long totalReceived = 0;
        long totalSpent = 0;
        var totals = walletStatsRepository.findTotals(userId);
        if (!totals.isEmpty()) {
            totalReceived = toLong(totals.get(0)[0]);
            totalSpent = toLong(totals.get(0)[1]);
        }

        List<TransactionRow> transactions = tokenRepository
                .findRecentTransactions(userId, 100).stream()
                .map(r -> new TransactionRow(
                        toInt(r[0]), str(r[1]), toInt(r[2]), toInt(r[3]),
                        str(r[4]), toInt(r[5]), toDateTime(r[6])))
                .toList();

        List<TokenPackageCard> packages = tokenPackageRepository.findAll().stream()
                .filter(TokenPackage::isActive)
                .sorted(Comparator.comparingInt(TokenPackage::getTokens))
                .map(t -> new TokenPackageCard(t.getId(),
                        "Gói " + t.getTokens() + " Token",
                        t.getTokens(), t.getPrice()))
                .toList();

        return new WalletResponse(balance, totalReceived, totalSpent,
                transactions, packages);
    }

    private void requireCandidate(int userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Bạn cần đăng nhập."));
        if (user.getRole() != User.Role.candidate) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Khu vực ví này dành cho ứng viên.");
        }
    }

    private static Integer toInt(Object value) {
        return value == null ? null : ((Number) value).intValue();
    }

    private static long toLong(Object value) {
        return value == null ? 0L : ((Number) value).longValue();
    }

    private static String str(Object value) {
        return value == null ? null : value.toString();
    }

    private static LocalDateTime toDateTime(Object value) {
        if (value == null) return null;
        if (value instanceof LocalDateTime ldt) return ldt;
        if (value instanceof Timestamp ts) return ts.toLocalDateTime();
        return LocalDateTime.parse(value.toString().replace(' ', 'T'));
    }
}
