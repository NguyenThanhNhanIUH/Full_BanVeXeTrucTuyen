package com.banvexe.accountmanagement.service.booking;

import com.banvexe.accountmanagement.dto.booking.CreateTripRequest;
import com.banvexe.accountmanagement.dto.booking.TripDetailDto;
import com.banvexe.accountmanagement.dto.booking.UpdateTripRequest;
import com.banvexe.accountmanagement.entity.ChuyenXe;
import com.banvexe.accountmanagement.entity.RouteStatus;
import com.banvexe.accountmanagement.entity.TripRunStatus;
import com.banvexe.accountmanagement.entity.TuyenXe;
import com.banvexe.accountmanagement.entity.Xe;
import com.banvexe.accountmanagement.repository.ChuyenXeRepository;
import com.banvexe.accountmanagement.repository.TuyenXeRepository;
import com.banvexe.accountmanagement.repository.XeRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ManagerTripService {

    private final ChuyenXeRepository chuyenXeRepository;
    private final TuyenXeRepository tuyenXeRepository;
    private final XeRepository xeRepository;
    private final BookingCatalogService bookingCatalogService;

    public ManagerTripService(
        ChuyenXeRepository chuyenXeRepository,
        TuyenXeRepository tuyenXeRepository,
        XeRepository xeRepository,
        BookingCatalogService bookingCatalogService
    ) {
        this.chuyenXeRepository = chuyenXeRepository;
        this.tuyenXeRepository = tuyenXeRepository;
        this.xeRepository = xeRepository;
        this.bookingCatalogService = bookingCatalogService;
    }

    public List<TripDetailDto> listAll() {
        return chuyenXeRepository.findAll().stream()
            .map(c -> chuyenXeRepository.findByIdWithDetails(c.getId()).orElse(c))
            .map(c -> toDetail(c, bookingCatalogService.countAvailableSeats(c)))
            .toList();
    }

    @Transactional
    public TripDetailDto create(CreateTripRequest req) {
        TuyenXe tuyen = tuyenXeRepository.findById(req.tuyenXeId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tuyến"));
        if (tuyen.getTrangThai() != RouteStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tuyến không hoạt động");
        }
        Xe xe = xeRepository.findById(req.xeId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy xe"));
        validateDeparture(req.ngayDi(), req.gioDi());

        ChuyenXe c = new ChuyenXe();
        c.setTuyenXe(tuyen);
        c.setXe(xe);
        c.setNgayDi(req.ngayDi());
        c.setGioDi(req.gioDi());
        c.setGiaVe(req.giaVe());
        c.setTrangThai(TripRunStatus.CHUA_KHOI_HANH);
        chuyenXeRepository.save(c);
        ChuyenXe full = chuyenXeRepository.findByIdWithDetails(c.getId()).orElse(c);
        return toDetail(full, bookingCatalogService.countAvailableSeats(full));
    }

    @Transactional
    public TripDetailDto update(Integer id, UpdateTripRequest req) {
        ChuyenXe c = chuyenXeRepository.findByIdWithDetails(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chuyến"));
        TuyenXe tuyen = tuyenXeRepository.findById(req.tuyenXeId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tuyến"));
        Xe xe = xeRepository.findById(req.xeId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy xe"));
        validateDeparture(req.ngayDi(), req.gioDi());
        c.setTuyenXe(tuyen);
        c.setXe(xe);
        c.setNgayDi(req.ngayDi());
        c.setGioDi(req.gioDi());
        c.setGiaVe(req.giaVe());
        c.setTrangThai(req.trangThai());
        chuyenXeRepository.save(c);
        ChuyenXe full = chuyenXeRepository.findByIdWithDetails(c.getId()).orElse(c);
        return toDetail(full, bookingCatalogService.countAvailableSeats(full));
    }

    @Transactional
    public void deleteTrip(Integer id) {
        ChuyenXe c = chuyenXeRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chuyến"));
        c.setTrangThai(TripRunStatus.HUY_CHUYEN);
        chuyenXeRepository.save(c);
    }

    private void validateDeparture(LocalDate ngay, java.time.LocalTime gio) {
        LocalDateTime dep = LocalDateTime.of(ngay, gio);
        if (!dep.isAfter(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày giờ khởi hành phải trong tương lai");
        }
    }

    private TripDetailDto toDetail(ChuyenXe c, int soGheTrong) {
        var t = c.getTuyenXe();
        var x = c.getXe();
        return new TripDetailDto(
            c.getId(),
            t.getId(),
            t.getTenTuyen(),
            t.getDiemDi(),
            t.getDiemDen(),
            c.getNgayDi(),
            c.getGioDi(),
            c.getGiaVe(),
            x.getId(),
            x.getLoaiXe(),
            x.getBienSo(),
            x.getSoGhe(),
            soGheTrong,
            c.getTrangThai().name()
        );
    }
}
