package com.printforge.printforge.labservice.dto;

import lombok.Getter;
import lombok.Setter;

// All fields optional — PATCH semantics, only non-null fields are applied.
@Getter
@Setter
public class UpdateLabLocationRequest {
    private String name;
    private String address;
    private Double latitude;
    private Double longitude;
    private Boolean isActive;
}
