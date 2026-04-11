package com.banvexe.accountmanagement.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
    @NotBlank @Size(max = 100) String fullName,
    @Size(max = 15) @Pattern(regexp = "^$|^0[0-9]{9,10}$", message = "Số điện thoại không hợp lệ") String phone
) {
}
