package com.printforge.printforge.materialservice.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

// PATCH /api/admin/materials/{name} — partial update, null field means
// "leave unchanged", same convention as UpdateContactInfoRequest.
@Getter
@Setter
public class UpdateMaterialRequest {
    private Double costPerGram;
    private List<String> colors;
    private String availabilityStatus;
}
