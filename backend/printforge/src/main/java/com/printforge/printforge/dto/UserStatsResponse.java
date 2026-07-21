package com.printforge.printforge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

/**
 * Response for GET /api/users/{id}/stats. followerCount/followingCount
 * come from FollowRepository (socialservice); totalLikes sums
 * DesignListing.favoriteCount across the designer's listings — same
 * unfiltered-across-all-listings pattern as totalEarnings, since likes
 * are already public per-listing on the storefront.
 */
@Getter
@Builder
@AllArgsConstructor
public class UserStatsResponse {

    private Long userId;
    private int designCount;
    private int followerCount;
    private int followingCount;
    private int totalLikes;
    private BigDecimal totalEarnings;
}
