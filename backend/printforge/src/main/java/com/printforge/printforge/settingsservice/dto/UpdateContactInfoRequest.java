package com.printforge.printforge.settingsservice.dto;

import lombok.Getter;
import lombok.Setter;

// PATCH /api/admin/settings/contact — partial update, same shape as
// moderationservice's request DTOs: a null field means "leave unchanged".
@Getter
@Setter
public class UpdateContactInfoRequest {
    private String labName;
    private String email;
    private String phone;
}
