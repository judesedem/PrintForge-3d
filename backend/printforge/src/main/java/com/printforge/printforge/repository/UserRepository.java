package com.printforge.printforge.repository;

import com.printforge.printforge.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    // Used to exclude a suspended designer's listings from marketplace
    // browse/search/profile queries (#68) without needing a JPQL join
    // between DesignListing and User (designerId is a plain FK, not a
    // mapped association).
    List<User> findBySuspendedTrue();
}