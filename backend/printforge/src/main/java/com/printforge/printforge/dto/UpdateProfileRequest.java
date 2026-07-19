package com.printforge.printforge.dto;

import jakarta.validation.constraints.Email;
import lombok.Getter;
import lombok.Setter;

// All fields optional — PATCH semantics. fullName's blank/length check and
// email's uniqueness check are done in AuthService (not annotation-only,
// since "not blank if provided" and "unique if changed" both need to see
// whether the field was sent at all, not just its value).
@Getter
@Setter
public class UpdateProfileRequest {

    private String fullName;

    @Email(message = "Email must be valid")
    private String email;
}
