package com.printforge.payment.paymentservice.repository;

import com.printforge.payment.paymentservice.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
