package com.printforge.notification.dto;

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

    // Only populated by AdminService.suspendUser() today (#68) — every
    // other toUserDto() call site in AuthService/UserService leaves this
    // null, which is harmless since none of those responses are about a
    // caller's suspension state.
    private Boolean suspended;
}