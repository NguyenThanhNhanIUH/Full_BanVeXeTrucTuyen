package com.banvexe.accountmanagement.service.booking;

import java.text.Normalizer;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class LocationCoordinateResolver {

    public record GeoPoint(double lat, double lng) {
    }

    private static final GeoPoint VIETNAM_CENTER = new GeoPoint(16.0471, 108.2068);

    private final Map<String, GeoPoint> cityPoints = buildCityPoints();

    public GeoPoint resolve(String placeName) {
        String key = normalizePlaceKey(placeName);
        if (key.isBlank()) {
            return VIETNAM_CENTER;
        }
        GeoPoint exact = cityPoints.get(key);
        if (exact != null) {
            return exact;
        }
        for (Map.Entry<String, GeoPoint> entry : cityPoints.entrySet()) {
            if (key.contains(entry.getKey()) || entry.getKey().contains(key)) {
                return entry.getValue();
            }
        }
        return VIETNAM_CENTER;
    }

    private static String normalizePlaceKey(String value) {
        if (value == null) {
            return "";
        }
        String trimmed = value.trim();
        int paren = trimmed.indexOf('(');
        if (paren > 0) {
            trimmed = trimmed.substring(0, paren).trim();
        }
        String normalized = Normalizer.normalize(trimmed, Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "")
            .toLowerCase(Locale.ROOT)
            .replace("thanh pho", "tp.")
            .replaceAll("\\s+", " ")
            .trim();
        return normalized;
    }

    private static Map<String, GeoPoint> buildCityPoints() {
        Map<String, GeoPoint> map = new LinkedHashMap<>();
        put(map, "tp. ho chi minh", 10.7769, 106.7009);
        put(map, "ha noi", 21.0285, 105.8542);
        put(map, "da nang", 16.0544, 108.2022);
        put(map, "da lat", 11.9404, 108.4583);
        put(map, "nha trang", 12.2388, 109.1967);
        put(map, "cam ranh", 11.9214, 109.1591);
        put(map, "can tho", 10.0452, 105.7469);
        put(map, "ca mau", 9.1769, 105.1524);
        put(map, "dong thap", 10.4930, 105.6882);
        put(map, "an giang", 10.5216, 105.1259);
        put(map, "ben tre", 10.2434, 106.3759);
        put(map, "soc trang", 9.6036, 105.9800);
        put(map, "long an", 10.6957, 106.2431);
        put(map, "tien giang", 10.3600, 106.3600);
        put(map, "vung tau", 10.3460, 107.0843);
        put(map, "thua thien hue", 16.4637, 107.5909);
        put(map, "hue", 16.4637, 107.5909);
        put(map, "hoi an", 15.8801, 108.3380);
        put(map, "quang nam", 15.5394, 108.0191);
        put(map, "tam ky", 15.5736, 108.4740);
        put(map, "quang ngai", 15.1214, 108.8044);
        put(map, "sa huynh", 14.7000, 109.1000);
        put(map, "quy nhon", 13.7820, 109.2196);
        put(map, "tuy hoa", 13.0880, 109.0929);
        put(map, "phan thiet", 10.9333, 108.1000);
        put(map, "phan rang", 11.5643, 108.9886);
        return Map.copyOf(map);
    }

    private static void put(Map<String, GeoPoint> map, String key, double lat, double lng) {
        map.put(key, new GeoPoint(lat, lng));
    }
}
