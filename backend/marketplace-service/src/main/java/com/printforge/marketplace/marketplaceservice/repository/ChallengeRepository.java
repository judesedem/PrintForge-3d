package com.printforge.marketplace.marketplaceservice.repository;

import com.printforge.marketplace.marketplaceservice.model.Challenge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChallengeRepository extends JpaRepository<Challenge, Long> {
    List<Challenge> findByPostedBy(Long postedBy);
    List<Challenge> findByStatus(String status);
}
