package com.printforge.auth.util;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

// Shared by DataSeeder (seed accounts, keyed by full name — there are only
// three of them, so their background colors are picked by hand) and
// AuthService (real registrations, keyed by email since it's unique and
// immutable at signup while fullName can collide) so every user, seeded or
// self-registered, gets a distinct-looking profilePictureUrl from the start
// instead of everyone sharing one hardcoded fallback avatar.
public final class AvatarUrls {

    private AvatarUrls() {
    }

    // Small fixed palette so real registrations don't all render on the
    // same flat background — dicebear's own seed-derived styling already
    // varies the illustration, but backgroundColor is the one part of the
    // URL we control explicitly, so it's picked deterministically from the
    // seed here rather than left to default to a single color for everyone.
    private static final String[] PALETTE = {
            "6366f1", "ec4899", "10b981", "f59e0b", "3b82f6", "ef4444", "8b5cf6", "14b8a6"
    };

    public static String dicebearInitials(String seed, String backgroundColorHex) {
        return "https://api.dicebear.com/7.x/initials/png?seed=" + urlEncode(seed)
                + "&backgroundColor=" + backgroundColorHex;
    }

    /** Picks a background color deterministically from {@code seed} so distinct seeds get distinct colors. */
    public static String dicebearInitials(String seed) {
        String color = PALETTE[Math.floorMod(seed.hashCode(), PALETTE.length)];
        return dicebearInitials(seed, color);
    }

    private static String urlEncode(String value) {
        try {
            return URLEncoder.encode(value, StandardCharsets.UTF_8.name());
        } catch (UnsupportedEncodingException e) {
            // UTF-8 is always supported — this never actually throws.
            throw new IllegalStateException(e);
        }
    }
}
