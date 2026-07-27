package com.printforge.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminCreateUserRequest {
    private String full_name;
    private String email;
    private String password;
    private String confirm_password;
    private String role;
}
