package com.printforge.payment.paymentservice.repository;

import com.printforge.payment.paymentservice.model.Withdrawal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WithdrawalRepository extends JpaRepository<Withdrawal, Long> {
    List<Withdrawal> findByUserId(Long userId);
    List<Withdrawal> findByUserIdOrderByCreatedAtDesc(Long userId);
}
