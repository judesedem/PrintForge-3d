package com.printforge.printforge.marketplaceservice.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

// Body of PATCH /api/marketplace/{id}/images/reorder: the full set of a
// listing's image ids, in the desired display order.
@Getter
@Setter
public class ReorderImagesRequest {
    private List<Long> imageIds;
}
