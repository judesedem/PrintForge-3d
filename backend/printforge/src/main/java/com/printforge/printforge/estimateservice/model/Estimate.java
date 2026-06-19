package com.printforge.printforge.estimateservice.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "estimates")
@Data // Use Lombok for getters/setters, or generate them manually
public class Estimate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The user's inputs
    private Double fileSizeKb;
    private String quality; // "DRAFT", "STANDARD", "HIGH"
    private Integer infillPercent;
    private Integer quantity;

    // The calculated outputs
    private Double estimatedGrams;
    private Double durationMinutes;
}