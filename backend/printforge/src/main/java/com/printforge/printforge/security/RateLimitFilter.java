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
 * Login           — 5 attempts per 15 minutes, keyed by IP + email
 *                   so User A and User B on the same network each get
 *                   their own independent 5-attempt quota.
 *
 * Register        — 10 attempts per 4 minutes, keyed by IP only
 *                   (no email in body yet at registration time from a
 *                   rate-limit perspective — we use IP to stop bulk
 *                   account creation from one machine). Loosened from the
 *                   original 3/hour for easier local testing — still a real
 *                   limit, not disabled.
 *
 * Forgot-password — two independent limits, both must pass:
 *                   (a) 3 attempts per hour, keyed by IP + email — the
 *                       per-target limit. Stricter than login's per-target
 *                       limit (3/hour vs. 5/15min) because mail-bombing a
 *                       victim's inbox costs them more than a failed login
 *                       attempt costs the account owner.
 *                   (b) 10 attempts per 15 minutes, keyed by IP only — a
 *                       ceiling on one source requesting resets for many
 *                       *different* emails, which (a) alone wouldn't catch
 *                       since each email gets its own independent bucket.
 *
 * Reset-password  — 10 attempts per 15 minutes, keyed by IP only. No email
 *                   in this body (just {token, newPassword}), so there's no
 *                   per-target bucket to key on — token guessing itself
 *                   isn't realistically rate-limit-relevant given a
 *                   128-bit token (UUID with dashes stripped), this is
 *                   just a generic ceiling against scripted abuse of the
 *                   endpoint.
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

    // "ip:email" → forgot-password bucket (3 tokens per hour per target)
    private final ConcurrentHashMap<String, Bucket> forgotPasswordEmailBuckets = new ConcurrentHashMap<>();

    // ip → forgot-password bucket (10 tokens per 15 minutes per machine —
    // catches one source probing many different emails)
    private final ConcurrentHashMap<String, Bucket> forgotPasswordIpBuckets = new ConcurrentHashMap<>();

    // ip → reset-password bucket (10 tokens per 15 minutes per machine)
    private final ConcurrentHashMap<String, Bucket> resetPasswordBuckets = new ConcurrentHashMap<>();

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
                        "Too many registration attempts. Try again in 4 minutes.");
                return;
            }

        } else if ("/api/auth/forgot-password".equals(path) && "POST".equalsIgnoreCase(request.getMethod())) {
            // IP-only ceiling first — cheaper to check before touching the
            // body, and catches one source probing many different emails
            // (which the per-email bucket below wouldn't, since each email
            // gets its own independent bucket).
            Bucket ipBucket = forgotPasswordIpBuckets.computeIfAbsent(ip, k -> buildForgotPasswordIpBucket());
            if (!ipBucket.tryConsume(1)) {
                rejectTooManyRequests(response,
                        "Too many password reset requests. Try again in 15 minutes.");
                return;
            }

            CachedBodyHttpServletRequest cachedRequest = new CachedBodyHttpServletRequest(request);
            String email = extractEmailFromCachedBody(cachedRequest.getCachedBody());
            String bucketKey = ip + ":" + (email != null ? email.toLowerCase() : "unknown");

            Bucket emailBucket = forgotPasswordEmailBuckets.computeIfAbsent(bucketKey, k -> buildForgotPasswordEmailBucket());
            if (!emailBucket.tryConsume(1)) {
                rejectTooManyRequests(response,
                        "Too many password reset requests for this account. Try again in an hour.");
                return;
            }

            filterChain.doFilter(cachedRequest, response);
            return;

        } else if ("/api/auth/reset-password".equals(path) && "POST".equalsIgnoreCase(request.getMethod())) {
            Bucket bucket = resetPasswordBuckets.computeIfAbsent(ip, k -> buildResetPasswordBucket());
            if (!bucket.tryConsume(1)) {
                rejectTooManyRequests(response,
                        "Too many password reset attempts. Try again in 15 minutes.");
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
        // Was 3 attempts / 1 hour — loosened for testing (still a real
        // limit, not disabled): 10 attempts / 4 minutes.
        Bandwidth limit = Bandwidth.classic(10,
                Refill.intervally(10, Duration.ofMinutes(4)));
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket buildForgotPasswordEmailBucket() {
        Bandwidth limit = Bandwidth.classic(3,
                Refill.intervally(3, Duration.ofHours(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket buildForgotPasswordIpBucket() {
        Bandwidth limit = Bandwidth.classic(10,
                Refill.intervally(10, Duration.ofMinutes(15)));
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket buildResetPasswordBucket() {
        Bandwidth limit = Bandwidth.classic(10,
                Refill.intervally(10, Duration.ofMinutes(15)));
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

    /**
     * X-Forwarded-For is built left-to-right as a request passes through
     * proxies: client-supplied values (if any) come first, then each
     * proxy along the way appends the hop it actually saw. This app runs
     * on Railway, which sits in front of it as the one and only reverse
     * proxy — Railway's edge appends the real client IP as the LAST entry
     * in this header. A client can prepend as many fake IPs as they want
     * before their request ever reaches Railway, so taking the FIRST
     * entry (the old behavior) meant trusting whatever the attacker
     * claimed, completely unvalidated — every IP-keyed bucket in this
     * filter (login, register, forgot-password's IP ceiling,
     * reset-password) could be bypassed by spoofing a fresh header value
     * per request. The LAST entry is the one Railway itself appended and
     * a client cannot forge.
     *
     * Do NOT "fix" this back to the first entry later — that's only
     * correct if there's no trusted proxy in front of the app at all, or
     * if the header is stripped/overwritten at the edge (neither is true
     * here). If this app ever moves behind an additional CDN/proxy layer
     * in front of Railway, this needs revisiting: the trustworthy entry
     * is always "the one appended by the outermost hop you actually
     * control," which shifts further back in the list as more trusted
     * proxies are added.
     */
    private String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            String[] hops = xff.split(",");
            return hops[hops.length - 1].trim();
        }
        // No X-Forwarded-For at all — a direct connection with no proxy in
        // front (e.g. local dev), so the raw remote address is already the
        // real client IP.
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
