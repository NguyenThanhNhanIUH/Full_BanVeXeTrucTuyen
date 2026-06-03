package com.banvexe.accountmanagement.dto.booking;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record GuestBookTicketRequest(
    @NotNull Integer chuyenXeId,
    @NotEmpty @Size(max = 20) List<@Size(min = 1, max = 10) String> maGhe,
    @Size(max = 500) String ghiChu,
    @NotBlank @Email @Size(max = 100) String email,
    @NotBlank @Size(max = 20) String soDienThoai,
    @NotBlank @Size(max = 100) String hoTen,
    @Size(max = 64) String holdToken
) {
}