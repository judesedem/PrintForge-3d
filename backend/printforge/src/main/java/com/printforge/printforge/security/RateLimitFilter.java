package com.printforge.printforge.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Per-user rate limiting for auth endpoints.
 *
 * Login    — 5 attempts per 15 minutes, keyed by IP + email
 *            so User A and User B on the same network each get
 *            their own independent 5-attempt quota.
 *
 * Register — 3 attempts per hour, keyed by IP only
 *            (no email in body yet at registration time from a
 *            rate-limit perspective — we use IP to stop bulk
 *            account creation from one machine).
 *
 * Buckets are in-memory — they reset on server restart.
 * For production, swap ConcurrentHashMap for Redis + Bucket4j
 * redis extension so limits survive restarts.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    // "ip:email" → login bucket (5 tokens per 15 minutes per user)
    private final ConcurrentHashMap<String, Bucket> loginBuckets    = new ConcurrentHashMap<>();

    // ip → register bucket (3 tokens per hour per machine)
    private final ConcurrentHashMap<String, Bucket> registerBuckets = new ConcurrentHashMap<>();

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String path = request.getServletPath();
        String ip   = resolveClientIp(request);

        if ("/api/auth/login".equals(path) && "POST".equalsIgnoreCase(request.getMethod())) {
            // Wrap the request so the body can be read here AND by Spring afterward
            CachedBodyHttpServletRequest cachedRequest = new CachedBodyHttpServletRequest(request);

            String email = extractEmailFromCachedBody(cachedRequest.getCachedBody());
            String bucketKey = ip + ":" + (email != null ? email.toLowerCase() : "unknown");

            Bucket bucket = loginBuckets.computeIfAbsent(bucketKey, k -> buildLoginBucket());
            if (!bucket.tryConsume(1)) {
                rejectTooManyRequests(response,
                        "Too many login attempts for this account. Try again in 15 minutes.");
                return;
            }

            // Pass the cached wrapper downstream so Spring can still read the body
            filterChain.doFilter(cachedRequest, response);
            return;

        } else if ("/api/auth/register".equals(path) && "POST".equalsIgnoreCase(request.getMethod())) {
            Bucket bucket = registerBuckets.computeIfAbsent(ip, k -> buildRegisterBucket());
            if (!bucket.tryConsume(1)) {
                rejectTooManyRequests(response,
                        "Too many registration attempts. Try again in 1 hour.");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    // ── Bucket factories ─────────────────────────────────────────────────────

    private Bucket buildLoginBucket() {
        Bandwidth limit = Bandwidth.classic(5,
                Refill.intervally(5, Duration.ofMinutes(15)));
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket buildRegisterBucket() {
        Bandwidth limit = Bandwidth.classic(3,
                Refill.intervally(3, Duration.ofHours(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Peeks at the JSON body to extract the "email" field without
     * consuming the stream. Uses a cached body wrapper so Spring can
     * still deserialize the full request body afterward.
     */
    private String extractEmailFromCachedBody(byte[] body) {
        try {
            if (body == null || body.length == 0) return null;
            @SuppressWarnings("unchecked")
            Map<String, Object> map = objectMapper.readValue(body, Map.class);
            Object email = map.get("email");
            return email != null ? email.toString() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private void rejectTooManyRequests(HttpServletResponse response, String message)
            throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(),
                Map.of("error", "Too Many Requests", "message", message));
    }
}
