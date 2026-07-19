package com.printforge.printforge.labservice.dto;

import com.printforge.printforge.labservice.model.LabLocation;
import lombok.Getter;
import lombok.Setter;

// Lean projection embedded as PrintJobResponse.pickup_location — GET /api/labs
// endpoints return the full LabLocation entity instead.
@Getter
@Setter
public class LabLocationSummary {
    private Long id;
    private String name;
    private String address;
    private Double latitude;
    private Double longitude;

    public static LabLocationSummary from(LabLocation lab) {
        LabLocationSummary summary = new LabLocationSummary();
        summary.setId(lab.getId());
        summary.setName(lab.getName());
        summary.setAddress(lab.getAddress());
        summary.setLatitude(lab.getLatitude());
        summary.setLongitude(lab.getLongitude());
        return summary;
    }
}
