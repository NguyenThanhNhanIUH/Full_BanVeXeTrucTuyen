package com.banvexe.accountmanagement.service;

import com.banvexe.accountmanagement.dto.AuthResponse;
import com.banvexe.accountmanagement.dto.EmailRequest;
import com.banvexe.accountmanagement.dto.LoginRequest;
import com.banvexe.accountmanagement.dto.MessageResponse;
import com.banvexe.accountmanagement.dto.RegisterRequest;
import com.banvexe.accountmanagement.dto.UserProfileResponse;
import com.banvexe.accountmanagement.dto.VerifyEmailRequest;
import com.banvexe.accountmanagement.entity.AccountStatus;
import com.banvexe.accountmanagement.entity.UserAccount;
import com.banvexe.accountmanagement.repository.UserAccountRepository;
import com.banvexe.accountmanagement.util.PhoneNumberUtil;
import com.banvexe.accountmanagement.security.JwtService;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserAccountRepository userAccountRepository;
    private final PasswordService passwordService;
    private final JwtService jwtService;
    private final JavaMailSender mailSender;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, OtpData> otpStore = new ConcurrentHashMap<>();
    private final Map<String, OtpData> passwordResetOtpStore = new ConcurrentHashMap<>();
    private final Set<String> verifiedResetEmails = ConcurrentHashMap.newKeySet();

    @Value("${spring.mail.username:no-reply@banvexe.local}")
    private String fromEmail;

    @Value("${app.otp.expiration-minutes:5}")
    private long otpExpirationMinutes;

    public AuthService(UserAccountRepository userAccountRepository,
                       PasswordService passwordService,
                       JwtService jwtService,
                       JavaMailSender mailSender) {
        this.userAccountRepository = userAccountRepository;
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
        if (phone != null && userAccountRepository.existsByPhone(phone)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại này đã được dùng cho một tài khoản. Vui lòng dùng số khác.");
        }

        UserAccount user = new UserAccount();
        user.setEmail(email);
        user.setPasswordHash(passwordService.encode(request.password()));
        user.setFullName(request.fullName().trim());
        user.setPhone(phone);
        user.setRole(UserAccount.UserRole.KHACH_HANG);
        user.setStatus(AccountStatus.INACTIVE);

        try {
            userAccountRepository.save(user);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Email hoặc số điện thoại trùng với tài khoản đã có trong hệ thống."
            );
        }
        sendOtp(otpStore, email, "Xác thực email đăng ký tài khoản");

        return new MessageResponse("Đăng ký thành công. Vui lòng kiểm tra email để lấy OTP xác thực.");
    }

    public MessageResponse resendOtp(EmailRequest request) {
        String email = normalizeEmail(request.email());
        UserAccount user = userAccountRepository.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));

        if (user.getStatus() == AccountStatus.ACTIVE) {
            return new MessageResponse("Tài khoản đã xác thực trước đó.");
        }

        sendOtp(otpStore, email, "Gửi lại OTP xác thực tài khoản");
        return new MessageResponse("Đã gửi lại OTP qua email.");
    }

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
        userAccountRepository.save(user);
        otpStore.remove(email);

        return new MessageResponse("Xác thực email thành công.");
    }

    public MessageResponse requestPasswordResetOtp(EmailRequest request) {
        String email = normalizeEmail(request.email());
        UserAccount user = userAccountRepository.findByEmail(email).orElse(null);
        if (user != null) {
            sendOtp(passwordResetOtpStore, email, "Mã OTP đặt lại mật khẩu");
        }
        verifiedResetEmails.remove(email);
        return new MessageResponse("Đã gửi mã xác thực qua email.");
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

        String token = jwtService.generateToken(user);
        return new AuthResponse(token, "Bearer", user.getEmail(), user.getRole().name());
    }

    public UserProfileResponse me(String email) {
        UserAccount user = userAccountRepository.findByEmail(normalizeEmail(email))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));

        return new UserProfileResponse(
            user.getId(),
            user.getEmail(),
            user.getFullName(),
            user.getPhone(),
            user.getRole().name(),
            user.getStatus().name()
        );
    }

    private void sendOtp(Map<String, OtpData> store, String email, String subject) {
        String otpCode = String.format("%06d", secureRandom.nextInt(1_000_000));
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(otpExpirationMinutes);
        store.put(email, new OtpData(otpCode, expiresAt));

        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setFrom(fromEmail);
            mail.setTo(email);
            mail.setSubject(subject);
            mail.setText("Xin chào,\n\nMã OTP xác thực tài khoản của bạn là: " + otpCode + "\n\nMã này sẽ hết hạn sau " + otpExpirationMinutes + " phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.");
            mailSender.send(mail);
            System.out.println("Đã gửi email OTP thực tế đến: " + email);
        } catch (Exception e) {
            System.err.println("Gửi email thất bại: " + e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi hệ thống: Không thể gửi email chứa mã OTP. Vui lòng thử lại sau.");
        }
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private record OtpData(String code, LocalDateTime expiresAt) {
    }
}
