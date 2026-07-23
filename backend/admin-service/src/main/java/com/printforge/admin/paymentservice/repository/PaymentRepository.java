package com.printforge.admin.paymentservice.repository;

import com.printforge.admin.paymentservice.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    // Used by AdminService.getRevenueHistory() — GET
    // /api/admin/dashboard/revenue-history. Filters to COMPLETED here
    // (rather than pulling every payment and filtering in Java) so the
    // row set stays bounded by the caller's date-range window regardless
    // of how many PENDING/FAILED rows exist outside it.
    List<Payment> findByStatusAndCompletedAtGreaterThanEqual(String status, LocalDateTime since);
}
