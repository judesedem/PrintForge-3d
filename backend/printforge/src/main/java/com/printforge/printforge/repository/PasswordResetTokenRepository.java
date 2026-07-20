package com.printforge.printforge.repository;

import com.printforge.printforge.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByToken(String token);

    // Used to invalidate any still-live tokens before issuing a new one.
    List<PasswordResetToken> findByUserIdAndUsedFalse(Long userId);
}
