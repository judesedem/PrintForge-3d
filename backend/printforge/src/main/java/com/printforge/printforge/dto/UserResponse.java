package com.printforge.printforge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class UserResponse {

    private Long userId;
    private String fullName;
    private String email;
    private String role;
}