package com.printforge.printforge.paymentservice.repository;

import com.printforge.printforge.paymentservice.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByUserId(Long userId);
    Optional<Payment> findByPaystackReference(String paystackReference);
    Optional<Payment> findByEstimateIdAndStatus(Long estimateId, String status);

    // Used by DELETE /api/marketplace/{id}: a listing with a PENDING
    // payment in flight can't be deleted out from under it — see
    // MarketplaceController.deleteListing().
    boolean existsByListingIdAndStatus(Long listingId, String status);

    // Used by AdminService.getRevenueHistory() — GET
    // /api/admin/dashboard/revenue-history. Filters to COMPLETED here
    // (rather than pulling every payment and filtering in Java) so the
    // row set stays bounded by the caller's date-range window regardless
    // of how many PENDING/FAILED rows exist outside it.
    List<Payment> findByStatusAndCompletedAtGreaterThanEqual(String status, LocalDateTime since);
}
