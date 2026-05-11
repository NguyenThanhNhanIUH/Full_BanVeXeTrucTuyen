package com.banvexe.accountmanagement.util;

/**
 * Chuẩn hóa số di động VN thành dạng lưu DB: 0 + 9–10 chữ số.
 */
public final class PhoneNumberUtil {

    private PhoneNumberUtil() {
    }

    /**
     * @return null nếu để trống; chuỗi dạng 0xxxx... nếu hợp lệ
     * @throws IllegalArgumentException nếu có nội dung nhưng không chuẩn hóa được
     */
    public static String toStoredVnMobileOrNull(String input) {
        if (input == null) {
            return null;
        }
        String t = input.trim();
        if (t.isEmpty()) {
            return null;
        }
        t = t.replaceAll("[\\s.]+", "");
        t = t.replace("−", "-").replace("–", "-");
        t = t.replaceAll("-", "");
        if (t.startsWith("(+84)")) {
            t = "+84" + t.substring(5);
        } else if (t.startsWith("(84)")) {
            t = "84" + t.substring(4);
        }
        if (t.startsWith("+84")) {
            t = "0" + t.substring(3);
        } else if (t.startsWith("84") && t.length() >= 10) {
            t = "0" + t.substring(2);
        }
        t = t.replaceAll("\\D", "");
        if (t.isEmpty()) {
            if (!input.trim().isEmpty()) {
                throw new IllegalArgumentException(
                    "Số điện thoại không hợp lệ. Nhập chữ số (10 số bắt đầu bằng 0) hoặc dạng +84.");
            }
            return null;
        }
        if (t.charAt(0) != '0' && t.length() >= 9 && t.length() <= 10) {
            t = "0" + t;
        }
        if (!t.matches("^0[0-9]{9,10}$")) {
            throw new IllegalArgumentException("Số điện thoại không hợp lệ. Nhập 10 số bắt đầu bằng 0 (ví dụ: 0912345678) hoặc dạng +84.");
        }
        return t;
    }
}
