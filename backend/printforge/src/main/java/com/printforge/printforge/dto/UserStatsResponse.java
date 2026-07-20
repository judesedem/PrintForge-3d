package com.printforge.printforge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

/**
 * Response for GET /api/users/{id}/stats. followerCount/followingCount/
 * totalLikes are hardcoded to 0 for now — there's no follow or like model
 * in the backend yet.
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
