package com.proctoring.backend.repository;

import com.proctoring.backend.model.auth.OtpToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OtpTokenRepository
        extends JpaRepository<OtpToken, Long> {

    Optional<OtpToken> findByEmailAndOtp(String email, String otp);
}
