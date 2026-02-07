package com.proctoring.backend.controller;

import com.proctoring.backend.model.auth.OtpToken;
import com.proctoring.backend.repository.OtpTokenRepository;
import com.proctoring.backend.security.JwtUtil;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final OtpTokenRepository repo;
    private final JwtUtil jwtUtil;

    public AuthController(OtpTokenRepository repo, JwtUtil jwtUtil) {
        this.repo = repo;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/request-otp")
    public void requestOtp(@RequestBody Map<String, String> req) {

        String email = req.get("email");
        String otp = String.valueOf(
            new SecureRandom().nextInt(900000) + 100000
        );

        OtpToken token = new OtpToken();
        token.setEmail(email);
        token.setOtp(otp);
        token.setExpiresAt(LocalDateTime.now().plusMinutes(5));

        repo.save(token);

        // TEMP: log OTP (replace with email later)
        System.out.println("OTP for " + email + ": " + otp);
    }

    @PostMapping("/verify-otp")
    public Map<String, String> verify(@RequestBody Map<String, String> req) {

        OtpToken token = repo
            .findByEmailAndOtp(req.get("email"), req.get("otp"))
            .orElseThrow();

        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("OTP expired");
        }

        return Map.of(
            "token", jwtUtil.generateToken(token.getEmail())
        );
    }
}
