package com.printforge.admin.settingsservice.dto;

import lombok.Getter;
import lombok.Setter;

// PATCH /api/admin/settings/features/{key}
@Getter
@Setter
public class UpdateFeatureToggleRequest {
    private boolean enabled;
}
