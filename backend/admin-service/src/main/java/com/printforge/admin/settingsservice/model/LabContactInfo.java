package com.printforge.admin.settingsservice.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Single-row config table — this app has exactly one lab, so there is
 * exactly one contact-info row, always id=1 (fixed, not @GeneratedValue).
 * LabContactInfoSeeder creates it on startup so every reader can assume it
 * exists rather than null-checking.
 */
@Entity
@Table(name = "lab_contact_info")
public class LabContactInfo {

    @Id
    private Long id = 1L;

    private String labName;
    private String email;
    private String phone;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getLabName() { return labName; }
    public void setLabName(String labName) { this.labName = labName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
}
