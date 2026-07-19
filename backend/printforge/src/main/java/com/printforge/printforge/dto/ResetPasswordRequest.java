package com.printforge.printforge.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResetPasswordRequest {

    @NotBlank(message = "Token is required")
    private String token;

    // Same rule as RegisterRequest.password, sourced from the same
    // constant rather than a second hardcoded "6" — see PasswordPolicy.
    @NotBlank(message = "Password is required")
    @Size(min = PasswordPolicy.MIN_LENGTH, message = PasswordPolicy.MESSAGE)
    private String newPassword;
}
