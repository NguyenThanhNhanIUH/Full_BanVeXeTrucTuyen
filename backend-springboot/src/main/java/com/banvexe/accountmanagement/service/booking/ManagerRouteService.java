package com.banvexe.accountmanagement.service.booking;

import com.banvexe.accountmanagement.dto.booking.CreateRouteRequest;
import com.banvexe.accountmanagement.dto.booking.RouteSummaryDto;
import com.banvexe.accountmanagement.dto.booking.UpdateRouteRequest;
import com.banvexe.accountmanagement.entity.RouteStatus;
import com.banvexe.accountmanagement.entity.TuyenXe;
import com.banvexe.accountmanagement.repository.ChuyenXeRepository;
import com.banvexe.accountmanagement.repository.TuyenXeRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ManagerRouteService {

    private final TuyenXeRepository tuyenXeRepository;
    private final ChuyenXeRepository chuyenXeRepository;

    public ManagerRouteService(TuyenXeRepository tuyenXeRepository, ChuyenXeRepository chuyenXeRepository) {
        this.tuyenXeRepository = tuyenXeRepository;
        this.chuyenXeRepository = chuyenXeRepository;
    }

    public List<RouteSummaryDto> listAll() {
        return tuyenXeRepository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional
    public RouteSummaryDto create(CreateRouteRequest req) {
        if (req.diemDi().trim().equalsIgnoreCase(req.diemDen().trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Điểm đi và điểm đến không được trùng");
        }
        TuyenXe t = new TuyenXe();
        t.setTenTuyen(req.tenTuyen().trim());
        t.setDiemDi(req.diemDi().trim());
        t.setDiemDen(req.diemDen().trim());
        t.setKhoangCach(req.khoangCach());
        t.setThoiGianDuKien(req.thoiGianDuKienPhut());
        t.setGiaVeCoBan(req.giaVeCoBan());
        t.setTrangThai(RouteStatus.ACTIVE);
        tuyenXeRepository.save(t);
        return toDto(t);
    }

    @Transactional
    public RouteSummaryDto update(Integer id, UpdateRouteRequest req) {
        TuyenXe t = tuyenXeRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tuyến"));
        if (req.diemDi().trim().equalsIgnoreCase(req.diemDen().trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Điểm đi và điểm đến không được trùng");
        }
        t.setTenTuyen(req.tenTuyen().trim());
        t.setDiemDi(req.diemDi().trim());
        t.setDiemDen(req.diemDen().trim());
        t.setKhoangCach(req.khoangCach());
        t.setThoiGianDuKien(req.thoiGianDuKienPhut());
        t.setGiaVeCoBan(req.giaVeCoBan());
        t.setTrangThai(req.trangThai());
        tuyenXeRepository.save(t);
        return toDto(t);
    }

    @Transactional
    public void deleteOrDeactivate(Integer id) {
        TuyenXe t = tuyenXeRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tuyến"));
        if (chuyenXeRepository.existsByTuyenXeId(id)) {
            t.setTrangThai(RouteStatus.INACTIVE);
            tuyenXeRepository.save(t);
            return;
        }
        tuyenXeRepository.delete(t);
    }

    private RouteSummaryDto toDto(TuyenXe t) {
        return new RouteSummaryDto(
            t.getId(),
            t.getTenTuyen(),
            t.getDiemDi(),
            t.getDiemDen(),
            t.getKhoangCach(),
            t.getThoiGianDuKien(),
            t.getGiaVeCoBan(),
            t.getTrangThai().name()
        );
    }
}
