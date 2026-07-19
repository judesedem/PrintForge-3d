package com.printforge.printforge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class UserDto {

    private Long user_id;
    private String full_name;
    private String email;
    private String role;
    private String profile_picture_url;
}