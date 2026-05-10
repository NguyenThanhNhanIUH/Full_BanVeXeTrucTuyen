package com.banvexe.accountmanagement.service;

import com.banvexe.accountmanagement.dto.AuthResponse;
import com.banvexe.accountmanagement.dto.EmailRequest;
import com.banvexe.accountmanagement.dto.LoginRequest;
import com.banvexe.accountmanagement.dto.MessageResponse;
import com.banvexe.accountmanagement.dto.RegisterRequest;
import com.banvexe.accountmanagement.dto.UserProfileResponse;
import com.banvexe.accountmanagement.dto.VerifyEmailRequest;
import com.banvexe.accountmanagement.entity.AccountStatus;
import com.banvexe.accountmanagement.entity.KhachHang;
import com.banvexe.accountmanagement.entity.UserAccount;
import com.banvexe.accountmanagement.entity.UserAccount.UserRole;
import com.banvexe.accountmanagement.repository.KhachHangRepository;
import com.banvexe.accountmanagement.repository.UserAccountRepository;
import com.banvexe.accountmanagement.util.AccountView;
import com.banvexe.accountmanagement.util.PhoneNumberUtil;
import com.banvexe.accountmanagement.security.JwtService;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Set;
import jakarta.mail.internet.InternetAddress;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserAccountRepository userAccountRepository;
    private final KhachHangRepository khachHangRepository;
    private final PasswordService passwordService;
    private final JwtService jwtService;
    private final JavaMailSender mailSender;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, OtpData> otpStore = new ConcurrentHashMap<>();
    private final Map<String, OtpData> passwordResetOtpStore = new ConcurrentHashMap<>();
    private final Set<String> verifiedResetEmails = ConcurrentHashMap.newKeySet();

    @Value("${app.mail.from:${spring.mail.username:no-reply@banvexe.local}}")
    private String fromEmail;

    @Value("${app.otp.expiration-minutes:5}")
    private long otpExpirationMinutes;

    @Value("${app.otp.dev-mode:false}")
    private boolean otpDevMode;

    @Value("${app.mail.mailjet.api-key:}")
    private String mailjetApiKey;

    @Value("${app.mail.mailjet.secret-key:}")
    private String mailjetSecretKey;

    @Value("${app.mail.from-name:BanVeXe}")
    private String fromName;

    @Value("${app.mail.reply-to:}")
    private String replyTo;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    public AuthService(
        UserAccountRepository userAccountRepository,
        KhachHangRepository khachHangRepository,
        PasswordService passwordService,
        JwtService jwtService,
        JavaMailSender mailSender) {
        this.userAccountRepository = userAccountRepository;
        this.khachHangRepository = khachHangRepository;
        this.passwordService = passwordService;
        this.jwtService = jwtService;
        this.mailSender = mailSender;
    }

    @Transactional
    public MessageResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());

        if (userAccountRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email này đã được dùng cho một tài khoản. Vui lòng dùng email khác.");
        }

        String phone;
        try {
            phone = PhoneNumberUtil.toStoredVnMobileOrNull(request.phone());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }

        return khachHangRepository.findByEmail(email)
            .map(kh -> registerLinkExistingKhach(email, request, phone, kh))
            .orElseGet(() -> registerNewKhachAndAccount(email, request, phone));
    }

    private MessageResponse registerNewKhachAndAccount(String email, RegisterRequest request, String phone) {
        if (phone != null && khachHangRepository.existsByPhone(phone)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại này đã được dùng. Vui lòng dùng số khác.");
        }
        KhachHang kh = new KhachHang();
        kh.setEmail(email);
        kh.setPhone(phone);
        kh.setFullName(request.fullName().trim());
        kh.setStatus(AccountStatus.INACTIVE);
        try {
            kh = khachHangRepository.save(kh);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Email hoặc số điện thoại trùng với dữ liệu đã có."
            );
        }
        return saveUserAndSendOtp(email, request.password().trim(), kh);
    }

    private MessageResponse registerLinkExistingKhach(
        String email, RegisterRequest request, String phone, KhachHang kh) {
        if (userAccountRepository.findByKhachHang_Id(kh.getId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email này đã được dùng cho một tài khoản. Vui lòng dùng email khác.");
        }
        if (kh.getPhone() != null && !kh.getPhone().isBlank()) {
            if (phone == null || !phone.equals(kh.getPhone())) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Số điện thoại không trùng với hồ sơ đã tạo khi mua vé (vãng lai). Vui lòng dùng cùng số hoặc liên hệ hỗ trợ."
                );
            }
        } else if (phone != null) {
            if (khachHangRepository.existsByPhone(phone)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại này đã được dùng.");
            }
            kh.setPhone(phone);
        }
        if (request.fullName() != null && !request.fullName().isBlank() && (kh.getFullName() == null || kh.getFullName().isBlank())) {
            kh.setFullName(request.fullName().trim());
        }
        khachHangRepository.save(kh);
        return saveUserAndSendOtp(email, request.password().trim(), kh);
    }

    private MessageResponse saveUserAndSendOtp(String email, String password, KhachHang kh) {
        UserAccount user = new UserAccount();
        user.setKhachHang(kh);
        user.setEmail(email);
        user.setPasswordHash(passwordService.encode(password));
        user.setRole(UserRole.KHACH_HANG);
        user.setStatus(AccountStatus.INACTIVE);
        try {
            userAccountRepository.save(user);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Email hoặc số điện thoại trùng với tài khoản đã có trong hệ thống."
            );
        }
        String otpCode = sendOtp(otpStore, email, "Xác thực email đăng ký tài khoản", OtpMailPurpose.REGISTER);
        return new MessageResponse(buildOtpMessage("Đăng ký thành công. Vui lòng kiểm tra email để lấy OTP xác thực.", otpCode));
    }

    public MessageResponse resendOtp(EmailRequest request) {
        String email = normalizeEmail(request.email());
        UserAccount user = userAccountRepository.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));

        if (user.getStatus() == AccountStatus.ACTIVE) {
            return new MessageResponse("Tài khoản đã xác thực trước đó.");
        }

        String otpCode = sendOtp(otpStore, email, "Gửi lại OTP xác thực tài khoản", OtpMailPurpose.REGISTER);
        return new MessageResponse(buildOtpMessage("Đã gửi lại OTP qua email.", otpCode));
    }

    @Transactional
    public MessageResponse verifyEmail(VerifyEmailRequest request) {
        String email = normalizeEmail(request.email());
        OtpData otpData = otpStore.get(email);

        if (otpData == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP không tồn tại hoặc đã hết hạn");
        }

        if (LocalDateTime.now().isAfter(otpData.expiresAt())) {
            otpStore.remove(email);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP đã hết hạn");
        }

        if (!otpData.code().equals(request.otp())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP không đúng");
        }

        UserAccount user = userAccountRepository.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));

        user.setStatus(AccountStatus.ACTIVE);
        if (user.getKhachHang() != null) {
            user.getKhachHang().setStatus(AccountStatus.ACTIVE);
            khachHangRepository.save(user.getKhachHang());
        }
        userAccountRepository.save(user);
        otpStore.remove(email);

        return new MessageResponse("Xác thực email thành công.");
    }

    public MessageResponse requestPasswordResetOtp(EmailRequest request) {
        String email = normalizeEmail(request.email());
        final String[] otpCode = new String[1];
        userAccountRepository.findByEmail(email).ifPresent(user ->
            otpCode[0] = sendOtp(passwordResetOtpStore, email, "Mã OTP đặt lại mật khẩu", OtpMailPurpose.PASSWORD_RESET)
        );
        verifiedResetEmails.remove(email);
        return new MessageResponse(buildOtpMessage("Đã gửi mã xác thực qua email.", otpCode[0]));
    }

    public MessageResponse verifyPasswordResetOtp(VerifyEmailRequest request) {
        String email = normalizeEmail(request.email());
        OtpData otpData = passwordResetOtpStore.get(email);
        if (otpData == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP không tồn tại hoặc đã hết hạn");
        }
        if (LocalDateTime.now().isAfter(otpData.expiresAt())) {
            passwordResetOtpStore.remove(email);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP đã hết hạn");
        }
        if (!otpData.code().equals(request.otp())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP không đúng");
        }

        verifiedResetEmails.add(email);
        passwordResetOtpStore.remove(email);
        return new MessageResponse("Xác thực OTP thành công.");
    }

    @Transactional
    public MessageResponse resetPassword(com.banvexe.accountmanagement.dto.ResetPasswordRequest request) {
        String email = normalizeEmail(request.email());
        if (!verifiedResetEmails.contains(email)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng xác thực OTP trước khi đặt lại mật khẩu");
        }
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu xác nhận không khớp");
        }

        UserAccount user = userAccountRepository.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));
        if (passwordService.matches(request.newPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu mới phải khác mật khẩu hiện tại");
        }
        user.setPasswordHash(passwordService.encode(request.newPassword()));
        userAccountRepository.save(user);
        verifiedResetEmails.remove(email);
        return new MessageResponse("Đặt lại mật khẩu thành công.");
    }

    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());

        UserAccount user = userAccountRepository.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không đúng"));

        if (!passwordService.matches(request.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không đúng");
        }

        if (user.getStatus() != AccountStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản chưa xác thực email hoặc đang bị khóa");
        }
        if (user.getRole() == UserRole.KHACH_HANG && user.getKhachHang() != null
            && user.getKhachHang().getStatus() != AccountStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Hồ sơ khách hàng chưa kích hoạt hoặc đang bị khóa");
        }

        String token = jwtService.generateToken(user);
        return new AuthResponse(
            token,
            "Bearer",
            user.getEmail(),
            user.getRole().name(),
            AccountView.fullName(user),
            AccountView.phone(user)
        );
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public UserProfileResponse me(String email) {
        UserAccount user = userAccountRepository.findByEmail(normalizeEmail(email))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));

        String avatar = user.getAvatarUrl();
        return new UserProfileResponse(
            AccountView.publicId(user),
            user.getEmail(),
            AccountView.fullName(user),
            AccountView.phone(user),
            user.getRole().name(),
            user.getStatus().name(),
            avatar
        );
    }

    private String sendOtp(Map<String, OtpData> store, String email, String subject, OtpMailPurpose purpose) {
        String otpCode = String.format("%06d", secureRandom.nextInt(1_000_000));
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(otpExpirationMinutes);
        store.put(email, new OtpData(otpCode, expiresAt));

        if (otpDevMode) {
            System.out.println("OTP DEV MODE - " + email + ": " + otpCode);
            return otpCode;
        }

        String fullSubject = brandedSubject(subject);
        String plain = buildOtpPlainBody(otpCode, purpose);
        String html = buildOtpHtmlBody(otpCode, purpose);

        try {
            if (isMailjetApiConfigured()) {
                sendOtpViaMailjetApi(email, fullSubject, plain, html);
                System.out.println("Đã gửi email OTP qua Mailjet API đến: " + email);
                return null;
            }

            var mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, StandardCharsets.UTF_8.name());
            helper.setFrom(new InternetAddress(fromEmail, displayFromName(), StandardCharsets.UTF_8.name()));
            helper.setTo(email);
            helper.setSubject(fullSubject);
            if (replyTo != null && !replyTo.isBlank()) {
                helper.setReplyTo(replyTo.trim());
            }
            helper.setText(plain, html);
            mailSender.send(mime);
            System.out.println("Đã gửi email OTP thực tế đến: " + email);
            return null;
        } catch (Exception e) {
            System.err.println("Gửi email thất bại: " + e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi hệ thống: Không thể gửi email chứa mã OTP. Vui lòng thử lại sau.");
        }
    }

    private String buildOtpMessage(String baseMessage, String otpCode) {
        if (!otpDevMode || otpCode == null || otpCode.isBlank()) {
            return baseMessage;
        }
        return baseMessage + " [DEV OTP: " + otpCode + "]";
    }

    private boolean isMailjetApiConfigured() {
        return mailjetApiKey != null && !mailjetApiKey.isBlank() && mailjetSecretKey != null && !mailjetSecretKey.isBlank();
    }

    private void sendOtpViaMailjetApi(String email, String subject, String textPart, String htmlPart)
        throws IOException, InterruptedException {
        String replyBlock = "";
        if (replyTo != null && !replyTo.isBlank()) {
            replyBlock = ",\"ReplyTo\":{\"Email\":\"" + jsonEscape(replyTo.trim()) + "\"}";
        }

        String jsonBody = "{"
            + "\"Messages\":[{"
            + "\"From\":{\"Email\":\"" + jsonEscape(fromEmail) + "\",\"Name\":\"" + jsonEscape(displayFromName()) + "\"},"
            + "\"To\":[{\"Email\":\"" + jsonEscape(email) + "\"}],"
            + "\"Subject\":\"" + jsonEscape(subject) + "\","
            + "\"TextPart\":\"" + jsonEscape(textPart) + "\","
            + "\"HTMLPart\":\"" + jsonEscape(htmlPart) + "\""
            + replyBlock
            + "}]"
            + "}";

        String authToken = java.util.Base64.getEncoder()
            .encodeToString((mailjetApiKey + ":" + mailjetSecretKey).getBytes(java.nio.charset.StandardCharsets.UTF_8));

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://api.mailjet.com/v3.1/send"))
            .header("Content-Type", "application/json")
            .header("Authorization", "Basic " + authToken)
            .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        int status = response.statusCode();
        if (status < 200 || status >= 300) {
            throw new IOException("Mailjet API error " + status + ": " + response.body());
        }
    }

    private static String jsonEscape(String value) {
        if (value == null) return "";
        return value
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r");
    }

    private String displayFromName() {
        return fromName == null || fromName.isBlank() ? "BanVeXe" : fromName.trim();
    }

    private String brandedSubject(String subject) {
        String name = displayFromName();
        return "[" + name + "] " + subject;
    }

    private String buildOtpPlainBody(String otpCode, OtpMailPurpose purpose) {
        String brand = displayFromName();
        return "Xin chào,\n\n"
            + "Bạn đang thực hiện: " + purpose.actionLine + ".\n"
            + "Mã OTP của bạn là: " + otpCode + "\n\n"
            + "Mã có hiệu lực trong " + otpExpirationMinutes
            + " phút. Không chia sẻ mã cho bất kỳ ai.\n\n"
            + "---\n"
            + "Email tự động từ " + brand + ". Nếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email.\n";
    }

    private String buildOtpHtmlBody(String otpCode, OtpMailPurpose purpose) {
        String brand = htmlEscape(displayFromName());
        String action = htmlEscape(purpose.actionLine);
        String code = htmlEscape(otpCode);
        return "<!DOCTYPE html><html lang=\"vi\"><head><meta charset=\"UTF-8\"/></head>"
            + "<body style=\"font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#333;\">"
            + "<p>Xin chào,</p>"
            + "<p>Bạn đang thực hiện: <strong>" + action + "</strong>.</p>"
            + "<p>Mã OTP của bạn là: <strong style=\"font-size:1.25rem;letter-spacing:0.12em;\">" + code + "</strong></p>"
            + "<p>Mã có hiệu lực trong <strong>" + otpExpirationMinutes + "</strong> phút. "
            + "Không chia sẻ mã cho bất kỳ ai.</p>"
            + "<hr style=\"border:none;border-top:1px solid #e5e5e5;margin:1.25rem 0\"/>"
            + "<p style=\"font-size:12px;color:#666\">Email tự động từ " + brand
            + ". Nếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email.</p>"
            + "</body></html>";
    }

    private static String htmlEscape(String s) {
        if (s == null) {
            return "";
        }
        return s.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;");
    }

    private enum OtpMailPurpose {
        REGISTER("xác thực đăng ký tài khoản"),
        PASSWORD_RESET("đặt lại mật khẩu");

        private final String actionLine;

        OtpMailPurpose(String actionLine) {
            this.actionLine = actionLine;
        }
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private record OtpData(String code, LocalDateTime expiresAt) {
    }
}
